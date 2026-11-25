/**
 * Script de testes automatizados para a Fitinity Community API
 * Executa todas as validações descritas no Item 10 do PDF da avaliação.
 */
const app = require('../src/app');
const { initDatabase } = require('../src/config/database');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testCount = 0;
let passCount = 0;
let autoStartedServer = null;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASSOU] ${message}`);
  } else {
    console.error(`  ❌ [FALHOU] ${message}`);
  }
}

async function ensureServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      console.log(`📡 Conectado ao servidor já em execução em ${BASE_URL}`);
      return;
    }
  } catch {
    // Servidor não está rodando; inicia automaticamente
  }

  console.log(`⚡ Servidor não detectado em ${BASE_URL}. Inicializando servidor para os testes...`);
  await initDatabase();

  await new Promise((resolve) => {
    autoStartedServer = app.listen(3000, () => {
      console.log(`🚀 Servidor temporário de testes iniciado na porta 3000.\n`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 INICIANDO TESTES AUTOMATIZADOS DA API FITINITY COMMUNITY');
  console.log(`Alvo: ${BASE_URL}`);
  console.log('============================================================\n');

  try {
    // Garante que o servidor esteja rodando (inicia automaticamente se necessário)
    await ensureServerRunning();

    // 0. Healthcheck
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes.status === 200, 'Healthcheck da API respondendo 200 OK');

    // 1. Cadastrar Usuário A (Carlos)
    console.log('\n[Cenário 1: Cadastro e Verificação de Duplicidade]');
    const uniqueEmailCarlos = `carlos_${Date.now()}@fitinity.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Silva',
        email: uniqueEmailCarlos,
        password: 'senhaSegura123'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, `Cadastro de novo usuário retornado 201 Created (ID: ${regData.user?.id})`);
    assert(!!regData.token, 'Token JWT retornado no cadastro');

    // 2. Tentar cadastrar o mesmo e-mail novamente (Deve retornar 409 Conflict)
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Clone',
        email: uniqueEmailCarlos,
        password: 'outraSenha123'
      })
    });
    assert(dupRes.status === 409, 'Tentativa de cadastrar e-mail duplicado bloqueada com 409 Conflict');

    // 3. Cadastrar Usuário B (Ana) para testes de autorização cruzada
    const uniqueEmailAna = `ana_${Date.now()}@fitinity.com`;
    const regAnaRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Souza',
        email: uniqueEmailAna,
        password: 'senhaSegura123'
      })
    });
    const regAnaData = await regAnaRes.json();
    const tokenAna = regAnaData.token;

    // 4. Testes de Login
    console.log('\n[Cenário 2: Login com credenciais válidas e inválidas]');
    const loginValidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmailCarlos,
        password: 'senhaSegura123'
      })
    });
    const loginValidData = await loginValidRes.json();
    assert(loginValidRes.status === 200, 'Login com credenciais corretas retorna 200 OK');
    const tokenCarlos = loginValidData.token;

    const loginInvalidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmailCarlos,
        password: 'SENHA_INCORRETA'
      })
    });
    assert(loginInvalidRes.status === 401, 'Login com senha incorreta bloqueado com 401 Unauthorized');

    // 5. Testes de Rotas Privadas (com e sem token)
    console.log('\n[Cenário 3: Proteção de Rotas com JWT]');
    const privateWithoutToken = await fetch(`${BASE_URL}/api/users/me`);
    assert(privateWithoutToken.status === 401, 'Acesso à rota privada sem token rejeitado com 401 Unauthorized');

    const privateWithToken = await fetch(`${BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${tokenCarlos}` }
    });
    assert(privateWithToken.status === 200, 'Acesso à rota privada com token válido autorizado com 200 OK');

    // 6. Atualização de Perfil
    const updateProfileRes = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenCarlos}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Carlos Silva Atleta',
        bio: 'Foco total nos treinos e nutrição.'
      })
    });
    assert(updateProfileRes.status === 200, 'Atualização de dados do perfil retornou 200 OK');

    // 7. Teste de Upload: arquivo inválido
    console.log('\n[Cenário 4: Validação de Upload com Multer]');
    const fakeTextFile = new Blob(['isto nao eh uma imagem'], { type: 'text/plain' });
    const formDataInvalid = new FormData();
    formDataInvalid.append('avatar', fakeTextFile, 'arquivo.txt');

    const invalidUploadRes = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCarlos}` },
      body: formDataInvalid
    });
    assert(invalidUploadRes.status === 400, 'Upload de tipo de arquivo não permitido (.txt) rejeitado com 400 Bad Request');

    // 7b. Teste de Upload: arquivo acima do limite de 2MB para avatar
    const oversizedBuffer = Buffer.alloc(2 * 1024 * 1024 + 1024, 0);
    const oversizedBlob = new Blob([oversizedBuffer], { type: 'image/png' });
    const formDataOversized = new FormData();
    formDataOversized.append('avatar', oversizedBlob, 'grande.png');

    const oversizedUploadRes = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCarlos}` },
      body: formDataOversized
    });
    assert(oversizedUploadRes.status === 400, 'Upload de arquivo acima do limite (2MB) rejeitado com 400 Bad Request');

    // 8. Teste de Upload: imagem válida (PNG dummy 1x1 pixel)
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const validPngBlob = new Blob([validPngBuffer], { type: 'image/png' });
    const formDataValid = new FormData();
    formDataValid.append('avatar', validPngBlob, 'avatar.png');

    const validUploadRes = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCarlos}` },
      body: formDataValid
    });
    assert(validUploadRes.status === 200, 'Upload de foto de perfil válida aceito com 200 OK');

    // 9. Publicações (Criar, Listar, Detalhar)
    console.log('\n[Cenário 5: CRUD de Publicações]');
    const postForm = new FormData();
    postForm.append('content', 'Primeiro treino de musculação registrado na plataforma! 🏋️');
    postForm.append('image', validPngBlob, 'treino.png');

    const createPostRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCarlos}` },
      body: postForm
    });
    const createPostData = await createPostRes.json();
    assert(createPostRes.status === 201, `Publicação criada com sucesso com 201 Created (ID: ${createPostData.post?.id})`);
    const postId = createPostData.post?.id;

    const listPostsRes = await fetch(`${BASE_URL}/api/posts`);
    const listPostsData = await listPostsRes.json();
    assert(listPostsRes.status === 200 && listPostsData.posts?.length > 0, 'Listagem de publicações retornou lista com sucesso');

    const getPostRes = await fetch(`${BASE_URL}/api/posts/${postId}`);
    assert(getPostRes.status === 200, 'Consulta de publicação específica por ID retornou 200 OK');

    // 10. Teste de Autorização: Usuário B (Ana) tenta editar o post de Carlos
    console.log('\n[Cenário 6: Bloqueio de Alteração de Conteúdo Alheio (403 Forbidden)]');
    const unauthorizedEditRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenAna}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Tentativa indevida de alterar post alheio' })
    });
    assert(unauthorizedEditRes.status === 403, 'Tentativa de editar post de outro usuário bloqueada com 403 Forbidden');

    const unauthorizedDeleteRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAna}` }
    });
    assert(unauthorizedDeleteRes.status === 403, 'Tentativa de excluir post de outro usuário bloqueada com 403 Forbidden');

    // 11. Interações: Curtidas
    console.log('\n[Cenário 7: Interações (Curtidas e Comentários)]');
    const likeRes = await fetch(`${BASE_URL}/api/posts/${postId}/likes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAna}` }
    });
    assert(likeRes.status === 201, 'Curtir publicação retornou 201 Created');

    // Duplicar curtida deve ser impedido
    const dupLikeRes = await fetch(`${BASE_URL}/api/posts/${postId}/likes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAna}` }
    });
    assert(dupLikeRes.status === 400, 'Curtida duplicada bloqueada com 400 Bad Request');

    // 12. Interações: Comentários
    const commentRes = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAna}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Muito bom o treino! Parabéns!' })
    });
    const commentData = await commentRes.json();
    assert(commentRes.status === 201, `Comentário criado com sucesso com 201 Created (ID: ${commentData.comment?.id})`);
    const commentId = commentData.comment?.id;

    // Listar comentários da publicação
    const listCommentsRes = await fetch(`${BASE_URL}/api/posts/${postId}/comments`);
    const listCommentsData = await listCommentsRes.json();
    assert(listCommentsRes.status === 200 && listCommentsData.comments?.length > 0, 'Listagem de comentários da publicação retornou 200 OK');

    // Carlos tenta excluir o comentário de Ana (deve dar 403)
    const unauthorizedCommentDel = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCarlos}` }
    });
    assert(unauthorizedCommentDel.status === 403, 'Tentativa de excluir comentário de outro usuário bloqueada com 403 Forbidden');

    // Ana edita o próprio comentário
    const editCommentRes = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenAna}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Comentário editado pela própria autora!' })
    });
    assert(editCommentRes.status === 200, 'Edição de comentário próprio permitida com 200 OK');

    // Ana remove curtida
    const unlikeRes = await fetch(`${BASE_URL}/api/posts/${postId}/likes`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAna}` }
    });
    assert(unlikeRes.status === 200, 'Remoção de curtida retornou 200 OK');

    // Ana exclui o próprio comentário
    const delCommentRes = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAna}` }
    });
    assert(delCommentRes.status === 200, 'Exclusão de comentário próprio permitida com 200 OK');

    // Carlos edita o próprio post
    const editPostRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenCarlos}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'Texto atualizado pelo autor do post!' })
    });
    assert(editPostRes.status === 200, 'Edição do próprio post permitida com 200 OK');

    // Carlos exclui o próprio post
    const delPostRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCarlos}` }
    });
    assert(delPostRes.status === 200, 'Exclusão do próprio post permitida com 200 OK');

    // Carlos remove a foto de perfil
    const delAvatarRes = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCarlos}` }
    });
    assert(delAvatarRes.status === 200, 'Exclusão de foto de perfil retornou 200 OK');

    console.log('\n============================================================');
    console.log(`🎉 RESULTADO FINAL: ${passCount} de ${testCount} testes passaram com sucesso!`);
    console.log('============================================================\n');

    if (autoStartedServer) {
      autoStartedServer.close();
    }

    if (passCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    if (autoStartedServer) {
      autoStartedServer.close();
    }
    console.error('Erro inesperado durante a execução dos testes:', err);
    process.exit(1);
  }
}

runTests();

