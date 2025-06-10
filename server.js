const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve i file statici
app.use(express.static(path.join(__dirname, '../public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size
  });
});

// Gestione delle stanze
let rooms = new Map();

io.on('connection', (socket) => {
  console.log(`Nuova connessione: ${socket.id}`);
  
  // Registrazione del dispositivo
  socket.on('register', (data) => {
    const { role, roomCode } = data;
    
    console.log(`Registrazione: ${role} - Stanza: ${roomCode} - Socket: ${socket.id}`);
    
    if (role === 'sender') {
      // Dispositivo casa (trasmettitore)
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, { sender: null, receivers: [] });
      }
      
      const room = rooms.get(roomCode);
      
      // Se c'era già un sender, disconnettilo
      if (room.sender) {
        room.sender.emit('error', 'Un altro dispositivo casa si è connesso');
        room.sender.disconnect();
      }
      
      room.sender = socket;
      socket.roomCode = roomCode;
      socket.role = 'sender';
      
      socket.emit('registered', { role: 'sender', roomCode });
      
      // Notifica ai receivers che il sender è disponibile
      room.receivers.forEach(receiver => {
        receiver.emit('sender-available');
      });
      
    } else if (role === 'receiver') {
      // Dispositivo principale (ricevitore)
      if (!rooms.has(roomCode)) {
        socket.emit('error', 'Stanza non trovata. Assicurati che il dispositivo casa sia acceso.');
        return;
      }
      
      const room = rooms.get(roomCode);
      
      if (!room.sender) {
        socket.emit('error', 'Dispositivo casa non disponibile.');
        return;
      }
      
      if (room.receivers.length >= 3) {
        socket.emit('error', 'Numero massimo di dispositivi connessi raggiunto.');
        return;
      }
      
      room.receivers.push(socket);
      socket.roomCode = roomCode;
      socket.role = 'receiver';
      
      socket.emit('registered', { role: 'receiver', roomCode });
      
      console.log(`Receiver aggiunto alla stanza ${roomCode}. Totale receivers: ${room.receivers.length}`);
    }
  });
  
  // Gestione dei messaggi di signaling WebRTC
  socket.on('signal', (data) => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms.has(roomCode)) {
      console.log('Messaggio signal ricevuto ma stanza non trovata');
      return;
    }
    
    const room = rooms.get(roomCode);
    
    console.log(`Signal ricevuto da ${socket.role} (${socket.id}): ${data.type}`);
    
    if (socket.role === 'sender') {
      // Inoltra ai receivers
      room.receivers.forEach(receiver => {
        if (receiver.id !== socket.id) {
          receiver.emit('signal', data);
        }
      });
    } else if (socket.role === 'receiver') {
      // Inoltra al sender
      if (room.sender) {
        room.sender.emit('signal', data);
      }
    }
  });
    // Gestione comandi di controllo
  socket.on('control', (data) => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms.has(roomCode)) return;
    
    const room = rooms.get(roomCode);
    
    // Solo i receivers possono inviare comandi
    if (socket.role === 'receiver' && room.sender) {
      room.sender.emit('control', data);
      console.log(`Comando inviato: ${data.command} da ${socket.id} a sender`);
    }
  });
  
  // Richiesta di iniziare la connessione
  socket.on('start-connection', () => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms.has(roomCode)) return;
    
    const room = rooms.get(roomCode);
    
    if (socket.role === 'receiver' && room.sender) {
      // Notifica al sender di iniziare la trasmissione
      room.sender.emit('start-transmission');
      console.log(`Richiesta connessione da receiver ${socket.id}`);
    }
  });
  
  // Gestione stato trasmissione
  socket.on('transmission-status', (data) => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms.has(roomCode)) return;
    
    const room = rooms.get(roomCode);
    
    if (socket.role === 'sender') {
      // Notifica a tutti i receivers lo stato della trasmissione
      room.receivers.forEach(receiver => {
        receiver.emit('transmission-status', data);
      });
    }
  });
  
  // Heartbeat per mantenere la connessione
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Gestione disconnessione
  socket.on('disconnect', () => {
    console.log(`Disconnessione: ${socket.id}`);
    
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms.has(roomCode)) return;
    
    const room = rooms.get(roomCode);
    
    if (socket.role === 'sender') {
      // Il sender si è disconnesso
      console.log(`Sender disconnesso dalla stanza ${roomCode}`);
      
      // Notifica tutti i receivers
      room.receivers.forEach(receiver => {
        receiver.emit('sender-disconnected');
      });
      
      // Rimuovi la stanza se non ci sono più dispositivi
      rooms.delete(roomCode);
      
    } else if (socket.role === 'receiver') {
      // Un receiver si è disconnesso
      room.receivers = room.receivers.filter(r => r.id !== socket.id);
      console.log(`Receiver disconnesso dalla stanza ${roomCode}. Receivers rimanenti: ${room.receivers.length}`);
      
      // Se non ci sono più receivers e nessun sender, rimuovi la stanza
      if (room.receivers.length === 0 && !room.sender) {
        rooms.delete(roomCode);
      }
    }
  });
  
  // Gestione errori
  socket.on('error', (error) => {
    console.error(`Errore socket ${socket.id}:`, error);
  });
});

// Cleanup periodico delle stanze vuote
setInterval(() => {
  const emptyRooms = [];
  
  rooms.forEach((room, roomCode) => {
    if (!room.sender && room.receivers.length === 0) {
      emptyRooms.push(roomCode);
    }
  });
  
  emptyRooms.forEach(roomCode => {
    rooms.delete(roomCode);
    console.log(`Stanza vuota rimossa: ${roomCode}`);
  });
  
  if (emptyRooms.length > 0) {
    console.log(`Cleanup completato. Stanze attive: ${rooms.size}`);
  }
}, 300000); // Ogni 5 minuti

// Statistiche server
setInterval(() => {
  const stats = {
    activeRooms: rooms.size,
    totalConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Statistiche server:', stats);
}, 60000); // Ogni minuto

// Gestione graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Ricevuto SIGTERM, chiusura server...');
  
  // Notifica tutti i client della chiusura
  io.emit('server-shutdown', { message: 'Server in manutenzione, riconnessione automatica...' });
  
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Server chiuso correttamente');
      process.exit(0);
    });
  }, 1000);
});

process.on('SIGINT', () => {
  console.log('🛑 Ricevuto SIGINT, chiusura server...');
  
  io.emit('server-shutdown', { message: 'Server in manutenzione, riconnessione automatica...' });
  
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Server chiuso correttamente');
      process.exit(0);
    });
  }, 1000);
});

// Avvio server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pet Monitor Server avviato su porta ${PORT}`);
  console.log(`📱 Accedi da: http://localhost:${PORT}`);
  console.log(`🌐 Accesso remoto: http://[tuo-ip]:${PORT}`);
  console.log(`⏰ Server avviato: ${new Date().toISOString()}`);
});

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
  console.error('❌ Errore non catturato:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejection non gestita:', reason);
});
