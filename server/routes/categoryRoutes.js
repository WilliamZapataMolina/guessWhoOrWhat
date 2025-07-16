const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController'); // Importa el controlador de categorías

// Rutas para CATEGORIAS
router.post('/', categoryController.createCategory);        // Crear
router.get('/', categoryController.getAllCategories);      // Obtener todas
router.get('/:id', categoryController.getCategoryById);    // Obtener por ID
router.put('/:id', categoryController.updateCategory);     // Actualizar
router.delete('/:id', categoryController.deleteCategory);  // Eliminar

module.exports = router;