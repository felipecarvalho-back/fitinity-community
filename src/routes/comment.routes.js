const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Rotas diretas de comentários /api/comments/:id
router.use(authMiddleware);

router.patch('/:id', commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

module.exports = router;
