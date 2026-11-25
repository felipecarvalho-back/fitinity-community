let authToken = localStorage.getItem('fitinity_token') || null;
let currentUser = JSON.parse(localStorage.getItem('fitinity_user') || 'null');
let currentEditingPostId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  updateSessionUI();
  loadFeed();
  if (authToken) {
    loadMyProfile();
  }
});

// Atualiza UI de sessão
function updateSessionUI() {
  const badge = document.getElementById('session-badge');
  if (currentUser && authToken) {
    badge.className = 'session-badge badge-auth';
    badge.innerHTML = `Logado como: <strong>${currentUser.name}</strong> (${currentUser.email}) | <a href="#" onclick="logout()" style="color:#ef4444; margin-left:6px;">Sair</a>`;
  } else {
    badge.className = 'session-badge badge-guest';
    badge.textContent = 'Modo Visitante (Não autenticado)';
  }
}

// Wrapper centralizado de chamadas de API que atualiza o console em tempo real
async function apiCall(endpoint, options = {}) {
  const startTime = Date.now();
  const method = options.method || 'GET';

  options.headers = options.headers || {};
  if (authToken && !options.skipAuth) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Se não for FormData, envia JSON
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(endpoint, options);
    const duration = Date.now() - startTime;
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { text: await res.text() };
    }

    logConsole(method, endpoint, res.status, data, duration);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    logConsole(method, endpoint, 0, { networkError: err.message }, Date.now() - startTime);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

// Atualiza o Console de Inspeção HTTP
function logConsole(method, endpoint, status, data, duration) {
  const statusDiv = document.getElementById('console-status');
  const jsonPre = document.getElementById('console-json');

  let methodClass = 'method-init';
  if (status >= 200 && status < 300) methodClass = 'method-200';
  else if (status >= 400) methodClass = 'method-400';

  statusDiv.innerHTML = `
    <span class="method-tag ${methodClass}">${method} ${status}</span>
    <span class="url-tag">${endpoint} (${duration}ms)</span>
  `;

  jsonPre.textContent = JSON.stringify(data, null, 2);
}

function clearConsole() {
  document.getElementById('console-status').innerHTML = `
    <span class="method-tag method-init">PRONTO</span>
    <span class="url-tag">Console limpo.</span>
  `;
  document.getElementById('console-json').textContent = '// Aguardando requisição...';
}

// Abas de Auth
function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    loginBtn.classList.remove('active');
    regBtn.classList.add('active');
  }
}

// Preenchimento rápido para testar múltiplos usuários
function fillQuickUser(type) {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (type === 'carlos') {
    emailInput.value = 'carlos@fitinity.com';
    passInput.value = 'senha123';
  } else {
    emailInput.value = 'ana@fitinity.com';
    passInput.value = 'senha123';
  }
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  if (result.ok) {
    authToken = result.data.token;
    currentUser = result.data.user;
    localStorage.setItem('fitinity_token', authToken);
    localStorage.setItem('fitinity_user', JSON.stringify(currentUser));
    updateSessionUI();
    loadMyProfile();
    loadFeed();
  } else {
    alert(`Erro no login (${result.status}): ` + (result.data.error || 'Credenciais inválidas'));
  }
}

// Cadastro
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: { name, email, password }
  });

  if (result.ok) {
    authToken = result.data.token;
    currentUser = result.data.user;
    localStorage.setItem('fitinity_token', authToken);
    localStorage.setItem('fitinity_user', JSON.stringify(currentUser));
    updateSessionUI();
    loadMyProfile();
    loadFeed();
    switchAuthTab('login');
    alert('Usuário cadastrado com sucesso e autenticado!');
  } else {
    alert(`Erro no cadastro (${result.status}): ` + (result.data.error || 'Falha ao cadastrar'));
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('fitinity_token');
  localStorage.removeItem('fitinity_user');
  updateSessionUI();
  document.getElementById('profile-name').textContent = 'Faça login para ver o perfil';
  document.getElementById('profile-email').textContent = '---';
  document.getElementById('profile-bio').textContent = '---';
  document.getElementById('profile-avatar-img').src = 'https://via.placeholder.com/80?text=Avatar';
  loadFeed();
}

// Perfil
async function loadMyProfile() {
  if (!authToken) {
    alert('Você precisa estar logado para consultar o perfil.');
    return;
  }

  const result = await apiCall('/api/users/me');
  if (result.ok) {
    const user = result.data.user;
    currentUser = user;
    localStorage.setItem('fitinity_user', JSON.stringify(user));
    document.getElementById('profile-name').textContent = `${user.name} (ID: ${user.id})`;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-bio').textContent = user.bio || 'Nenhuma biografia cadastrada.';
    document.getElementById('profile-avatar-img').src = user.avatar_url || 'https://via.placeholder.com/80?text=Sem+Foto';
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-bio').value = user.bio || '';
  }
}

async function updateProfile() {
  if (!authToken) return alert('Faça login primeiro.');

  const name = document.getElementById('edit-name').value;
  const bio = document.getElementById('edit-bio').value;

  const result = await apiCall('/api/users/me', {
    method: 'PATCH',
    body: { name, bio }
  });

  if (result.ok) {
    loadMyProfile();
    loadFeed();
    alert('Perfil atualizado com sucesso!');
  } else {
    alert(`Erro ao atualizar perfil (${result.status}): ` + result.data.error);
  }
}

async function uploadAvatar() {
  if (!authToken) return alert('Faça login primeiro.');
  const fileInput = document.getElementById('avatar-input');
  if (!fileInput.files || fileInput.files.length === 0) {
    return alert('Selecione um arquivo de imagem primeiro.');
  }

  const formData = new FormData();
  formData.append('avatar', fileInput.files[0]);

  const result = await apiCall('/api/users/me/avatar', {
    method: 'POST',
    body: formData
  });

  if (result.ok) {
    fileInput.value = '';
    loadMyProfile();
    loadFeed();
    alert('Avatar atualizado com sucesso!');
  } else {
    alert(`Erro no upload (${result.status}): ` + result.data.error);
  }
}

async function deleteAvatar() {
  if (!authToken) return alert('Faça login primeiro.');
  if (!confirm('Deseja realmente remover sua foto de perfil?')) return;

  const result = await apiCall('/api/users/me/avatar', {
    method: 'DELETE'
  });

  if (result.ok) {
    loadMyProfile();
    loadFeed();
    alert('Foto de perfil removida com sucesso!');
  } else {
    alert(`Erro ao remover foto (${result.status}): ` + result.data.error);
  }
}

// Posts
function previewPostFile(e) {
  const fileNameSpan = document.getElementById('post-file-name');
  if (e.target.files && e.target.files.length > 0) {
    fileNameSpan.textContent = e.target.files[0].name;
  } else {
    fileNameSpan.textContent = 'Nenhum arquivo';
  }
}

async function handleCreatePost(e) {
  e.preventDefault();
  if (!authToken) return alert('Faça login para criar uma publicação.');

  const content = document.getElementById('post-content').value;
  const fileInput = document.getElementById('post-image-file');

  const formData = new FormData();
  formData.append('content', content);
  if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  const result = await apiCall('/api/posts', {
    method: 'POST',
    body: formData
  });

  if (result.ok) {
    document.getElementById('post-content').value = '';
    fileInput.value = '';
    document.getElementById('post-file-name').textContent = 'Nenhum arquivo';
    loadFeed();
  } else {
    alert(`Erro ao criar publicação (${result.status}): ` + result.data.error);
  }
}

async function loadFeed() {
  const container = document.getElementById('posts-list');
  const result = await apiCall('/api/posts?limit=30');

  if (!result.ok) {
    container.innerHTML = `<p class="loading-hint">Erro ao carregar publicações: ${result.data.error}</p>`;
    return;
  }

  const posts = result.data.posts || [];
  if (posts.length === 0) {
    container.innerHTML = '<p class="loading-hint">Nenhuma publicação na comunidade ainda. Seja o primeiro a postar!</p>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const isOwner = currentUser && post.user_id === currentUser.id;
    const authorAvatar = post.author_avatar || 'https://via.placeholder.com/40?text=U';
    const postDate = new Date(post.created_at).toLocaleString('pt-BR');

    return `
      <div class="post-item" id="post-${post.id}">
        <div class="post-top">
          <div class="author-block">
            <img class="author-avatar" src="${authorAvatar}" alt="${post.author_name}">
            <div>
              <div class="author-name">${post.author_name} ${isOwner ? '<span class="pill-accent">Você</span>' : ''}</div>
              <div class="post-date">${postDate} (ID: ${post.id})</div>
            </div>
          </div>
          <div class="post-owner-actions">
            ${isOwner ? `
              <button class="btn btn-sm btn-outline" onclick="openEditModal(${post.id}, \`${escapeQuotes(post.content)}\`)">✏️ Editar</button>
              <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">🗑️ Excluir</button>
            ` : `
              <button class="btn btn-sm btn-outline" style="opacity:0.6;" onclick="tryUnauthorizedEdit(${post.id})">🔒 Testar 403 (Editar)</button>
            `}
          </div>
        </div>

        <div class="post-text">${escapeHtml(post.content)}</div>

        ${post.image_url ? `
          <div class="post-image-container">
            <img src="${post.image_url}" alt="Imagem do post">
          </div>
        ` : ''}

        <div class="post-bottom">
          <div class="post-metrics">
            <button class="metric-btn ${post.is_liked_by_me ? 'liked' : ''}" onclick="toggleLike(${post.id}, ${post.is_liked_by_me})">
              ${post.is_liked_by_me ? '❤️' : '🤍'} ${post.likes_count} Curtidas
            </button>
            <span class="metric-btn">
              💬 ${post.comments_count} Comentários
            </span>
          </div>
        </div>

        <!-- Área de comentários -->
        <div class="comments-container" id="comments-${post.id}">
          <button class="btn btn-sm btn-outline" onclick="toggleComments(${post.id})">Ver Comentários</button>
        </div>
      </div>
    `;
  }).join('');
}

// Like / Unlike
async function toggleLike(postId, isLiked) {
  if (!authToken) return alert('Faça login para curtir publicações.');

  const method = isLiked ? 'DELETE' : 'POST';
  const result = await apiCall(`/api/posts/${postId}/likes`, { method });

  if (result.ok) {
    loadFeed();
  } else {
    alert(result.data.error || 'Erro ao processar curtida');
  }
}

// Comentários
async function toggleComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  const result = await apiCall(`/api/posts/${postId}/comments`);

  if (!result.ok) return;

  const comments = result.data.comments || [];
  container.innerHTML = `
    <div class="comments-list">
      ${comments.length === 0 ? '<p style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.5rem;">Nenhum comentário ainda.</p>' : ''}
      ${comments.map(c => {
        const isCommentOwner = currentUser && c.user_id === currentUser.id;
        return `
          <div class="comment-item">
            <div>
              <span class="comment-author">${c.author_name}:</span>
              <span>${escapeHtml(c.content)}</span>
            </div>
            ${isCommentOwner ? `
              <div class="comment-actions">
                <button onclick="deleteComment(${c.id}, ${postId})">Excluir</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <form class="add-comment-form" onsubmit="submitComment(event, ${postId})">
      <input type="text" id="comment-input-${postId}" placeholder="Escreva um comentário..." required>
      <button type="submit" class="btn btn-sm btn-primary">Enviar</button>
    </form>
  `;
}

async function submitComment(e, postId) {
  e.preventDefault();
  if (!authToken) return alert('Faça login para comentar.');

  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value;

  const result = await apiCall(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: { content }
  });

  if (result.ok) {
    input.value = '';
    toggleComments(postId);
  } else {
    alert(result.data.error || 'Erro ao adicionar comentário');
  }
}

async function deleteComment(commentId, postId) {
  if (!authToken) return alert('Faça login primeiro.');
  if (!confirm('Deseja excluir este comentário?')) return;

  const result = await apiCall(`/api/comments/${commentId}`, {
    method: 'DELETE'
  });

  if (result.ok) {
    toggleComments(postId);
  } else {
    alert(result.data.error || 'Erro ao excluir comentário');
  }
}

// Edição de Post
function openEditModal(postId, content) {
  currentEditingPostId = postId;
  document.getElementById('edit-post-content').value = content;
  document.getElementById('edit-post-modal').classList.remove('hidden');
}

function closeEditModal() {
  currentEditingPostId = null;
  document.getElementById('edit-post-modal').classList.add('hidden');
}

async function submitEditPost() {
  if (!currentEditingPostId) return;

  const content = document.getElementById('edit-post-content').value;
  const fileInput = document.getElementById('edit-post-image');
  const removeImage = document.getElementById('edit-post-remove-image').checked;

  const formData = new FormData();
  formData.append('content', content);
  if (removeImage) {
    formData.append('remove_image', 'true');
  } else if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  const result = await apiCall(`/api/posts/${currentEditingPostId}`, {
    method: 'PATCH',
    body: formData
  });

  if (result.ok) {
    closeEditModal();
    loadFeed();
    alert('Publicação atualizada com sucesso!');
  } else {
    alert(`Erro ao editar (${result.status}): ` + result.data.error);
  }
}

async function deletePost(postId) {
  if (!authToken) return alert('Faça login primeiro.');
  if (!confirm('Deseja realmente excluir esta publicação?')) return;

  const result = await apiCall(`/api/posts/${postId}`, {
    method: 'DELETE'
  });

  if (result.ok) {
    loadFeed();
    alert('Publicação excluída com sucesso!');
  } else {
    alert(`Erro ao excluir (${result.status}): ` + result.data.error);
  }
}

// Teste de autorização 403 Forbidden
async function tryUnauthorizedEdit(postId) {
  if (!authToken) {
    return alert('Faça login com um usuário diferente do criador deste post para testar a rejeição 403!');
  }

  const result = await apiCall(`/api/posts/${postId}`, {
    method: 'PATCH',
    body: { content: 'Tentativa de alteração não autorizada!' }
  });

  if (result.status === 403) {
    alert(`[SUCESSO NO TESTE 403 FORBIDDEN]\nA API bloqueou corretamente a alteração:\n"${result.data.error}"`);
  } else {
    alert(`Resposta inesperada: status ${result.status}`);
  }
}

// ==========================================
// BATERIA DE TESTES OBRIGATÓRIOS DO PDF (ITEM 10)
// ==========================================
async function runDemoTest(testName) {
  switch (testName) {
    case 'duplicate_email': {
      // 1. Cadastrar usuário existente
      alert('Testando cadastro com e-mail duplicado...');
      const res = await apiCall('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Tentativa Duplicada',
          email: 'carlos@fitinity.com',
          password: 'senha123'
        }
      });
      alert(`[Resultado]: Status ${res.status} (Esperado: 409 Conflict)\nResposta: ${JSON.stringify(res.data)}`);
      break;
    }

    case 'invalid_login': {
      // 2. Login inválido
      alert('Testando login com senha incorreta...');
      const res = await apiCall('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'carlos@fitinity.com',
          password: 'SENHA_TOTALMENTE_ERRADA'
        }
      });
      alert(`[Resultado]: Status ${res.status} (Esperado: 401 Unauthorized)\nResposta: ${JSON.stringify(res.data)}`);
      break;
    }

    case 'unauthorized_route': {
      // 3. Rota privada sem token
      alert('Testando acesso à rota GET /api/users/me sem token JWT...');
      const res = await apiCall('/api/users/me', {
        method: 'GET',
        skipAuth: true
      });
      alert(`[Resultado]: Status ${res.status} (Esperado: 401 Unauthorized)\nResposta: ${JSON.stringify(res.data)}`);
      break;
    }

    case 'forbidden_edit': {
      // 4. Modificar post de outro usuário
      alert('Testando modificação de conteúdo de outro usuário (403 Forbidden)...');
      // Busca lista de posts
      const feedRes = await apiCall('/api/posts');
      const posts = feedRes.data.posts || [];
      const otherPost = posts.find(p => !currentUser || p.user_id !== currentUser.id);

      if (!otherPost) {
        alert('Crie pelo menos dois usuários e publique com um para testar a tentativa de alteração pelo outro!');
        return;
      }

      const res = await apiCall(`/api/posts/${otherPost.id}`, {
        method: 'PATCH',
        body: { content: 'Hackeando publicação alheia...' }
      });
      alert(`[Resultado]: Status ${res.status} (Esperado: 403 Forbidden)\nResposta: ${JSON.stringify(res.data)}`);
      break;
    }

    case 'invalid_upload': {
      // 5. Upload de arquivo inválido
      alert('Testando envio de arquivo com extensão inválida (.txt)...');
      if (!authToken) {
        alert('Faça login primeiro para testar o upload.');
        return;
      }
      const fakeTxtBlob = new Blob(['texto de teste que nao eh imagem'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('avatar', fakeTxtBlob, 'arquivo_invalido.txt');

      const res = await apiCall('/api/users/me/avatar', {
        method: 'POST',
        body: formData
      });
      alert(`[Resultado]: Status ${res.status} (Esperado: 400 Bad Request)\nResposta: ${JSON.stringify(res.data)}`);
      break;
    }
  }
}

async function runAllDemoTests() {
  await runDemoTest('duplicate_email');
  await runDemoTest('invalid_login');
  await runDemoTest('unauthorized_route');
  await runDemoTest('invalid_upload');
  alert('Cenários principais executados! Verifique o console de inspeção HTTP.');
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}
