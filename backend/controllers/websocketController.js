const WebSocket = require('ws');
const Message = require('../models/Message');

const allowedOrigins = [
  'https://chat-app-mern-eosin.vercel.app',
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
      // Check origin
      const origin = req.headers.origin;
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('New client connected from:', origin);
        this.handleConnection(ws);
      } else {
        console.log('Connection rejected from:', origin);
        ws.close();
      }
    });
  }

  setupKeepAlive() {
    // Send ping every 30 seconds to keep connection alive
    setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      });
    }, 30000);
  }

  handleConnection(ws) {
    // Set a timeout for the connection
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }, 60000); // 1 minute timeout

    ws.on('pong', () => {
      // Reset timeout on pong
      clearTimeout(timeout);
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received:', data);

        if (data.type === 'username') {
          ws.username = data.username;
          console.log(`User registered: ${data.username}`);
        } else if (data.type === 'message') {
          const newMessage = new Message({
            username: data.username,
            message: data.message,
            timestamp: new Date(data.timestamp)
          });
          await newMessage.save();
          this.broadcastMessage(newMessage);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(timeout);
    });
  }

  broadcastMessage(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            type: 'message',
            message: message
          }));
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    });
  }
}

module.exports = WebSocketController; 