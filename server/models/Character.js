const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Guarda el public_id de Cloudinary para construir la URL
    imageUrl: {
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
    birthName: { type: String },
    nickName: { type: String },
    description: { type: String },

    attributes: {
        gender: { type: String, enum: ['masculino', 'femenino', 'neutro', 'N/A'] },
        occupationType: { type: String },
        isAlive: { type: Boolean },
        isFictional: { type: Boolean },
        nationality: { type: String },
        continent: { type: String },
        hasGlasses: { type: Boolean },
        hasHat: { type: Boolean },
        skinColor: { type: String },
        hairColor: { type: String },
        eyeColor: { type: String },
        facialHair: { type: String },
        isPresident: { type: Boolean },
        isKingOrQueen: { type: Boolean },
        isAthete: { type: Boolean },
        isMusician: { type: Boolean },
        hasScars: { type: Boolean, default: null },
        isBald: { type: Boolean },
        era: { type: String },
        knownFor: { type: String },
        historicalImpact: { type: String, enum: ['bajo', 'medio', 'alto', 'N/A'] },
        genre: { type: String },
        notableFor: { type: String },
        awards: { type: String },
        sport: { type: String },
        team: { type: String },
        position: { type: String },
        medals: { type: String },
        fieldOfStudy: { type: String },
        fieldOfScience: { type: String },
        species: { type: String },
        color: { type: String },
        hasClothes: { type: Boolean },
        isAnthropomorphic: { type: Boolean },
        isTalking: { type: Boolean },
        enemy: { type: String },
        armorType: { type: String },
        artisticMovement: { type: String },
        musicalPeriod: { type: String },

        // --- ATRIBUTOS ESPECÍFICOS PARA GEOGRAFÍA ---
        type: { type: String, enum: ['estructura', 'fenomeno_natural', 'paisaje', 'ciudad', 'estructura_arqueologica', 'paisaje_urbano', 'N/A'] },
        location: { type: String }, // País o Ciudad+País
        isManMade: { type: Boolean },
        isHistorical: { type: Boolean },
        isIconic: { type: Boolean },
        dominantColor: { type: String },
        material: { type: String },
        heightCategory: { type: String, enum: ['bajo', 'medio', 'alto', 'muy_alto', 'N/A'] },
        waterFeatureNearby: { type: Boolean },
        vegetationPresent: { type: Boolean },
        timePeriod: { type: String, enum: ['antiguo', 'moderno', 'contemporaneo', 'millones_de_años', 'N/A'] },
        tourismAttraction: { type: Boolean }
    },
    notableWorks: [{ type: String }],
    notableAchievements: [{ type: String }] // Para personas
}, { timestamps: true });

module.exports = mongoose.model('Character', CharacterSchema);