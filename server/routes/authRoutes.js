// server/routes/authRoutes.js
const express = require('express');
const router = express.Router(); // Crea un enrutador de Express
const authController = require('../controllers/authController'); // Importa las funciones del controlador de autenticación

// Ruta para registrar un usuario
router.post('/register', authController.registerUser);

// Ruta para iniciar sesión de usuario
router.post('/login', authController.loginUser);

module.exports = router; // Exporta el enrutador