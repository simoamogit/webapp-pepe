// server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Serve i file statici presenti in public/
app.use(express.static('public'));

// Gestione dei dispositivi connessi
let senderSocket = null;
let receiverSockets = [];

io.on('connection', (socket) => {
  console.log(`Nuova connessione: ${socket.id}`);

  // Registrazione del ruolo: "sender" (trasmettitore) o "receiver" (ricevitore)
  socket.on('register', (role) => {
    if (role === 'sender') {
      console.log(`Trasmettitore connesso: ${socket.id}`);
      senderSocket = socket;
    } else if (role === 'receiver') {
      console.log(`Ricevitore connesso: ${socket.id}`);
      if (receiverSockets.length < 3) {
        receiverSockets.push(socket);
      } else {
        socket.emit('error', 'Numero massimo di riceventi connessi');
      }
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log(`Disconnessione: ${socket.id}`);
    if (senderSocket && senderSocket.id === socket.id) {
      senderSocket = null;
    } else {
      receiverSockets = receiverSockets.filter(s => s.id !== socket.id);
    }
  });

  // Inoltro dei messaggi di signaling per WebRTC (SDP e ICE candidates)
  socket.on('signal', (data) => {
    console.log('Messaggio di segnalazione ricevuto da: ' + socket.id);
    // Se il messaggio proviene dal sender, inoltralo a tutti i receiver, oppure viceversa
    if (socket === senderSocket) {
      receiverSockets.forEach(sock => {
        sock.emit('signal', data);
      });
    } else {
      if (senderSocket) {
        senderSocket.emit('signal', data);
      }
    }
  });

  // Comandi remoti, per controllare (es. zoom o luminosità)
  socket.on('control', (data) => {
    console.log('Comando remoto ricevuto da: ' + socket.id);
    if (socket !== senderSocket && senderSocket) {
      senderSocket.emit('control', data);
    }
  });

  // Notifica di movimento rilevato dal sender
  socket.on('motion', (data) => {
    console.log('Movimento rilevato dal sender');
    receiverSockets.forEach(sock => {
      sock.emit('motion', data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
