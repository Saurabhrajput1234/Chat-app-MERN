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
      res.status(500).json({ error: 'Error fetching messages' });
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

      const savedMessage = await newMessage.save();
      res.status(201).json(savedMessage);
    } catch (error) {
      res.status(500).json({ error: 'Error creating message' });
    }
  }
}

module.exports = new MessageController(); 