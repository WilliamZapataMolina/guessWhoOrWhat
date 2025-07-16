// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const registerButton = document.getElementById('registerButton');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const messageDisplay = document.getElementById('message');
    const authSection = document.getElementById('auth-section');
    const gameSection = document.getElementById('game-section');
    const userEmailDisplay = document.getElementById('userEmail');

    // Función para mostrar mensajes al usuario
    function showMessage(msg, type = 'info') {
        messageDisplay.textContent = msg;
        messageDisplay.className = `message ${type}`; // Añade clase para estilos (success, error)
        setTimeout(() => {
            messageDisplay.textContent = '';
            messageDisplay.className = 'message';
        }, 5000); // El mensaje desaparece después de 5 segundos
    }

    // Función para cambiar la vista entre autenticación y juego
    function updateUI() {
        const token = localStorage.getItem('token');
        const userEmail = localStorage.getItem('userEmail');

        if (token && userEmail) {
            // Usuario autenticado
            authSection.style.display = 'none';
            gameSection.style.display = 'block';
            userEmailDisplay.textContent = userEmail;
        } else {
            // No autenticado
            authSection.style.display = 'block';
            gameSection.style.display = 'none';
            userEmailDisplay.textContent = '';
        }
    }

    // --- Event Listeners para los botones ---

    registerButton.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('Por favor, ingresa un correo y una contraseña.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) { // Si el estado es 2xx (ej. 201 Created)
                showMessage(data.message, 'success');
                // Opcional: Autologuear después de registrar
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', data.user.email);
                updateUI();
            } else {
                showMessage(`Error al registrar: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error de red al registrar:', error);
            showMessage('Error de conexión con el servidor al registrar.', 'error');
        }
    });

    loginButton.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('Por favor, ingresa un correo y una contraseña.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) { // Si el estado es 2xx (ej. 200 OK)
                showMessage(data.message, 'success');
                localStorage.setItem('token', data.token); // Guarda el token en localStorage
                localStorage.setItem('userEmail', data.user.email); // Guarda el email del usuario
                updateUI(); // Actualiza la UI para mostrar la sección del juego
            } else {
                showMessage(`Error al iniciar sesión: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error de red al iniciar sesión:', error);
            showMessage('Error de conexión con el servidor al iniciar sesión.', 'error');
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token'); // Elimina el token
        localStorage.removeItem('userEmail'); // Elimina el email
        showMessage('Sesión cerrada exitosamente.', 'info');
        updateUI(); // Actualiza la UI para mostrar la sección de autenticación
    });

    // Al cargar la página, verifica si ya hay un token para mostrar la UI correcta
    updateUI();
});