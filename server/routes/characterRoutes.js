const express = require('express');
const router = express.Router();

const characterController = require('../controllers/characterController'); // Importa el controlador de personajes

//Rutas para la lógica del juego(deben estar en esta posición, antes de las rutas para personajes)
router.get('/byCategories', characterController.getCharactersByCategories);
router.post('/game/balanced', characterController.getBalancedCharactersForGame);

// Rutas para PERSONAJES
router.post('/', characterController.createCharacter);       // Crear
router.get('/', characterController.getAllCharacters);     // Obtener todos
router.get('/:id', characterController.getCharacterById);   // Obtener por ID
router.put('/:id', characterController.updateCharacter);    // Actualizar
router.delete('/:id', characterController.deleteCharacter); // Eliminar

module.exports = router;