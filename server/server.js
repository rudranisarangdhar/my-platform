const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    const clients = io.sockets.adapter.rooms.get(roomId);
    const numClients = clients ? clients.size : 0;

    if (numClients === 0) {
      socket.join(roomId);
      socket.emit("created");
      console.log(`Room ${roomId} created by ${socket.id}`);
    } else if (numClients === 1) {
      socket.join(roomId);
      socket.emit("joined");
      socket.to(roomId).emit("ready");
      console.log(`User ${socket.id} joined room ${roomId}`);
    } else {
      socket.emit("full");
    }
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data.sdp);
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", data.sdp);
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Signaling server running on port ${PORT}`));
