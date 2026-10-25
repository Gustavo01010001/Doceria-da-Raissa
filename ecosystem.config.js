// Configuração do PM2: mantém o site rodando e religa sozinho se cair ou se o servidor reiniciar
module.exports = {
    apps: [{
        name: 'doceria',
        script: 'app.js',
        cwd: __dirname,
        max_memory_restart: '300M',
        time: true
    }]
};
