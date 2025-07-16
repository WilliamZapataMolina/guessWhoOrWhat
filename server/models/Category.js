const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

// ¡Asegúrate de que el nombre del modelo aquí sea EXACTAMENTE 'Category'!
module.exports = mongoose.model('Category', CategorySchema);