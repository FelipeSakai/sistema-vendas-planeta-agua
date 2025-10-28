(function () {
  // =========================
  // Configuração e helpers
  // =========================
  const API_BASE = localStorage.getItem("API_BASE") || "";
  const getRawToken = () => localStorage.getItem("token") || "";
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, "").trim();

  function authHeaders() {
    const t = getToken();
    if (!t) {
      window.location.href = "login.html";
      return {};
    }
    return {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    };
  }

  async function api(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) throw new Error(data?.mensagem || `Erro ${res.status}`);
    return data?.dados ?? data;
  }

  const toCents = (v) => Math.round(Number(String(v).replace(/[^\d,.-]/g, "").replace(",", ".")) * 100) || 0;
  const fromCents = (v) => (v || 0) / 100;
  const formatBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fromCents(v));

  // =========================
  // DOM refs
  // =========================
  const inputProduto = document.getElementById("inputProduto");
  const sugestoesProduto = document.getElementById("sugestoesProduto");
  const quantidadeProduto = document.getElementById("quantidadeProduto");
  const precoProduto = document.getElementById("precoProduto");
  const subtotalProduto = document.getElementById("subtotalProduto");
  const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
  const listaProdutos = document.getElementById("listaProdutos");
  const subtotalVenda = document.getElementById("subtotalVenda");
  const descontoVenda = document.getElementById("descontoVenda");
  const descontoResumo = document.getElementById("descontoResumo");
  const totalVenda = document.getElementById("totalVenda");

  // =========================
  // Estado
  // =========================
  let catalogoProdutos = [];
  let carrinho = [];
  let debounce = null;

  // =========================
  // Inicialização
  // =========================
  document.addEventListener("DOMContentLoaded", async () => {
    await loadProdutos();
    configurarAutocomplete();
    configurarEventos();
    atualizarListaProdutos();
    atualizarTotais();
  });

  // =========================
  // Produtos (carrega todos)
  // =========================
  async function loadProdutos() {
    try {
      const payload = await api("GET", "/api/produtos?perPage=500");
      catalogoProdutos = payload?.data || payload || [];
      console.log("✅ Produtos carregados:", catalogoProdutos.length);
    } catch (e) {
      console.warn("Erro ao carregar produtos:", e);
      catalogoProdutos = [];
    }
  }

  // =========================
  // Autocomplete visual
  // =========================
  function configurarAutocomplete() {
    inputProduto.addEventListener("focus", () => {
      renderSugestoes(catalogoProdutos);
      sugestoesProduto.style.display = "block";
    });

    inputProduto.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const termo = inputProduto.value.trim().toLowerCase();
        const filtrados = termo
          ? catalogoProdutos.filter((p) => p.nome.toLowerCase().includes(termo))
          : catalogoProdutos;
        renderSugestoes(filtrados);
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!sugestoesProduto.contains(e.target) && e.target !== inputProduto) {
        sugestoesProduto.style.display = "none";
      }
    });
  }

  function renderSugestoes(lista) {
    sugestoesProduto.innerHTML = "";
    sugestoesProduto.className =
      "list-group position-absolute w-100 shadow-sm border rounded-3 overflow-auto";
    sugestoesProduto.style.maxHeight = "220px";
    sugestoesProduto.style.zIndex = "1050";
    sugestoesProduto.style.display = "block";

    if (!lista.length) {
      const div = document.createElement("div");
      div.className = "list-group-item text-center text-muted";
      div.textContent = "Nenhum produto encontrado";
      sugestoesProduto.appendChild(div);
      return;
    }

    lista.slice(0, 20).forEach((p) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      const preco =
        typeof p.precoCentavos === "number"
          ? fromCents(p.precoCentavos)
          : Number(p.preco || 0);
      item.innerHTML = `
        <span>${p.nome}</span>
        <strong class="text-primary">R$ ${preco.toFixed(2)}</strong>
      `;
      item.dataset.id = p.id;
      item.dataset.preco = preco;
      item.addEventListener("click", () => escolherProduto(item));
      sugestoesProduto.appendChild(item);
    });
  }

  function escolherProduto(item) {
    inputProduto.value = item.querySelector("span").textContent;
    inputProduto.dataset.produtoId = item.dataset.id;
    precoProduto.value = Number(item.dataset.preco || 0).toFixed(2);
    if (!quantidadeProduto.value || Number(quantidadeProduto.value) <= 0)
      quantidadeProduto.value = "1";
    atualizarSubtotalProduto();
    sugestoesProduto.style.display = "none";
  }

  // =========================
  // Produto na venda
  // =========================
  function atualizarSubtotalProduto() {
    const qtd = Number(quantidadeProduto.value || 0);
    const preco = toCents(precoProduto.value);
    subtotalProduto.value = fromCents(qtd * preco).toFixed(2);
  }

  function atualizarListaProdutos() {
    listaProdutos.innerHTML = "";
    if (!carrinho.length) {
      listaProdutos.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">Nenhum produto adicionado.</td></tr>';
      return;
    }

    carrinho.forEach((it) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.nome}</td>
        <td>${formatBRL(it.precoCents)}</td>
        <td>${it.quantidade}</td>
        <td class="text-end">${formatBRL(it.subtotalCents)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger btn-remover" data-id="${it.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>`;
      listaProdutos.appendChild(tr);
    });

    listaProdutos.querySelectorAll(".btn-remover").forEach((btn) => {
      btn.addEventListener("click", () => {
        carrinho = carrinho.filter((x) => x.id !== btn.dataset.id);
        atualizarListaProdutos();
        atualizarTotais();
      });
    });
  }

  function atualizarTotais() {
    const subtotal = carrinho.reduce((a, b) => a + b.subtotalCents, 0);
    const desconto = toCents(descontoVenda.value);
    const total = Math.max(0, subtotal - desconto);
    subtotalVenda.textContent = formatBRL(subtotal);
    descontoResumo.textContent = `- ${formatBRL(desconto)}`;
    totalVenda.textContent = formatBRL(total);
  }

  // =========================
  // Eventos
  // =========================
  function configurarEventos() {
    quantidadeProduto.addEventListener("input", atualizarSubtotalProduto);
    precoProduto.addEventListener("input", atualizarSubtotalProduto);
    descontoVenda.addEventListener("input", atualizarTotais);

    btnAdicionarProduto.addEventListener("click", () => {
      const id = inputProduto.dataset.produtoId;
      if (!id) return Swal.fire("Atenção", "Selecione um produto.", "warning");

      const qtd = Number(quantidadeProduto.value || 0);
      if (!qtd) return Swal.fire("Atenção", "Informe uma quantidade.", "warning");

      const precoCents = toCents(precoProduto.value);
      const nome =
        catalogoProdutos.find((p) => String(p.id) === String(id))?.nome ||
        inputProduto.value;

      const existente = carrinho.find((x) => x.id === id);
      if (existente) {
        existente.quantidade += qtd;
        existente.subtotalCents = existente.quantidade * existente.precoCents;
      } else {
        carrinho.push({
          id,
          nome,
          precoCents,
          quantidade: qtd,
          subtotalCents: qtd * precoCents,
        });
      }

      atualizarListaProdutos();
      atualizarTotais();
      Swal.fire({
        icon: "success",
        title: `${nome} adicionado!`,
        toast: true,
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
      });

      inputProduto.value = "";
      inputProduto.dataset.produtoId = "";
      precoProduto.value = "";
      quantidadeProduto.value = "1";
      subtotalProduto.value = "";
    });
  }
})();
