# Real-Time Chat Application

A modern real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring WebSocket communication for instant messaging.

## Features

- Real-time messaging using WebSocket
- User authentication with username
- Message persistence in MongoDB
- Responsive design for all devices
- Auto-reconnection on connection loss
- Message history
- Modern UI with smooth animations

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time Communication**: WebSocket
- **Styling**: CSS3

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat-app
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Configuration

1. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

2. Create a `.env` file in the frontend directory:
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Enter your username to join the chat
2. Start sending messages
3. Messages are delivered in real-time
4. Chat history is preserved between sessions

## Development

- Backend runs on port 5000
- Frontend runs on port 5173
- WebSocket server runs on the same port as the backend

## License

MIT

## Author

[Your Name]
