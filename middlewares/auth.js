const verificarLogin = (req, res, next) => {
    if (req.session.logado) {
        
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        
        next(); 
    } 
    
    else {
        res.redirect('/login'); 
    }
};

module.exports = { verificarLogin };