const Message = require('../models/Message');

class MessageController {
  async getMessages(req, res) {
    try {
      const messages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      res.json(messages.reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  async createMessage(req, res) {
    try {
      const { username, message } = req.body;
      if (!username || !message) {
        return res.status(400).json({ error: 'Username and message are required' });
      }

      const newMessage = new Message({
        username,
        message,
        timestamp: new Date()
      });

      await newMessage.save();
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  }
}

module.exports = new MessageController();
