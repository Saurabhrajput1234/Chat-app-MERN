import { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  const wsUrl = import.meta.env.VITE_WS_URL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    return () => {
      ws.current?.close();
      clearTimeout(reconnectTimeout.current);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/messages`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data);
    } catch {
      setError('Failed to load messages');
    }
  };

  const connectWebSocket = () => {
    if (!username.trim()) {
      setError('Enter a username');
      return;
    }

    ws.current?.close(); // Close existing connection

    if (!wsUrl) {
      setError('WebSocket URL missing');
      return;
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      setError('');
      ws.current.send(JSON.stringify({ type: 'username', username }));
      fetchMessages();
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch {
        setError('Invalid message received');
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setError('Disconnected. Reconnecting...');
      reconnectTimeout.current = setTimeout(() => {
        if (username) connectWebSocket();
      }, 3000);
    };

    ws.current.onerror = () => {
      setError('WebSocket error');
      setIsConnected(false);
    };
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Cannot send message');
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'message',
      username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    }));

    setMessage('');
    setError('');
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
            onKeyDown={(e) => e.key === 'Enter' && connectWebSocket()}
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
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.username === username ? 'own-message' : ''}`}>
            <span className="username">{msg.username}</span>
            <p className="message-text">{msg.message}</p>
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
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
