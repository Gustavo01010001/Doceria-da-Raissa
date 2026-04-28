const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'doceria-super-secreta',
    resave: false,
    saveUninitialized: true
}));

const lojaRoutes = require('./routes/lojaRoutes');
const carrinhoRoutes = require('./routes/carrinhoRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', lojaRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando liso na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});