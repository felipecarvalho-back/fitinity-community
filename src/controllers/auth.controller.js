const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'chave_padrao_fitinity_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Validador simples de e-mail
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Cadastra um novo usuário
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Validações de entrada
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Nome, e-mail e senha são obrigatórios.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Formato de e-mail inválido.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 6 caracteres.'
      });
    }

    // Verifica duplicidade de e-mail
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    // Gera o hash com bcrypt (nunca salvar texto puro)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const userId = result.insertId;

    // Gera token JWT para login imediato
    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), name: name.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        avatar_url: null,
        bio: null
      },
      token
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Autentica usuário e retorna token JWT
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'E-mail e senha são obrigatórios.'
      });
    }

    // Busca usuário pelo e-mail
    const [users] = await db.query(
      'SELECT id, name, email, password_hash, bio, avatar_url, created_at FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Credenciais inválidas.'
      });
    }

    const user = users[0];

    // Compara senha enviada com o hash salvo no banco
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas.'
      });
    }

    // Gera token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
};
