document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const avatarGallery = document.querySelector('.avatar-gallery');
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

    let selectedAvatarUrl = currentAvatarImg.src;

    //Manejar la selección de un avatar
    avatarGallery.addEventListener('click', (e) => {
        if (e.target.classList.contains('avatar-option')) {
            //Remueve la selección previa
            document.querySelectorAll('.avatar-option').forEach(img => {
                img.classList.remove('border', 'border-primary');
            });
            e.target.classList.add('boreder', 'border-primary');

            selectedAvatarUrl = e.target.dataset.url;
            currentAvatarImg.src = selectedAvatarUrl;
        }
    });

    // --- Lógica del botón "Guardar Avatar" ---
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', async () => {
            if (selectedAvatarUrl) {
                try {
                    const response = await fetch('/profile/update-avatar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ avatarUrl: selectedAvatarUrl })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error('Error al guardar el avatar:', error);
                    alert('Error al conectar con el servidor.');
                }
            } else {
                alert('Por favor, selecciona un avatar antes de guardar.');
            }
        });
    }

    // --- Lógica del botón "Guardar Alias" ---
    if (saveAliasBtn) {
        saveAliasBtn.addEventListener('click', async () => {
            const alias = aliasInput.value.trim();
            if (!alias) {
                return alert("El alias no puede estar vacío.");
            }
            try {
                const response = await fetch('/profile/update-alias', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ alias: alias })
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.message);
                } else {
                    alert(`Error: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al guardar el alias:', error);
                alert('Error al conectar con el servidor.');
            }
        });
    }


    // --- Mostrar datos por defecto antes de que el backend los proporcione ---
    // currentAvatarImg.src = "https://res.cloudinary.com/diddlk54m/image/upload/v1754394747/avatarDefault_rl2tzy.png";
    gamesPlayedSpan.textContent = "N/A";
    winsSpan.textContent = "N/A";
    lossesSpan.textContent = "N/A";

    console.log('Lógica del perfil cargada para el usuario:', userEmail);

    // 🔄 (Opcional) Aquí podrías hacer un fetch para cargar el avatar y alias reales si tu backend lo permite
});
