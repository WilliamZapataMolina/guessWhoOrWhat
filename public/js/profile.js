document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const currentAvatarImg = document.getElementById('currentAvatar');
    const gamesPlayedSpan = document.getElementById('gamesPlayed');
    const winsSpan = document.getElementById('wins');
    const lossesSpan = document.getElementById('losses');

    // --- Verificación de Autenticación al Cargar la Página ---

    const userEmail = localStorage.getItem('userEmail'); // O userName/alias
    const userId = localStorage.getItem('userId');



    // --- Lógica del Botón de Cerrar Sesión ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/logout', { method: 'GET' });
                if (res.ok) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userId');

                    window.location.replace('/');
                } else {
                    alert('Error al cerrar sesión. Intenta de nuevo.');
                }
            } catch (error) {
                alert('No se pudo conectar con el servidor para cerrar sesión.');
            }
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