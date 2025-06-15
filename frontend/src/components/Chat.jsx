import { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_WS_URL;
      const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
      
      if (!wsUrl) {
        setError('WebSocket URL not configured');
        return;
      }

      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError('');
        
        // Send username to server
        ws.current.send(JSON.stringify({
          type: 'username',
          username: username
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          if (data.type === 'history') {
            setMessages(data.messages || []);
          } else if (data.type === 'message') {
            setMessages(prev => [...prev, data.message]);
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setError('Connection lost. Please try again.');
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setError('Failed to connect. Please try again.');
      setIsConnected(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageData = {
      type: 'message',
      username: username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      ws.current.send(JSON.stringify(messageData));
      setMessage('');
      setError('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  if (!isConnected) {
    return (
      <div className="chat-container">
        <div className="login-container">
          <h2>Join Chat</h2>
          {error && <div className="error-message">{error}</div>}
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && connectWebSocket()}
          />
          <button onClick={connectWebSocket}>Join</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat Room</h2>
        <span className="status">Connected as: {username}</span>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.username === username ? 'own-message' : ''}`}>
            <span className="username">{msg.username}</span>
            <p className="message-text">{msg.message}</p>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat; 