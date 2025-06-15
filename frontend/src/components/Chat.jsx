import { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const ws = useRef(null);

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

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError('');
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'history') {
          setMessages(data.messages);
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, data.message]);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setError('Connection lost. Please try again.');
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        setIsConnected(false);
      };
    } catch (error) {
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
      username,
      message: message.trim()
    };

    ws.current.send(JSON.stringify(messageData));
    setMessage('');
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