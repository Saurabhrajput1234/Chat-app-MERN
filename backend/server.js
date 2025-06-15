const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const messageRoutes = require('./routes/messageRoutes');
const WebSocketController = require('./controllers/websocketController');
const messageController = require('./controllers/messageController');

const app = express();
const server = http.createServer(app);

//CORS Configuration
const allowedOrigins = [
  'https://chat-app-mern-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS policy does not allow this origin'), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

//Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));


const wss = new WebSocket.Server({ server });

new WebSocketController(wss); 

// REST API Routes
app.get('/messages', messageController.getMessages);
app.post('/messages', messageController.createMessage);
app.use('/api/messages', messageRoutes);


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});


process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

function shutdown(signal) {
  console.log(`${signal} received: shutting down...`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB disconnected');
      process.exit(0);
    });
  });
}
