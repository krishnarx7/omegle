const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

let users = [];
let userPeers = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
    users = users.filter((user) => user !== socket.id);
    delete userPeers[socket.id];
  });

  // Signaling for WebRTC
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', { sender: socket.id, data: data.offer });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', { sender: socket.id, data: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', { sender: socket.id, data: data.candidate });
  });

  // Random video chat initiation
  socket.on('start-video-chat', () => {
    users.push(socket.id);
    userPeers[socket.id] = socket;

    if (users.length >= 2) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      // Notify both users to initiate video chat
      io.to(socket.id).to(randomUser).emit('finding-message', 'Finding...');
      io.to(socket.id).to(randomUser).emit('initiate-video-chat');
      io.to(socket.id).to(randomUser).emit('finding-message', '');

      // Notify the remaining users (excluding the matched pair) that they were not connected
      users.forEach((user) => {
        if (user !== socket.id && user !== randomUser) {
          io.to(user).emit('not-connect-message', 'Not able to connect');
        }
      });

      users = [];
    }
  });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});