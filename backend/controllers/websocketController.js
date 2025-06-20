const WebSocket = require('ws');
const Message = require('../models/Message');

const allowedOrigins = [
  'https://chat-app-mern-web.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174'
];

function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    if (!origin || !allowedOrigins.includes(origin)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }

    handleConnection(ws, wss);
  });

  // Keep-alive ping every 30 seconds
  setInterval(() => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
}

function handleConnection(ws, wss) {
  let messageQueue = [];
  let isProcessing = false;
  let isAlive = true;

  ws.on('pong', () => { isAlive = true; });

  const pingInterval = setInterval(() => {
    if (!isAlive) {
      ws.terminate();
      clearInterval(pingInterval);
      return;
    }
    isAlive = false;
    ws.ping();
  }, 60000);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (typeof data === 'object') {
        messageQueue.push(data);
        processQueue();
      } else {
        throw new Error();
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => clearInterval(pingInterval));
  ws.on('error', () => clearInterval(pingInterval));

  async function processQueue() {
    if (isProcessing || !messageQueue.length) return;

    isProcessing = true;
    const data = messageQueue.shift();

    try {
      if (data.type === 'username') {
        ws.username = data.username;
        ws.send(JSON.stringify({ type: 'ack', status: 'username_set' }));
      } else if (data.type === 'message') {
        const { username, message, timestamp } = data;
        const newMessage = new Message({ username, message, timestamp: new Date(timestamp) });

        await newMessage.save({ writeConcern: { w: 'majority', wtimeout: 2500 } });

        broadcastMessage(newMessage, wss);
        ws.send(JSON.stringify({ type: 'ack', status: 'message_sent', messageId: newMessage._id }));
      } else {
        throw new Error('Unknown message type');
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    } finally {
      isProcessing = false;
      if (messageQueue.length) setTimeout(processQueue, 0);
    }
  }
}

function broadcastMessage(message, wss) {
  const payload = JSON.stringify({
    type: 'message',
    message: {
      _id: message._id,
      username: message.username,
      message: message.message,
      timestamp: message.timestamp
    }
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = setupWebSocket;
