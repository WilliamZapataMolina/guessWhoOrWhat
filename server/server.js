const express = require('express');//Importar el framework Express
const http = require('node:http');// Módulo HTTP de Node.js para crear el servidor
const { Server } = require('socket.io');// Importa Server de Socket.IO
const path = require('node:path');// Módulo Path de Node.js para manejar rutas de archivos
const os = require('node:os');// Módulo OS de Node.js para obtener información del sistema
const mongoose = require('mongoose');// Importa Mongoose para manejar la base de datos MongoDB
const dotenv = require('dotenv'); //Para cargar variables de entorno desde .env
const cloudinary = require('cloudinary').v2; // Importa Cloudinary para manejar imágenes
const cookieParser = require('cookie-parser');
const authController = require('./controllers/authController');


dotenv.config();// Carga las variables de entorno desde el archivo .env
//Importar las rutas modularizadas
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const characterRoutes = require('./routes/characterRoutes');

// Importa los middlewares de autenticación
const { requireAuth, checkUser } = require('./middleware/authMiddleware');

// Importa los modelos que necesitarás para la lógica del juego
const Character = require('./models/Character');
const Category = require('./models/Category');
const app = express();// Crea una instancia de la aplicación Express

//Configuración EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const server = http.createServer(app);// Crea un servidor HTTP usando la aplicación Express
const io = new Server(server, {
    cors: {
        origin: ["http://WilliamZapata:3000", "http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});// Conecta Socket.IO al servidor HTTP

const PORT = process.env.PORT || 3000;// Define el puerto del servidor, usa 3000 por defecto
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guessWhoOrWhat';//URI de conexión a MongoDB


//Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));


// Middleware para parsear datos de formularios HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

//Middleware para parsear JSON en las solicitudes (necesario para registro/login)
app.use(express.json());


app.use(cookieParser());

// Aplicar checkUser en TODAS las rutas
app.use(checkUser);


// --- Conexión a MongoDB ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('¡Conectado a MongoDB de forma satisfactoria!'); // Mensaje actualizado
    })
    .catch(error => {
        console.error('Error al conectar a MongoDB:', error);
    });

//Usar rutas modularizadas
// Estas rutas manejan las solicitudes a la API
app.use(authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/characters', characterRoutes);


// Ruta principal para servir el archivo HTML
app.get('/', checkUser, (req, res) => {
    if (res.locals.user) {
        return res.redirect('/profile'); // o '/game' u otra ruta
    }
    res.render('index', { user: res.locals.user });
});


// Ruta para el juego(ruta protegida)
app.get('/game', (req, res) => {
    if (!res.locals.user) return res.redirect('/');
    res.render('game', { user: res.locals.user });
});
//Ruta para el perfil de usuario
app.get('/profile', requireAuth, checkUser, (req, res) => { // Asegúrate de que checkUser esté aquí
    res.render('profile', { user: res.locals.user, footer: true }); // Pasa res.locals.user
});

app.get('/logout', authController.logout_get);
//--- Lógica de Socket.IO (comunicación en tiempo real y lógica de juego)---

// Objeto para mantener el estado de las salas activas
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`Un usuario se ha conectado: ${socket.id}`);

    // Manejar el evento 'joinRoom' para que los jugadores se unan a una sala
    socket.on('joinRoom', (roomId, userEmail) => {
        let room = rooms.get(roomId);
        if (!room) {
            // Si la sala no existe, créala y haz a este jugador el host
            room = {
                id: roomId,
                players: [], // Almacenar objetos { id: socket.id, email: userEmail }
                player1Id: socket.id, // El primer jugador en unirse es el host/player1
                player2Id: null,
                hostId: socket.id, // <-- Almacenar el ID del host
                gameStarted: false,
                boardCharacters: [],
                selectedSecretCharacters: new Map(),
                secretCharacters: {},
                readyForGame: new Set(),
                currentPlayerTurn: null,
                playerEmails: new Map() // Para mapear socket.id a email
            };
            rooms.set(roomId, room);
            socket.join(roomId);
            room.players.push({ id: socket.id, email: userEmail });
            room.playerEmails.set(socket.id, userEmail); // Guardar email
            console.log(`Sala ${roomId} creada por ${userEmail} (${socket.id}).`);

        } else {
            // Lógica para unirse a una sala existente (player2)
            if (room.players.length === 1 && room.players[0].id !== socket.id) {
                room.player2Id = socket.id;
                room.players.push({ id: socket.id, email: userEmail });
                room.playerEmails.set(socket.id, userEmail); // Guardar email
                socket.join(roomId);
                console.log(`${userEmail} (${socket.id}) se unió a la sala ${roomId}.`);

            } else if (room.players.length === 2) {
                socket.emit('roomFull', roomId);
                console.log(`Intento de unirse a sala ${roomId} llena o ya dentro.`);
                return;
            } else if (room.players.length === 1 && room.players[0].id === socket.id) {
                console.log(`Usuario ${userEmail} (${socket.id}) ya está en la sala ${roomId}.`);
                io.to(roomId).emit('roomReady', roomId, room.player1Id, room.player2Id, room.players); // <<-- Emitir para el jugador que se reconecta
                return;
            }
        }
        io.to(roomId).emit('playerJoined', userEmail, room.players.length, room.players); // Siempre emitir esto

        if (room.players.length === 2) {
            console.log(`Sala ${roomId} está lista para jugar. Jugadores: ${room.players.map(p => p.email).join(', ')}`);
            // ¡AHORA SÍ, EMITIMOS room.players PARA QUE EL FRONTEND PUEDA ACTUALIZAR LA LISTA!
            io.to(roomId).emit('roomReady', roomId, room.player1Id, room.player2Id, room.players);
        }
    });
    // Manejar el evento 'startGame' (solo el host puede enviar esto)
    socket.on('startGame', async (roomId, selectedCategoryIds, totalCharacters) => {
        const room = rooms.get(roomId);
        // Validaciones clave:
        if (!room) {
            socket.emit('gameError', 'La sala no existe.');
            return;
        }
        if (room.players.length < 2) {
            socket.emit('gameError', 'Se necesitan 2 jugadores para iniciar el juego.');
            return;
        }
        // VALIDACIÓN DEL HOST: Solo el host puede iniciar
        if (room.hostId !== socket.id) { // <-- ¡Esta es la validación importante!
            socket.emit('gameError', 'No tienes permiso para iniciar el juego. Solo el anfitrión puede.');
            return;
        }
        // Validar si el juego ya está en proceso de inicio o ya iniciado
        if (room.gameStarted || room.readyForGame.size > 0) { // Si ya están seleccionando o ya inició
            socket.emit('gameError', 'El juego ya ha iniciado o está en fase de selección de personaje.');
            return;
        }

        try {

            if (!Array.isArray(selectedCategoryIds) || selectedCategoryIds.length === 0) {
                socket.emit('gameError', 'Se deben seleccionar categorías para iniciar el juego.');
                return;
            }
            //Obtener categorías seleccionadas de la DB
            const selectedCategories = await Category.find({
                _id: { $in: selectedCategoryIds }
            });

            if (selectedCategories.length !== selectedCategoryIds.length) {
                socket.emit('gameError', 'Una o más categorías seleccionadas no son válidas.');
                return;
            }

            const allPossibleCharacters = await Character.find({
                categoryId: { $in: selectedCategoryIds }
            });

            if (allPossibleCharacters.length < totalCharacters) {
                socket.emit('gameError', `No hay suficientes personajes (${allPossibleCharacters.length}) para las categorías seleccionadas. Se necesitan ${totalCharacters}.`);
                return;
            }
            //Barajar los personajes y seleccionar el número requerido para el tablero
            const shuffledCharacters = allPossibleCharacters.sort(() => 0.5 - Math.random());
            const gameBoardCharacters = shuffledCharacters.slice(0, totalCharacters);

            // Asignar los personajes al tablero de la sala
            room.boardCharacters = gameBoardCharacters;
            room.gameStarted = false; // El juego aún no ha comenzado del todo, solo la fase de selección

            // Notificar a ambos jugadores que las categorías han sido seleccionadas
            io.to(roomId).emit('categoriesSelected', {
                characters: room.boardCharacters,
            });


            // Restablecer estados de selección de personajes para la nueva partida
            room.selectedSecretCharacters = new Map();
            room.readyForGame = new Set();
            room.currentPlayerTurn = null; // Reiniciar el turno

            console.log(`Host ${socket.id} inició la fase de selección de categorías en sala ${roomId}.`);

        } catch (error) {
            console.error(`Error al iniciar juego en sala ${roomId}:`, error);
            io.to(roomId).emit('gameError', 'Error al preparar personajes para el juego.');
        }
    });

    // Manejar la selección de personaje secreto por cada jugador
    socket.on('secretCharacterChosen', (roomId, characterId) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('gameError', 'La sala no existe para seleccionar el personaje secreto.');
            return;
        }

        if (!room.boardCharacters || room.boardCharacters.length === 0) {
            socket.emit('gameError', 'Los personajes del tablero no están cargados. Contacta al host.');
            return;
        }

        const chosenChar = room.boardCharacters.find(char => char._id.toString() === characterId);
        if (!chosenChar) {
            socket.emit('gameError', 'El personaje secreto seleccionado no es válido.');
            return;
        }

        // Almacena el personaje secreto elegido por este jugador
        room.selectedSecretCharacters.set(socket.id, chosenChar);
        room.readyForGame.add(socket.id); // Marca a este jugador como "listo"

        console.log(`${room.playerEmails.get(socket.id)} (${socket.id}) ha elegido su personaje secreto: ${chosenChar.name}`);

        // Si ambos jugadores han elegido su personaje secreto, el juego puede comenzar
        if (room.readyForGame.size === 2) {
            room.gameStarted = true; // El juego realmente comienza aquí
            room.currentPlayerTurn = room.player1Id; // El host (player1) siempre comienza

            // Asignar los personajes secretos del oponente a cada jugador
            // El secreto de A es el que eligió B
            // El secreto de B es el que eligió A
            const player1Secret = room.selectedSecretCharacters.get(room.player2Id);
            const player2Secret = room.selectedSecretCharacters.get(room.player1Id);

            // Emitir a cada jugador su personaje secreto (el del oponente)
            io.to(room.player1Id).emit('allSecretsChosen', {
                boardCharacters: room.boardCharacters,
                secretCharacter: player1Secret, // Secreto del oponente para player1
                mySecretCharacter: room.selectedSecretCharacters.get(room.player1Id), // Su propio secreto
                currentPlayerTurn: room.currentPlayerTurn
            });
            io.to(room.player2Id).emit('allSecretsChosen', {
                boardCharacters: room.boardCharacters,
                secretCharacter: player2Secret, // Secreto del oponente para player2
                mySecretCharacter: room.selectedSecretCharacters.get(room.player2Id), // Su propio secreto
                currentPlayerTurn: room.currentPlayerTurn
            });

            console.log(`Juego en sala ${roomId} iniciado con personajes secretos elegidos. Turno inicial: ${room.currentPlayerTurn}`);
        } else {
            // Notificar que se está esperando al otro jugador
            io.to(roomId).emit('gameStatusUpdate', `Esperando que el otro jugador elija su personaje secreto.`);
        }
    });

    // Manejar las preguntas de los jugadores
    // La función 'formatAttributeKey' no está definida aquí, es del frontend.
    // Solo la usamos para los console.log o si el servidor necesitara el texto formateado.
    socket.on('askQuestion', (roomId, questionDetails) => {
        const room = rooms.get(roomId);
        if (room && room.gameStarted && socket.id === room.currentPlayerTurn) {
            const { attrKey, attrValue } = questionDetails;

            const opponentId = room.players.find(p => p.id !== socket.id)?.id;
            if (!opponentId) {
                socket.emit('gameError', 'No se pudo encontrar al oponente en la sala.');
                return;
            }

            const opponentSecretChar = room.selectedSecretCharacters.get(opponentId);

            if (!opponentSecretChar) {
                socket.emit('gameError', 'No se pudo determinar el personaje secreto del oponente.');
                return;
            }

            // Determinar la respuesta a la pregunta basándose en el personaje secreto del oponente
            const secretAttributeValue = opponentSecretChar.attributes ? opponentSecretChar.attributes[attrKey] : undefined;
            const answer = secretAttributeValue === attrValue;

            // Emitir la respuesta y los detalles de la pregunta a todos en la sala
            io.to(roomId).emit('questionAnswered', {
                playerId: socket.id, // Quién hizo la pregunta
                question: questionDetails.question, // El texto de la pregunta (opcional, el frontend puede generarlo)
                answer: answer,
                attrKey: attrKey, // Clave del atributo
                attrValue: attrValue // Valor del atributo
            });

            // Cambiar el turno al otro jugador
            const nextPlayer = room.players.find(p => p.id !== socket.id);
            room.currentPlayerTurn = nextPlayer.id;
            io.to(roomId).emit('turnChanged', room.currentPlayerTurn); // Notificar el cambio de turno
            console.log(`Pregunta en sala ${roomId}: ${questionDetails.question}. Respuesta: ${answer}. Nuevo turno: ${room.currentPlayerTurn}`);

        } else {
            // Si no es el turno del jugador o el juego no ha iniciado
            socket.emit('gameError', 'No es tu turno para preguntar o el juego no ha iniciado.');
        }
    });

    // Manejar adivinanzas de los jugadores
    socket.on('makeGuess', (roomId, guessedCharacterId) => {
        const room = rooms.get(roomId);
        if (room && room.gameStarted && socket.id === room.currentPlayerTurn) {
            const opponentId = room.players.find(p => p.id !== socket.id).id;
            const opponentSecretChar = room.selectedSecretCharacters.get(opponentId);

            if (!opponentSecretChar) {
                socket.emit('gameError', 'No se pudo determinar el personaje secreto del oponente para la adivinanza.');
                return;
            }
            const isCorrect = opponentSecretChar._id.toString() === guessedCharacterId;

            if (isCorrect) {
                // El jugador adivinó correctamente
                io.to(roomId).emit('gameOver', {
                    winnerId: socket.id,
                    message: `¡${room.playerEmails.get(socket.id)} ha adivinado correctamente! ¡Ganó el juego!`
                });
                console.log(`Juego terminado en sala ${roomId}. Ganador: ${socket.id}`);
                rooms.delete(roomId); // Eliminar la sala
            } else {
                // El jugador adivinó incorrectamente y pierde
                const loserId = socket.id;
                const winnerId = room.players.find(p => p.id !== loserId)?.id; // El otro jugador gana
                io.to(roomId).emit('gameOver', {
                    winnerId: winnerId,
                    message: `¡${room.playerEmails.get(loserId)} adivinó incorrectamente y perdió! ${room.playerEmails.get(winnerId)} gana la partida.`
                });
                console.log(`Juego terminado en sala ${roomId}. ${loserId} perdió.`);
                rooms.delete(roomId); // Eliminar la sala
            }
        } else {
            socket.emit('gameError', 'No es tu turno o el juego no ha iniciado para adivinar.');
        }
    });
    // Añade esto en tu server.js
    socket.on('resetGame', (roomId) => {
        const room = rooms.get(roomId);
        if (room) {
            // Limpiar completamente el estado de la sala para permitir un nuevo juego
            room.players = [];
            room.player1Id = null;
            room.player2Id = null;
            room.hostId = null;
            room.gameStarted = false;
            room.boardCharacters = [];
            room.selectedSecretCharacters = new Map();
            room.readyForGame = new Set();
            room.currentPlayerTurn = null;
            room.playerEmails = new Map();

            // Notificar a todos en la sala (incluido el que lo inició)
            io.to(roomId).emit('gameReset');
            console.log(`Juego en sala ${roomId} ha sido reiniciado por el usuario ${socket.id}.`);
            rooms.delete(roomId); // Elimina la sala, se recreará al unirse
        } else {
            socket.emit('gameError', 'No se encontró la sala para reiniciar.');
        }
    });
    // Manejar desconexiones de usuarios
    socket.on('disconnect', () => {
        console.log(`Un usuario se ha desconectado: ${socket.id}`);
        // Recorrer las salas para ver si el usuario estaba en alguna
        for (const [roomId, room] of rooms.entries()) { // Iteración correcta sobre Map
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                // Eliminar al jugador de la sala
                room.players.splice(playerIndex, 1);
                console.log(`Usuario ${socket.id} salió de la sala ${roomId}. Jugadores restantes: ${room.players.length}`);

                // Notificar a los demás jugadores en la sala
                io.to(roomId).emit('playerLeft', socket.id, room.players.length);

                if (room.players.length === 0) {
                    // Si no quedan jugadores, eliminar la sala
                    rooms.delete(roomId);
                    console.log(`Sala ${roomId} eliminada por falta de jugadores.`);
                } else if (room.gameStarted) {
                    // Si el juego estaba en curso y un jugador se desconecta, el otro gana
                    io.to(roomId).emit('gameOver', {
                        winnerId: room.players[0].id,
                        message: `El otro jugador se desconectó. ¡${room.playerEmails.get(room.players[0].id)} ganaste!`
                    });
                    rooms.delete(roomId); // Limpiar la sala
                    console.log(`Juego en sala ${roomId} terminado por desconexión.`);
                }
                break; // El jugador solo puede estar en una sala a la vez
            }
        }
    });
});


//Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto${PORT}`);

    //Obtener y mostrar la IP local o nombre de host
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            //Saltar direcciones internas y aquellas que no sean IPv4
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
            }
        }
        if (localIp !== 'localhost') break;
    }
    console.log(`Para jugar con otros, pídeles que se conecten a: http://${localIp}:${PORT}`);
    console.log(`O usa el nombre de tu PC (si la resolución de nombres funciona): http://${os.hostname()}:${PORT}`);
});