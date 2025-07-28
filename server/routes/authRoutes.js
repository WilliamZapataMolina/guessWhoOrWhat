// server/routes/authRoutes.js
const express = require('express');
const router = express.Router(); // Crea un enrutador de Express
const authController = require('../controllers/authController'); // Importa las funciones del controlador de autenticación

// Ruta para registrar un usuario
router.post('/signup', authController.signup_post);

// Ruta para iniciar sesión de usuario
router.post('/login', authController.login_post);

router.get('/logout', authController.logout_get);

module.exports = router; 