// === Clientes.js (com máscaras + logout + status na API) ===
(function () {
  const API_BASE = localStorage.getItem('API_BASE') || '';
  console.debug('[clientes] API_BASE =', API_BASE);
  const getRawToken = () => localStorage.getItem('token') || '';
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, '').trim();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    page: 1,
    perPage: 10,
    totalPages: 1,
    geral: '',
    tipo: 'todos',     // pessoa_fisica | pessoa_juridica | todos
    status: 'todos',   // ativo | inativo | todos
    currentEditId: null,
    currentViewId: null,
    currentDeleteId: null,
  };

  // ======== Funções utilitárias ========

  // Apenas dígitos
  const digits = (s) => (s || '').replace(/\D+/g, '');

  // ---------- TELEFONE ----------
  function formatPhone(value) {
    const d = digits(value).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function formatPhoneInput(input) {
    const posAntes = input.selectionStart;
    const antes = input.value;

    input.value = formatPhone(antes);

    // Mantém cursor proporcional
    const diff = input.value.length - antes.length;
    input.setSelectionRange(posAntes + diff, posAntes + diff);
  }

  // ---------- CPF ----------
  function formatCPF(value) {
    const d = digits(value).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function formatCPFInput(input) {
    const posAntes = input.selectionStart;
    const antes = input.value;

    input.value = formatCPF(antes);

    const diff = input.value.length - antes.length;
    input.setSelectionRange(posAntes + diff, posAntes + diff);
  }

  // ---------- CNPJ ----------
  function formatCNPJ(value) {
    const d = digits(value).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  function formatCNPJInput(input) {
    const posAntes = input.selectionStart;
    const antes = input.value;

    input.value = formatCNPJ(antes);

    const diff = input.value.length - antes.length;
    input.setSelectionRange(posAntes + diff, posAntes + diff);
  }


  const isCNPJ = (v) => digits(v).length === 14;
  const deriveTipo = (cpfCnpj) => (isCNPJ(cpfCnpj) ? 'pessoa_juridica' : 'pessoa_fisica');

  const fmtInitials = (nome) =>
    (nome || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('') || 'CL';

  const badgeStatus = (status) =>
    status === 'ATIVO'
      ? '<span class="badge bg-success">Ativo</span>'
      : '<span class="badge bg-secondary">Inativo</span>';

  // ===== Auth / API =====
  function authHeaders() {
    const t = getToken();
    if (!t) {
      const LOGIN_URL = location.pathname.includes('/pages/') ? '/pages/login.html' : 'login.html';
      location.assign(LOGIN_URL);
      throw new Error('Sem token JWT');
    }
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` };
  }

  async function api(method, path, body) {
    if (!API_BASE) throw new Error('API_BASE não definido. Use: localStorage.setItem("API_BASE","http://localhost:3333")');
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { }
    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // ===== DOM refs =====
  const $search = $('#searchCliente');
  const $filterTipo = $('#filterTipo');
  const $filterStatus = $('#filterStatus');
  const $btnAdd = $('#btnAddCliente');
  const $tbody = document.querySelector('table.table tbody');
  const $pagination = document.querySelector('.pagination');
  const $logout = document.querySelector('.sidebar-footer .nav-link'); // botão Sair

  // Modais
  const clienteModal = new bootstrap.Modal($('#clienteModal'));
  const viewModal = new bootstrap.Modal($('#viewClienteModal'));
  const deleteModal = new bootstrap.Modal($('#deleteClienteModal'));

  // Form campos
  const $tipoCliente = $('#tipoCliente');
  const $statusCliente = $('#statusCliente');
  const $camposPF = $('#camposPessoaFisica');
  const $camposPJ = $('#camposPessoaJuridica');

  const $nomeCliente = $('#nomeCliente');
  const $cpfCliente = $('#cpfCliente');
  const $razaoSocialCliente = $('#razaoSocialCliente');
  const $cnpjCliente = $('#cnpjCliente');
  const $nomeFantasiaCliente = $('#nomeFantasiaCliente');
  const $telefoneCliente = $('#telefoneCliente');
  const $emailCliente = $('#emailCliente');
  const $cepCliente = $('#cepCliente');
  const $enderecoCliente = $('#enderecoCliente');
  const $numeroCliente = $('#numeroCliente');
  const $complementoCliente = $('#complementoCliente');
  const $bairroCliente = $('#bairroCliente');
  const $cidadeCliente = $('#cidadeCliente');
  const $estadoCliente = $('#estadoCliente');
  const $observacoesCliente = $('#observacoesCliente');
  const $btnSalvar = $('#btnSalvarCliente');

  // View modal refs
  const $viewNome = $('#viewNomeCliente');
  const $viewTipo = $('#viewTipoCliente');
  const $viewStatus = $('#viewStatusCliente');
  const $viewTelefone = $('#viewTelefoneCliente');
  const $viewEmail = $('#viewEmailCliente');
  const $viewCpf = $('#viewCpfCliente');
  const $viewDesde = $('#viewDataCadastroCliente');
  const $viewEndereco = $('#viewEnderecoCompletoCliente');

  // Delete modal refs
  const $deleteNome = $('#deleteClienteNome');
  const $btnConfirmarExclusao = $('#btnConfirmarExclusao');

  // ===== Máscaras nos inputs =====
  $telefoneCliente?.addEventListener('input', () => formatPhoneInput($telefoneCliente));
  $cpfCliente?.addEventListener('input', () => formatCPFInput($cpfCliente));
  $cnpjCliente?.addEventListener('input', () => formatCNPJInput($cnpjCliente));


  // ===== Render =====
  function renderRows(list) {
    const rows = list.map(cli => {
      const initials = fmtInitials(cli.nome);
      const tipo = deriveTipo(cli.cpfCnpj || '') === 'pessoa_juridica' ? 'Pessoa Jurídica' : 'Pessoa Física';
      const tel = cli.telefone ? formatPhone(cli.telefone) : '-';

      return `
        <tr data-id="${cli.id}">
          <td>
            <div class="d-flex align-items-center">
              <div class="avatar ${tipo === 'Pessoa Jurídica' ? 'company' : ''}">${initials}</div>
              <div class="ms-2">
                <div class="fw-bold">${cli.nome}</div>
                <div class="text-muted small">Cliente desde ${formatDate(cli.criadoEm)}</div>
              </div>
            </div>
          </td>
          <td>${tipo}</td>
          <td>${tel}</td>
          <td>${cli.email || '-'}</td>
          <td>${cli.endereco || '-'}</td>
          <td>${badgeStatus(cli.status)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-view" data-id="${cli.id}">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${cli.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${cli.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    $tbody.innerHTML = rows || `<tr><td colspan="7" class="text-center text-muted">Nenhum cliente encontrado</td></tr>`;
  }

  function renderPagination(page, totalPages) {
    if (!$pagination) return;
    const items = [];
    const disabledPrev = page <= 1 ? 'disabled' : '';
    const disabledNext = page >= totalPages ? 'disabled' : '';

    items.push(`
      <li class="page-item ${disabledPrev}">
        <a class="page-link" href="#" data-page="${page - 1}">Anterior</a>
      </li>
    `);

    const maxBtns = 5;
    const start = Math.max(1, page - Math.floor(maxBtns / 2));
    const end = Math.min(totalPages, start + maxBtns - 1);
    for (let p = start; p <= end; p++) {
      items.push(`
        <li class="page-item ${p === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${p}">${p}</a>
        </li>
      `);
    }

    items.push(`
      <li class="page-item ${disabledNext}">
        <a class="page-link" href="#" data-page="${page + 1}">Próximo</a>
      </li>
    `);

    $pagination.innerHTML = items.join('');
  }

  function formatDate(d) {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return ''; }
  }

  // ===== Load/Fetch =====
  async function loadClientes() {
    const params = new URLSearchParams();
    if (state.geral) params.set('geral', state.geral);
    params.set('page', String(state.page));
    params.set('perPage', String(state.perPage));
    // status para o backend paginar corretamente
    if (state.status === 'ativo') params.set('status', 'ATIVO');
    else if (state.status === 'inativo') params.set('status', 'INATIVO');
    else params.set('status', 'TODOS');

    const data = await api('GET', `/api/clientes?${params.toString()}`);
    const payload = data?.dados || data;
    const lista = payload.data || [];
    renderRows(lista);
    state.totalPages = payload.totalPages || 1;
    renderPagination(state.page, state.totalPages);
  }

  // ===== Form/Modal helpers =====
  function resetForm() {
    $('#clienteModalLabel').textContent = 'Adicionar Cliente';
    $tipoCliente.value = '';
    $statusCliente.value = 'ativo';
    $camposPF.style.display = '';
    $camposPJ.style.display = 'none';

    $nomeCliente.value = '';
    $cpfCliente.value = '';
    $razaoSocialCliente.value = '';
    $cnpjCliente.value = '';
    $nomeFantasiaCliente.value = '';
    $telefoneCliente.value = '';
    $emailCliente.value = '';
    $cepCliente.value = '';
    $enderecoCliente.value = '';
    $numeroCliente.value = '';
    $complementoCliente.value = '';
    $bairroCliente.value = '';
    $cidadeCliente.value = '';
    $estadoCliente.value = '';
    $observacoesCliente.value = '';

    state.currentEditId = null;
  }

  function toggleTipoFields() {
    const v = $tipoCliente.value;
    if (v === 'pessoa_juridica') {
      $camposPF.style.display = 'none';
      $camposPJ.style.display = '';
    } else {
      $camposPF.style.display = '';
      $camposPJ.style.display = 'none';
    }
  }

  function montarEnderecoStr() {
    const rua = ($enderecoCliente.value || '').trim();
    const numero = ($numeroCliente.value || '').trim();
    const complemento = ($complementoCliente.value || '').trim();
    const bairro = ($bairroCliente.value || '').trim();
    const cidade = ($cidadeCliente.value || '').trim();
    const estado = ($estadoCliente.value || '').trim();
    const cep = ($cepCliente.value || '').trim();

    const partes = [];

    if (rua) partes.push(rua);
    if (numero) partes.push(`, ${numero}`);
    if (complemento) partes.push(` - ${complemento}`);
    if (bairro) partes.push(` - ${bairro}`);
    if (cidade) partes.push(` - ${cidade}`);
    if (estado) partes.push(` - ${estado}`);
    if (cep) partes.push(` - CEP ${cep}`);

    return partes.join('');
  }

  function montarPayloadCliente() {
    // Observação: CPF/CNPJ é OPCIONAL
    const tipo = $tipoCliente.value;
    const status = $statusCliente.value.toUpperCase() === 'INATIVO' ? 'INATIVO' : 'ATIVO';

    const nome =
      tipo === 'pessoa_juridica'
        ? ($razaoSocialCliente.value || $nomeFantasiaCliente.value || '').trim()
        : ($nomeCliente.value || '').trim();

    const cpfCnpj =
      tipo === 'pessoa_juridica'
        ? digits($cnpjCliente.value)
        : digits($cpfCliente.value);

    return {
      nome,
      cpfCnpj: cpfCnpj || null, // <- opcional
      telefone: digits($telefoneCliente.value) || null,
      email: ($emailCliente.value || '').trim().toLowerCase() || null,
      endereco: montarEnderecoStr() || null,
      status, // 'ATIVO' | 'INATIVO'
    };
  }

  async function abrirEditar(id) {
    const res = await api('GET', `/api/clientes/${id}`);
    const cli = res?.dados || res;

    $enderecoCliente.value = '';
    $numeroCliente.value = '';
    $complementoCliente.value = '';
    $bairroCliente.value = '';
    $cidadeCliente.value = '';
    $estadoCliente.value = '';
    $cepCliente.value = '';

    $('#clienteModalLabel').textContent = 'Editar Cliente';
    state.currentEditId = cli.id;

    const tipo = deriveTipo(cli.cpfCnpj || '');
    $tipoCliente.value = tipo;
    toggleTipoFields();

    if (tipo === 'pessoa_juridica') {
      $razaoSocialCliente.value = cli.nome || '';
      $cnpjCliente.value = formatCNPJ(cli.cpfCnpj || '');
      $nomeFantasiaCliente.value = '';
    } else {
      $nomeCliente.value = cli.nome || '';
      $cpfCliente.value = formatCPF(cli.cpfCnpj || '');
    }

    $statusCliente.value = (cli.status === 'INATIVO' ? 'inativo' : 'ativo');
    $telefoneCliente.value = formatPhone(cli.telefone || '');
    $emailCliente.value = cli.email || '';
    if (cli.endereco) $enderecoCliente.value = cli.endereco;

    clienteModal.show();
  }

  async function abrirView(id) {
    const res = await api('GET', `/api/clientes/${id}`);
    const cli = res?.dados || res;

    $viewNome.textContent = cli.nome || '';
    const tipo = deriveTipo(cli.cpfCnpj || '');
    $viewTipo.textContent = tipo === 'pessoa_juridica' ? 'Pessoa Jurídica' : 'Pessoa Física';
    $viewStatus.innerHTML = cli.status === 'INATIVO' ? 'Inativo' : 'Ativo';
    $viewTelefone.textContent = cli.telefone ? formatPhone(cli.telefone) : '-';
    $viewEmail.textContent = cli.email || '-';
    $viewCpf.textContent = cli.cpfCnpj ? (tipo === 'pessoa_juridica' ? formatCNPJ(cli.cpfCnpj) : formatCPF(cli.cpfCnpj)) : '-';
    $viewDesde.textContent = formatDate(cli.criadoEm);
    $viewEndereco.textContent = cli.endereco || '-';

    state.currentViewId = cli.id;
    viewModal.show();
  }

  function abrirDelete(id, nome) {
    state.currentDeleteId = id;
    $deleteNome.textContent = nome || '';
    deleteModal.show();
  }

  // ===== Listeners =====
  $search?.addEventListener('input', () => {
    state.geral = $search.value.trim();
    state.page = 1;
    loadClientes().catch(showErr);
  });

  $filterTipo?.addEventListener('change', () => {
    state.tipo = $filterTipo.value;
    state.page = 1;
    loadClientes().catch(showErr);
  });

  $filterStatus?.addEventListener('change', () => {
    state.status = $filterStatus.value;
    state.page = 1;
    loadClientes().catch(showErr);
  });

  $btnAdd?.addEventListener('click', () => {
    resetForm();
    clienteModal.show();
  });

  $tipoCliente?.addEventListener('change', toggleTipoFields);

  $btnSalvar?.addEventListener('click', async () => {
    try {
      const payload = montarPayloadCliente();
      if (!payload.nome) throw new Error('Nome/Razão social é obrigatório.');
      // CPF/CNPJ é opcional — não validar aqui
      if (!payload.telefone && !payload.email) {
        throw new Error('Informe pelo menos telefone ou e-mail.');
      }

      if (state.currentEditId) {
        await api('PUT', `/api/clientes/${state.currentEditId}`, payload);
      } else {
        await api('POST', `/api/clientes`, payload);
      }

      clienteModal.hide();
      await loadClientes();
    } catch (e) {
      showErr(e);
    }
  });

  $tbody?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const tr = btn.closest('tr');
    const nome = tr?.querySelector('.fw-bold')?.textContent || '';

    if (btn.classList.contains('btn-view')) {
      abrirView(id).catch(showErr);
    } else if (btn.classList.contains('btn-edit')) {
      abrirEditar(id).catch(showErr);
    } else if (btn.classList.contains('btn-delete')) {
      abrirDelete(id, nome);
    }
  });

  $pagination?.addEventListener('click', (ev) => {
    const a = ev.target.closest('a.page-link');
    if (!a) return;
    ev.preventDefault();
    const p = Number(a.getAttribute('data-page'));
    if (!Number.isFinite(p) || p < 1 || p > state.totalPages || p === state.page) return;
    state.page = p;
    loadClientes().catch(showErr);
  });

  $btnConfirmarExclusao?.addEventListener('click', async () => {
    if (!state.currentDeleteId) return;
    try {
      await api('DELETE', `/api/clientes/${state.currentDeleteId}`);
      deleteModal.hide();
      await loadClientes();
    } catch (e) {
      showErr(e);
    }
  });

  // ===== Logout =====
  $logout?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      localStorage.removeItem('token');
    } finally {
      const LOGIN_URL = location.pathname.includes('/pages/') ? '/pages/login.html' : 'login.html';
      location.assign(LOGIN_URL);
    }
  });

  function showErr(e) {
    const msg = e?.message || 'Ops! Algo deu errado.';
    console.error('[clientes] erro:', e);
    alert(msg);
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadClientes().catch(showErr);
  });
})();
