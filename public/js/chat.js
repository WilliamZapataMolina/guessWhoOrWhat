function startChat(socket, roomId) {
    const chatIcon = document.getElementById('chatIcon');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const chatHeader = document.querySelector('.chat-header');

    //Lógica para que la ventana sea arrastrable
    let isDragging = false;
    let offsetX, offsetY;

    chatHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - chatModal.offsetLeft;
        offsetY = e.clientY - chatModal.offsetTop;
        chatModal.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        chatModal.style.left = `${e.clientX - offsetX}px`;
        chatModal.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        chatModal.style.transition = 'transform 0.2s'; // Añade una transición suave al soltar
    });

    //Muestra el modal del chat al hacer clcik en el ícono
    chatIcon.addEventListener('click', () => {
        chatModal.style.display = 'block';
        chatIcon.classList.remove('has-new-messages');

        //Asegura que los mensajes se muestren desde el final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    //Oculta el modal del chat al hacer click en el botón de cerrar
    closeChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
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

        if (chatModal.style.display === 'none') {
            chatIcon.classList.add('has-new-messages'); // Muestra la notificación si el chat está cerrado
        }
        // Desplazarse al último mensaje
        chatMessages.scrolltop = chatMessages.scrollHeight;
    });
}