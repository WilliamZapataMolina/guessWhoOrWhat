document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const authErrors = document.getElementById('authErrors');

    let action = 'login'; // valor por defecto

    // Lógica para enviar el formulario
    const submitForm = async (event) => {
        event.preventDefault();

        authErrors.textContent = ''; // limpiar errores anteriores

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const res = await fetch(`/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            console.log('Respuesta del servidor:', data);

            if (!res.ok) {
                if (data.errors) {
                    authErrors.textContent = `${data.errors.email || ''} ${data.errors.password || ''}`.trim();
                } else if (data.message) {
                    authErrors.textContent = data.message;
                } else {
                    authErrors.textContent = 'Ocurrió un error inesperado.';
                }
                return;
            }

            if (data.user && data.redirect) {
                localStorage.setItem('userEmail', data.user.email);
                window.location.href = data.redirect;
            }
        } catch (err) {
            console.error('Error al enviar los datos:', err);
            authErrors.textContent = 'Error de red o del servidor.';
        }
    };

    // Los botones ya no son de tipo 'submit', así que añadimos el evento 'click' para manejar el envío
    loginBtn?.addEventListener('click', () => {
        action = 'login';
        submitForm({ preventDefault: () => { } }); // Llama a la función de envío
    });

    registerBtn?.addEventListener('click', () => {
        action = 'signup';
        submitForm({ preventDefault: () => { } }); // Llama a la función de envío
    });

    // Se mantiene el evento 'submit' en caso de que se presione ENTER en el formulario
    if (form) {
        form.addEventListener('submit', submitForm);
    } else {
        console.warn('No se encontró el formulario #authForm');
    }
});