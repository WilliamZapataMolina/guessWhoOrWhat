// server/controllers/authController.js
const User = require('../models/User'); // Importa el modelo User
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Asegúrate de que bcrypt esté importado, es necesario para el login y el hashing.

// --- NUEVO: Secret para JWT y duración del token/cookie ---
// DEBE ESTAR EN TU .ENV EN PRODUCCIÓN para seguridad.
const jwtSecret = process.env.JWT_SECRET || 'supersecretajwtnodeterminarasmiperro';
const maxAge = 3 * 24 * 60 * 60; // 3 días en segundos (para la expiración de la cookie)

// --- NUEVO: Función para crear un token JWT ---
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge
    });
};

// --- NUEVO/MEJORADO: Función para manejar errores de validación y duplicados ---
// Esta función es más robusta para manejar errores de Mongoose y duplicados.
const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { email: '', password: '' };

    // Errores de duplicación de email
    if (err.code === 11000) {
        errors.email = 'Ese email ya está registrado';
        return errors;
    }

    // Errores de validación de Mongoose
    if (err.message.includes('User validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }
    return errors;
};


// --- FUNCIÓN DE REGISTRO (signup_post) ---
exports.signup_post = async (req, res) => {
    // --- CAMBIO CLAVE: Extraer también el alias del cuerpo de la solicitud ---
    const { email, password, alias } = req.body;

    // Tu validación de campos requeridos (Mongoose ya lo hace, pero esto es una buena comprobación rápida)
    if (!email || !password) {
        return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
    }

    try {
        // Mongoose ya tiene la validación 'unique', así que el 'try...catch' se encargará de esto
        // Aquí creamos el usuario con los campos recibidos. Si 'alias' es null o undefined,
        // Mongoose asignará el valor 'default' que definimos en el modelo.
        const newUser = await User.create({ email, password, alias });

        res.clearCookie('jwt');

        const token = createToken(newUser._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000, sameSite: 'Lax' });

        // --- CAMBIO CLAVE: Enviar el alias asignado en la respuesta al cliente ---
        res.status(201).json({ user: { email: newUser.email, alias: newUser.alias }, redirect: '/game' });

    } catch (error) {
        // Usa la función handleErrors para un manejo más detallado de los errores de Mongoose
        if (error.name === 'ValidationError' || error.code === 11000) {
            const errors = handleErrors(error);
            return res.status(400).json({ errors });
        }
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
    }
};

// --- FUNCIÓN DE INICIO DE SESIÓN (login_post) - FUSIONADA ---
// Ahora usa `User.login` (método estático en el modelo) y establece la cookie HttpOnly.
exports.login_post = async (req, res) => {
    const { email, password } = req.body;

    // Tu validación de campos requeridos
    if (!email || !password) {
        // Mejor enviar un JSON con errores para el frontend, incluso para validaciones básicas
        return res.status(400).json({ errors: { email: 'Correo electrónico y contraseña son requeridos.' } });
    }

    try {
        // Intenta loguear al usuario usando el método estático User.login
        const user = await User.login(email, password); // Este método debe lanzar un error si las credenciales son incorrectas

        res.clearCookie('jwt'); // Limpia cualquier cookie jwt previa
        // Si el login fue exitoso, crea el token y establece la cookie HTTP-only
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000, sameSite: 'Lax' });

        // **REDIRECCIÓN DIRECTA DESDE EL SERVIDOR TRAS LOGIN EXITOSO**
        // Como tu formulario es tradicional, el navegador seguirá esta redirección automáticamente.
        res.status(200).json({ user: { email: user.email, id: user._id }, redirect: '/game' });

    } catch (error) {
        // Captura los errores lanzados por `User.login` (ej. 'Contraseña incorrecta', 'Email no registrado')
        console.error('Error durante el login:', error);

        // Prepara los mensajes de error para enviar al frontend en formato JSON
        // Esto permite que tu frontend capture el error y muestre un mensaje adecuado.
        let errors = { email: '', password: '' };
        if (error.message === 'incorrect email') { // Asume que User.login lanza este mensaje
            errors.email = 'Ese correo electrónico no está registrado.';
        } else if (error.message === 'incorrect password') { // Asume que User.login lanza este mensaje
            errors.password = 'Contraseña incorrecta.';
        } else {
            // Error genérico si el mensaje no coincide con los esperados
            errors.email = 'Error al intentar iniciar sesión. Inténtalo de nuevo.';
        }

        // Envía una respuesta de error JSON al cliente
        // Tu frontend necesitará JavaScript para leer esta respuesta y mostrar los errores.
        res.status(400).json({ errors });
    }
};

// --- NUEVO: Controlador para el logout de usuarios ---
// Este se llama cuando el cliente hace una solicitud GET a /logout (manejado en server.js)
exports.logout_get = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1, httpOnly: true, sameSite: 'Lax' }); // Borra la cookie (expira inmediatamente)
    res.redirect('/'); // Redirige a la página principal (o a /login)
};