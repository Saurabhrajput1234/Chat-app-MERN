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
let MONGODB_URI = process.env.MONGODB_URI;

// Validate and clean MongoDB URI
if (MONGODB_URI) {
  // Remove any accidental spaces or newlines
  MONGODB_URI = MONGODB_URI.trim();
  
  // Ensure proper write concern format
  if (!MONGODB_URI.includes('w=majority')) {
    MONGODB_URI = MONGODB_URI.includes('?') 
      ? `${MONGODB_URI}&w=majority` 
      : `${MONGODB_URI}?w=majority`;
  }
  
  // Ensure retryWrites is set
  if (!MONGODB_URI.includes('retryWrites=true')) {
    MONGODB_URI = MONGODB_URI.includes('?') 
      ? `${MONGODB_URI}&retryWrites=true` 
      : `${MONGODB_URI}?retryWrites=true`;
  }
}

const isProduction = process.env.NODE_ENV === 'production';

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 2500
};

// Add additional options for production
if (isProduction) {
  mongooseOptions.ssl = true;
  mongooseOptions.sslValidate = true;
  mongooseOptions.sslCA = undefined;
}

console.log('Environment:', isProduction ? 'production' : 'development');
console.log('Connecting to MongoDB...');

// Log the sanitized URI (without credentials)
const sanitizedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@');
console.log('MongoDB URI:', sanitizedUri);

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('Connection state:', mongoose.connection.readyState);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Connection URI:', sanitizedUri);
    process.exit(1);
  });

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

const wss = new WebSocket.Server({ server });

new WebSocketController(wss); 

// REST API Routes
app.get('/messages', messageController.getMessages);
app.post('/messages', messageController.createMessage);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(200).json({ 
    status: 'ok',
    database: dbState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
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
