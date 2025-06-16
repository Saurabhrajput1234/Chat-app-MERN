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


const allowedOrigins = [
  'https://chat-app-mern-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy error'), false);
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());


let MONGODB_URI = process.env.MONGODB_URI?.trim();
if (MONGODB_URI) {
  if (!MONGODB_URI.includes('w=majority')) {
    MONGODB_URI += (MONGODB_URI.includes('?') ? '&' : '?') + 'w=majority';
  }
  if (!MONGODB_URI.includes('retryWrites=true')) {
    MONGODB_URI += '&retryWrites=true';
  }
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// WebSocket
const wss = new WebSocket.Server({ server });
new WebSocketController(wss);


app.get('/messages', messageController.getMessages);
app.post('/messages', messageController.createMessage);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Shutting down due to ${signal}`);
    server.close(() => {
      mongoose.connection.close(false, () => {
        process.exit(0);
      });
    });
  });
});
