# 🐾 Pet Monitor - Sistema di Monitoraggio Animali

Sistema di monitoraggio in tempo reale per animali domestici utilizzando WebRTC e Socket.IO.

## 🚀 Caratteristiche

- **Streaming video in tempo reale** tra dispositivi
- **Audio bidirezionale** per comunicare con i tuoi animali
- **Cambio camera** (frontale/posteriore) durante la trasmissione
- **Screenshot** del video ricevuto
- **Interfaccia responsive** ottimizzata per mobile e desktop
- **Connessione sicura** peer-to-peer
- **Gestione automatica** della riconnessione

## 📱 Come Usare

### Dispositivo Casa (Trasmettitore)

1. Apri l'app sul dispositivo che vuoi lasciare a casa
2. Seleziona "📹 Dispositivo Casa"
3. Inserisci un codice stanza (es: "casa123")
4. Clicca "Avvia Trasmissione"
5. Posiziona il dispositivo per inquadrare l'area desiderata

### Dispositivo Principale (Ricevitore)

1. Apri l'app sul tuo dispositivo principale
2. Seleziona "📱 Dispositivo Principale"
3. Inserisci lo stesso codice stanza
4. Clicca "Connetti al Dispositivo Casa"
5. Visualizza il video in tempo reale

## 🛠️ Installazione

### Prerequisiti

- Node.js 16+ installato
- Connessione internet stabile
- Browser moderno con supporto WebRTC

### Setup Locale

```bash
# Clona il repository
git clone <repository-url>
cd webapp-pepe

# Installa le dipendenze
npm install

# Avvia il server
npm start
```

### Setup per Sviluppo

```bash
# Installa nodemon per il reload automatico
npm install -g nodemon

# Avvia in modalità sviluppo
npm run dev
```

## 🌐 Accesso Remoto

Per accedere da dispositivi esterni alla rete locale:

1. **Trova il tuo IP locale:**

   ```bash
   # Windows
   ipconfig

   # Mac/Linux
   ifconfig
   ```

2. **Configura il router** per il port forwarding (porta 3000)

3. **Accedi tramite:**
   - Rete locale: `http://[IP-LOCALE]:3000`
   - Internet: `http://[IP-PUBBLICO]:3000`

## 🔧 Configurazione

### Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
PORT=3000
NODE_ENV=production
```

### Configurazione WebRTC

I server STUN/TURN sono configurati nel client. Per reti aziendali potrebbe essere necessario configurare server TURN personalizzati.

## 📋 Requisiti di Sistema

### Browser Supportati

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Dispositivi

- **Mobile:** iOS 12+, Android 6+
- **Desktop:** Windows 10+, macOS 10.14+, Linux

### Rete

- Connessione internet stabile
- Larghezza di banda minima: 1 Mbps upload/download
- Porte: 3000 (HTTP), range dinamico per WebRTC

## 🚨 Risoluzione Problemi

### Problemi Comuni

**"Errore nell'accesso ai media"**

- Verifica i permessi camera/microfono nel browser
- Controlla che nessun'altra app stia usando la camera

**"Connessione fallita"**

- Verifica la connessione internet
- Controlla che entrambi i dispositivi usino lo stesso codice stanza
- Riavvia l'applicazione

**"Video non visibile"**

- Aggiorna la pagina
- Verifica la compatibilità del browser
- Controlla la console per errori JavaScript

### Debug

Apri la console del browser (F12) per vedere i log dettagliati:

- Messaggi di connessione WebRTC
- Errori di streaming
- Stato delle connessioni Socket.IO

## 🔒 Sicurezza

- Le connessioni WebRTC sono crittografate end-to-end
- I codici stanza sono temporanei e non persistenti
- Nessun video viene salvato sui server
- Comunicazione diretta peer-to-peer quando possibile

## 📊 Monitoraggio

Il server fornisce statistiche in tempo reale:

- Numero di stanze attive
- Connessioni totali
- Stato del server

Endpoint di health check: `http://localhost:3000/health`

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/nuova-funzione`)
3. Commit delle modifiche (`git commit -am 'Aggiunge nuova funzione'`)
4. Push del branch (`git push origin feature/nuova-funzione`)
5. Crea una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 🆘 Supporto

Per problemi o domande:

- Apri un issue su GitHub
- Controlla la documentazione
- Verifica i log del server e del browser

---

**Nota:** Questo sistema è progettato per uso domestico. Per utilizzi commerciali, considera l'implementazione di funzionalità di sicurezza aggiuntive.

````

Infine, creiamo uno script di avvio per sistemi Unix:

```bash:webapp-pepe/start.sh
#!/bin/bash

# Script di avvio Pet Monitor
echo "🐾 Avvio Pet Monitor..."

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Installa Node.js 16+ prima di continuare."
    exit 1
fi

# Verifica dipendenze
if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install
fi

# Trova IP locale
if command -v ip &> /dev/null; then
    LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}')
elif command -v ifconfig &> /dev/null; then
    LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
else
    LOCAL_IP="localhost"
fi

echo "🚀 Avvio server..."
echo "📱 Accesso locale: http://localhost:3000"
echo "🌐 Accesso rete: http://$LOCAL_IP:3000"
echo "⏹️  Premi Ctrl+C per fermare il server"
echo ""

# Avvia il server
npm start
````

Per rendere eseguibile lo script:

```bash
chmod +x start.sh
```

L'applicazione è ora completa! Ecco cosa abbiamo creato:

## 🎯 Funzionalità Principali

1. **Streaming Video Bidirezionale** - WebRTC per connessioni dirette
2. **Audio Comunicazione** - Parla con i tuoi animali
3. **Cambio Camera** - Passa tra camera frontale e posteriore
4. **Screenshot** - Cattura momenti dei tuoi pet
5. **Interfaccia Responsive** - Funziona su tutti i dispositivi
6. **Gestione Stanze** - Codici per connessioni private
7. **Riconnessione Automatica** - Gestione robusta degli errori

## 🚀 Per Avviare

```bash
cd webapp-pepe
npm install
npm start
```
