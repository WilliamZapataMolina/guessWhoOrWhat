function startChat(socket, roomId) {
    const chatIcon = document.getElementById('chatIcon');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const chatHeader = document.querySelector('.chat-header');
    const resizeHandle = document.querySelector('.chat-resize-handle');

    //Estado
    let isDragging = false;
    let isResizing = false;
    let offsetX = 0, offsetY = 0;

    //Dragging
    chatHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        chatModal.style.transform = 'none';
        offsetX = e.clientX - chatModal.offsetLeft;
        offsetY = e.clientY - chatModal.offsetTop;
        chatModal.style.transition = 'none';
    });

    //Logica para renderizar el chat(resizing)
    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        chatModal.style.transition = 'none'; // Desactiva la transición durante el redimensionamiento
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            const navbarHeight = 0;// Altura de la barra de navegación

            newLeft = Math.max(0.5, Math.min(window.innerWidth - chatModal.offsetWidth, newLeft));
            newTop = Math.max(navbarHeight, Math.min(window.innerHeight - chatModal.offsetHeight, newTop));

            chatModal.style.left = `${newLeft}px`;
            chatModal.style.top = `${newTop}px`;

        } else if (isResizing) {
            const rect = chatModal.getBoundingClientRect();
            const newWidth = e.clientX - rect.left;
            const newHeight = e.clientY - rect.top;

            //Aplica los nuevos valores, respetando los límites mínimos
            chatModal.style.width = `${Math.max(250, newWidth)}px`; // Ancho mínimo de 250px
            chatModal.style.height = `${Math.max(300, newHeight)}px`; // Alto mínimo de 150px
        }

    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        chatModal.style.transition = 'transform 0.2s'; // Añade una transición suave al soltar
    });

    //Muestra el modal del chat al hacer clcik en el ícono
    chatIcon.addEventListener('click', () => {
        chatModal.style.display = 'flex';
        chatModal.style.left = '50%';
        chatModal.style.top = '50%';
        chatModal.style.transform = 'translate(-50%, -50%)';
        chatIcon.classList.remove('has-new-messages');
        scrollToBottom();
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
        scrollToBottom();
    });
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}