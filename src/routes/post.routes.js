const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const commentController = require('../controllers/comment.controller');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth.middleware');
const { uploadPostImage } = require('../middlewares/upload.middleware');

// Listar e consultar publicações (públicas ou personalizadas para usuário logado)
router.get('/', optionalAuthMiddleware, postController.listPosts);
router.get('/:id', optionalAuthMiddleware, postController.getPostById);

// Criar, editar e excluir publicações (privadas)
router.post('/', authMiddleware, uploadPostImage, postController.createPost);
router.patch('/:id', authMiddleware, uploadPostImage, postController.updatePost);
router.delete('/:id', authMiddleware, postController.deletePost);

// Interações: Curtidas
router.post('/:id/likes', authMiddleware, postController.likePost);
router.delete('/:id/likes', authMiddleware, postController.unlikePost);

// Interações: Comentários
router.get('/:id/comments', commentController.listComments);
router.post('/:id/comments', authMiddleware, commentController.createComment);
router.patch('/:id/comments/:commentId', authMiddleware, (req, res, next) => {
  req.params.id = req.params.commentId;
  return commentController.updateComment(req, res, next);
});
router.delete('/:id/comments/:commentId', authMiddleware, (req, res, next) => {
  req.params.id = req.params.commentId;
  return commentController.deleteComment(req, res, next);
});

module.exports = router;
