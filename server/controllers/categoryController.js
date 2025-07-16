const Category = require('../models/Category'); // Importa el modelo Category

// Crear una nueva categoría
exports.createCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre de la categoría es requerido.' });
    }
    try {
        const newCategory = new Category({ name, description });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        if (error.code === 11000) { // Error de clave duplicada (nombre único)
            return res.status(409).json({ message: 'Ya existe una categoría con este nombre.' });
        }
        console.error('Error al crear categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la categoría.' });
    }
};

// Obtener todas las categorías
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener las categorías.' });
    }
};

// Obtener una categoría por ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Categoría no encontrada.' });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error('Error al obtener categoría por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la categoría.' });
    }
};

// Actualizar una categoría por ID
exports.updateCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true, runValidators: true }
        );
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Categoría no encontrada para actualizar.' });
        }
        res.status(200).json(updatedCategory);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ya existe otra categoría con este nombre.' });
        }
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la categoría.' });
    }
};

// Eliminar una categoría por ID
exports.deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Categoría no encontrada para eliminar.' });
        }
        res.status(200).json({ message: 'Categoría eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la categoría.' });
    }
};