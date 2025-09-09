(function () {
  const API_BASE = localStorage.getItem('API_BASE') || '';
  const getRawToken = () => localStorage.getItem('token') || '';
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, '').trim();

  function authHeaders() {
    const t = getToken();
    if (!t) {
      const href = location.pathname.includes('/pages/')
        ? 'login.html'
        : '/pages/login.html';
      location.href = href;
      return {};
    }
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` };
  }

  async function api(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data; 
  }

  const state = {
    page: 1,
    perPage: 12,
    totalPages: 1,
    geral: '',
    tipo: 'todos',        
    estoqueFiltro: 'todos',
    currentEditId: null,
    currentViewId: null,
    currentDeleteId: null,
  };

  const $grid = document.getElementById('produtosGrid');
  const $resumo = document.getElementById('produtosResumo');
  const $pagination = document.querySelector('.pagination');

  const $btnAdd = document.getElementById('btnAddProduto');
  const $search = document.getElementById('searchProduto');
  const $filterCategoria = document.getElementById('filterCategoria');
  const $filterEstoque = document.getElementById('filterEstoque');

  const produtoModal = new bootstrap.Modal(document.getElementById('produtoModal'));
  const viewModal = new bootstrap.Modal(document.getElementById('viewProdutoModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteProdutoModal'));

  const $produtoForm = document.getElementById('produtoForm');
  const $produtoModalLabel = document.getElementById('produtoModalLabel');
  const $nome = document.getElementById('nomeProduto');
  const $categoria = document.getElementById('categoriaProduto'); 
  const $preco = document.getElementById('precoProduto');
  const $validade = document.getElementById('validadeProduto');
  const $estoque = document.getElementById('estoqueProduto');
  const $btnSalvar = document.getElementById('btnSalvarProduto');

  const $viewNome = document.getElementById('viewNomeProduto');
  const $viewCategoria = document.getElementById('viewCategoriaProduto');
  const $viewPreco = document.getElementById('viewPrecoProduto');
  const $viewEstoque = document.getElementById('viewEstoqueProduto');
  const $viewValidade = document.getElementById('viewValidadeProduto');
  const $viewEstoqueBadge = document.getElementById('viewEstoqueBadge');

  const $deleteNome = document.getElementById('deleteProdutoNome');
  const $btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  const $sair = document.querySelector('.sidebar-footer .nav-link[href*="login"]');
  $sair?.addEventListener('click', (e) => {
    try { localStorage.removeItem('token'); } catch {}
  });

  function formatMoney(v) {
    const n = Number(v || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  function formatDateISOToBR(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.valueOf())) return '-';
    return d.toLocaleDateString('pt-BR');
  }

  function estoqueNivel(qtd) {
    const n = Number(qtd || 0);
    if (n <= 10) return 'baixo';
    if (n <= 50) return 'normal';
    return 'alto';
  }

  function estoqueBadgeHtml(qtd) {
    const nivel = estoqueNivel(qtd);
    const map = {
      baixo:  { cls: 'bg-danger', label: 'Estoque Baixo' },
      normal: { cls: 'bg-warning text-dark', label: 'Estoque Normal' },
      alto:   { cls: 'bg-success', label: 'Estoque Alto' },
    };
    const x = map[nivel];
    return `<span class="badge ${x.cls} produto-badge">${x.label}</span>`;
  }

  function renderCards(list) {
    if (!$grid) return;
    let data = list;
    if (state.estoqueFiltro !== 'todos') {
      data = list.filter(p => estoqueNivel(p.estoqueAtual) === state.estoqueFiltro);
    }

    const cards = data.map(p => {
      const tipo = p.tipo || '-';
      const preco = formatMoney(p.preco);
      const estoqueTxt = `${p.estoqueAtual ?? 0} unidades`;
      return `
        <div class="col">
          <div class="card h-100 produto-card">
            <div class="card-body">
              <div class="produto-img-container mb-3">
                ${estoqueBadgeHtml(p.estoqueAtual)}
              </div>
              <h5 class="card-title">${p.nome}</h5>
              <p class="card-text text-muted">${tipo}</p>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="produto-preco">${preco}</span>
                <span class="produto-estoque">${estoqueTxt}</span>
              </div>
              <div class="produto-actions">
                <button class="btn btn-sm btn-outline-primary btn-view" data-id="${p.id}">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${p.id}">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${p.id}" data-nome="${p.nome}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    $grid.innerHTML = cards || `
      <div class="col">
        <div class="text-center text-muted py-4">Nenhum produto encontrado</div>
      </div>
    `;
  }

  function renderResumo(page, perPage, total) {
    if (!$resumo) return;
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(total, page * perPage);
    $resumo.textContent = `Mostrando ${start}-${end} de ${total} produtos`;
  }

  function renderPagination(page, totalPages) {
    if (!$pagination) return;
    const items = [];
    const prevDis = page <= 1 ? 'disabled' : '';
    const nextDis = page >= totalPages ? 'disabled' : '';

    items.push(`<li class="page-item ${prevDis}"><a class="page-link" href="#" data-page="${page - 1}">Anterior</a></li>`);

    const maxBtns = 5;
    let start = Math.max(1, page - Math.floor(maxBtns / 2));
    let end = Math.min(totalPages, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);
    for (let p = start; p <= end; p++) {
      items.push(`<li class="page-item ${p === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`);
    }

    items.push(`<li class="page-item ${nextDis}"><a class="page-link" href="#" data-page="${page + 1}">Próximo</a></li>`);

    $pagination.innerHTML = items.join('');
  }

  async function loadProdutos() {
    const params = new URLSearchParams();
    if (state.geral) params.set('geral', state.geral);
    if (state.tipo && state.tipo !== 'todos') params.set('tipo', state.tipo);
    params.set('page', String(state.page));
    params.set('perPage', String(state.perPage));

    const data = await api('GET', `/api/produtos?${params.toString()}`);
    const payload = data?.dados || data; 

    renderCards(payload.data || []);
    renderResumo(payload.page, payload.perPage, payload.total);
    state.totalPages = payload.totalPages || 1;
    renderPagination(payload.page, state.totalPages);
  }

  function resetForm() {
    $produtoForm.reset();
    $produtoModalLabel.textContent = 'Adicionar Produto';
    state.currentEditId = null;
  }

  function montarPayload() {
    const tipoTexto = $categoria.selectedOptions[0]
      ? $categoria.selectedOptions[0].textContent.trim()
      : '';

    return {
      nome: ($nome.value || '').trim(),
      tipo: tipoTexto || null,
      preco: Number($preco.value),
      validade: $validade.value ? $validade.value : null, 
      estoqueAtual: Number($estoque.value || 0),
    };
  }

  $search?.addEventListener('input', () => {
    state.geral = $search.value.trim();
    state.page = 1;
    loadProdutos().catch(err => alert(err.message));
  });


  $filterCategoria?.addEventListener('change', () => {
    state.tipo = ($filterCategoria.selectedOptions[0]?.textContent || 'todos').trim();
    if ($filterCategoria.value === 'todos') state.tipo = 'todos';
    state.page = 1;
    loadProdutos().catch(err => alert(err.message));
  });

  $filterEstoque?.addEventListener('change', () => {
    state.estoqueFiltro = $filterEstoque.value; 
    state.page = 1;
    loadProdutos().catch(err => alert(err.message));
  });

  $btnAdd?.addEventListener('click', () => {
    resetForm();
    produtoModal.show();
  });

  $btnSalvar?.addEventListener('click', async () => {
    try {
      if (!$produtoForm.checkValidity()) {
        $produtoForm.reportValidity();
        return;
      }

      const payload = montarPayload();
      if (!payload.nome) throw new Error('Nome é obrigatório.');
      if (Number.isNaN(Number(payload.preco))) throw new Error('Preço inválido.');

      if (state.currentEditId) {
        await api('PUT', `/api/produtos/${state.currentEditId}`, payload);
      } else {
        await api('POST', `/api/produtos`, payload);
      }

      produtoModal.hide();
      await loadProdutos();
    } catch (e) {
      alert(e?.message || 'Erro ao salvar produto.');
    }
  });

  $grid?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');

    if (btn.classList.contains('btn-view')) {
      abrirView(id).catch(e => alert(e.message));
    } else if (btn.classList.contains('btn-edit')) {
      abrirEditar(id).catch(e => alert(e.message));
    } else if (btn.classList.contains('btn-delete')) {
      const nome = btn.getAttribute('data-nome') || '';
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
    loadProdutos().catch(err => alert(err.message));
  });

  $btnConfirmarExclusao?.addEventListener('click', async () => {
    if (!state.currentDeleteId) return;
    try {
      await api('DELETE', `/api/produtos/${state.currentDeleteId}`);
      deleteModal.hide();
      await loadProdutos();
    } catch (e) {
      alert(e?.message || 'Erro ao excluir produto.');
    }
  });

  async function abrirView(id) {
    const res = await api('GET', `/api/produtos/${id}`);
    const p = res?.dados || res;
    $viewNome.textContent = p.nome || '';
    $viewCategoria.textContent = p.tipo || '-';
    $viewPreco.textContent = formatMoney(p.preco);
    $viewEstoque.textContent = `${p.estoqueAtual ?? 0} unidades`;
    $viewValidade.textContent = formatDateISOToBR(p.validade);
    $viewEstoqueBadge.outerHTML = estoqueBadgeHtml(p.estoqueAtual);
    state.currentViewId = p.id;
    viewModal.show();
  }

  async function abrirEditar(id) {
    const res = await api('GET', `/api/produtos/${id}`);
    const p = res?.dados || res;

    $produtoModalLabel.textContent = 'Editar Produto';
    state.currentEditId = p.id;

    $nome.value = p.nome || '';

    const textoTipo = (p.tipo || '').toLowerCase();
    let matched = false;
    Array.from($categoria.options).forEach(opt => {
      if (opt.textContent.trim().toLowerCase() === textoTipo) {
        opt.selected = true;
        matched = true;
      }
    });
    if (!matched) $categoria.value = '';

    $preco.value = Number(p.preco || 0);
    $validade.value = p.validade ? String(p.validade).slice(0,10) : '';
    $estoque.value = Number(p.estoqueAtual || 0);

    produtoModal.show();
  }

  function abrirDelete(id, nome) {
    state.currentDeleteId = id;
    if ($deleteNome) $deleteNome.textContent = nome || '';
    deleteModal.show();
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Produtos] API_BASE:', API_BASE);
    loadProdutos().catch(e => {
      console.error(e);
      alert(e?.message || 'Erro ao carregar produtos.');
    });
  });
})();
