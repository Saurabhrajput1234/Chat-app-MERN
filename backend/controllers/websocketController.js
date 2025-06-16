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
      const data = messageQueue.shift();

      try {
        if (!data || !data.type) {
          throw new Error('Invalid message format');
        }

        if (data.type === 'username') {
          if (!data.username || typeof data.username !== 'string') {
            throw new Error('Invalid username format');
          }
          ws.username = data.username;
          ws.send(JSON.stringify({ type: 'ack', status: 'username_set' }));
        } else if (data.type === 'message') {
          if (!data.username || !data.message || !data.timestamp) {
            throw new Error('Invalid message format');
          }

          try {
            const newMessage = new Message({
              username: data.username,
              message: data.message,
              timestamp: new Date(data.timestamp)
            });

            // Save message with explicit write concern
            await newMessage.save({ 
              writeConcern: { 
                w: 'majority',
                wtimeout: 2500
              }
            });

            // Broadcast the message
            this.broadcastMessage(newMessage);
            
            // Send acknowledgment
            ws.send(JSON.stringify({ 
              type: 'ack', 
              status: 'message_sent',
              messageId: newMessage._id
            }));
          } catch (dbError) {
            console.error('Database error:', dbError);
            throw new Error('Failed to save message to database');
          }
        } else {
          throw new Error('Unknown message type');
        }
      } catch (err) {
        console.error('Error processing message:', err);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: err.message || 'Failed to process message'
        }));
      } finally {
        isProcessing = false;
        if (messageQueue.length > 0) {
          setTimeout(processQueue, 0);
        }
      }
    };

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid message format');
        }
        messageQueue.push(data);
        processQueue();
      } catch (err) {
        console.error('Error parsing message:', err);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format'
        }));
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
            message: {
              _id: message._id,
              username: message.username,
              message: message.message,
              timestamp: message.timestamp
            }
          }));
        } catch (err) {
          console.error('Error broadcasting message:', err);
        }
      }
    });
  }
}

module.exports = WebSocketController;
