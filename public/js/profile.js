document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const currentAvatarImg = document.getElementById('currentAvatar');
    const gamesPlayedSpan = document.getElementById('gamesPlayed');
    const winsSpan = document.getElementById('wins');
    const lossesSpan = document.getElementById('losses');

    // --- Verificación de Autenticación al Cargar la Página ---
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail'); // O userName/alias
    const userId = localStorage.getItem('userId');

    if (!token || !userEmail || !userId) {
        // Si no está autenticado, redirigir a la página de login
        alert('No estás autenticado. Por favor, inicia sesión.');
        window.location.href = '/';
        return;
    }

    // --- Lógica del Botón de Cerrar Sesión ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userId');
            alert('Sesión cerrada. Redirigiendo...');
            window.location.href = '/';
        });
    }

    // --- Mostrar Información del Perfil del Usuario (Marcadores de posición) ---
    // Más tarde, obtendrás el avatar y las estadísticas reales de tu backend
    currentAvatarImg.src = "images/default-avatar.png"; // Cargar el avatar real de los datos del usuario más tarde
    gamesPlayedSpan.textContent = "N/A";
    winsSpan.textContent = "N/A";
    lossesSpan.textContent = "N/A";

    console.log('Lógica del perfil cargada para el usuario:', userEmail);

    // --- Aquí irá la lógica para subir avatar, cambiar alias, obtener estadísticas ---
});