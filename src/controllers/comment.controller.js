const { db } = require('../config/database');

/**
 * Adiciona comentário a uma publicação
 * POST /api/posts/:id/comments
 */
async function createComment(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'O conteúdo do comentário é obrigatório.' });
    }

    // Verifica se a publicação existe
    const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const [result] = await db.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
      [userId, postId, content.trim()]
    );

    const commentId = result.insertId;

    const [commentRows] = await db.query(
      `SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, c.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    return res.status(201).json({
      message: 'Comentário adicionado com sucesso!',
      comment: commentRows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista comentários de uma publicação
 * GET /api/posts/:id/comments
 */
async function listComments(req, res, next) {
  try {
    const postId = req.params.id;

    const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const [comments] = await db.query(
      `SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, c.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return res.status(200).json({
      total: comments.length,
      comments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Edita apenas o próprio comentário
 * PATCH /api/comments/:id
 */
async function updateComment(req, res, next) {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'O conteúdo do comentário não pode ficar vazio.' });
    }

    const [comments] = await db.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }

    const comment = comments[0];

    // Verificação de autorização: apenas o autor do comentário pode editar
    if (comment.user_id !== userId) {
      return res.status(403).json({
        error: 'Você não tem permissão para editar este comentário. Operação não autorizada.'
      });
    }

    await db.query('UPDATE comments SET content = ? WHERE id = ?', [content.trim(), commentId]);

    const [updatedRows] = await db.query(
      `SELECT c.id, c.user_id, c.post_id, c.content, c.created_at, c.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    return res.status(200).json({
      message: 'Comentário atualizado com sucesso!',
      comment: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Exclui apenas o próprio comentário
 * DELETE /api/comments/:id
 */
async function deleteComment(req, res, next) {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    const [comments] = await db.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }

    const comment = comments[0];

    // Verificação de autorização: apenas o autor do comentário pode excluir
    if (comment.user_id !== userId) {
      return res.status(403).json({
        error: 'Você não tem permissão para excluir este comentário. Operação não autorizada.'
      });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [commentId]);

    return res.status(200).json({
      message: 'Comentário excluído com sucesso!'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComment,
  listComments,
  updateComment,
  deleteComment
};
