const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // Pour générer des codes uniques pour les salons

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Stockage des utilisateurs et des salons
let users = {}; // Utilisateurs avec leurs pseudos
let rooms = {}; // Salon avec codes

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');
    
    // Gérer la demande de pseudo
    socket.on('set-nickname', (nickname) => {
        if (Object.values(users).includes(nickname)) {
            socket.emit('nickname-taken');
        } else {
            users[socket.id] = nickname;
            socket.emit('nickname-set', nickname);
            console.log(`L'utilisateur ${nickname} est connecté`);
        }
    });

    // Créer un salon
    socket.on('create-room', (nickname) => {
        const roomCode = uuidv4(); // Générer un code unique pour le salon
        rooms[roomCode] = { users: [socket.id] }; // Ajouter l'utilisateur au salon
        socket.join(roomCode);
        socket.emit('room-created', roomCode);
    });

    // Rejoindre un salon
    socket.on('join-room', ({ nickname, roomCode }) => {
        if (rooms[roomCode]) {
            rooms[roomCode].users.push(socket.id);
            socket.join(roomCode);
            socket.emit('room-joined', roomCode);
        } else {
            socket.emit('error', 'Salon introuvable');
        }
    });

    // Gérer l'envoi des messages
    socket.on('message', (data) => {
        io.to(data.roomCode).emit('message', data); // Diffuser le message à tous les utilisateurs du salon
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        const nickname = users[socket.id];
        if (nickname) {
            delete users[socket.id];
        }
        for (let roomCode in rooms) {
            rooms[roomCode].users = rooms[roomCode].users.filter(id => id !== socket.id);
            if (rooms[roomCode].users.length === 0) {
                delete rooms[roomCode]; // Supprimer le salon vide
            }
        }
        console.log('Un utilisateur s\'est déconnecté');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur http://localhost:${PORT}`);
});
