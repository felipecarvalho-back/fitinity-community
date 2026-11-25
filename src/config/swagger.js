const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Fitinity Community API',
    version: '1.0.0',
    description: 'API RESTful completa para a comunidade fitness Fitinity Community, com autenticação JWT, upload de imagens (Multer) e banco de dados relacional (MySQL/MariaDB).'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor Local de Desenvolvimento'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Insira o token JWT retornado no login ou cadastro para autenticar as requisições privadas.'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Carlos Silva' },
          email: { type: 'string', format: 'email', example: 'carlos@fitinity.com' },
          bio: { type: 'string', example: 'Atleta amador focado em corrida e musculação' },
          avatar_url: { type: 'string', example: '/uploads/avatars/avatar-1-1700000000.jpg' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          user_id: { type: 'integer', example: 1 },
          author_name: { type: 'string', example: 'Carlos Silva' },
          author_avatar: { type: 'string', example: '/uploads/avatars/avatar-1-1700000000.jpg' },
          content: { type: 'string', example: 'Treino de perna finalizado hoje! 🏋️‍♂️💪' },
          image_url: { type: 'string', example: '/uploads/posts/post-1-1700000000.jpg' },
          likes_count: { type: 'integer', example: 12 },
          comments_count: { type: 'integer', example: 3 },
          is_liked_by_me: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          user_id: { type: 'integer', example: 2 },
          post_id: { type: 'integer', example: 10 },
          author_name: { type: 'string', example: 'Ana Beatriz' },
          author_avatar: { type: 'string', example: null },
          content: { type: 'string', example: 'Boa! Parabéns pela consistência!' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensagem explicativa do erro' }
        }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Cadastrar novo usuário',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Carlos Silva' },
                  email: { type: 'string', example: 'carlos@fitinity.com' },
                  password: { type: 'string', minLength: 6, example: 'senha123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Usuário cadastrado com sucesso' },
          400: { description: 'Dados inválidos' },
          409: { description: 'E-mail já cadastrado' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Autenticar usuário e obter JWT',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'carlos@fitinity.com' },
                  password: { type: 'string', example: 'senha123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login realizado com sucesso' },
          401: { description: 'Credenciais inválidas' }
        }
      }
    },
    '/api/users/me': {
      get: {
        summary: 'Consultar dados do usuário autenticado',
        tags: ['Perfil de Usuário'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Perfil retornado com sucesso' },
          401: { description: 'Não autenticado' }
        }
      },
      patch: {
        summary: 'Atualizar dados do perfil (nome, bio, senha)',
        tags: ['Perfil de Usuário'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Carlos Silva Atualizado' },
                  bio: { type: 'string', example: 'Nova biografia sobre fitness' },
                  current_password: { type: 'string', example: 'senha123' },
                  new_password: { type: 'string', minLength: 6, example: 'novaSenha123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Perfil atualizado com sucesso' },
          400: { description: 'Erro de validação ou senha atual incorreta' },
          401: { description: 'Não autenticado' }
        }
      }
    },
    '/api/users/me/avatar': {
      post: {
        summary: 'Enviar foto de perfil (avatar)',
        tags: ['Perfil de Usuário'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo de imagem (JPEG, PNG, WEBP, GIF, máx 2MB)'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Foto atualizada com sucesso' },
          400: { description: 'Tipo inválido ou limite de tamanho excedido' },
          401: { description: 'Não autenticado' }
        }
      },
      delete: {
        summary: 'Excluir foto de perfil',
        tags: ['Perfil de Usuário'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Foto excluída com sucesso' },
          400: { description: 'Usuário não possui foto' },
          401: { description: 'Não autenticado' }
        }
      }
    },
    '/api/posts': {
      get: {
        summary: 'Listar publicações da comunidade',
        tags: ['Publicações'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Lista de publicações' }
        }
      },
      post: {
        summary: 'Criar uma nova publicação com imagem opcional',
        tags: ['Publicações'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Fiz 10km de corrida hoje pela manhã! 🏃💨' },
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Imagem opcional da publicação (JPEG, PNG, WEBP, GIF, máx 5MB)'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Publicação criada' },
          400: { description: 'Conteúdo obrigatório ou arquivo inválido' },
          401: { description: 'Não autenticado' }
        }
      }
    },
    '/api/posts/{id}': {
      get: {
        summary: 'Consultar uma publicação específica e seus comentários',
        tags: ['Publicações'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Publicação detalhada' },
          404: { description: 'Publicação não encontrada' }
        }
      },
      patch: {
        summary: 'Editar publicação própria',
        tags: ['Publicações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string', example: 'Texto atualizado da publicação' },
                  image: { type: 'string', format: 'binary' },
                  remove_image: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Publicação atualizada' },
          403: { description: 'Proibido: publicação pertence a outro usuário' },
          404: { description: 'Publicação não encontrada' }
        }
      },
      delete: {
        summary: 'Excluir publicação própria',
        tags: ['Publicações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Publicação excluída com sucesso' },
          403: { description: 'Proibido: publicação pertence a outro usuário' },
          404: { description: 'Publicação não encontrada' }
        }
      }
    },
    '/api/posts/{id}/likes': {
      post: {
        summary: 'Curtir uma publicação',
        tags: ['Interações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          201: { description: 'Publicação curtida' },
          400: { description: 'Usuário já curtiu esta publicação' },
          404: { description: 'Publicação não encontrada' }
        }
      },
      delete: {
        summary: 'Remover curtida da publicação',
        tags: ['Interações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Curtida removida' },
          400: { description: 'Usuário não havia curtido' },
          404: { description: 'Publicação não encontrada' }
        }
      }
    },
    '/api/posts/{id}/comments': {
      get: {
        summary: 'Listar comentários de uma publicação',
        tags: ['Interações'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Lista de comentários' },
          404: { description: 'Publicação não encontrada' }
        }
      },
      post: {
        summary: 'Adicionar comentário a uma publicação',
        tags: ['Interações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Inspirador! Parabéns pelo resultado!' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Comentário adicionado' },
          400: { description: 'Conteúdo obrigatório' },
          404: { description: 'Publicação não encontrada' }
        }
      }
    },
    '/api/comments/{id}': {
      patch: {
        summary: 'Editar comentário próprio',
        tags: ['Interações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Comentário corrigido' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Comentário atualizado' },
          403: { description: 'Proibido: comentário pertence a outro usuário' },
          404: { description: 'Comentário não encontrado' }
        }
      },
      delete: {
        summary: 'Excluir comentário próprio',
        tags: ['Interações'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Comentário excluído' },
          403: { description: 'Proibido: comentário pertence a outro usuário' },
          404: { description: 'Comentário não encontrado' }
        }
      }
    }
  }
};

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  // Rota JSON caso queiram importar no Postman/Insomnia
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
}

module.exports = {
  setupSwagger,
  swaggerDocument
};
