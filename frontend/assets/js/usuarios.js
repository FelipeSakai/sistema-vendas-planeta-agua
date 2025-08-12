// Funcionalidades específicas para a página de usuários
document.addEventListener('DOMContentLoaded', function () {
  // ====== Config e helpers da API ======
  const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3333';

  // Redireciona se não houver token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...(options.headers || {})
      }
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // ====== Funções utilitárias ======
  function tipoBadge(tipo) {
    switch ((tipo || '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return { text: 'Administrador', cls: 'bg-primary', avatar: 'admin' };
      case 'motorista':
        return { text: 'Motorista', cls: 'bg-warning text-dark', avatar: 'driver' };
      default:
        return { text: 'Funcionário', cls: 'bg-info text-dark', avatar: '' };
    }
  }

  function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'inativo' || s === 'inactive') {
      return '<span class="badge bg-secondary">Inativo</span>';
    }
    return '<span class="badge bg-success">Ativo</span>';
  }

  function iniciais(nome) {
    if (!nome) return '??';
    const parts = nome.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || '').join('');
  }

  function formatarData(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('pt-BR');
  }

  function formatarDataHora(d) {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function linhaUsuario(u) {
    const tipo = tipoBadge(u.tipo || u.role);
    const ini = iniciais(u.nome || u.name);
    const email = u.email || '';
    const ultimo = u.ultimoAcesso || u.lastLogin || '-';
    const desde = u.desde || u.createdAt || '';
    const id = u.id;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar ${tipo.avatar}">${ini}</div>
            <div class="ms-2">
              <div class="fw-bold">${u.nome || u.name || '(sem nome)'}</div>
              <div class="text-muted small">${desde ? 'Desde ' + formatarData(desde) : ''}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${tipo.cls}">${tipo.text}</span></td>
        <td>${email}</td>
        <td>${tel}</td>
        <td>${statusBadge(u.status)}</td>
        <td>${formatarDataHora(ultimo)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary btn-view" data-id="${id}">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  // ====== Carrega e preenche tabela ======
  async function carregarUsuarios() {
    try {
      const lista = await apiFetch('/users'); // ajuste se o endpoint for diferente
      const tbody = document.getElementById('tbodyUsuarios');
      if (!Array.isArray(lista)) throw new Error('Resposta inesperada da API de usuários');

      tbody.innerHTML = lista.map(linhaUsuario).join('');

      // Eventos dos botões serão implementados na próxima parte
    } catch (err) {
      console.error(err);
      alert('Falha ao carregar usuários: ' + err.message);
    }
  }

  // ====== Seu código antigo para botões/modais ======
  const btnAddUsuario = document.getElementById('btnAddUsuario');
  const usuarioModal = new bootstrap.Modal(document.getElementById('usuarioModal'));
  const viewUsuarioModal = new bootstrap.Modal(document.getElementById('viewUsuarioModal'));
  const deleteUsuarioModal = new bootstrap.Modal(document.getElementById('deleteUsuarioModal'));
  const tipoUsuarioSelect = document.getElementById('tipoUsuario');
  const camposMotorista = document.getElementById('camposMotorista');
  const btnSalvarUsuario = document.getElementById('btnSalvarUsuario');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
  const searchUsuario = document.getElementById('searchUsuario');
  const filterTipo = document.getElementById('filterTipo');
  const filterStatus = document.getElementById('filterStatus');

  // Eventos que você já tinha — ainda não ligados ao backend
  if (tipoUsuarioSelect) {
    tipoUsuarioSelect.addEventListener('change', function () {
      camposMotorista.style.display = this.value === 'motorista' ? 'block' : 'none';
    });
  }

  if (btnAddUsuario) {
    btnAddUsuario.addEventListener('click', function () {
      document.getElementById('usuarioForm').reset();
      document.getElementById('usuarioModalLabel').textContent = 'Adicionar Usuário';
      camposMotorista.style.display = 'none';
      usuarioModal.show();
    });
  }

  // Aqui viriam as lógicas de salvar, editar, excluir — faremos nas próximas partes

  // ====== Inicialização ======
  carregarUsuarios();
});
