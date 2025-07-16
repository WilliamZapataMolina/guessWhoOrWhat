const express = require('express');//Importar el framework Express
const http = require('node:http');// Módulo HTTP de Node.js para crear el servidor
const { Server } = require('socket.io');// Importa Server de Socket.IO
const path = require('node:path');// Módulo Path de Node.js para manejar rutas de archivos
const os = require('node:os');// Módulo OS de Node.js para obtener información del sistema
const mongoose = require('mongoose');// Importa Mongoose para manejar la base de datos MongoDB
const dotenv = require('dotenv'); //Para cargar variables de entorno desde .env


//Importar las rutas modularizadas
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const characterRoutes = require('./routes/characterRoutes');

dotenv.config();// Carga las variables de entorno desde el archivo .env

const app = express();// Crea una instancia de la aplicación Express
const server = http.createServer(app);// Crea un servidor HTTP usando la aplicación Express
const io = new Server(server);// Conecta Socket.IO al servidor HTTP

const PORT = process.env.PORT || 3000;// Define el puerto del servidor, usa 3000 por defecto
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guessWhoOrWhat';//URI de conexión a MongoDB


//Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

//Middleware para parsear JSON en las solicitudes (necesario para registro/login)
app.use(express.json());

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
app.use('/api', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/characters', characterRoutes);

// Ruta principal para servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Lógica de Socket.IO (comunicación en tiempo real)
io.on('connection', (socket) => {
    console.log(`Un usuario se ha conectado: ${socket.id}`);
    //Se ejecuta cuando un cliente se desconecta
    socket.on('disconnect', () => {
        console.log(`Un usuario se ha desconectado: ${socket.id}`);
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
})