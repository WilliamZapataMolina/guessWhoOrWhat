// server/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, checkUser } = require('../middleware/authMiddleware');

// Ruta para actualizar el avatar del usuario
router.post('/update-avatar', requireAuth, async (req, res) => {
    try {
        const { avatarUrl } = req.body;
        // Usa res.locals.user._id para acceder al ID del usuario
        const user = await User.findByIdAndUpdate(res.locals.user._id, { avatar: avatarUrl }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Avatar actualizado con éxito.' });
    } catch (error) {
        console.error('Error al actualizar el avatar:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para actualizar el alias del usuario
router.post('/update-alias', requireAuth, async (req, res) => {
    try {
        const { alias } = req.body;
        if (!alias) {
            return res.status(400).json({ message: 'El alias no puede estar vacío.' });
        }
        // Usa res.locals.user._id para acceder al ID del usuario
        const user = await User.findByIdAndUpdate(res.locals.user._id, { alias: alias }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Alias actualizado con éxito.' });
    } catch (error) {
        console.error('Error al actualizar el alias:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
// === RUTA PARA OBTENER DATOS DEL PERFIL ===
router.get('/data', checkUser, async (req, res) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }

        // Asumimos que las estadísticas están en user.stats
        // Enviamos el alias, el avatar y las estadísticas
        res.status(200).json({
            alias: user.alias,
            avatarUrl: user.avatarUrl,
            stats: user.stats || { gamesPlayed: 0, gamesWon: 0, gamesLost: 0 }
        });

    } catch (error) {
        console.error('Error al obtener datos del perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
module.exports = router;