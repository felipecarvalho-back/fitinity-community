const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que os diretórios existam
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const postsDir = path.join(__dirname, '../../uploads/posts');

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}

// Filtro para aceitar apenas imagens
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Tipo de arquivo inválido. Apenas imagens JPEG, PNG, WEBP e GIF são permitidas.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Storage para Avatares
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user ? req.user.id : 'anon'}-${uniqueSuffix}${ext}`);
  }
});

// Storage para Publicações
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${req.user ? req.user.id : 'anon'}-${uniqueSuffix}${ext}`);
  }
});

// Limite configurável (padrão 2MB para avatar e 5MB para posts)
const maxAvatarSize = 2 * 1024 * 1024; // 2MB
const maxPostSize = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024; // 5MB

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: maxAvatarSize }
}).single('avatar');

const uploadPostImage = multer({
  storage: postStorage,
  fileFilter: imageFilter,
  limits: { fileSize: maxPostSize }
}).single('image');

/**
 * Remove com segurança um arquivo do disco a partir de sua URL relativa (ex: /uploads/avatars/foto.jpg)
 */
async function deleteUploadedFile(relativeUrl) {
  if (!relativeUrl) return;

  try {
    // Normaliza para caminho relativo dentro da pasta uploads
    const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
    const fullPath = path.join(__dirname, '../../', cleanUrl);

    // Proteção contra path traversal
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const resolvedPath = path.resolve(fullPath);

    if (resolvedPath.startsWith(uploadsRoot) && fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      console.log(`[Upload] Arquivo removido do disco: ${resolvedPath}`);
    }
  } catch (error) {
    console.error(`[Upload] Erro ao remover arquivo ${relativeUrl}:`, error.message);
  }
}

module.exports = {
  uploadAvatar,
  uploadPostImage,
  deleteUploadedFile,
  maxAvatarSize,
  maxPostSize
};
