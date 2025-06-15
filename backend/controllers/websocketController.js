const WebSocket = require('ws');
const Message = require('../models/Message');

const allowedOrigins = [
  'https://chat-app-mern-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174'
];

class WebSocketController {
  constructor(wss) {
    this.wss = wss;
    this.setupWebSocket();
    this.setupKeepAlive();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const origin = req.headers.origin;
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('Client connected from:', origin || 'unknown');
        this.handleConnection(ws);
      } else {
        console.warn('Connection rejected from:', origin);
        ws.close();
      }
    });
  }

  setupKeepAlive() {
    setInterval(() => {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      });
    }, 30000); // 30 sec ping
  }

  handleConnection(ws) {
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    const interval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        clearInterval(interval);
      }
      isAlive = false;
      ws.ping();
    }, 60000);

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'username') {
          ws.username = data.username;
        } else if (data.type === 'message') {
          const newMessage = new Message({
            username: data.username,
            message: data.message,
            timestamp: new Date(data.timestamp)
          });
          await newMessage.save();
          this.broadcastMessage(newMessage);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      clearInterval(interval);
      console.log('Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clearInterval(interval);
    });
  }

  broadcastMessage(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          message
        }));
      }
    });
  }
}

module.exports = WebSocketController;
