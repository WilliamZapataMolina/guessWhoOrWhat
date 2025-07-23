// server/controllers/characterController.js
const Character = require('../models/Character'); // Importa el modelo Character
const cloudinary = require('cloudinary').v2; // Importa Cloudinary para manejar imágenes
const Category = require('../models/Category');   // También necesitamos Category para validar categoryId
const mongoose = require('mongoose');

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
/**
 * @desc Obtiene todos los personajes de una o varias categorías específicas.
 * @route GET /api/characters/byCategories?categoryIds=id1,id2,id3
 * @access Public
 */
exports.getCharactersByCategories = async (req, res) => {
    // Los IDs de categoría se esperan como una cadena separada por comas en la query
    const categoryIdsString = req.query.categoryIds;

    if (!categoryIdsString) {
        return res.status(400).json({ message: 'Se requiere al menos un ID de categoría.' });
    }
    try {
        // Convierte la cadena de IDs en un array de ObjectIds
        const categoryObjectIds = categoryIdsString.split(',').map(id => new mongoose.Types.ObjectId(id.trim()));

        // Opcional: Verificar que todas las categorías existan (puede ser costoso si hay muchos IDs)
        // Para simplificar, asumiremos que los IDs proporcionados son válidos.

        const characters = await Character.find({ categoryId: { $in: categoryObjectIds } }).populate('categoryId', 'name');

        if (characters.length === 0) {
            return res.status(404).json({ message: 'No se encontraron personajes para las categorías especificadas.' });
        }

        res.status(200).json(characters);
    } catch (error) {
        console.error('Error al obtener personajes por categorías:', error);
        // Manejar errores de formato de ObjectId si la cadena es inválida
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ message: 'Uno o más ID de categoría son inválidos.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al obtener los personajes por categorías.' });
    }

};
/**
 * @desc Obtiene un conjunto balanceado de personajes aleatorios de categorías específicas para el tablero del juego.
 * También selecciona uno de ellos como el personaje secreto.
 * @route POST /api/characters/game/balanced
 * @body { array } categoryIds - Array de IDs de categoría.
 * @body { number } [totalCharacters=24] - Número total de personajes deseados en el tablero.
 * @access Public
 */
exports.getBalancedCharactersForGame = async (req, res) => {
    const { categoryIds, totalCharacters = 24 } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de categoría.' });
    }
    if (typeof totalCharacters !== 'number' || totalCharacters <= 0) {
        return res.status(400).json({ message: 'El número total de personajes debe ser un número positivo.' });
    }

    try {
        console.log('Category IDs recibidos:', categoryIds);
        const categoryObjectIds = categoryIds.map(id => new mongoose.Types.ObjectId(id.trim()));

        // Opcional: Verificar que todas las categorías existan
        const existingCategories = await Category.find({ _id: { $in: categoryObjectIds } });
        if (existingCategories.length !== categoryObjectIds.length) {
            return res.status(404).json({ message: 'Algunas de las categorías especificadas no existen.' });
        }

        let allSelectedCharacters = [];
        const numCategories = categoryObjectIds.length;
        const charactersPerCategoryBase = Math.floor(totalCharacters / numCategories);
        let remainingCharacters = totalCharacters % numCategories;

        for (let i = 0; i < numCategories; i++) {
            const currentCategoryId = categoryObjectIds[i];
            let numToSelect = charactersPerCategoryBase;
            if (remainingCharacters > 0) {
                numToSelect++; // Distribuye los caracteres restantes de forma equitativa
                remainingCharacters--;
            }

            const selectedFromCategory = await Character.aggregate([
                { $match: { categoryId: currentCategoryId } },
                { $sample: { size: numToSelect } }
            ]);
            allSelectedCharacters = allSelectedCharacters.concat(selectedFromCategory);
        }

        // Shuffle final para asegurar que el orden de las cartas sea aleatorio en el tablero
        // aunque se hayan seleccionado por categoría.
        for (let i = allSelectedCharacters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSelectedCharacters[i], allSelectedCharacters[j]] = [allSelectedCharacters[j], allSelectedCharacters[i]];
        }

        // Seleccionar el personaje secreto de entre los personajes seleccionados para el tablero
        if (allSelectedCharacters.length === 0) {
            return res.status(404).json({ message: 'No se pudieron obtener personajes para el juego con las categorías especificadas.' });
        }
        const secretCharacterIndex = Math.floor(Math.random() * allSelectedCharacters.length);
        const secretCharacter = allSelectedCharacters[secretCharacterIndex];

        // Retornar tanto la lista de personajes para el tablero como el personaje secreto
        res.status(200).json({
            boardCharacters: allSelectedCharacters,
            secretCharacter: secretCharacter
        });

    } catch (error) {
        console.error('Error al obtener personajes balanceados para el juego:', error);
        // Manejar errores de CastError si los IDs no son válidos
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ message: 'Uno o más ID de categoría son inválidos.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al obtener los personajes balanceados.' });
    }
};