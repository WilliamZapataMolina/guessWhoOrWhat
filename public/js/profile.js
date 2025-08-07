//Asegura que el secript se ejecute solo cuando la página está completamente cargada
document.addEventListener('DOMContentLoaded', () => {
    //--- Referencias a los elementos de la interfaz de usuario (UI)---
    const logoutBtn = document.getElementById('logoutBtn');
    const avatarGallery = document.querySelector('.avatar-gallery');
    const currentAvatarImg = document.getElementById('currentAvatar');
    const gamesPlayedSpan = document.getElementById('gamesPlayed');
    const winsSpan = document.getElementById('wins');
    const lossesSpan = document.getElementById('losses');
    const aliasInput = document.getElementById('aliasInput');
    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    const saveAliasBtn = document.getElementById('saveAliasBtn');

    // --- Obtener datos del usuario desde el almacenamiento local ---
    // Usamos 'localStorage' para obtener la información del usuario que se guardó al iniciar sesión.
    const userEmail = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');

    let selectedAvatarUrl = currentAvatarImg.src;

    // --- Cierre de sesión ---
    // Si el botón de cierre de sesión existe, se añade un evento 'click' para manejar la acción de cerrar sesión.
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                //Envía una solicitud GET al servidor para la ruta de 'logout'.
                const res = await fetch('/logout', { method: 'GET' });
                if (res.ok) {
                    // Si el servidor responde exitosamente, elimina los datos del usuario del almacenamiento local.
                    localStorage.removeItem('token');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userId');
                    window.location.replace('/');
                } else {
                    // Muestra una alerta si el cierre de sesión falla en el servidor.
                    alert('Error al cerrar sesión. Intenta de nuevo.');
                }
            } catch (error) {
                //Muestra una alerta si no se puede conectar con el servidor.
                alert('No se pudo conectar con el servidor para cerrar sesión.');
            }
        });
    }

    // --- Lógica para selección de avatar desde galería ---
    document.querySelectorAll('.avatar-option').forEach(img => {
        img.addEventListener('click', () => {
            const selectedUrl = img.dataset.url;
            //Actualiza la imagen del avatar actual con la URL seleccionada.
            currentAvatarImg.src = selectedUrl;
            //Guarda la URL seleccionada en la variable para usarla más tarde.
            currentAvatarImg.dataset.avatarUrl = selectedUrl;
        });
    });

    //Manejar la selección de un avatar
    avatarGallery.addEventListener('click', (e) => {
        // Verifica que el clic haya sido en una imagen con la clase 'avatar-option'.
        if (e.target.classList.contains('avatar-option')) {
            //Remueve la selección previa
            document.querySelectorAll('.avatar-option').forEach(img => {
                img.classList.remove('border', 'border-primary');
            });
            // Añade un borde a la imagen seleccionada
            e.target.classList.add('boreder', 'border-primary');

            // Actualiza la URL del avatar seleccionado y la imagen principal.
            selectedAvatarUrl = e.target.dataset.url;
            currentAvatarImg.src = selectedAvatarUrl;
        }
    });

    // --- Lógica del botón "Guardar Avatar" ---
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', async () => {
            //Asegura que el usuario haya seleccionado un avatar.
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

    // --- Cargar datos del perfil al inicio ---
    async function fetchUserProfileData() {
        try {
            const response = await fetch('/profile/data');
            if (response.ok) {
                const data = await response.json();
                // Actualizar el avatar y alias en la interfaz
                aliasInput.value = data.alias || userEmail;
                gamesPlayedSpan.textContent = data.stats.gamesPlayed !== undefined ? data.stats.gamesPlayed : 0;
                winsSpan.textContent = data.stats.gamesWon !== undefined ? data.stats.gamesWon : "0";
                lossesSpan.textContent = data.stats.gamesLost !== undefined ? data.stats.gamesLost : "0";

                console.log('Datos del perfil cargados:', data);
            } else {
                console.error('Error al cargar los datos del perfil:', response.statusText);
            }
        } catch (error) {
            console.error('Error al conectar con el servidor:', error);
        }
    }

    //Llamar a la función para cargar los datos del perfil al inicio
    fetchUserProfileData();
});
