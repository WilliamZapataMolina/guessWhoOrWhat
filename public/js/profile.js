document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const currentAvatarImg = document.getElementById('currentAvatar');
    const gamesPlayedSpan = document.getElementById('gamesPlayed');
    const winsSpan = document.getElementById('wins');
    const lossesSpan = document.getElementById('losses');
    const aliasInput = document.getElementById('aliasInput');
    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    const saveAliasBtn = document.getElementById('saveAliasBtn');

    const userEmail = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');

    // --- Cierre de sesión ---
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

    // --- Lógica para selección de avatar desde galería ---
    document.querySelectorAll('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            const selectedUrl = img.dataset.url;
            currentAvatarImg.src = selectedUrl;
            currentAvatarImg.dataset.avatarUrl = selectedUrl;
        });
    });

    // --- Guardar avatar seleccionado ---
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', () => {
            const avatarUrl = currentAvatarImg.dataset.avatarUrl;
            if (!avatarUrl) return alert("Selecciona un avatar primero.");

            fetch('/update-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatarUrl })
            })
                .then(res => res.json())
                .then(data => alert(data.message || "Avatar actualizado correctamente."))
                .catch(err => alert("Error al guardar el avatar."));
        });
    }

    // --- Guardar alias ---
    if (saveAliasBtn) {
        saveAliasBtn.addEventListener('click', () => {
            const alias = aliasInput.value.trim();
            if (!alias) return alert("Debes ingresar un alias.");

            fetch('/update-alias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias })
            })
                .then(res => res.json())
                .then(data => alert(data.message || "Alias actualizado correctamente."))
                .catch(err => alert("Error al guardar el alias."));
        });
    }

    // --- Mostrar datos por defecto antes de que el backend los proporcione ---
    currentAvatarImg.src = "images/default-avatar.png";
    gamesPlayedSpan.textContent = "N/A";
    winsSpan.textContent = "N/A";
    lossesSpan.textContent = "N/A";

    console.log('Lógica del perfil cargada para el usuario:', userEmail);

    // 🔄 (Opcional) Aquí podrías hacer un fetch para cargar el avatar y alias reales si tu backend lo permite
});
