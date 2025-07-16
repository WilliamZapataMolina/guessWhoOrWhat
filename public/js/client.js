//Conecta el cliente al servidor Socket.IO
//Por defecto, se conecta al mismo host y puerto que sirvió la página HTML
const socket = io();

socket.on('connect', () => {
    console.log('Conectado al servidor de juego a través de Sockect.IO(Desde el cliente)');
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor del juego. (Desde el cliente)');

});