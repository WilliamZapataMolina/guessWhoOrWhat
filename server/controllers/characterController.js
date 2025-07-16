// server/controllers/characterController.js
const Character = require('../models/Character'); // Importa el modelo Character
const Category = require('../models/Category');   // También necesitamos Category para validar categoryId

// Crear un nuevo personaje/elemento
exports.createCharacter = async (req, res) => {
    const { name, imageUrl, categoryId, description } = req.body;
    if (!name || !imageUrl || !categoryId || !description) {
        return res.status(400).json({ message: 'Nombre, URL de imagen, ID de categoría y descripción son requeridos.' });
    }
    try {
        // Verificar si la categoría existe
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
            return res.status(404).json({ message: 'La categoría especificada no existe.' });
        }

        const newCharacter = new Character({ name, imageUrl, categoryId, description });
        await newCharacter.save();

        // Opcional: Popular la categoría para la respuesta
        const populatedCharacter = await Character.findById(newCharacter._id).populate('categoryId', 'name');

        res.status(201).json(populatedCharacter);
    } catch (error) {
        if (error.code === 11000) { // Error de clave duplicada (nombre único)
            return res.status(409).json({ message: 'Ya existe un personaje/elemento con este nombre.' });
        }
        console.error('Error al crear personaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear el personaje/elemento.' });
    }
};

// Obtener todos los personajes/elementos
exports.getAllCharacters = async (req, res) => {
    try {
        const characters = await Character.find().populate('categoryId', 'name');
        res.status(200).json(characters);
    } catch (error) {
        console.error('Error al obtener personajes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener los personajes/elementos.' });
    }
};

// Obtener un personaje/elemento por ID
exports.getCharacterById = async (req, res) => {
    try {
        const character = await Character.findById(req.params.id).populate('categoryId', 'name');
        if (!character) {
            return res.status(404).json({ message: 'Personaje/elemento no encontrado.' });
        }
        res.status(200).json(character);
    } catch (error) {
        console.error('Error al obtener personaje por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el personaje/elemento.' });
    }
};

// Actualizar un personaje/elemento por ID
exports.updateCharacter = async (req, res) => {
    const { name, imageUrl, categoryId, description } = req.body;
    try {
        // Si se proporciona un categoryId, verificar que exista
        if (categoryId) {
            const categoryExists = await Category.findById(categoryId);
            if (!categoryExists) {
                return res.status(404).json({ message: 'La nueva categoría especificada no existe.' });
            }
        }

        const updatedCharacter = await Character.findByIdAndUpdate(
            req.params.id,
            { name, imageUrl, categoryId, description },
            { new: true, runValidators: true }
        );
        if (!updatedCharacter) {
            return res.status(404).json({ message: 'Personaje/elemento no encontrado para actualizar.' });
        }

        // Opcional: Popular la categoría para la respuesta actualizada
        const populatedCharacter = await Character.findById(updatedCharacter._id).populate('categoryId', 'name');

        res.status(200).json(populatedCharacter);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ya existe otro personaje/elemento con este nombre.' });
        }
        console.error('Error al actualizar personaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el personaje/elemento.' });
    }
};

// Eliminar un personaje/elemento por ID
exports.deleteCharacter = async (req, res) => {
    try {
        const deletedCharacter = await Character.findByIdAndDelete(req.params.id);
        if (!deletedCharacter) {
            return res.status(404).json({ message: 'Personaje/elemento no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Personaje/elemento eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar personaje:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el personaje/elemento.' });
    }
};