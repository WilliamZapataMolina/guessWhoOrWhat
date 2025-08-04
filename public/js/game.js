// 1. URL base de tu API y Socket.IO
const API_BASE_URL = 'http://WilliamZapata:3000/api'; // Asegúrate de que esta URL sea correcta
const SOCKET_IO_URL = 'http://WilliamZapata:3000'; // Debe coincidir con el origen de tu servidor Express/Socket.IO

// 2. Variables globales para el estado del juego
let allCategories = [];
let selectedCategoryIds = [];
let boardCharacters = []; // Personajes en el tablero de juego
let secretCharacter = null; // El personaje SECRETO que ESTE JUGADOR debe adivinar (el del oponente)
const TOTAL_GAME_CHARACTERS = 24; // Cantidad de personajes en el tablero

// Variables para la selección del personaje secreto propio
let charactersForSelection = []; // Personajes disponibles para elegir como secreto propio
let selectedSecretCharacter = null; // El personaje que ESTE JUGADOR elige como SU secreto

// 3. Variables para el multijugador y Socket.IO
let socket;
let currentRoomId = null;
let isHost = false; // true si este cliente es quien creó la sala y la inició
let myTurn = false; // true si es el turno de este cliente
let currentTurnPlayerId = null; // ID del socket del jugador actual en turno

// 4. Referencias a elementos del DOM (¡asegúrate de que los IDs coincidan con game.html!)
const loggedInUserEmailSpan = document.getElementById('loggedInUserEmail');
const logoutBtn = document.getElementById('logoutBtn');


// Secciones del juego
const lobbySection = document.getElementById('lobby-section');
const gameSetupSection = document.getElementById('gameSetup');
const characterSelectionSection = document.getElementById('characterSelection'); // Nueva sección para elegir personaje secreto
const gameBoardSection = document.getElementById('gameBoard');

// Elementos del Lobby
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const playerList = document.getElementById('playerList');
const roomMessages = document.getElementById('roomMessages');

// Elementos de Configuración del Juego (Game Setup)
const categoryCheckboxesDiv = document.getElementById('categoryCheckboxes');
const startGameButton = document.getElementById('startGameBtn');

// Elementos de Selección de Personaje Secreto
const secretCharacterSelectionGrid = document.getElementById('secretCharacterSelectionGrid');
const confirmSecretCharacterBtn = document.getElementById('confirmSecretCharacterBtn');
const secretSelectionMessage = document.getElementById('secretSelectionMessage');

// Elementos del Tablero de Juego
const secretCharacterDisplay = document.getElementById('secretCharacterDisplay'); // Para mostrar TU personaje secreto
const secretCharacterNameSpan = document.getElementById('secretCharacterName'); // Para el nombre del personaje secreto
const secretCharacterImg = document.getElementById('secretCharacterImg'); // Para la imagen del personaje secreto
const gameBoardContentDiv = document.getElementById('gameBoardContent'); // La cuadrícula de personajes

// Elementos de Controles del Juego
const gameControls = document.querySelector('.game-controls');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatusMessage = document.getElementById('gameStatusMessage');
const attributeQuestionsDiv = document.getElementById('attributeQuestions');
const guessedCharacterInput = document.getElementById('guessedCharacterInput');
const guessCharacterBtn = document.getElementById('guessCharacterBtn');
const resetGameBtn = document.getElementById('resetGameBtn'); // Botón para reiniciar juego

// --- 5. Lógica Principal al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación del usuario
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.replace('/'); // Redirige al login si no está autenticado
        return;
    }

    // Mostrar el email del usuario logueado
    if (loggedInUserEmailSpan) {
        loggedInUserEmailSpan.textContent = userEmail;
    }

    // Conectar a Socket.IO
    socket = io(SOCKET_IO_URL, {
        query: {
            userEmail: userEmail
        }
    });

    // --- 6. Manejo de Eventos de Socket.IO ---

    socket.on('connect', () => {
        console.log('Conectado al servidor de Socket.IO con ID:', socket.id);
        // Cuando te conectas, notifica al servidor con tu email para el lobby
        socket.emit('userConnected', userEmail);
    });

    socket.on('disconnect', (reason) => {
        console.log('Desconectado del servidor de Socket.IO. Razón:', reason);
        // Puedes ser más específico con el mensaje si la razón es 'io server disconnect'
        // (que sería el caso si el servidor te desconecta por 'authError')
        if (reason !== 'io server disconnect') {
            alert('Te has desconectado del juego inesperadamente. Volviendo al lobby.');
            showLobby();
        }
        // Si la razón es 'io server disconnect', 'authError' ya manejó la redirección.
    });

    socket.on('authError', (message) => {
        console.error('Error de autenticación desde el servidor:', message);
        alert(message); // Mostrar el mensaje de error al usuario
        window.location.replace('/login'); // Redirige al login o a la página principal
    });


    // Eventos del Lobby
    socket.on('playerJoined', (joinedUserEmail, playerCount, playersInRoom) => {
        roomMessages.textContent = `"${joinedUserEmail}" se unió. Jugadores en la sala: ${playerCount}/2`;
        updatePlayerList(playersInRoom); // Actualiza la lista con los emails reales
        // Si ya hay 2 jugadores y eres el host, el botón de iniciar juego puede aparecer
        if (isHost && playerCount === 2) {
            startGameButton.style.display = 'block';
        }
    });

    socket.on('roomReady', (roomId, player1Id, player2Id, playersInRoom) => {
        console.log(`Sala ${roomId} lista. Jugadores: ${player1Id}, ${player2Id}`);
        updatePlayerList(playersInRoom); // Asegúrate de pasar los jugadores como un array de objetos si tu updatePlayerList lo espera así

        if (socket.id === player1Id) {
            // Este jugador es el ANFITRIÓN
            isHost = true; // Asegúrate de que esta variable global se actualice correctamente aquí

            // ¡ACTIVA LA SECCIÓN DE CONFIGURACIÓN DEL JUEGO PARA EL HOST!
            showGameSetup(); // Esto oculta el lobby y muestra gameSetupSection
            loadCategories(); // Esto cargará y mostrará las checkboxes de categorías

            const waitingMessage = document.getElementById('waitingForHostMessage');
            if (waitingMessage) { // <--- AÑADIR ESTA VERIFICACIÓN
                waitingMessage.style.display = 'none';
            }
        } else {
            // Este jugador es el INVITADO
            isHost = false; // Asegúrate de que esta variable global se actualice correctamente aquí
            lobbySection.style.display = 'none'; // Oculta el lobby
            gameSetupSection.style.display = 'block'; // Muestra la sección de setup para el invitado (pero con mensaje de espera)

            const categoryArea = document.getElementById('categorySelectionArea');
            if (categoryArea) { // <--- AÑADIR ESTA VERIFICACIÓN
                categoryArea.style.display = 'none';

            } else {
                console.warn('Advertencia: #categorySelectionArea no encontrado al intentar ocultarlo para el invitado.');
            }
            document.getElementById('startGameBtn').style.display = 'none';
            document.getElementById('waitingForHostMessage').style.display = 'block'; // Muestra el mensaje de espera
            roomMessages.textContent = '¡Sala lista! Esperando que el anfitrión elija categorías e inicie el juego...'; // Mensaje para el invitado
        }
    });

    socket.on('roomFull', (roomIdFromSrv) => {
        alert(`La sala "${roomIdFromSrv}" está llena o ya estás en ella.`);
        showLobbyControls(); // Permitir intentar otra sala
    });

    socket.on('playerLeft', (playersInRoom) => {
        alert('El otro jugador se desconectó. El juego ha terminado. Volviendo al lobby.');
        // Limpiar la sala y el estado del juego
        currentRoomId = null;
        isHost = false;
        myTurn = false;
        secretCharacter = null;
        boardCharacters = [];
        selectedSecretCharacter = null;
        charactersForSelection = [];
        window.location.reload(); // Recarga para un reinicio limpio
    });

    // Evento del servidor para seleccionar categorías (anteriormente 'startGame' completo)
    socket.on('categoriesSelected', (data) => {
        console.log('Categorías seleccionadas. Ahora elige tu personaje secreto:', data.characters);
        charactersForSelection = data.characters;
        showCharacterSelection(); // Muestra la nueva sección de selección de personaje
        renderCharacterSelectionGrid(charactersForSelection); // Renderiza las cartas para elegir
        // El botón de iniciar juego ya se oculta en showCharacterSelection, pero lo aseguramos
        startGameButton.style.display = 'none';
    });

    socket.on('allSecretsChosen', (gameData) => {
        console.log('¡Ambos personajes secretos elegidos! Juego iniciado:', gameData);

        // Asignar los personajes a la variable global ANTES de renderizar
        boardCharacters = gameData.boardCharacters;
        secretCharacter = gameData.secretCharacter;
        currentTurnPlayerId = gameData.currentPlayerTurn;

        myTurn = (socket.id === currentTurnPlayerId);

        showGameBoard();
        renderBoard(boardCharacters);
        renderSecretCharacter(gameData.mySecretCharacter);

        // Ahora, 'boardCharacters' ya tiene los datos.
        generateAttributeQuestions(boardCharacters);

        updateTurnIndicator(currentTurnPlayerId);
        gameStatusMessage.textContent = '¡El juego ha comenzado!';
        alert('¡El juego ha comenzado!');
    });

    // Evento de respuesta a la pregunta (recibido por AMBOS jugadores)
    socket.on('questionAnswered', (data) => {
        console.log('Respuesta recibida:', data);

        // Muestra la pregunta y la respuesta del oponente
        gameStatusMessage.textContent = `Pregunta: "${data.question}" - Respuesta: ${data.answer ? 'Sí' : 'No'}`;

        // Usa la lista de IDs del servidor para voltear las cartas
        if (data.charactersToFlip && Array.isArray(data.charactersToFlip)) {
            data.charactersToFlip.forEach(characterId => {
                // Llama a la función toggleCard por su nombre
                toggleCard(characterId);
            });
            console.log(`Volteando ${data.charactersToFlip.length} cartas.`);
        } else {
            console.warn('El servidor no envió una lista válida de caracteres para voltear.');
        }
    });

    // Evento de cambio de turno (recibido por AMBOS jugadores)
    socket.on('turnChanged', (nextPlayerId) => {
        console.log('Turno cambiado. Siguiente jugador ID:', nextPlayerId);
        console.log('Mi socket ID:', socket.id);
        updateTurnIndicator(nextPlayerId);
        myTurn = (socket.id === nextPlayerId); // Actualizar el estado de mi turno
        if (myTurn) {
            alert('¡Es tu turno!');
        } else {
            alert('Turno del oponente.');
        }
    });

    // Evento de adivinanza incorrecta (recibido por AMBOS jugadores)
    socket.on('guessIncorrect', (data) => {
        gameStatusMessage.textContent = `${data.guesserId === socket.id ? 'Tú' : 'Tu oponente'} adivinó incorrectamente.`;
        alert(`¡Adivinanza incorrecta! Es el turno de ${data.nextPlayerId === socket.id ? 'tu' : 'tu oponente'}.`);
        updateTurnIndicator(data.nextPlayerId); // Asegúrate de que el turno se actualice
    });

    // Evento de juego terminado (ganador o perdedor)
    socket.on('gameOver', (data) => {
        alert(data.message);
        gameStatusMessage.textContent = data.message;
        resetGameBtn.style.display = 'inline-block'; // Mostrar el botón de reinicio
    });

    socket.on('gameError', (message) => {
        alert(`Error en el juego: ${message}`);
        console.error('Error del servidor:', message);
        showLobby(); // Volver al lobby en caso de error grave
    });
    // --- 7. Event Listeners para la UI ---
    logoutBtn.addEventListener('click', async () => {

        try {
            // Llama a la ruta /logout en el servidor para borrar la cookie JWT
            const res = await fetch('/logout', { method: 'GET' });

            if (res.ok) { // Verifica si el servidor respondió exitosamente
                console.log('Logout exitoso en el servidor (cookie JWT borrada).');
                localStorage.removeItem('userEmail'); // Borra el estado de autenticación del cliente
                // Si también usas 'userToken' en localStorage, bórralo aquí también:
                // localStorage.removeItem('userToken'); 

                if (typeof socket !== 'undefined' && socket.connected) {
                    socket.disconnect(); // Desconecta el socket
                    console.log('Socket desconectado.');
                }
                window.location.replace('/'); // Redirige el navegador a la página de inicio
            } else {
                console.error('Error del servidor al intentar cerrar sesión:', res.status, res.statusText);
                alert('Hubo un problema al cerrar sesión. Por favor, inténtalo de nuevo.');
            }
        } catch (err) {
            console.error('Error de red al intentar cerrar sesión:', err);
            alert('No se pudo conectar con el servidor para cerrar sesión.');
        }
    });

    createRoomBtn.addEventListener('click', () => {
        const roomName = roomIdInput.value.trim();
        if (!roomName) {
            alert('Debes escribir un nombre para la sala.');
            return;
        }

        socket.emit('joinRoom', roomName);
        currentRoomId = roomName;
        isHost = true; // quien crea la sala es el host
        roomMessages.textContent = `Creando y uniéndote a la sala: ${roomName}...`;
        hideLobbyControls();
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomIdToJoin = roomIdInput.value.trim(); // Usar un nombre de variable más claro
        if (roomIdToJoin) {
            currentRoomId = roomIdToJoin;
            // Emitir un evento 'joinRoom' al servidor, pasando solo el ID de la sala
            socket.emit('joinRoom', roomIdToJoin); // El servidor puede obtener el email del socket.handshake.query
            isHost = false; // Este cliente no es el host
            roomMessages.textContent = `Uniéndote a la sala: ${roomIdToJoin}...`;
            hideLobbyControls();
        } else {
            alert('Por favor, ingresa un ID de sala para unirte.');
        }
    });


    startGameButton.addEventListener('click', () => {
        selectedCategoryIds = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        if (selectedCategoryIds.length === 0) {
            alert('Por favor, selecciona al menos una categoría para empezar el juego.');
            return;
        }
        if (isHost && currentRoomId) {
            // El host envía las categorías y el total de personajes al servidor
            socket.emit('startGame', currentRoomId, selectedCategoryIds, TOTAL_GAME_CHARACTERS);
            gameStatusMessage.textContent = 'Iniciando juego...';
            // El resto de la UI se actualizará cuando se reciba 'categoriesSelected' del servidor
        } else {
            alert('Solo el anfitrión puede iniciar el juego, o la sala no está lista.');
        }
    });

    // Event Listener para el botón de confirmar personaje secreto
    confirmSecretCharacterBtn.addEventListener('click', () => {
        if (selectedSecretCharacter) {
            // Emitir el personaje secreto elegido por ESTE JUGADOR al servidor
            socket.emit('secretCharacterChosen', currentRoomId, selectedSecretCharacter._id);
            secretSelectionMessage.textContent = `Has elegido a ${selectedSecretCharacter.name}. Esperando que el otro jugador elija su personaje...`;
            confirmSecretCharacterBtn.disabled = true; // Deshabilitar para evitar múltiples envíos
        } else {
            alert('Por favor, selecciona un personaje secreto.');
        }
    });

    // Event listener para el botón de adivinar
    guessCharacterBtn.addEventListener('click', () => {
        const guessedCharacterName = guessedCharacterInput.value.trim();
        if (!guessedCharacterName) {
            alert('Por favor, ingresa el nombre del personaje que deseas adivinar.');
            return;
        }

        const guessedChar = boardCharacters.find(char => char.name.toLowerCase() === guessedCharacterName.toLowerCase());

        if (!guessedChar) {
            alert('Personaje no encontrado en el tablero. Por favor, revisa el nombre.');
            return;
        }

        if (myTurn && currentRoomId) {
            socket.emit('makeGuess', currentRoomId, guessedChar._id); // Envía el ID del personaje adivinado
        } else if (!myTurn) {
            alert('No es tu turno para adivinar.');
        }
    });

    resetGameBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres reiniciar el juego y volver al lobby?')) {
            // Notificar al servidor que este jugador quiere reiniciar
            socket.emit('resetGame', currentRoomId);
        }
    });
    // Manejar el evento de reseteo del servidor
    socket.on('gameReset', () => {
        alert('El juego ha sido reiniciado. Volviendo al lobby.');
        window.location.reload(); // Recargar para un reinicio limpio
    });


    // --- 8. Funciones Auxiliares de UI (Mantener o adaptar) ---

    // Muestra solo la sección del lobby
    function showLobby() {
        lobbySection.style.display = 'block';
        gameSetupSection.style.display = 'none';
        characterSelectionSection.style.display = 'none'; // Asegúrate de ocultarlo
        gameBoardSection.style.display = 'none';
        gameControls.style.display = 'none';
        showLobbyControls();
        roomMessages.textContent = ''; // Limpiar mensajes
        playerList.innerHTML = ''; // Limpiar lista de jugadores
        roomIdInput.value = ''; // Limpiar input de sala
        isHost = false; // Resetear estado de host
        myTurn = false; // Resetear turno
    }

    // Muestra solo la sección de configuración de juego (selección de categorías)
    function showGameSetup() {
        lobbySection.style.display = 'none';
        gameSetupSection.style.display = 'block';
        characterSelectionSection.style.display = 'none'; // Asegúrate de ocultarlo
        gameBoardSection.style.display = 'none';
        gameControls.style.display = 'none';
        startGameButton.style.display = 'block'; // Mostrar botón de iniciar juego
    }

    // Muestra solo la sección de selección de personaje secreto
    function showCharacterSelection() {
        lobbySection.style.display = 'none';
        gameSetupSection.style.display = 'none';
        characterSelectionSection.style.display = 'block';
        gameBoardSection.style.display = 'none';
        gameControls.style.display = 'none';
        confirmSecretCharacterBtn.style.display = 'none'; // Ocultar hasta que se seleccione
        selectedSecretCharacter = null; // Resetear selección
        secretSelectionMessage.textContent = 'Selecciona tu personaje secreto:';
    }

    // Muestra solo la sección del tablero de juego
    function showGameBoard() {
        lobbySection.style.display = 'none';
        gameSetupSection.style.display = 'none';
        characterSelectionSection.style.display = 'none';
        gameBoardSection.style.display = 'block';
        gameControls.style.display = 'flex'; // Usar flex para los controles
    }

    // Oculta los controles de crear/unirse a sala en el lobby
    function hideLobbyControls() {
        createRoomBtn.style.display = 'none';
        joinRoomBtn.style.display = 'none';
        roomIdInput.readOnly = true;
    }

    // Muestra los controles de crear/unirse a sala en el lobby
    function showLobbyControls() {
        createRoomBtn.style.display = 'block';
        joinRoomBtn.style.display = 'block';
        roomIdInput.readOnly = false;
        startGameButton.style.display = 'none'; // Asegurarse de que no aparezca
    }

    // Actualiza la lista de jugadores en el lobby (muestra emails)
    function updatePlayerList(players) {
        playerList.innerHTML = '<h4>Jugadores en la sala:</h4>';
        players.forEach(player => {
            playerList.innerHTML += `<li>${player.email} (${player.id === socket.id ? 'Tú' : 'Oponente'})</li>`;
        });
    }

    // Actualiza el indicador de turno en la UI
    function updateTurnIndicator(playerId) {
        currentTurnPlayerId = playerId; // Actualiza la variable global
        if (playerId === socket.id) {
            turnIndicator.textContent = '¡Es tu turno!';
            turnIndicator.style.color = 'green';
            // Habilitar los botones de pregunta y adivinar
            attributeQuestionsDiv.querySelectorAll('button').forEach(btn => btn.disabled = false);
            guessCharacterBtn.disabled = false;
            // guessCharacterInput.disabled = false; // El input puede estar habilitado siempre
        } else {
            turnIndicator.textContent = 'Turno del oponente';
            turnIndicator.style.color = 'red';
            // Deshabilitar los botones de pregunta y adivinar
            attributeQuestionsDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
            guessCharacterBtn.disabled = true;
            // guessedCharacterInput.disabled = true; // El input puede estar habilitado siempre
        }
    }

    // --- 9. Funciones de Carga y Renderizado de Componentes ---

    // Función para cargar categorías desde la API
    async function loadCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            allCategories = await response.json();
            console.log('Categorías cargadas:', allCategories);

            categoryCheckboxesDiv.innerHTML = '';
            allCategories.forEach(category => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.classList.add('category-item');
                checkboxDiv.innerHTML = `
                    <input type="checkbox" id="cat-${category._id}" value="${category._id}" name="category">
                    <label for="cat-${category._id}">${category.name}</label>
                `;
                categoryCheckboxesDiv.appendChild(checkboxDiv);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            alert('No se pudieron cargar las categorías. Intenta de nuevo más tarde.');
        }
    }

    // Función para renderizar las tarjetas de personajes en el tablero de juego
    function renderBoard(characters) {
        gameBoardContentDiv.innerHTML = ''; // Limpiar tablero
        characters.forEach(char => {
            const card = document.createElement('div');
            card.classList.add('character-card');
            card.setAttribute('data-id', char._id);
            card.innerHTML = `
                <img src="${char.imageUrl}" alt="${char.name}">
            <p>${char.name}</p>
            `;
            // Añadir un evento de clic para voltear la carta
            card.addEventListener('click', () => {
                card.classList.toggle('flipped'); // toggle es mejor para clics manuales
            });

            gameBoardContentDiv.appendChild(card);
        });
    }

    // Función para renderizar el personaje secreto del JUGADOR en la sección lateral
    function renderSecretCharacter(character) {
        const secretCharacterDisplay = document.getElementById('secretCharacterDisplay');
        if (secretCharacterDisplay && character) { // ¡Verifica que el div exista y que el personaje no sea null!
            secretCharacterDisplay.innerHTML = `
            <img src="${character.imageUrl}" alt="${character.name}" style="width: 100px; height: 100px; object-fit: cover;">
            <p>${character.name}</p>
        `;
            console.log('Personaje secreto renderizado:', character.name); // Añade este log
        } else {
            console.error('Error: No se encontró secretCharacterDisplay o el personaje es nulo.', secretCharacterDisplay, character);
        }
    }

    // Función para renderizar el grid de selección de personaje secreto (TU SECRETO)
    function renderCharacterSelectionGrid(characters) {
        secretCharacterSelectionGrid.innerHTML = '';
        characters.forEach(char => {
            const card = document.createElement('div');
            card.classList.add('character-card', 'selectable-card'); // Añade clase para estilo/funcionalidad
            card.setAttribute('data-id', char._id);
            card.innerHTML = `
                 <img src="${char.imageUrl}" alt="${char.name}">
            <p>${char.name}</p>
            `;
            card.addEventListener('click', () => {
                // Remover selección previa
                const prevSelected = document.querySelector('.selectable-card.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                // Añadir selección actual
                card.classList.add('selected');
                selectedSecretCharacter = char; // Guarda el personaje completo
                confirmSecretCharacterBtn.style.display = 'block'; // Mostrar botón de confirmar
                secretSelectionMessage.textContent = `Has elegido a: ${char.name}`;
            });
            secretCharacterSelectionGrid.appendChild(card);
        });
    }

    // Función para voltear una carta por su ID
    function toggleCard(characterId) {
        const card = document.querySelector(`.character-card[data-id="${characterId}"]`);
        if (card) {
            card.classList.toggle('flipped');
            console.log(`Tarjeta ${characterId} volteada (o desvolteada).`);
        } else {
            console.error(`Error: No se encontró la tarjeta con data-id="${characterId}" para voltear.`);
        }
    }

    function generateAttributeQuestions(characters) {
        attributeQuestionsDiv.innerHTML = '';
        const uniqueAttributes = extractUniqueAttributes(characters);

        for (const attrKey in uniqueAttributes) {
            if (uniqueAttributes.hasOwnProperty(attrKey)) {
                const possibleValues = Array.from(uniqueAttributes[attrKey]);

                // Si el atributo es booleano, ordena los valores para que el 'true' aparezca primero
                if (possibleValues.some(val => typeof val === 'boolean')) {
                    possibleValues.sort((a, b) => {
                        if (typeof a === 'boolean' && typeof b === 'boolean') {
                            return a === b ? 0 : (a ? -1 : 1);
                        }
                        return 0;
                    });
                } else {
                    possibleValues.sort();
                }

                possibleValues.forEach(attrValue => {
                    const questionText = formatAttributeQuestion(attrKey, attrValue);

                    // Solo crea el botón si la pregunta es válida (no es null)
                    if (questionText) {
                        const button = document.createElement('button');
                        button.textContent = questionText;
                        button.classList.add('attribute-question-btn');
                        button.setAttribute('data-attr-key', attrKey);
                        button.setAttribute('data-attr-value', attrValue);

                        button.addEventListener('click', (event) => {
                            if (myTurn && currentRoomId) {
                                // Deshabilita el botón para evitar spam
                                event.target.disabled = true;

                                // Envía la pregunta formateada y los datos del atributo al servidor
                                socket.emit('askQuestion', currentRoomId, {
                                    question: questionText,
                                    attrKey: attrKey,
                                    attrValue: attrValue
                                });
                            } else {
                                alert('No es tu turno para preguntar.');
                            }
                        });
                        attributeQuestionsDiv.appendChild(button);
                    }
                });
            }
        }
    }
    // Al iniciar, mostrar el lobby
    showLobby();
});