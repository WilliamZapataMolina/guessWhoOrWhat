document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const playerNameSpan = document.getElementById('playerName'); // Para mostrar el nombre/correo del usuario

    // --- Verificación de Autenticación al Cargar la Página ---
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail'); // O userName/alias una vez que lo implementes

    if (!token || !userEmail) {
        // Si no hay token o email, redirigir a la página de login
        alert('No estás autenticado. Por favor, inicia sesión.'); // Opcional: proporcionar feedback al usuario
        window.location.href = '/'; // Redirige a la página principal de login/registro
        return; // Detener la ejecución adicional de este script
    }

    // Mostrar información del usuario si ha iniciado sesión
    playerNameSpan.textContent = userEmail;

    // --- Lógica del Botón de Cerrar Sesión ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userId'); // También eliminar el ID de usuario
            alert('Sesión cerrada. Redirigiendo...'); // Opcional: feedback al usuario
            window.location.href = '/'; // Redirige a la página principal de login/registro
        });
    }

    console.log('Lógica del juego cargada para el usuario:', userEmail);
    // --- Aquí irá toda la lógica específica del juego, carga de cartas, etc. ---
    // Ejemplo: Añadir dinámicamente una carta de personaje
    const characterCardsContainer = document.getElementById('characterCardsContainer');
    if (characterCardsContainer) {
        // Esto es un marcador de posición. Lo reemplazarás con datos reales de tu backend.
        const exampleCardHtml = `
            <div class="character-card">
                <img src="https://via.placeholder.com/120x150?text=Personaje+Ejemplo" alt="Personaje Ejemplo">
                </div>
        `;
        characterCardsContainer.innerHTML = exampleCardHtml;
    }
});