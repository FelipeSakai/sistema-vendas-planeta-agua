(function () {
  const API_BASE = localStorage.getItem('API_BASE') || '';
  const getRawToken = () => localStorage.getItem('token') || '';
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, '').trim();

  function authHeaders(isForm = false) {
    const t = getToken();
    if (!t) {
      const href = location.pathname.includes('/pages/')
        ? 'login.html'
        : '/pages/login.html';
      location.href = href;
      return {};
    }

    // Se for FormData → NÃO coloca Content-Type
    if (isForm) {
      return { 'Authorization': `Bearer ${t}` };
    }

    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` };
  }

  const safeAlert = (opts) =>
    (window.Swal && Swal.fire)
      ? Swal.fire(opts)
      : alert(opts?.text || opts?.title || 'Aviso');


  // =====================================================
  //               FUNÇÃO API COM PERMISSÃO
  // =====================================================
  async function api(method, path, body, isForm = false) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(isForm),
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { raw: text }; }

    // 403 → Sem permissão
    if (res.status === 403) {
      safeAlert({
        icon: "error",
        title: "Acesso Negado",
        text: data?.mensagem || data?.error || "Você não tem permissão para esta ação.",
        confirmButtonColor: "#1e88e5"
      });
      throw new Error("Permissão negada");
    }

    // 401 → Token inválido ou expirado
    if (res.status === 401) {
      safeAlert({
        icon: "warning",
        title: "Sessão Expirada",
        text: "Faça login novamente.",
        confirmButtonColor: "#1e88e5"
      });

      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }, 10);

      throw new Error("Não autorizado");
    }

    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // =====================================================
  //                    ESTADO DA PÁGINA
  // =====================================================
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

  // =====================================================
  //               ELEMENTOS DA INTERFACE
  // =====================================================
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
  const $estoque = document.getElementById('estoqueProduto');
  const $btnSalvar = document.getElementById('btnSalvarProduto');
  const $imgInput = document.getElementById('imagemProduto');
  const $preview = document.getElementById('previewImagem');
  const $wrapRemover = document.getElementById('wrapRemoverImg');
  const $remover = document.getElementById('removerImagem');

  const $viewNome = document.getElementById('viewNomeProduto');
  const $viewCategoria = document.getElementById('viewCategoriaProduto');
  const $viewPreco = document.getElementById('viewPrecoProduto');
  const $viewEstoque = document.getElementById('viewEstoqueProduto');
  const $viewEstoqueBadge = document.getElementById('viewEstoqueBadge');

  const $deleteNome = document.getElementById('deleteProdutoNome');
  const $btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  const $sair = document.querySelector('.sidebar-footer .nav-link[href*="login"]');
  $sair?.addEventListener('click', () => localStorage.removeItem('token'));

  // =====================================================
  //                     FUNÇÕES ÚTEIS
  // =====================================================
  function formatMoney(v) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(v || 0));
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
      baixo: { cls: 'bg-danger', label: 'Estoque Baixo' },
      normal: { cls: 'bg-warning text-dark', label: 'Estoque Normal' },
      alto: { cls: 'bg-success', label: 'Estoque Alto' },
    };
    const x = map[nivel];
    return `<span class="badge ${x.cls} produto-badge">${x.label}</span>`;
  }

  // =====================================================
  //                 PRÉ-VISUALIZAÇÃO DA IMAGEM
  // =====================================================
  $imgInput?.addEventListener('change', () => {
    const f = $imgInput.files?.[0];
    if (f) {
      $preview.src = URL.createObjectURL(f);
      $preview.classList.remove('d-none');
      $wrapRemover.classList.remove('d-none');
      if ($remover) $remover.checked = false;
    }
  });

  // =====================================================
  //                     RENDER DOS CARDS
  // =====================================================
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

      let imgUrl = '';
      if (p.imageUrl) {
        imgUrl = p.imageUrl.startsWith('http')
          ? p.imageUrl
          : `${API_BASE}${p.imageUrl.startsWith('/') ? p.imageUrl : '/' + p.imageUrl}`;
      }

      const imgHtml = imgUrl
        ? `<img src="${imgUrl}" class="produto-img mb-2" style="max-width:100%;max-height:120px;object-fit:contain;">`
        : `<div class="produto-img-placeholder mb-2"
             style="width:100%;height:120px;background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;">
              Sem imagem
           </div>`;

      return `
        <div class="col">
          <div class="card h-100 produto-card">
            <div class="card-body">
              <div class="produto-img-container mb-3">
                ${imgHtml}
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
                <button class="btn btn-sm btn-outline-danger btn-delete"
                    data-id="${p.id}"
                    data-nome="${p.nome}">
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
        <div class="text-center text-muted py-4">
          Nenhum produto encontrado
        </div>
      </div>
    `;
  }


  // =====================================================
  //                   PAGINAÇÃO / RESUMO
  // =====================================================
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

    items.push(`<li class="page-item ${prevDis}">
      <a class="page-link" href="#" data-page="${page - 1}">Anterior</a>
    </li>`);

    const maxBtns = 5;
    let start = Math.max(1, page - Math.floor(maxBtns / 2));
    let end = Math.min(totalPages, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);

    for (let p = start; p <= end; p++) {
      items.push(`
        <li class="page-item ${p === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${p}">${p}</a>
        </li>
      `);
    }

    items.push(`<li class="page-item ${nextDis}">
      <a class="page-link" href="#" data-page="${page + 1}">Próximo</a>
    </li>`);

    $pagination.innerHTML = items.join('');
  }

  // =====================================================
  //                   CARREGAMENTO
  // =====================================================
  async function loadProdutos() {
    const params = new URLSearchParams();
    if (state.geral) params.set('geral', state.geral);
    if (state.tipo !== 'todos') params.set('tipo', state.tipo);

    params.set('page', state.page);
    params.set('perPage', state.perPage);

    const data = await api('GET', `/api/produtos?${params.toString()}`);
    const payload = data?.dados || data;

    renderCards(payload.data || []);
    renderResumo(payload.page, payload.perPage, payload.total);

    state.totalPages = payload.totalPages || 1;
    renderPagination(payload.page, state.totalPages);
  }

  // =====================================================
  //               FORMULÁRIO / CRIAÇÃO
  // =====================================================
  function montarFormData() {
    const fd = new FormData();

    const tipoTexto = document.getElementById('categoriaProduto').selectedOptions[0]
      ? document.getElementById('categoriaProduto').selectedOptions[0].textContent.trim()
      : '';

    fd.append('nome', (document.getElementById('nomeProduto').value || '').trim());
    if (tipoTexto) fd.append('tipo', tipoTexto);
    fd.append('preco', String(document.getElementById('precoProduto').value || '0'));
    fd.append('estoqueAtual', String(document.getElementById('estoqueProduto').value || '0'));

    const file = $imgInput?.files?.[0];
    if (file) fd.append('imagem', file);

    if ($remover?.checked) fd.append('imageUrl', '');

    return fd;
  }

  // =====================================================
  //                    EVENTOS DE FILTRO
  // =====================================================
  $search?.addEventListener('input', () => {
    state.geral = $search.value.trim();
    state.page = 1;
    loadProdutos();
  });

  $filterCategoria?.addEventListener('change', () => {
    state.tipo = ($filterCategoria.selectedOptions[0]?.textContent || 'todos').trim();
    if ($filterCategoria.value === 'todos') state.tipo = 'todos';
    state.page = 1;
    loadProdutos();
  });

  $filterEstoque?.addEventListener('change', () => {
    state.estoqueFiltro = $filterEstoque.value;
    state.page = 1;
    loadProdutos();
  });

  // =====================================================
  //                    ADICIONAR PRODUTO
  // =====================================================
  $btnAdd?.addEventListener('click', () => {
    $produtoForm.reset();
    $produtoModalLabel.textContent = 'Adicionar Produto';
    state.currentEditId = null;
    $preview.classList.add('d-none');
    produtoModal.show();
  });

  // =====================================================
  //                 SALVAR (CRIAR / EDITAR)
  // =====================================================
  $btnSalvar?.addEventListener('click', async () => {
    try {
      if (!$produtoForm.checkValidity()) { 
        $produtoForm.reportValidity(); 
        return; 
      }

      const fd = montarFormData();

      if (state.currentEditId) {
        await api('PUT', `/api/produtos/${state.currentEditId}`, fd, true);
      } else {
        await api('POST', `/api/produtos`, fd, true);
      }

      produtoModal.hide();
      await loadProdutos();

    } catch (e) {
      safeAlert({
        icon: "error",
        title: "Erro",
        text: e.message || 'Erro ao salvar produto.'
      });
    }
  });

  // =====================================================
  //                     VIEW / EDITAR
  // =====================================================
  $grid?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;

    const id = btn.getAttribute('data-id');

    if (btn.classList.contains('btn-view')) abrirView(id);
    if (btn.classList.contains('btn-edit')) abrirEditar(id);
    if (btn.classList.contains('btn-delete')) {
      const nome = btn.getAttribute('data-nome');
      abrirDelete(id, nome);
    }
  });

  async function abrirView(id) {
    const res = await api('GET', `/api/produtos/${id}`);
    const p = res?.dados || res;

    $viewNome.textContent = p.nome || '';
    $viewCategoria.textContent = p.tipo || '-';
    $viewPreco.textContent = formatMoney(p.preco);
    $viewEstoque.textContent = `${p.estoqueAtual ?? 0} unidades`;

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
    $preco.value = p.preco || '';
    $estoque.value = p.estoqueAtual ?? 0;

    for (const opt of $categoria.options) {
      if (opt.textContent.trim() === (p.tipo || '').trim()) {
        $categoria.value = opt.value;
        break;
      }
    }

    if (p.imageUrl) {
      const imgUrl = p.imageUrl.startsWith('http')
        ? p.imageUrl
        : `${API_BASE}${p.imageUrl}`;
      $preview.src = imgUrl;
      $preview.classList.remove('d-none');
      $wrapRemover.classList.remove('d-none');
    } else {
      $preview.classList.add('d-none');
      $wrapRemover.classList.add('d-none');
    }

    if ($imgInput) $imgInput.value = '';
    produtoModal.show();
  }

  // =====================================================
  //                       DELETE
  // =====================================================
  function abrirDelete(id, nome) {
    state.currentDeleteId = id;
    $deleteNome.textContent = nome;
    deleteModal.show();
  }

  $btnConfirmarExclusao?.addEventListener('click', async () => {
    if (!state.currentDeleteId) return;

    try {
      await api('DELETE', `/api/produtos/${state.currentDeleteId}`);
      deleteModal.hide();
      await loadProdutos();
    } catch (e) {
      safeAlert({
        icon: "error",
        title: "Erro ao excluir",
        text: e.message
      });
    }
  });

  // =====================================================
  //                   INICIALIZAÇÃO
  // =====================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadProdutos();
  });

})();
