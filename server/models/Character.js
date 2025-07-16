const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Guarda el public_id de Cloudinary para construir la URL
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    // Puedes añadir una referencia a una categoría si las tienes
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    // Otros atributos del personaje (color de pelo, gafas, etc.) que usarás para las preguntas
    attributes: {
        hairColor: { type: String },
        hasGlasses: { type: Boolean, default: false },
        // ... etc.
    }
}, { timestamps: true });

module.exports = mongoose.model('Character', CharacterSchema);