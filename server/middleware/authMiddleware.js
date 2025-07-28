const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Middleware para proteger rutas (requireAuth) ---
const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                console.error(`[requireAuth] Token inválido: ${err.message}`);
                return res.redirect('/');
            }
            try {
                const user = await User.findById(decodedToken.id);
                if (!user) {
                    console.warn(`[requireAuth] Usuario no encontrado. Redirigiendo.`);
                    res.clearCookie('jwt');
                    return res.redirect('/');
                }
                res.locals.user = user;
                next();
            } catch (dbError) {
                console.error(`[requireAuth] Error DB al buscar usuario:`, dbError);
                res.clearCookie('jwt');
                return res.redirect('/');
            }
        });
    } else {
        console.log(`[requireAuth] Sin token. Redirigiendo a /`);
        res.redirect('/');
    }
};

// --- Middleware para verificar usuario actual (checkUser) ---
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;
    console.log(`[checkUser] INICIO. Solicitud a: ${req.url}, Token: ${token ? 'Sí' : 'No'}`);

    if (!token) {
        console.log(`[checkUser] No hay token para ${req.url}.`);
        res.locals.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
        if (err) {
            console.log('JWT inválido en checkUser', err.message);
            res.locals.user = null;
            return next();
        }

        try {
            console.log(`[checkUser] Intentando buscar usuario con ID: ${decodedToken.id}`);
            const user = await User.findById(decodedToken.id);
            console.log(`[checkUser] Resultado de User.findById: ${user ? user.email : 'NO ENCONTRADO'}`);

            if (!user) {
                res.locals.user = null;
                res.clearCookie('jwt');

                /*  if (req.originalUrl === '/game' || req.originalUrl === '/profile') {
                      console.log(`[checkUser] Usuario no encontrado en ruta protegida, redirigiendo a /`);
                      return res.redirect('/');
                  }*/

                return next();
            }

            res.locals.user = user;
            console.log(`[checkUser] Usuario válido: ${user.email}`);
            return next();

        } catch (dbError) {
            console.error(`[checkUser] ERROR DB al buscar usuario ${decodedToken.id} para ${req.url}:`, dbError);
            res.locals.user = null;
            return next();
        }
    });
};

module.exports = { requireAuth, checkUser };