const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupSwagger } = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// Importação das rotas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta uploads (fotos de perfil e publicações)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir o Frontend de Testes localizado na pasta public
app.use(express.static(path.join(__dirname, '../public')));

// Documentação Swagger / OpenAPI
setupSwagger(app);

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Rota de status/healthcheck da API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Fitinity Community API',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas inexistentes (404)
app.use(notFoundHandler);

// Middleware centralizado de tratamento de erros (500, multer, validações)
app.use(errorHandler);

module.exports = app;
