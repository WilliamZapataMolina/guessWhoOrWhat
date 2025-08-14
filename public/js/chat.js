function startChat(socket, roomId) {
    const chatIcon = document.getElementById('chatIcon');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');



    //Muestra el modal del chat al hacer clcik en el ícono
    chatIcon.addEventListener('click', () => {
        chatModal.classList.add('show');

        //Asegura que los mensajes se muestren desde el final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    //Oculta el modal del chat al hacer click en el botón de cerrar
    closeChatBtn.addEventListener('click', () => {
        chatModal.classList.remove('show');
    });
    //Envía el mensaje al servidor al enviar el formulario
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();//Evita que la página se recargue al enviar el formulario
        const message = chatInput.value.trim();
        if (message !== '' && typeof socket !== 'undefined' && typeof roomId !== 'undefined') {
            socket.emit('chatMessage', roomId, message);
            chatInput.value = '';
        }
    });
    //Recibe un mensaje del servidor y lo muestra en el modal
    socket.on('chatMessage', (data) => {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${data.sender}: ${data.message}`;
        chatMessages.appendChild(messageElement);
        // Desplazarse al último mensaje
        chatMessages.scrolltop = chatMessages.scrollHeight;
    });
}