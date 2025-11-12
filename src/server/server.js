const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  methods: ["GET", "POST"]
}));

app.get('/', (req, res) => {
  res.send('Server is running');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  try {
    console.log('User Connected:', socket.id);
    socket.emit('me', socket.id);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('callEnded');
    });

    socket.on('callUser', ({ userToCall, signalData, from, name }) => {
      io.to(userToCall).emit('callUser', { signal: signalData, from, name });
    });

    socket.on('answerCall', (data) => {
      io.to(data.to).emit('callAccepted', data.signal);
    });
  } catch (error) {
    console.error('Socket connection error:', error);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Server startup error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});