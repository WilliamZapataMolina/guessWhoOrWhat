const express = require('express'); // Importar el framework Express
const http = require('node:http'); // Módulo HTTP de Node.js para crear el servidor
const { Server } = require('socket.io'); // Importa Server de Socket.IO
const path = require('node:path'); // Módulo Path de Node.js para manejar rutas de archivos
const os = require('node:os'); // Módulo OS de Node.js para obtener información del sistema
const mongoose = require('mongoose'); // Importa Mongoose para manejar la base de datos MongoDB
const dotenv = require('dotenv'); // Para cargar variables de entorno desde .env
const cloudinary = require('cloudinary').v2; // Importa Cloudinary para manejar imágenes
const cookieParser = require('cookie-parser');
const authController = require('./controllers/authController');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
//const reconnectionTimers = new Map(); // Para manejar reconexiones de Socket.IO

// Importar las rutas modularizadas
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const characterRoutes = require('./routes/characterRoutes');
const profileRoutes = require('./routes/profileRoutes');

// Importa los middlewares de autenticación
const { requireAuth, checkUser } = require('./middleware/authMiddleware');

// Importa los modelos que necesitarás para la lógica del juego
const Character = require('./models/Character');
const Category = require('./models/Category');



dotenv.config(); // Carga las variables de entorno desde el archivo .env

const app = express(); // Crea una instancia de la aplicación Express

// Configuración EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const server = http.createServer(app); // Crea un servidor HTTP usando la aplicación Express
const PORT = process.env.PORT || 3000; // Define el puerto del servidor, usa 3000 por defecto
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guessWhoOrWhat'; // URI de conexión a MongoDB

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Middleware para parsear datos de formularios HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Middleware para parsear JSON en las solicitudes (necesario para registro/login)
app.use(express.json());

app.use(cookieParser());

// Aplicar checkUser en TODAS las rutas
app.use(checkUser);

// --- Conexión a MongoDB ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('¡Conectado a MongoDB de forma satisfactoria!');
    })
    .catch(error => {
        console.error('Error al conectar a MongoDB:', error);
    });

// Usar rutas modularizadas
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

// Ruta para el juego (ruta protegida)
app.get('/game', (req, res) => {
    if (!res.locals.user) return res.redirect('/');
    res.render('game', { user: res.locals.user });
});

// Ruta para el perfil de usuario
app.get('/profile', requireAuth, checkUser, (req, res) => {
    res.render('profile', { user: res.locals.user, footer: true });
});

app.use('/profile', profileRoutes);

app.get('/logout', authController.logout_get);

// --- Lógica de Socket.IO (comunicación en tiempo real y lógica de juego) ---

// Objeto para mantener el estado de las salas activas
const rooms = new Map(); // salas existentes

// Objeto para mantener un registro de usuarios activos por email y su socket.id
const activeUserSockets = new Map(); // { userId: socketId }

const io = new Server(server, {
    cors: {
        origin: ["http://WilliamZapata:3000", "http://localhost:3000"],
        methods: ["GET", "POST"]
    },
    allowRequest: (req, callback) => {
        cookieParser()(req, {}, () => {
            callback(null, true);
        });
    }
});

// Middleware de Socket.IO para autenticación
io.use(async (socket, next) => {
    // Obtener el token JWT de la cookie o de la autenticación del handshake
    const token = socket.handshake.auth.token || (socket.handshake.headers.cookie && socket.handshake.headers.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1]);

    if (token) {
        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decodedToken.id);
            if (user) {
                socket.userId = user._id.toString();
                socket.userEmail = user.email;

                // === CAMBIO CRUCIAL ===
                // Simplemente actualizamos el socket activo. La nueva conexión SIEMPRE gana.
                activeUserSockets.set(socket.userId, socket.id);
                console.log(`[Middleware] Usuario ${socket.userEmail} (ID: ${socket.userId}) autenticado. Socket activo: ${activeUserSockets.get(socket.userId)}`);

                next();
            } else {
                console.log('Usuario no encontrado en la base de datos.');
                next(new Error('Auth failed: User not found.'));
            }
        } catch (err) {
            console.log('Error de verificación de JWT:', err.message);
            next(new Error('Auth failed: Invalid token.'));
        }
    } else {
        console.log('No se encontró token JWT en el handshake.');
        next(new Error('Auth failed: No token.'));
    }
});

io.on('connection', (socket) => {
    const { userEmail, userId } = socket;

    // El middleware ya autenticó al usuario y gestionó la sesión.
    console.log(`Un usuario se ha conectado: ${socket.id} (Email: ${userEmail}, UserId: ${userId})`);

    // Al conectar, emitir el email del usuario de vuelta al cliente
    socket.emit('loggedInSuccessfully', userEmail);


    socket.on('joinRoom', (roomId) => {
        const userEmail = socket.userEmail;
        const userId = socket.userId;

        if (!userId) {
            socket.emit('gameError', 'Error: Tu usuario no pudo ser identificado para unirte a la sala.');
            return;
        }

        // --- NUEVA LÓGICA: Verificar si el usuario ya está en CUALQUIER sala y notificar ---
        let currentRoomIdForUser = null;
        for (const [rId, r] of rooms.entries()) {
            if (r.players.some(p => p.userId === userId)) {
                currentRoomIdForUser = rId;
                break;
            }
        }

        if (currentRoomIdForUser) {
            // El usuario ya está en una sala.
            if (currentRoomIdForUser === roomId) {
                // Es el mismo usuario en la misma sala (reconexión o nueva pestaña).
                // La lógica de reconexión actual es robusta y no requiere cambios aquí.
                // Para simplificar, simplemente notificamos que ya está en la sala.
                console.log(`Usuario ${userEmail} (${socket.id}) ya está en la sala ${roomId}. Reenviando estado de la sala.`);
                const room = rooms.get(roomId);
                io.to(roomId).emit('roomReady', roomId, room.player1Id, room.player2Id, room.players);
                return;
            } else {
                // El usuario ya está en OTRA sala.
                console.log(`Usuario ${userEmail} (${socket.id}) intentó unirse a sala ${roomId} pero ya está en sala ${currentRoomIdForUser}.`);
                socket.emit('gameError', `Ya estás en una partida en la sala "${currentRoomIdForUser}". Por favor, sal de esa sala antes de unirte.`);
                return;
            }
        }
        // --- FIN DE LA NUEVA LÓGICA ---

        // Si llega a este punto, el usuario no está en ninguna sala, por lo que podemos proceder.
        let room = rooms.get(roomId);

        if (!room) {
            // Lógica para crear una nueva sala
            room = {
                id: roomId,
                players: [],
                player1Id: null,
                player2Id: null,
                hostId: socket.id,
                gameStarted: false,
                boardCharacters: [],
                selectedSecretCharacters: new Map(),
                readyForGame: new Set(),
                currentPlayerTurn: null,
                playerEmails: new Map(),
                playerUserIds: new Map()
            };
            rooms.set(roomId, room);
            console.log(`Sala ${roomId} creada por ${userEmail} (${socket.id}).`);
        }

        // 4. Asegurarse de que la sala no esté llena.
        if (room.players.length >= 2) {
            socket.emit('roomFull', roomId);
            console.log(`Intento de unirse a sala ${roomId} llena por ${userEmail}.`);
            return;
        }

        // 5. Asignar player1Id o player2Id y añadir el jugador.
        if (room.players.length === 0) {
            room.player1Id = socket.id;
        } else if (room.players.length === 1) {
            room.player2Id = socket.id;
        }

        // Añadir el jugador a la lista de la sala
        socket.join(roomId);
        room.players.push({ id: socket.id, email: userEmail, userId: userId });
        room.playerEmails.set(socket.id, userEmail);
        room.playerUserIds.set(socket.id, userId);

        console.log(`${userEmail} (${socket.id}) se unió a la sala ${roomId}. Jugadores actuales: ${room.players.map(p => p.email).join(', ')}`);

        io.to(roomId).emit('playerJoined', userEmail, room.players.length, room.players);

        if (room.players.length === 2) {
            console.log(`Sala ${roomId} está lista para jugar. Jugadores: ${room.players.map(p => p.email).join(', ')}`);
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
        if (room.hostId !== socket.id) {
            socket.emit('gameError', 'No tienes permiso para iniciar el juego. Solo el anfitrión puede.');
            return;
        }
        // Validar si el juego ya está en proceso de inicio o ya iniciado
        if (room.gameStarted || room.readyForGame.size > 0) {
            socket.emit('gameError', 'El juego ya ha iniciado o está en fase de selección de personaje.');
            return;
        }

        try {
            if (!Array.isArray(selectedCategoryIds) || selectedCategoryIds.length === 0) {
                socket.emit('gameError', 'Se deben seleccionar categorías para iniciar el juego.');
                return;
            }
            // Obtener categorías seleccionadas de la DB
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
            // Barajar los personajes y seleccionar el número requerido para el tablero
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
    socket.on('askQuestion', (roomId, questionDetails) => {
        const room = rooms.get(roomId);
        if (room && room.gameStarted && socket.id === room.currentPlayerTurn) {
            const { attrKey, attrValue, question } = questionDetails;
            console.log('Pregunta recibida del cliente:', question);

            const opponentPlayer = room.players.find(p => p.userId !== userId);
            if (!opponentPlayer) {
                socket.emit('gameError', 'No se pudo encontrar al oponente en la sala.');
                return;
            }
            const opponentId = opponentPlayer.id;

            const opponentSecretChar = room.selectedSecretCharacters.get(opponentId);

            if (!opponentSecretChar) {
                socket.emit('gameError', 'No se pudo determinar el personaje secreto del oponente.');
                return;
            }

            const secretAttributeValue = opponentSecretChar.attributes ? opponentSecretChar.attributes[attrKey] : undefined;
            const answer = secretAttributeValue === attrValue;

            // Determinar qué cartas deben voltearse
            const charactersToFlip = room.boardCharacters
                .filter(char => {
                    const charAttr = char.attributes ? char.attributes[attrKey] : undefined;
                    return answer ? charAttr !== attrValue : charAttr === attrValue;
                })
                .map(char => char._id.toString());
            console.log('Server va a emitir la lista de IDs para voltear:', charactersToFlip);
            // Emitir el evento 'questionAnswered'
            io.to(roomId).emit('questionAnswered', {
                playerId: socket.id,
                question: question,
                answer: answer,
                charactersToFlip: charactersToFlip // Renombrar la clave para mayor claridad
            });

            // Cambiar el turno al otro jugador
            room.currentPlayerTurn = opponentId;
            io.to(roomId).emit('turnChanged', room.currentPlayerTurn);
            console.log(`Pregunta en sala ${roomId}: ${questionDetails.question}. Respuesta: ${answer}. Nuevo turno: ${room.currentPlayerTurn}`);

        } else {
            socket.emit('gameError', 'No es tu turno para preguntar o el juego no ha iniciado.');
        }
    });

    // Manejar adivinanzas de los jugadores
    socket.on('makeGuess', async (roomId, guessedCharacterId) => {
        const room = rooms.get(roomId);
        if (room && room.gameStarted && socket.id === room.currentPlayerTurn) {
            // Busca el oponente por userId (ACTUALIZADO)
            const opponentPlayer = room.players.find(p => p.userId !== userId);
            if (!opponentPlayer) {
                socket.emit('gameError', 'No se pudo encontrar al oponente para la adivinanza.');
                return;
            }
            const opponentId = opponentPlayer.id; // Su socket ID actual
            const opponentSecretChar = room.selectedSecretCharacters.get(opponentId);

            if (!opponentSecretChar) {
                socket.emit('gameError', 'No se pudo determinar el personaje secreto del oponente para la adivinanza.');
                return;
            }
            const isCorrect = opponentSecretChar._id.toString() === guessedCharacterId;

            let winnerUserId, loserUserId;

            if (isCorrect) {

                winnerUserId = socket.userId; // El jugador que adivinó correctamente
                loserUserId = opponentPlayer.userId; // El oponente pierde


                // El jugador adivinó correctamente
                io.to(roomId).emit('gameOver', {
                    winnerId: socket.id,
                    message: `¡${room.playerEmails.get(socket.id)} ha adivinado correctamente! ¡Ganó el juego!`
                });
                console.log(`Juego terminado en sala ${roomId}. Ganador: ${socket.id}`);
                rooms.delete(roomId); // Eliminar la sala
            } else {

                winnerUserId = opponentPlayer.userId; // El oponente gana
                loserUserId = socket.userId; // El jugador que adivinó incorrectamente
                // El jugador adivinó incorrectamente y pierde
                const loserId = socket.id;
                const winnerId = opponentId; // El otro jugador gana si el que adivina falla (ACTUALIZADO)
                io.to(roomId).emit('gameOver', {
                    winnerId: winnerId,
                    message: `¡${room.playerEmails.get(loserId)} adivinó incorrectamente y perdió! ${room.playerEmails.get(winnerId)} gana la partida.`
                });
                console.log(`Juego terminado en sala ${roomId}. ${loserId} perdió.`);
                rooms.delete(roomId); // Eliminar la sala
            }
            // === Lógica para actualizar las estadísticas ===
            try {
                await User.findOneAndUpdate(
                    { _id: winnerUserId },
                    { $inc: { 'stats.gamesPlayed': 1, 'stats.gamesWon': 1 } }
                );

                await User.findOneAndUpdate(
                    { _id: loserUserId },
                    { $inc: { 'stats.gamesPlayed': 1, 'stats.gamesLost': 1 } }
                );
                console.log(`Estadísticas actualizadas para el ganador (${winnerUserId}) y el perdedor (${loserUserId}).`);
            } catch (err) {
                console.error('Error al actualizar estadísticas en makeGuess:', err);
            }
        } else {
            socket.emit('gameError', 'No es tu turno o el juego no ha iniciado para adivinar.');
        }
    });

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
            room.playerUserIds = new Map(); // Limpiar también este mapa

            // Notificar a todos en la sala (incluido el que lo inició)
            io.to(roomId).emit('gameReset');
            console.log(`Juego en sala ${roomId} ha sido reiniciado por el usuario ${socket.id}.`);
            rooms.delete(roomId); // Elimina la sala, se recreará al unirse
        } else {
            socket.emit('gameError', 'No se encontró la sala para reiniciar.');
        }
    });

    socket.on('disconnect', async () => {
        const disconnectedUserEmail = socket.userEmail;
        const disconnectedUserId = socket.userId;
        console.log(`Un usuario se ha desconectado: ${socket.id} (Email: ${disconnectedUserEmail})`);

        if (activeUserSockets.get(disconnectedUserId) === socket.id) {
            activeUserSockets.delete(disconnectedUserId);
            console.log(`Usuario ${disconnectedUserEmail} (ID: ${disconnectedUserId}) limpiado de sesiones activas.`);
        } else {
            console.log(`Socket antiguo ${socket.id} de ${disconnectedUserEmail} se desconectó, pero no era el socket principal registrado.`);
        }

        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.userId === disconnectedUserId);

            if (playerIndex !== -1) {
                if (room.players[playerIndex].id === socket.id) {
                    if (room.gameStarted) {
                        const opponentPlayer = room.players.find(p => p.userId !== disconnectedUserId);

                        if (opponentPlayer) {
                            console.log(`Jugador ${disconnectedUserEmail} (${socket.id}) desconectado de una partida en curso en sala ${roomId}.`);

                            // Notificamos al oponente que la partida ha terminado por desconexión
                            io.to(opponentPlayer.id).emit('gameOver', {
                                winnerId: opponentPlayer.id,
                                message: `Tu oponente se ha desconectado. ¡${room.playerEmails.get(opponentPlayer.id)} ganaste!`
                            });

                            // --- LÓGICA DE ACTUALIZACIÓN DE ESTADÍSTICAS ELIMINADA AQUÍ ---
                            // Ya no se actualizan las victorias/derrotas al desconectarse.
                            // Solo se actualizan al terminar el juego con una adivinanza.

                        }
                        rooms.delete(roomId);
                    } else {
                        room.players.splice(playerIndex, 1);
                        room.playerEmails.delete(socket.id);
                        room.playerUserIds.delete(socket.id);

                        console.log(`Usuario ${disconnectedUserEmail} (${socket.id}) salió de la sala ${roomId}. Jugadores restantes: ${room.players.length}`);
                        io.to(roomId).emit('playerLeft', socket.id, room.players.length);

                        if (room.players.length === 0) {
                            rooms.delete(roomId);
                            console.log(`Sala ${roomId} eliminada por falta de jugadores.`);
                        }
                    }
                } else {
                    console.log(`Socket antiguo ${socket.id} de ${disconnectedUserEmail} se desconectó, pero el usuario sigue activo en la sala ${roomId} con el socket ${room.players[playerIndex].id}.`);
                }
                break;
            }
        }
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);

    // Obtener y mostrar la IP local o nombre de host
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            // Saltar direcciones internas y aquellas que no sean IPv4
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