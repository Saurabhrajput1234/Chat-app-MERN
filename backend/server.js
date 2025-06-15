const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to MongoDB:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize controllers
const messageController = require('./controllers/messageController');
const WebSocketController = require('./controllers/websocketController');

// WebSocket Server
wss.on('connection', (ws) => {
  console.log('New client connected');

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

        // Broadcast message to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'message',
              message: newMessage
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Initialize WebSocket controller
const wsController = new WebSocketController(wss);

// HTTP Routes
app.get('/messages', messageController.getMessages);
app.post('/messages', messageController.createMessage);

// Routes
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 