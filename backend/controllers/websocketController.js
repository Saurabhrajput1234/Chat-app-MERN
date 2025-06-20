const WebSocket = require('ws');
const Message = require('../models/Message');

// Allowed frontend origins
const allowedOrigins = [
  'https://chat-app-mern-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174'
];

function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;

    // CORS
    if (!origin || !allowedOrigins.includes(origin)) {
      console.log('Blocked connection from disallowed origin:', origin);
      ws.close(1008, 'Origin not allowed');
      return;
    }

    console.log('WebSocket connected from:', origin);

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);

        if (data.type === 'username') {
          ws.username = data.username;
          ws.send(JSON.stringify({ type: 'ack', status: 'username_set' }));
        } else if (data.type === 'message') {
          const { username, message, timestamp } = data;
          const newMessage = new Message({ username, message, timestamp: new Date(timestamp) });
          await newMessage.save({ writeConcern: { w: 'majority', wtimeout: 2500 } });
          broadcastMessage(newMessage, wss);
          ws.send(JSON.stringify({ type: 'ack', status: 'message_sent', messageId: newMessage._id }));
        } else {
          throw new Error('Unknown message type');
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket closed');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  // Ping clients every 30 seconds
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('Terminating unresponsive client');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

function broadcastMessage(message, wss) {
  const payload = JSON.stringify({
    type: 'message',
    message: {
      _id: message._id,
      username: message.username,
      message: message.message,
      timestamp: message.timestamp
    }
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = setupWebSocket;
