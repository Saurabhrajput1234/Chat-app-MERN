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
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const origin = req.headers.origin;
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('Client connected from:', origin || 'unknown');
        this.handleConnection(ws);
      } else {
        console.warn('Connection rejected from:', origin);
        ws.close(1008, 'Origin not allowed');
      }
    });
  }

  handleConnection(ws) {
    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        
        if (data.type === 'username') {
          ws.username = data.username;
          ws.send(JSON.stringify({ type: 'ack', status: 'username_set' }));
        } 
        else if (data.type === 'message') {
          const newMessage = new Message({
            username: data.username,
            message: data.message,
            timestamp: new Date(data.timestamp)
          });

          await newMessage.save();
          this.broadcastMessage(newMessage);
          ws.send(JSON.stringify({ type: 'ack', status: 'message_sent' }));
        }
      } catch (err) {
        console.error('Error processing message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
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
