// URL base de tu API de Node.js
const API_BASE_URL = 'http://WilliamZapata:3000/api';

// Variables globales para el estado del juego
let allCategories = [];
let selectedCategoryIds = [];
let boardCharacters = [];
let secretCharacter = null;
const TOTAL_GAME_CHARACTERS = 24;

// Referencias a elementos del DOM
// Elementos de autenticación/jugador
const logoutBtn = document.getElementById('logoutBtn');
const playerNameSpan = document.getElementById('playerName'); // Para mostrar el nombre/correo del usuario

// Elementos de configuración y tablero del juego
const gameSetupDiv = document.getElementById('gameSetup');
const gameBoardContentDiv = document.getElementById('gameBoardContent'); // ID del div del tablero de juego
const categoryCheckboxesDiv = document.getElementById('categoryCheckboxes');
const startGameBtn = document.getElementById('startGameBtn');
const characterCardsContainer = document.getElementById('characterCards'); // Contenedor de las cartas del tablero
const secretCharacterImage = document.getElementById('secretCharacterImage');
const secretCharacterName = document.getElementById('secretCharacterName');
const showSecretBtn = document.getElementById('showSecretBtn'); // Botón de debug para el secreto
const resetGameBtn = document.getElementById('resetGameBtn'); // Botón de reinicio dentro del tablero
const newGameBtn = document.getElementById('newGameBtn'); // Botón "Nueva Partida" del header
const attributeQuestionsDiv = document.getElementById('attributeQuestions'); // Para las preguntas de atributos

// Elementos de control de juego adicionales (de tu HTML original)
const endGameBtn = document.getElementById('endGameBtn');
const askQuestionBtn = document.getElementById('askQuestionBtn');
const guessCharacterBtn = document.getElementById('guessCharacterBtn');
const questionInput = document.getElementById('questionInput');


/**
 * Lógica de inicialización al cargar el DOM.
 * Incluye verificación de autenticación y carga inicial de categorías.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // --- Verificación de Autenticación al Cargar la Página ---
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail'); // O userName/alias

    if (!token || !userEmail) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        window.location.href = '/'; // Redirige a la página principal de login/registro
        return; // Detener la ejecución adicional del script si no está autenticado
    }

    // Mostrar información del usuario si ha iniciado sesión
    playerNameSpan.textContent = userEmail;

    // --- Lógica del Botón de Cerrar Sesión ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userId'); // Asegúrate de eliminar todos los datos de sesión
            alert('Sesión cerrada. Redirigiendo...');
            window.location.href = '/'; // Redirige a la página principal de login/registro
        });
    }

    console.log('Lógica del juego cargada para el usuario:', userEmail);

    // --- Cargar Categorías para la Configuración del Juego ---
    await loadCategories(); // Esperar a que las categorías se carguen antes de permitir iniciar juego

    // --- Event Listeners Globales para el Juego ---
    startGameBtn.addEventListener('click', startGame);
    resetGameBtn.addEventListener('click', resetGame);
    newGameBtn.addEventListener('click', resetGame); // El botón "Nueva Partida" ahora reinicia el juego

    // Event listeners para botones adicionales (pueden requerir lógica en el futuro)
    if (endGameBtn) endGameBtn.addEventListener('click', () => alert('Funcionalidad "Terminar Partida" pendiente.'));
    if (askQuestionBtn) askQuestionBtn.addEventListener('click', () => alert('Funcionalidad "Preguntar" personalizada pendiente.'));
    if (guessCharacterBtn) guessCharacterBtn.addEventListener('click', () => alert('Funcionalidad "Adivinar Personaje" pendiente.'));

    // Event listener para el botón de depuración del personaje secreto
    showSecretBtn.addEventListener('click', () => {
        secretCharacterImage.style.display = secretCharacterImage.style.display === 'block' ? 'none' : 'block';
        secretCharacterName.style.display = secretCharacterName.style.display === 'block' ? 'none' : 'block';
    });
});

/**
 * Carga todas las categorías desde el backend y las muestra como checkboxes en la interfaz de configuración.
 */
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

/**
 * Inicia el juego. Recoge las categorías seleccionadas, solicita los personajes al backend
 * y renderiza el tablero de juego.
 */
async function startGame() {
    selectedCategoryIds = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedCategoryIds.length === 0) {
        alert('Por favor, selecciona al menos una categoría para empezar el juego.');
        return;
    }

    gameSetupDiv.style.display = 'none';
    gameBoardContentDiv.style.display = 'block'; // Muestra el contenido del tablero

    try {
        const response = await fetch(`${API_BASE_URL}/characters/game/balanced`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoryIds: selectedCategoryIds,
                totalCharacters: TOTAL_GAME_CHARACTERS
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error del servidor: ${errorData.message}`);
        }

        const data = await response.json();
        boardCharacters = data.boardCharacters;
        secretCharacter = data.secretCharacter;

        console.log('Personajes del tablero:', boardCharacters);
        console.log('Personaje Secreto:', secretCharacter);

        renderBoard();
        renderSecretCharacter();
        // Llama a la función para generar preguntas, que estará en questions.js
        if (typeof generateAttributeQuestions === 'function') {
            generateAttributeQuestions(boardCharacters, attributeQuestionsDiv, secretCharacter);
        } else {
            console.warn('generateAttributeQuestions no está definida. Asegúrate de que questions.js esté cargado y exporte la función.');
        }

    } catch (error) {
        console.error('Error al iniciar el juego:', error);
        alert('Error al iniciar el juego: ' + error.message);
        gameSetupDiv.style.display = 'block';
        gameBoardContentDiv.style.display = 'none'; // Vuelve a la configuración si hay error
    }
}

/**
 * Renderiza todas las tarjetas de personajes en el tablero de juego.
 */
function renderBoard() {
    characterCardsContainer.innerHTML = ''; // Limpiar cualquier tarjeta existente
    boardCharacters.forEach(char => {
        const card = document.createElement('div');
        card.classList.add('character-card');
        card.dataset.characterId = char._id;

        card.innerHTML = `
            <img src="${char.imageUrl}" alt="${char.name}">
            <p>${char.name}</p>
        `;
        card.addEventListener('click', () => toggleCard(char._id));
        characterCardsContainer.appendChild(card);
    });
}

/**
 * Cambia el estado visual de una carta (la "voltea" o la marca como descartada).
 * @param {string} characterId - El ID del personaje cuya carta se va a alternar.
 */
function toggleCard(characterId) {
    const card = document.querySelector(`.character-card[data-character-id="${characterId}"]`);
    if (card) {
        card.classList.toggle('flipped'); // Añade/quita una clase CSS
    }
}

/**
 * Muestra la información del personaje secreto (oculta por defecto en el juego real).
 */
function renderSecretCharacter() {
    secretCharacterImage.src = secretCharacter.imageUrl;
    secretCharacterImage.alt = secretCharacter.name;
    secretCharacterName.textContent = secretCharacter.name;
    secretCharacterImage.style.display = 'none'; // Oculta por defecto
    secretCharacterName.style.display = 'none'; // Oculta por defecto
}

/**
 * Reinicia el juego, volviendo a la pantalla de configuración y limpiando el estado.
 */
function resetGame() {
    gameSetupDiv.style.display = 'block';
    gameBoardContentDiv.style.display = 'none'; // Oculta el tablero
    characterCardsContainer.innerHTML = '';
    secretCharacter = null;
    boardCharacters = [];
    selectedCategoryIds = [];
    attributeQuestionsDiv.innerHTML = ''; // Limpiar preguntas anteriores

    // Desmarcar todos los checkboxes
    document.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
    console.log('Juego reiniciado.');
}

// Nota: La función generateAttributeQuestions se definirá en public/js/questions.js
// y será llamada desde game.js