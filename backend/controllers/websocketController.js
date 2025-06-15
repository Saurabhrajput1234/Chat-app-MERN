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
        ws.close(1008, 'Origin not allowed');
      }
    });
  }

  setupKeepAlive() {
    const interval = setInterval(() => {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  handleConnection(ws) {
    let isAlive = true;
    let messageQueue = [];
    let isProcessing = false;

    ws.on('pong', () => {
      isAlive = true;
    });

    const interval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        clearInterval(interval);
        return;
      }
      isAlive = false;
      ws.ping();
    }, 60000);

    const processQueue = async () => {
      if (isProcessing || messageQueue.length === 0) return;
      
      isProcessing = true;
      try {
        const data = messageQueue.shift();
        if (data.type === 'username') {
          ws.username = data.username;
          ws.send(JSON.stringify({ type: 'ack', status: 'username_set' }));
        } else if (data.type === 'message') {
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
      } finally {
        isProcessing = false;
        if (messageQueue.length > 0) {
          processQueue();
        }
      }
    };

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        messageQueue.push(data);
        processQueue();
      } catch (err) {
        console.error('Error parsing message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
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
        try {
          client.send(JSON.stringify({
            type: 'message',
            message
          }));
        } catch (err) {
          console.error('Error broadcasting message:', err);
        }
      }
    });
  }
}

module.exports = WebSocketController;
