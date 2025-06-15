const Message = require('../models/Message');

class WebSocketController {
  constructor(wss) {
    this.wss = wss;
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  async handleConnection(ws) {
    try {
      const messages = await this.getLastMessages();
      ws.send(JSON.stringify({
        type: 'history',
        messages: messages
      }));

      ws.on('message', async (data) => {
        try {
          const messageData = JSON.parse(data);
          const savedMessage = await this.saveMessage(messageData);
          this.broadcastMessage(savedMessage);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });
    } catch (error) {
      console.error('Error in connection handler:', error);
    }
  }

  async getLastMessages() {
    try {
      const messages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      return messages.reverse();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async saveMessage(messageData) {
    try {
      const message = new Message({
        username: messageData.username,
        message: messageData.message,
        timestamp: new Date()
      });
      return await message.save();
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  broadcastMessage(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'message',
          message: message
        }));
      }
    });
  }
}

module.exports = WebSocketController; 