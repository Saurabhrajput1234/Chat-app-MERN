import { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const messageQueue = useRef([]);

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
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    }
  };

  const processMessageQueue = () => {
    if (messageQueue.current.length > 0 && !isSending) {
      const nextMessage = messageQueue.current[0];
      try {
        ws.current.send(JSON.stringify(nextMessage));
        setIsSending(true);
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message. Please try again.');
        messageQueue.current.shift();
        setIsSending(false);
      }
    }
  };

  const connectWebSocket = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
    }

    try {
      const wsUrl = import.meta.env.VITE_WS_URL;
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
        messageQueue.current.push({
          type: 'username',
          username: username.trim()
        });
        processMessageQueue();

        // Fetch previous messages after connection
        fetchMessages();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          if (data.type === 'message') {
            setMessages(prev => [...prev, data.message]);
          } else if (data.type === 'ack') {
            console.log('Received acknowledgment:', data.status);
            if (data.status === 'message_sent') {
              messageQueue.current.shift();
              setIsSending(false);
              processMessageQueue();
            }
          } else if (data.type === 'error') {
            setError(data.message);
            if (isSending) {
              messageQueue.current.shift();
              setIsSending(false);
              processMessageQueue();
            }
          }
        } catch (err) {
          console.error('Error parsing message:', err);
          setError('Invalid message received');
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setError('Connection lost. Reconnecting...');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          if (username) {
            connectWebSocket();
          }
        }, 3000);
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
      setError('Cannot send message: Connection not available');
      return;
    }

    const messageData = {
      type: 'message',
      username: username.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    messageQueue.current.push(messageData);
    setMessage('');
    setError('');
    processMessageQueue();
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
          disabled={isSending}
        />
        <button type="submit" disabled={isSending}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Chat; 