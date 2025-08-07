// Espera a que el DOM (la estructura de la página) esté completamente cargado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    //Se obtinen todos del HTML que se necesitan para la funcionalidad de login y registro
    const form = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const authErrors = document.getElementById('authErrors');

    //Esto determina a qué acción se enviarán los datos del formulario (login o signup)
    // Inicialmente se establece en 'login', pero cambiará según el botón presionado
    let action = 'login';


    // --- Funciones principales ---
    // Lógica para enviar el formulario
    const submitForm = async (event) => {
        // Evita que el formulario se envíe de la manera tradicional
        event.preventDefault();

        authErrors.textContent = ''; // limpiar errores anteriores

        // Obtenemos los valores del email y la contraseña, y eliminamos espacios en blanco al inicio y final.
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        //Manejo de errores de red o del servidor
        try {
            //Petición asincrona al servidor usando fetch
            const res = await fetch(`/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Convierte los datos a formato JSON y los envía en el cuerpo de la petición.
                body: JSON.stringify({ email, password })
            });
            //Parsea la respuesta del servidor como JSON
            const data = await res.json();
            console.log('Respuesta del servidor:', data);

            if (!res.ok) {
                //Si la respuesta incluye errores de validación específicos, los muestra en el elemento authErrors.
                if (data.errors) {
                    authErrors.textContent = `${data.errors.email || ''} ${data.errors.password || ''}`.trim();
                    //Si hay un mensaje de error general, lo muestra también.
                } else if (data.message) {
                    authErrors.textContent = data.message;
                } else {
                    //Si el error no es específico, muestra un mensaje genérico.
                    authErrors.textContent = 'Ocurrió un error inesperado.';
                }
                //Termina la ejecución de la función si hay errores.
                return;
            }
            //Si la respuesta es exitosa y contiene un usuario y una URL de redirección,
            if (data.user && data.redirect) {
                //Guarda el email del usuario en el alamacenamiento local del navegador para su uso posterior. 
                localStorage.setItem('userEmail', data.user.email);
                //Redirige al usuario a la URL indicada
                window.location.href = data.redirect;
            }
        } catch (err) {
            //Captura errores de la red o fallos en la conexión al servidor.
            console.error('Error al enviar los datos:', err);
            authErrors.textContent = 'Error de red o del servidor.';
        }
    };

    // ---Manejo de eventos---
    // Añade un 'event listener' a los botones de login y registro.
    // El '?. ' (optional chaining) asegura que el código no falle si el botón no existe.

    //Cuando se hace clic en el botón de login actualiza la acción y envía el formulario.
    loginBtn?.addEventListener('click', () => {
        action = 'login';
        // Llamamos a submitForm con un objeto que simula el evento para que la función no falle.
        submitForm({ preventDefault: () => { } });
    });
    //Cuando se hace clic en el botón de registro actualiza la acción y envía el formulario.
    registerBtn?.addEventListener('click', () => {
        action = 'signup';
        // Llamamos a submitForm con un objeto que simula el evento para que la función no falle.
        submitForm({ preventDefault: () => { } }); // Llama a la función de envío
    });

    // Se mantiene el evento 'submit' en caso de que se presione ENTER en el formulario
    if (form) {
        form.addEventListener('submit', submitForm);
    } else {
        console.warn('No se encontró el formulario #authForm');
    }
});