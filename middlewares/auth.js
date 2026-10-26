const crypto = require('crypto');

const verificarLogin = (req, res, next) => {
    if (req.session.logado) {

        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

        // Código secreto que vai escondido nos formulários do painel (proteção CSRF)
        if (!req.session.csrfToken) {
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        }
        res.locals.csrfToken = req.session.csrfToken;

        next();
    }

    else {
        res.redirect('/login');
    }
};

// Só aceita o formulário se ele trouxer o código da sessão. Assim outro site
// não consegue fazer o navegador da chef apagar ou mudar produtos escondido.
const verificarCsrf = (req, res, next) => {
    const enviado = Buffer.from(String((req.body && req.body._csrf) || ''));
    const esperado = Buffer.from(req.session.csrfToken || '');

    if (esperado.length > 0 && enviado.length === esperado.length && crypto.timingSafeEqual(enviado, esperado)) {
        return next();
    }
    res.status(403).send('A página ficou desatualizada. <a href="/admin">Volte ao painel</a> e tente de novo.');
};

module.exports = { verificarLogin, verificarCsrf };
