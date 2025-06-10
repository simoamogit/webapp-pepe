// server/server.js
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

// Serve i file statici presenti in public/
app.use(express.static(path.join(__dirname, '../public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check per Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestione dei dispositivi connessi
let senderSocket = null;
let receiverSockets = [];
let rooms = new Map(); // Per gestire più stanze/codici

io.on('connection', (socket) => {
  console.log(`Nuova connessione: ${socket.id}`);

  // Registrazione del ruolo: "sender" (trasmettitore) o "receiver" (ricevitore)
  socket.on('register', (data) => {
    const { role, roomCode } = data;
    
    if (role === 'sender') {
      console.log(`Trasmettitore connesso: ${socket.id} - Stanza: ${roomCode}`);
      senderSocket = socket;
      socket.roomCode = roomCode;
      
      // Crea o aggiorna la stanza
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, { sender: socket, receivers: [] });
      } else {
        rooms.get(roomCode).sender = socket;
      }
      
      socket.emit('registered', { role: 'sender', roomCode });
      
    } else if (role === 'receiver') {
      console.log(`Ricevitore connesso: ${socket.id} - Stanza: ${roomCode}`);
      
      if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode);
        if (room.receivers.length < 3) {
          room.receivers.push(socket);
          receiverSockets.push(socket);
          socket.roomCode = roomCode;
          socket.emit('registered', { role: 'receiver', roomCode });
        } else {
          socket.emit('error', 'Numero massimo di riceventi connessi per questa stanza');
        }
      } else {
        socket.emit('error', 'Stanza non trovata. Assicurati che il dispositivo casa sia acceso.');
      }
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log(`Disconnessione: ${socket.id}`);
    
    if (senderSocket && senderSocket.id === socket.id) {
      senderSocket = null;
      
      // Rimuovi la stanza
      if (socket.roomCode && rooms.has(socket.roomCode)) {
        const room = rooms.get(socket.roomCode);
        room.receivers.forEach(receiver => {
          receiver.emit('sender-disconnected');
        });
        rooms.delete(socket.roomCode);
      }
    } else {
      receiverSockets = receiverSockets.filter(s => s.id !== socket.id);
      
      // Rimuovi dalle stanze
      if (socket.roomCode && rooms.has(socket.roomCode)) {
        const room = rooms.get(socket.roomCode);
        room.receivers = room.receivers.filter(s => s.id !== socket.id);
      }
    }
  });

  // Inoltro dei messaggi di signaling per WebRTC (SDP e ICE candidates)
  socket.on('signal', (data) => {
    console.log('Messaggio di segnalazione ricevuto da: ' + socket.id);
    
    if (socket.roomCode && rooms.has(socket.roomCode)) {
      const room = rooms.get(socket.roomCode);
      
      // Se il messaggio proviene dal sender, inoltralo a tutti i receiver della stanza
      if (socket === room.sender) {
        room.receivers.forEach(receiver => {
          receiver.emit('signal', data);
        });
      } else {
        // Se proviene da un receiver, inoltralo al sender
        if (room.sender) {
          room.sender.emit('signal', data);
        }
      }
    }
  });

  // Comandi remoti, per controllare (es. zoom o luminosità)
  socket.on('control', (data) => {
    console.log('Comando remoto ricevuto da: ' + socket.id);
    
    if (socket.roomCode && rooms.has(socket.roomCode)) {
      const room = rooms.get(socket.roomCode);
      
      // Solo i receiver possono inviare comandi al sender
      if (socket !== room.sender && room.sender) {
        room.sender.emit('control', data);
      }
    }
  });

  // Notifica di movimento rilevato dal sender
  socket.on('motion', (data) => {
    console.log('Movimento rilevato dal sender');
    
    if (socket.roomCode && rooms.has(socket.roomCode)) {
      const room = rooms.get(socket.roomCode);
      room.receivers.forEach(receiver => {
        receiver.emit('motion', data);
      });
    }
  });

  // Heartbeat per mantenere la connessione attiva
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Cleanup periodico delle stanze vuote
setInterval(() => {
  for (const [roomCode, room] of rooms.entries()) {
    if (!room.sender && room.receivers.length === 0) {
      console.log(`Rimozione stanza vuota: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }
}, 60000); // Ogni minuto

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});