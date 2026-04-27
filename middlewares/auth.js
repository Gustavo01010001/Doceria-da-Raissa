// middlewares/auth.js

const verificarLogin = (req, res, next) => {
    if (req.session.logado) {
        next(); // Deixa passar
    } else {
        res.redirect('/login'); // Manda de volta pro login
    }
};

module.exports = { verificarLogin };