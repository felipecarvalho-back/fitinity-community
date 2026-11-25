const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { deleteUploadedFile } = require('../middlewares/upload.middleware');

/**
 * Consulta perfil do usuário autenticado
 * GET /api/users/me
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      `SELECT id, name, email, bio, avatar_url, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Opcional: estatísticas para o perfil (contagem de posts, likes)
    const [postCount] = await db.query('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId]);
    const [likeCount] = await db.query('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', [userId]);

    return res.status(200).json({
      user: {
        ...users[0],
        total_posts: postCount[0].count,
        total_likes: likeCount[0].count
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Atualiza dados do perfil (nome, bio, senha opcional)
 * PATCH /api/users/me
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, bio, current_password, new_password } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'O nome não pode ser vazio.' });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio.trim());
    }

    // Se o usuário deseja alterar a senha
    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      if (!current_password) {
        return res.status(400).json({ error: 'Informe a senha atual para alterá-la.' });
      }

      const [userRows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (userRows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const isMatch = await bcrypt.compare(current_password, userRows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }

      const newHash = await bcrypt.hash(new_password, 10);
      updates.push('password_hash = ?');
      values.push(newHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado informado para atualização.' });
    }

    values.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updatedUsers] = await db.query(
      'SELECT id, name, email, bio, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso!',
      user: updatedUsers[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload de foto de perfil
 * POST /api/users/me/avatar
 */
async function uploadAvatarHandler(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado no campo "avatar".' });
    }

    // Busca foto anterior para deletar do disco caso exista
    const [userRows] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    const oldAvatar = userRows[0]?.avatar_url;

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

    // Deleta avatar anterior caso existisse
    if (oldAvatar && oldAvatar !== avatarUrl) {
      await deleteUploadedFile(oldAvatar);
    }

    return res.status(200).json({
      message: 'Foto de perfil atualizada com sucesso!',
      avatar_url: avatarUrl
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a foto de perfil
 * DELETE /api/users/me/avatar
 */
async function deleteAvatarHandler(req, res, next) {
  try {
    const userId = req.user.id;

    const [userRows] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    const currentAvatar = userRows[0]?.avatar_url;

    if (!currentAvatar) {
      return res.status(400).json({ error: 'O usuário não possui foto de perfil para remover.' });
    }

    await db.query('UPDATE users SET avatar_url = NULL WHERE id = ?', [userId]);
    await deleteUploadedFile(currentAvatar);

    return res.status(200).json({
      message: 'Foto de perfil removida com sucesso!'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatarHandler,
  deleteAvatarHandler
};
