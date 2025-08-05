const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Por favor, ingresa un correo electrónico'],
        unique: true,
        trim: true,
        lowercase: true, // Guarda el email en minúsculas para consistencia
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} no es un correo electrónico válido!`
        }
    },
    password: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: 'https://res.cloudinary.com/diddlk54m/image/upload/v1754394747/avatarDefault_rl2tzy.png', // URL del avatar por defecto
    },
    status: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        gamesLost: { type: Number, default: 0 },
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//Middleware de Mongoose: hashea la contraseña antes de guardar el usuario
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error)
    }
});

//Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.login = async function (email, password) {
    // Busca el usuario por email (asegúrate de que el email se guarde en lowercase)
    const user = await this.findOne({ email });
    if (user) {
        // Usa tu método de instancia comparePassword para verificar la contraseña
        const auth = await user.comparePassword(password);
        if (auth) {
            return user; // Si la contraseña es correcta, devuelve el objeto de usuario
        }
        // Si las contraseñas no coinciden, lanza un error
        throw Error('Contraseña incorrecta');
    }
    // Si el usuario no se encuentra, lanza un error
    throw Error('Email no registrado');
};

const User = mongoose.model('User', userSchema);

module.exports = User;