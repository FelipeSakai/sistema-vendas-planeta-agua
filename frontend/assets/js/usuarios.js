document.addEventListener('DOMContentLoaded', function () {
  const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3333';

  // ========= Token helpers =========
  const getRawToken = () => localStorage.getItem('token') || '';
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, '').trim();

  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // valida o JWT (não quebra a página)
  try {
    const part = token.split('.')[1] || '';
    const payload = part ? JSON.parse(atob(part)) : null;
    console.log('jwt payload', payload);
  } catch (e) {
    console.warn('JWT inválido/ilegível; limpando e voltando para login');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return;
  }

  // ========= Helpers de DOM =========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Elementos
  const tbody = $('#tbodyUsuarios');
  const btnAddUsuario = $('#btnAddUsuario');
  const usuarioModalEl = $('#usuarioModal');
  const viewUsuarioModalEl = $('#viewUsuarioModal');
  const deleteUsuarioModalEl = $('#deleteUsuarioModal');
  const usuarioForm = $('#usuarioForm');
  const btnSalvarUsuario = $('#btnSalvarUsuario');
  const btnConfirmarExclusao = $('#btnConfirmarExclusao');

  // Campos do form
  const inpId = $('#usuarioId'); // hidden
  const inpNome = $('#nome');
  const inpEmail = $('#email');
  const inpSenha = $('#senha');     // opcional no editar
  const selCargo = $('#cargo');     // ADMIN | FUNCIONARIO | MOTORISTA
  const selStatus = $('#status');    // ATIVO | INATIVO

  // Modais (se usa Bootstrap)
  const usuarioModal = usuarioModalEl ? new bootstrap.Modal(usuarioModalEl) : null;
  const viewUsuarioModal = viewUsuarioModalEl ? new bootstrap.Modal(viewUsuarioModalEl) : null;
  const deleteUsuarioModal = deleteUsuarioModalEl ? new bootstrap.Modal(deleteUsuarioModalEl) : null;

  // ========= Alerta seguro (fallback sem SweetAlert) =========
  const safeAlert = (opts) =>
    (window.Swal && Swal.fire)
      ? Swal.fire(opts)
      : alert(opts?.text || opts?.title || 'Aviso');

  // ========= Cliente genérico =========
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(options.headers || {})
      }
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (res.status === 401 || res.status === 403) {
      sessionStorage.setItem('lastAuthError', data?.error || 'Não autorizado');
      localStorage.removeItem('token');
      setTimeout(() => (window.location.href = 'login.html'), 10);
      throw new Error(data?.error || 'Não autorizado');
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || data?.mensagem || `Erro ${res.status}`);
    }
    return data; // retorna o envelope {sucesso, mensagem, dados} OU o objeto cru
  }

  // helper para desembrulhar { sucesso, mensagem, dados }
  const unwrap = (resp) =>
    (resp && typeof resp === 'object' && ('dados' in resp)) ? resp.dados : resp;

  // ========= UI helpers (datas robustas) =========

  // Parser tolerante: aceita Date, epoch (seg/ms), 'YYYY-MM-DD HH:mm:ss', ISO,
  // e também 'dd/mm/yyyy[ hh:mm[:ss]]'
  function toDateSafe(input) {
    if (input === null || input === undefined || input === '' || input === '—' || input === '-') return null;

    if (input instanceof Date) return isNaN(input) ? null : input;

    if (typeof input === 'number') {
      const ms = input < 1e12 ? input * 1000 : input; // 10 dígitos = seg
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }

    if (typeof input === 'string') {
      const s = input.trim();
      if (!s) return null;

      // ISO/SQL: 2025-08-13 14:25:00 ou 2025-08-13T14:25:00(.sss)?(Z)?
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const dIso = new Date(s.replace(' ', 'T'));
        if (!isNaN(dIso)) return dIso;

        // fallback local
        const [datePart, timePart = '00:00:00'] = s.split(/[ T]/);
        const [y, m, day] = datePart.split('-').map(Number);
        const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map(Number);
        const d = new Date(y, (m || 1) - 1, day || 1, hh, mm, ss);
        return isNaN(d) ? null : d;
      }

      // BR: 13/08/2025 ou 13/08/2025 14:25[:30]
      const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
      if (br) {
        const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = br;
        const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
        return isNaN(d) ? null : d;
      }

      // Epoch em string
      if (/^\d{10,13}$/.test(s)) return toDateSafe(Number(s));

      const d = new Date(s);
      return isNaN(d) ? null : d;
    }

    return null;
  }

  // Só data (BR)
  const fmtData = (d) => {
    const dt = toDateSafe(d);
    return dt ? dt.toLocaleDateString('pt-BR') : '—';
  };

  // Data + hora (BR)
  const fmtDataHora = (d) => {
    const dt = toDateSafe(d);
    return dt ? dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  };

  function badgeCargo(cargo) {
    switch (String(cargo || '').toUpperCase()) {
      case 'ADMIN': return '<span class="badge bg-primary">Administrador</span>';
      case 'MOTORISTA': return '<span class="badge bg-warning text-dark">Motorista</span>';
      default: return '<span class="badge bg-info text-dark">Funcionário</span>';
    }
  }
  function badgeStatus(status) {
    return String(status || '').toUpperCase() === 'INATIVO'
      ? '<span class="badge bg-secondary">Inativo</span>'
      : '<span class="badge bg-success">Ativo</span>';
  }
  const iniciais = (nome) =>
    (nome || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() || '')
      .join('') || '??';

  function linhaUsuario(u) {
    const id = u.id;
    const nome = u.nome || '(sem nome)';
    const email = u.email || '';
    const cargo = u.cargo;
    const status = u.status;
    const criadoEm = u.criadoEm;
    const ultimo = u.ultimoLogin || null; // pode não vir no JSON

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar bg-light border rounded-circle d-flex align-items-center justify-content-center" style="width:36px;height:36px;">
              <span class="fw-bold">${iniciais(nome)}</span>
            </div>
            <div class="ms-2">
              <div class="fw-bold">${nome}</div>
              <div class="text-muted small">${criadoEm ? 'Desde ' + fmtData(criadoEm) : ''}</div>
            </div>
          </div>
        </td>
        <td>${badgeCargo(cargo)}</td>
        <td>${email}</td>
        <td>${badgeStatus(status)}</td>
        <td>${fmtData(ultimo)}</td> <!-- Último acesso: só data -->
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary btn-view" data-id="${id}" title="Ver">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${id}" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${id}" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  // ========= CRUD (usando unwrap) =========
  const listarUsuarios = async () => unwrap(await apiFetch('/api/usuarios'));
  const buscarUsuarioPorId = async (id) => unwrap(await apiFetch(`/api/usuarios/${id}`));

  const criarUsuario = async (payload) => {
    return await apiFetch('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  };

  const atualizarUsuario = async (id, payload) => {
    return await apiFetch(`/api/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  };

  const excluirUsuario = async (id) => {
    return await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
  };

  // ========= Render / Eventos =========
  async function renderTabela() {
    try {
      const lista = await listarUsuarios();
      if (!Array.isArray(lista)) throw new Error('Resposta inesperada da API de usuários');
      if (tbody) tbody.innerHTML = lista.map(linhaUsuario).join('');
      wireRowButtons();
    } catch (err) {
      console.error(err);
      safeAlert({
        icon: 'error',
        title: 'Falha ao carregar usuários',
        text: err.message || 'Erro inesperado',
        confirmButtonColor: '#1e88e5'
      });
    }
  }

  function wireRowButtons() {
    $$('.btn-view').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const u = await buscarUsuarioPorId(id);

        document.getElementById('viewAvatarIniciais').textContent = iniciais(u.nome);
        document.getElementById('viewNomeUsuario').textContent = u.nome || '—';
        document.getElementById('viewDesdeUsuario').textContent = `Usuário desde ${fmtData(u.criadoEm)}`;

        const tipoEl = document.getElementById('viewTipoUsuario');
        const statusEl = document.getElementById('viewStatusUsuario');
        const cargoUp = String(u.cargo || '').toUpperCase();
        const statusUp = String(u.status || '').toUpperCase();

        tipoEl.textContent = cargoUp === 'ADMIN' ? 'Administrador'
          : cargoUp === 'MOTORISTA' ? 'Motorista'
            : 'Funcionário';
        tipoEl.className = 'badge ' + (
          cargoUp === 'ADMIN' ? 'bg-primary'
            : cargoUp === 'MOTORISTA' ? 'bg-warning text-dark'
              : 'bg-info text-dark'
        );

        statusEl.textContent = statusUp === 'INATIVO' ? 'Inativo' : 'Ativo';
        statusEl.className = 'badge ' + (statusUp === 'INATIVO' ? 'bg-secondary' : 'bg-success');

        document.getElementById('viewEmailUsuario').textContent = u.email || '—';
        document.getElementById('viewUltimoAcessoUsuario').textContent = fmtData(u.ultimoLogin); // só data
        document.getElementById('viewCriadoEm').textContent = fmtDataHora(u.criadoEm);
        document.getElementById('viewAtualizadoEm').textContent = fmtDataHora(u.atualizadoEm);

        const secMotorista = document.getElementById('viewInfoMotorista');
        secMotorista.style.display = cargoUp === 'MOTORISTA' ? '' : 'none';

        document.getElementById('viewObservacoesUsuario').textContent = '—';

        const hist = document.getElementById('viewHistoricoTbody');
        hist.innerHTML = `
          <tr>
            <td>${fmtData(u.ultimoLogin)}</td>
            <td>${u.ultimoLogin ? 'Login no sistema' : '—'}</td>
            <td>—</td>
          </tr>
        `;

        document.getElementById('btnEditarUsuarioView')?.addEventListener('click', () => {
          document.querySelector(`.btn-edit[data-id="${id}"]`)?.click();
        }, { once: true });

        viewUsuarioModal?.show();
      });
    });

    $$('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const u = await buscarUsuarioPorId(id);

        if (inpId) inpId.value = u.id;
        if (inpNome) inpNome.value = u.nome || '';
        if (inpEmail) inpEmail.value = u.email || '';
        if (inpSenha) inpSenha.value = ''; // não preencher senha
        if (selCargo) selCargo.value = u.cargo || 'FUNCIONARIO';
        if (selStatus) selStatus.value = u.status || 'ATIVO';

        $('#usuarioModalLabel') && ($('#usuarioModalLabel').textContent = 'Editar Usuário');
        usuarioModal?.show();
      });
    });

    $$('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        btnConfirmarExclusao?.setAttribute('data-id', id);
        deleteUsuarioModal?.show();
      });
    });
  }

  // Add
  btnAddUsuario && btnAddUsuario.addEventListener('click', () => {
    if (usuarioForm) usuarioForm.reset();
    if (inpId) inpId.value = '';
    if (selCargo) selCargo.value = 'FUNCIONARIO';
    if (selStatus) selStatus.value = 'ATIVO';
    $('#usuarioModalLabel') && ($('#usuarioModalLabel').textContent = 'Adicionar Usuário');
    usuarioModal?.show();
  });

  // Salvar (create/update)
  btnSalvarUsuario && btnSalvarUsuario.addEventListener('click', async () => {
    try {
      const id = inpId?.value?.trim();
      const nome = inpNome?.value?.trim();
      const email = inpEmail?.value?.trim();
      const senha = inpSenha?.value?.trim();
      const cargo = selCargo?.value || 'FUNCIONARIO';
      const status = selStatus?.value || 'ATIVO';

      // Regex simples para validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!nome || !email || (!id && !senha)) {
        safeAlert({
          icon: 'warning',
          title: 'Campos obrigatórios',
          text: id ? 'Nome e e-mail são obrigatórios.' : 'Nome, e-mail e senha são obrigatórios.',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }

      if (!emailRegex.test(email)) {
        safeAlert({
          icon: 'warning',
          title: 'E-mail inválido',
          text: 'Digite um e-mail no formato válido (ex: usuario@dominio.com)',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }

      let resp;
      if (id) {
        resp = await atualizarUsuario(id, { nome, email, cargo, status, ...(senha ? { senha } : {}) });
      } else {
        resp = await criarUsuario({ nome, email, senha, cargo, status });
      }

      usuarioModal?.hide();
      await renderTabela();

      safeAlert({
        icon: 'success',
        title: resp?.mensagem || (id ? 'Usuário atualizado!' : 'Usuário criado!'),
        timer: 1000,
        showConfirmButton: false
      });
    } catch (err) {
      safeAlert({
        icon: 'error',
        title: 'Falha ao salvar',
        text: err.message || 'Erro inesperado',
        confirmButtonColor: '#1e88e5'
      });
    }
  });

  // Confirmar exclusão
  btnConfirmarExclusao && btnConfirmarExclusao.addEventListener('click', async () => {
    try {
      const id = btnConfirmarExclusao.getAttribute('data-id');
      if (!id) return;
      const resp = await excluirUsuario(id);
      deleteUsuarioModal?.hide();
      await renderTabela();
      safeAlert({
        icon: 'success',
        title: resp?.mensagem || 'Usuário excluído!',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (err) {
      safeAlert({
        icon: 'error',
        title: 'Falha ao excluir',
        text: err.message || 'Erro inesperado',
        confirmButtonColor: '#1e88e5'
      });
    }
  });

  let listaUsuariosCache = [];

  async function renderTabela() {
    try {
      const lista = await listarUsuarios();
      if (!Array.isArray(lista)) throw new Error('Resposta inesperada da API de usuários');
      listaUsuariosCache = lista; // salva lista original
      aplicarFiltros();
    } catch (err) {
      console.error(err);
      safeAlert({
        icon: 'error',
        title: 'Falha ao carregar usuários',
        text: err.message || 'Erro inesperado',
        confirmButtonColor: '#1e88e5'
      });
    }
  }

  function aplicarFiltros() {
    let filtrados = [...listaUsuariosCache];

    const termo = $('#searchUsuario')?.value.trim().toLowerCase();
    if (termo) {
      filtrados = filtrados.filter(u =>
        u.nome?.toLowerCase().includes(termo) ||
        u.email?.toLowerCase().includes(termo)
      );
    }

    const tipo = $('#filterTipo')?.value;
    if (tipo && tipo !== 'todos') {
      filtrados = filtrados.filter(u => String(u.cargo).toUpperCase() === tipo.toUpperCase());
    }

    const status = $('#filterStatus')?.value;
    if (status && status !== 'todos') {
      filtrados = filtrados.filter(u => String(u.status).toUpperCase() === status.toUpperCase());
    }

    if (tbody) tbody.innerHTML = filtrados.map(linhaUsuario).join('');
    wireRowButtons();
  }

  $('#searchUsuario')?.addEventListener('input', aplicarFiltros);
  $('#filterTipo')?.addEventListener('change', aplicarFiltros);
  $('#filterStatus')?.addEventListener('change', aplicarFiltros);

  renderTabela();
});
