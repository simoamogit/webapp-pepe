// public/script.js

const socket = io();
let role = null;
let localStream = null;
let peerConnection = null;

// Configurazione ICE di base
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Gestione dei bottoni per la selezione del ruolo
document.getElementById('btnSender').addEventListener('click', () => {
  role = 'sender';
  socket.emit('register', role);
  document.getElementById('role-selection').style.display = 'none';
  document.getElementById('controls').style.display = 'block';
  document.getElementById('remote-controls').style.display = 'block';
});

document.getElementById('btnReceiver').addEventListener('click', () => {
  role = 'receiver';
  socket.emit('register', role);
  document.getElementById('role-selection').style.display = 'none';
  document.getElementById('controls').style.display = 'block';
});

// Per il sender: attiva la fotocamera e il microfono
if (document.getElementById('btnActivateCamera')) {
  document.getElementById('btnActivateCamera').addEventListener('click', async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('video').srcObject = localStream;
      initializePeerConnection();
    } catch (error) {
      console.error('Errore nell\'acquisizione di video/audio: ', error);
    }
  });
}

// Inizializza la connessione WebRTC
function initializePeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  // Aggiungi le tracce locali (video e audio) alla connessione
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Gestione delle tracce remote, utile per l'audio bidirezionale
  peerConnection.ontrack = event => {
    // Se il sender riceve la traccia audio dal receiver, la riproduce
    let remoteAudio = document.getElementById('audio');
    remoteAudio.srcObject = event.streams[0];
  };

  // Gestione dei candidati ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { candidate: event.candidate, role });
    }
  };

  // Se il dispositivo è sender, crea un'offerta in fase di negoziazione
  if (role === 'sender') {
    peerConnection.onnegotiationneeded = async () => {
      try {
        let offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { sdp: peerConnection.localDescription, role });
      } catch (error) {
        console.error('Errore nella negoziazione: ', error);
      }
    };
  }
}

// Gestione dei messaggi di signaling (SDP e candidati ICE)
socket.on('signal', async (data) => {
  if (data.sdp) {
    try {
      if (data.sdp.type === 'offer' && role === 'receiver') {
        // Il receiver riceve l'offerta e crea una nuova connessione WebRTC
        peerConnection = new RTCPeerConnection(config);
        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('signal', { candidate: event.candidate, role });
          }
        };

        // Imposta la descrizione remota
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Il receiver attiva il microfono per l'audio bidirezionale
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Visualizza la traccia video remote, se disponibile
        peerConnection.ontrack = event => {
          const videoElem = document.getElementById('video');
          videoElem.srcObject = event.streams[0];
        };

        // Crea e invia la risposta
        let answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { sdp: peerConnection.localDescription, role });
      } else if (data.sdp.type === 'answer' && role === 'sender') {
        // Il sender imposta la risposta ricevuta dal receiver
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    } catch (error) {
      console.error('Errore nel processo SDP: ', error);
    }
  } else if (data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Errore nell\'aggiunta del candidato: ', error);
    }
  }
});

// Gestione dei comandi remoti (es. per controllo zoom/luminosità)
// Se sei un receiver puoi inviare un comando al sender
if (role === 'receiver') {
  if (document.getElementById('btnRemoteCommand')) {
    document.getElementById('btnRemoteCommand').addEventListener('click', () => {
      const command = prompt("Inserisci comando remoto (es. zoomIn, brightnessUp):");
      if (command) {
        socket.emit('control', { command });
      }
    });
  }
}

// Il sender riceve comandi remoti e può applicare le modifiche (dovrai integrare il controllo dell'hardware se disponibile)
socket.on('control', data => {
  console.log("Comando remoto ricevuto:", data);
  // Inserisci qui la logica per applicare il comando (es. controllo di zoom o luminosità)
});

// Simulazione del rilevamento movimento (il sender invia notifiche ogni 5 secondi)
// In un'applicazione reale sostituisci questa simulazione con un algoritmo di motion detection
if (role === 'sender') {
  setInterval(() => {
    socket.emit('motion', { detected: true, timestamp: Date.now() });
  }, 5000);
}

// I receiver ricevono una notifica push quando viene rilevato un movimento
socket.on('motion', data => {
  if (Notification.permission === "granted") {
    new Notification("Movimento rilevato!", {
      body: "Il tuo gatto si sta muovendo."
    });
  }
});

// Richiedi il permesso per le notifiche (utile per i receiver)
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
