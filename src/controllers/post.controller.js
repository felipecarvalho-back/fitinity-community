const { db } = require('../config/database');
const { deleteUploadedFile } = require('../middlewares/upload.middleware');

/**
 * Cria uma nova publicação
 * POST /api/posts
 */
async function createPost(req, res, next) {
  try {
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      // Se subiu arquivo mas o conteúdo está vazio, remove o arquivo que acabou de ser enviado
      if (req.file) {
        await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
      }
      return res.status(400).json({ error: 'O texto da publicação é obrigatório.' });
    }

    const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

    const [result] = await db.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [userId, content.trim(), imageUrl]
    );

    const postId = result.insertId;

    // Retorna a publicação recém-criada com os dados do autor
    const [postRows] = await db.query(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    return res.status(201).json({
      message: 'Publicação criada com sucesso!',
      post: {
        ...postRows[0],
        likes_count: 0,
        comments_count: 0,
        is_liked_by_me: false
      }
    });
  } catch (error) {
    if (req.file) {
      await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
    }
    next(error);
  }
}

/**
 * Lista publicações da comunidade
 * GET /api/posts
 */
async function listPosts(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const isLikedExpr = currentUserId
      ? '(SELECT COUNT(*) > 0 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?)'
      : 'FALSE';

    const query = `
      SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.updated_at,
             u.name as author_name, u.avatar_url as author_avatar,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
             ${isLikedExpr} as is_liked_by_me
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = currentUserId ? [currentUserId, limit, offset] : [limit, offset];
    const [posts] = await db.query(query, queryParams);

    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM posts');
    const total = totalRows[0].total;

    return res.status(200).json({
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      posts: posts.map(p => ({
        ...p,
        likes_count: Number(p.likes_count),
        comments_count: Number(p.comments_count),
        is_liked_by_me: Boolean(p.is_liked_by_me)
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Consulta uma publicação específica
 * GET /api/posts/:id
 */
async function getPostById(req, res, next) {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const isLikedExpr = currentUserId
      ? '(SELECT COUNT(*) > 0 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?)'
      : 'FALSE';

    const query = `
      SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.updated_at,
             u.name as author_name, u.avatar_url as author_avatar,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
             ${isLikedExpr} as is_liked_by_me
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    const queryParams = currentUserId ? [currentUserId, postId] : [postId];
    const [posts] = await db.query(query, queryParams);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    // Busca comentários desta publicação
    const [comments] = await db.query(
      `SELECT c.id, c.user_id, c.content, c.created_at, c.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const post = posts[0];

    return res.status(200).json({
      post: {
        ...post,
        likes_count: Number(post.likes_count),
        comments_count: Number(post.comments_count),
        is_liked_by_me: Boolean(post.is_liked_by_me),
        comments
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Edita publicação própria
 * PATCH /api/posts/:id
 */
async function updatePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, remove_image } = req.body;

    // Busca o post
    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);

    if (posts.length === 0) {
      if (req.file) await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const post = posts[0];

    // Verificação de autorização: apenas o dono pode editar!
    if (post.user_id !== userId) {
      if (req.file) await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
      return res.status(403).json({
        error: 'Você não tem permissão para editar esta publicação. Operação não autorizada.'
      });
    }

    const updatedContent = content !== undefined ? content.trim() : post.content;

    if (!updatedContent) {
      if (req.file) await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
      return res.status(400).json({ error: 'O texto da publicação não pode ficar vazio.' });
    }

    let newImageUrl = post.image_url;

    // Se uma nova imagem foi enviada
    if (req.file) {
      newImageUrl = `/uploads/posts/${req.file.filename}`;
      // Remove imagem antiga se existia
      if (post.image_url && post.image_url !== newImageUrl) {
        await deleteUploadedFile(post.image_url);
      }
    } else if (remove_image === 'true' || remove_image === true) {
      if (post.image_url) {
        await deleteUploadedFile(post.image_url);
      }
      newImageUrl = null;
    }

    await db.query(
      'UPDATE posts SET content = ?, image_url = ? WHERE id = ?',
      [updatedContent, newImageUrl, postId]
    );

    const [updatedRows] = await db.query(
      `SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.updated_at,
              u.name as author_name, u.avatar_url as author_avatar
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    return res.status(200).json({
      message: 'Publicação atualizada com sucesso!',
      post: updatedRows[0]
    });
  } catch (error) {
    if (req.file) await deleteUploadedFile(`/uploads/posts/${req.file.filename}`);
    next(error);
  }
}

/**
 * Exclui publicação própria
 * DELETE /api/posts/:id
 */
async function deletePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const post = posts[0];

    // Verificação de autorização: apenas o dono pode excluir!
    if (post.user_id !== userId) {
      return res.status(403).json({
        error: 'Você não tem permissão para excluir esta publicação. Operação não autorizada.'
      });
    }

    // Se possuir imagem, apaga do disco
    if (post.image_url) {
      await deleteUploadedFile(post.image_url);
    }

    // Exclui do banco de dados (as chaves estrangeiras com CASCADE removem likes e comentários)
    await db.query('DELETE FROM posts WHERE id = ?', [postId]);

    return res.status(200).json({
      message: 'Publicação excluída com sucesso!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Curtir publicação
 * POST /api/posts/:id/likes
 */
async function likePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Verifica se o post existe
    const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    // Tenta inserir like (restrição UNIQUE user_id + post_id)
    try {
      await db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
    } catch (insertError) {
      if (insertError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Você já curtiu esta publicação.' });
      }
      throw insertError;
    }

    const [countRows] = await db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    return res.status(201).json({
      message: 'Publicação curtida com sucesso!',
      likes_count: countRows[0].count,
      is_liked_by_me: true
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remover curtida da publicação
 * DELETE /api/posts/:id/likes
 */
async function unlikePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const [result] = await db.query(
      'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Você ainda não curtiu esta publicação.' });
    }

    const [countRows] = await db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    return res.status(200).json({
      message: 'Curtida removida com sucesso!',
      likes_count: countRows[0].count,
      is_liked_by_me: false
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPost,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost
};
