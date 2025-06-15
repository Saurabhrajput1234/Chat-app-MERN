const WebSocket = require('ws');
const Message = require('../models/Message');

class WebSocketController {
  constructor(wss) {
    this.wss = wss;
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.handleConnection(ws);
    });
  }

  handleConnection(ws) {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received:', data);

        if (data.type === 'username') {
          // Handle username registration
          ws.username = data.username;
          console.log(`User registered: ${data.username}`);
        } else if (data.type === 'message') {
          // Save message to database
          const newMessage = new Message({
            username: data.username,
            message: data.message,
            timestamp: new Date(data.timestamp)
          });
          await newMessage.save();

          // Broadcast message to all clients
          this.broadcastMessage(newMessage);
        }
      } catch (error) {
        console.error('Error handling message:', error);
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
          message: message
        }));
      }
    });
  }
}

module.exports = WebSocketController; 