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

    if (isForm) {
      return { 'Authorization': `Bearer ${t}` };
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t}`,
    };
  }

  const safeAlert = (opts) =>
    (window.Swal && Swal.fire)
      ? Swal.fire(opts)
      : alert(opts?.text || opts?.title || 'Aviso');

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

    if (res.status === 403) {
      safeAlert({
        icon: "error",
        title: "Acesso negado",
        text: data?.mensagem || data?.error || "Você não tem permissão para esta ação.",
      });
      throw new Error("Permissão negada");
    }

    if (res.status === 401) {
      safeAlert({
        icon: "warning",
        title: "Sessão expirada",
        text: "Faça login novamente.",
      });

      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }, 200);

      throw new Error("Não autorizado");
    }

    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // =====================================================
  // ESTADO
  // =====================================================
  const state = {
    page: 1,
    perPage: 12,
    totalPages: 1,
    geral: '',
    tipo: 'todos',       // "AGUA" | "GALAO" | "ACESSORIO" | "todos"
    estoqueFiltro: 'todos',
    currentEditId: null,
    currentDeleteId: null,
  };

  // =====================================================
  // ELEMENTOS (com fallbacks pra evitar quebrar)
  // =====================================================
  const $grid = document.getElementById('produtosGrid');
  const $resumo = document.getElementById('produtosResumo');
  const $pagination = document.querySelector('.pagination');

  const $btnAdd = document.getElementById('btnAddProduto');
  const $search = document.getElementById('searchProduto');

  // Filtro de categoria (topo)
  const $filterCategoria =
    document.getElementById('filterCategoria') ||
    document.querySelector('.card #filterCategoria') ||
    document.querySelector('.card #categoriaProduto') || // fallback pro seu HTML atual
    null;

  const $filterEstoque = document.getElementById('filterEstoque');

  const produtoModalEl = document.getElementById('produtoModal');
  const produtoModal = produtoModalEl ? new bootstrap.Modal(produtoModalEl) : null;
  const deleteModalEl = document.getElementById('deleteProdutoModal');
  const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

  const $produtoForm = document.getElementById('produtoForm');
  const $produtoModalLabel = document.getElementById('produtoModalLabel');
  const $nome = document.getElementById('nomeProduto');
  const $preco = document.getElementById('precoProduto');
  const $estoque = document.getElementById('estoqueProduto');
  const $btnSalvar = document.getElementById('btnSalvarProduto');
  const $imgInput = document.getElementById('imagemProduto');
  const $preview = document.getElementById('previewImagem');
  const $wrapRemover = document.getElementById('wrapRemoverImg');
  const $remover = document.getElementById('removerImagem');

  // Select da CATEGORIA dentro do MODAL
  // tenta primeiro id novo (categoriaProdutoModal)
  // se não achar, pega o que está dentro do modal com id categoriaProduto (teu HTML atual)
  const $categoria =
    document.getElementById('categoriaProdutoModal') ||
    (produtoModalEl ? produtoModalEl.querySelector('#categoriaProduto') : null);

  const $deleteNome = document.getElementById('deleteProdutoNome');
  const $btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  const $sair = document.querySelector('.sidebar-footer .nav-link[href*="login"]');
  $sair?.addEventListener('click', () => localStorage.removeItem('token'));

  // =====================================================
  // UTILS
  // =====================================================
  function formatMoney(v) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
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

  // converte código → texto bonitinho pra mostrar no card
  function tipoLabel(tipo) {
    const t = (tipo || '').toUpperCase();
    const map = {
      AGUA: 'Água Mineral',
      GALAO: 'Galão',
      ACESSORIO: 'Acessório',
    };
    return map[t] || tipo || '-';
  }

  // =====================================================
  // PRÉ-VISUALIZAÇÃO DA IMAGEM
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
  // RENDER DOS CARDS
  // =====================================================
  function renderCards(list) {
    if (!$grid) return;

    let data = list;

    if (state.estoqueFiltro !== 'todos') {
      data = data.filter(p => estoqueNivel(p.estoqueAtual) === state.estoqueFiltro);
    }

    const cards = data.map(p => {
      const tipo = tipoLabel(p.tipo);
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
  // PAGINAÇÃO / RESUMO
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

  // paginação click
  $pagination?.addEventListener('click', (ev) => {
    const a = ev.target.closest('a.page-link');
    if (!a) return;
    ev.preventDefault();
    const p = Number(a.dataset.page);
    if (!Number.isFinite(p) || p < 1 || p > state.totalPages) return;
    state.page = p;
    loadProdutos();
  });

  // =====================================================
  // CARREGAMENTO
  // =====================================================
  async function loadProdutos() {
    const params = new URLSearchParams();
    if (state.geral) params.set('geral', state.geral);
    if (state.tipo && state.tipo !== 'todos') params.set('tipo', state.tipo);

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
  // FORMULÁRIO / CRIAÇÃO / EDIÇÃO
  // =====================================================
  function montarFormData() {
    const fd = new FormData();

    // categoria do MODAL
    let tipoValue = '';
    if ($categoria) {
      // se estiver com value="AGUA|GALAO|ACESSORIO"
      if ($categoria.value) {
        tipoValue = $categoria.value;
      } else {
        // fallback por texto
        const opt = $categoria.selectedOptions?.[0];
        if (opt) {
          const texto = opt.textContent.trim().toUpperCase();
          if (texto.includes('ÁGUA')) tipoValue = 'AGUA';
          else if (texto.includes('GALÃO') || texto.includes('GALAO')) tipoValue = 'GALAO';
          else if (texto.includes('ACESSÓRIO') || texto.includes('ACESSORIO')) tipoValue = 'ACESSORIO';
        }
      }
    }

    fd.append('nome', ($nome?.value || '').trim());
    if (tipoValue) {
      fd.append('tipo', tipoValue); // vai como "AGUA" | "GALAO" | "ACESSORIO"
    }
    fd.append('preco', String($preco?.value || '0'));
    fd.append('estoqueAtual', String($estoque?.value || '0'));

    const file = $imgInput?.files?.[0];
    if (file) fd.append('imagem', file);

    if ($remover?.checked) fd.append('imageUrl', '');

    return fd;
  }

  // =====================================================
  // EVENTOS DE FILTRO
  // =====================================================
  $search?.addEventListener('input', () => {
    state.geral = $search.value.trim();
    state.page = 1;
    loadProdutos();
  });

  $filterCategoria?.addEventListener('change', () => {
    // ideal: value="todos" | "AGUA" | "GALAO" | "ACESSORIO"
    const val = ($filterCategoria.value || '').toUpperCase();
    if (!val || val === 'TODOS') {
      state.tipo = 'todos';
    } else if (['AGUA', 'GALAO', 'ACESSORIO'].includes(val)) {
      state.tipo = val;
    } else {
      // fallback por texto do option se value vier vazio
      const opt = $filterCategoria.selectedOptions?.[0];
      const texto = opt?.textContent.trim().toUpperCase() || '';
      if (texto.includes('ÁGUA')) state.tipo = 'AGUA';
      else if (texto.includes('GALÃO') || texto.includes('GALAO')) state.tipo = 'GALAO';
      else if (texto.includes('ACESSÓRIO') || texto.includes('ACESSORIO')) state.tipo = 'ACESSORIO';
      else state.tipo = 'todos';
    }

    state.page = 1;
    loadProdutos();
  });

  $filterEstoque?.addEventListener('change', () => {
    state.estoqueFiltro = $filterEstoque.value;
    state.page = 1;
    loadProdutos();
  });

  // =====================================================
  // ADICIONAR PRODUTO
  // =====================================================
  $btnAdd?.addEventListener('click', () => {
    if (!$produtoForm) return;

    $produtoForm.reset();
    if ($produtoModalLabel) $produtoModalLabel.textContent = 'Adicionar Produto';
    state.currentEditId = null;

    $preview?.classList.add('d-none');
    $wrapRemover?.classList.add('d-none');
    if ($remover) $remover.checked = false;
    if ($imgInput) $imgInput.value = '';

    if ($categoria) $categoria.value = '';

    produtoModal?.show();
  });

  // =====================================================
  // SALVAR (CRIAR / EDITAR)
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

      produtoModal?.hide();
      await loadProdutos();

    } catch (e) {
      safeAlert({
        icon: "error",
        title: "Erro",
        text: e.message || 'Erro ao salvar produto.',
      });
    }
  });

  // =====================================================
  // GRID: EDITAR / DELETE
  // =====================================================
  $grid?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;

    const id = btn.getAttribute('data-id');

    if (btn.classList.contains('btn-edit')) {
      abrirEditar(id);
      return;
    }

    if (btn.classList.contains('btn-delete')) {
      const nome = btn.getAttribute('data-nome');
      abrirDelete(id, nome);
      return;
    }
  });

  async function abrirEditar(id) {
    const res = await api('GET', `/api/produtos/${id}`);
    const p = res?.dados || res;

    if ($produtoModalLabel) $produtoModalLabel.textContent = 'Editar Produto';
    state.currentEditId = p.id;

    if ($nome) $nome.value = p.nome || '';
    if ($preco) $preco.value = p.preco || '';
    if ($estoque) $estoque.value = p.estoqueAtual ?? 0;

    // seta categoria no modal
    if ($categoria) {
      const tipo = (p.tipo || '').toUpperCase();
      let setado = false;

      for (const opt of $categoria.options) {
        if (opt.value && opt.value.toUpperCase() === tipo) {
          $categoria.value = opt.value;
          setado = true;
          break;
        }
      }

      if (!setado) {
        $categoria.value = '';
      }
    }

    if (p.imageUrl) {
      const imgUrl = p.imageUrl.startsWith('http')
        ? p.imageUrl
        : `${API_BASE}${p.imageUrl}`;
      if ($preview) {
        $preview.src = imgUrl;
        $preview.classList.remove('d-none');
      }
      $wrapRemover?.classList.remove('d-none');
    } else {
      $preview?.classList.add('d-none');
      $wrapRemover?.classList.add('d-none');
    }

    if ($imgInput) $imgInput.value = '';
    if ($remover) $remover.checked = false;

    produtoModal?.show();
  }

  // =====================================================
  // DELETE
  // =====================================================
  function abrirDelete(id, nome) {
    state.currentDeleteId = id;
    if ($deleteNome) $deleteNome.textContent = nome;
    deleteModal?.show();
  }

  $btnConfirmarExclusao?.addEventListener('click', async () => {
    if (!state.currentDeleteId) return;

    try {
      await api('DELETE', `/api/produtos/${state.currentDeleteId}`);
      deleteModal?.hide();
      await loadProdutos();
    } catch (e) {
      safeAlert({
        icon: "error",
        title: "Erro ao excluir",
        text: e.message,
      });
    }
  });

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadProdutos();
  });

})();
