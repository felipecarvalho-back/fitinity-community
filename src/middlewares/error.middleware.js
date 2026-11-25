const multer = require('multer');

/**
 * Middleware central de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  // Trata erros de JSON inválido no corpo da requisição
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Formato de JSON inválido na requisição.'
    });
  }

  // Trata erros específicos do Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo excede o tamanho máximo permitido.'
      });
    }
    return res.status(400).json({
      error: `Erro no upload de arquivo: ${err.message}`
    });
  }

  // Trata erros personalizados de validação de arquivo
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: err.message
    });
  }

  console.error('[ErrorHandler]', err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Ocorreu um erro interno no servidor.';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message, stack: err.stack })
  });
}

/**
 * Middleware para capturar rotas não encontradas (404)
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Rota ${req.method} ${req.originalUrl} não encontrada.`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
