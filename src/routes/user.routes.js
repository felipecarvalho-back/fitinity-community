const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');

// Todas as rotas de perfil do usuário exigem autenticação
router.use(authMiddleware);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.post('/me/avatar', uploadAvatar, userController.uploadAvatarHandler);
router.delete('/me/avatar', userController.deleteAvatarHandler);

module.exports = router;
