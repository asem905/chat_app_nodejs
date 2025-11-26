const http = require('http');
const { Server } = require('socket.io');
const app = require('../app'); // Path to your Express application instance

// CRITICAL: We DO NOT require the controller here to avoid the circle.
// The handler function (persistAndBroadcastMessage) will be set/applied in index.js.

// 1. Create the HTTP server using your Express app
const server = http.createServer(app);

// 2. Initialize Socket.IO Server
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- Socket.IO Event Handling placeholder ---
// We will assign the actual handler function here in index.js
let sendMessageHandler = (data) => {
    console.log('[Socket] Message received, handler not yet assigned.');
};

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // 1. JOIN A ROOM
    socket.on('joinRoom', (roomId, callback) => {
        socket.join(roomId);
        console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
        
        if (callback) {
            callback({ status: 'ok', message: `Joined room ${roomId}` });
        }
    });

    // 2. LISTEN FOR NEW MESSAGES (Calls the dynamically assigned handler)
    socket.on('sendMessage', (data) => {
        // Delegate handling to the function assigned in index.js
        sendMessageHandler(socket, data);
    });

    // 3. DISCONNECT
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Export the HTTP server, the IO instance, and the function to set the handler
module.exports = { 
    server, 
    io,
    setSendMessageHandler: (handler) => { sendMessageHandler = handler; }
};