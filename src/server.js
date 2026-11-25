require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/database');

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    // Inicializa e verifica tabelas do banco de dados
    await initDatabase();

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Fitinity Community API rodando na porta ${PORT}`);
      console.log(`📌 Documentação Swagger: http://localhost:${PORT}/api/docs`);
      console.log(`💻 Frontend de Testes:  http://localhost:${PORT}/`);
      console.log(`⚡ Healthcheck:          http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Falha crítica ao iniciar o servidor:', error);
    process.exit(1);
  }
}

bootstrap();
