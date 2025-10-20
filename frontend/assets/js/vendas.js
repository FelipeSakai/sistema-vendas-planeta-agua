// vendas.js
// ===== Módulo Vendas (frontend) =====
(function () {
  // =========================
  // Config / Helpers Gerais
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
      "Authorization": `Bearer ${t}`,
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
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }
    // pode vir {sucesso, mensagem, dados} ou objeto direto
    return data?.dados ?? data;
  }

  // ===== Helpers de dinheiro (centavos) =====
  function toCents(n) {
    if (n == null) return 0;
    if (typeof n === "number") return Math.round(n * 100);
    if (typeof n === "string") {
      const s = n.trim().replace(/\s+/g, "").replace(/[R$\u00A0]/g, "");
      let norm;
      if (s.indexOf(".") > -1 && s.indexOf(",") > -1) {
        norm = s.replace(/\./g, "").replace(",", ".");
      } else {
        norm = s.replace(/,/g, ".");
      }
      const num = Number(norm);
      return Number.isNaN(num) ? 0 : Math.round(num * 100);
    }
    return 0;
  }
  function fromCents(cents) { return (Number(cents || 0) / 100); }
  function formatBRLFromCents(cents) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(fromCents(cents));
  }
  function readMoneyText(text) {
    const num = String(text || "").replace(/[^\d.,-]/g, "");
    return toCents(num);
  }

  // SweetAlert2 helpers
  function toastSuccess(msg) {
    if (!window.Swal) return alert(msg);
    Swal.fire({ icon: "success", title: msg, toast: true, position: "top-end", showConfirmButton: false, timer: 2500 });
  }
  function toastError(msg) {
    if (!window.Swal) return alert(msg);
    Swal.fire({ icon: "error", title: "Erro", text: msg });
  }
  function toastWarn(msg) {
    if (!window.Swal) return alert(msg);
    Swal.fire({ icon: "warning", title: "Atenção", text: msg });
  }

  // =========================
  // Referências de DOM
  // =========================
  const finalizarVendaModal = new bootstrap.Modal(document.getElementById("finalizarVendaModal"));
  const salvarPendenteModal = new bootstrap.Modal(document.getElementById("salvarPendenteModal"));
  const clienteModal = new bootstrap.Modal(document.getElementById("clienteModal"));

  const formCliente = document.getElementById("formCliente");

  const btnSelecionarCliente = document.getElementById("btnSelecionarCliente");
  const btnAlterarCliente = document.getElementById("btnAlterarCliente");
  const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
  const btnSalvarPendente = document.getElementById("btnSalvarPendente");
  const btnCancelarVenda = document.getElementById("btnCancelarVenda");
  const btnConfirmarFinalizacao = document.getElementById("btnConfirmarFinalizacao");
  const btnConfirmarPendente = document.getElementById("btnConfirmarPendente");
  const btnBuscarCliente = document.getElementById("btnBuscarCliente");

  const clienteSelecionadoBox = document.getElementById("clienteSelecionado");
  const semClienteSelecionadoBox = document.getElementById("semClienteSelecionado");
  const nomeCliente = document.getElementById("nomeCliente");
  const telefoneCliente = document.getElementById("telefoneCliente");
  const enderecoCliente = document.getElementById("enderecoCliente");

  const produtoSelect = document.getElementById("produtoSelect");
  const quantidadeProduto = document.getElementById("quantidadeProduto");
  const precoProduto = document.getElementById("precoProduto");
  const subtotalProduto = document.getElementById("subtotalProduto");

  const listaProdutos = document.getElementById("listaProdutos");
  const subtotalVenda = document.getElementById("subtotalVenda");
  const descontoVenda = document.getElementById("descontoVenda");
  const descontoResumo = document.getElementById("descontoResumo");
  const totalVenda = document.getElementById("totalVenda");
  const formaPagamento = document.getElementById("formaPagamento");

  const valorRecebidoFinalizar = document.getElementById("valorRecebidoFinalizar");
  const trocoFinalizarVenda = document.getElementById("trocoFinalizarVenda");
  const buscarCliente = document.getElementById("buscarCliente");

  const motoristaVenda = document.getElementById("motoristaVenda");
  const dataEntrega = document.getElementById("dataEntrega");
  const observacoesVenda = document.getElementById("observacoesVenda");

  // Campos no modal de finalização
  const clienteFinalizarVenda = document.getElementById("clienteFinalizarVenda");
  const totalFinalizarVenda = document.getElementById("totalFinalizarVenda");
  const formaPagamentoFinalizarVenda = document.getElementById("formaPagamentoFinalizarVenda");

  // Campos no modal pendente
  const totalVendaPendente = document.getElementById("totalVendaPendente");
  const formaPagamentoPendente = document.getElementById("formaPagamentoPendente");
  const observacoesPendente = document.getElementById("observacoesPendente");

  // Modal listagem de clientes
  const listaClientesEl = document.getElementById("listaClientes");

  const urlParams = new URLSearchParams(location.search);
  const currentVendaId = urlParams.get("id") ? Number(urlParams.get("id")) : null;

  // =========================
  // Estado
  // =========================
  let selectedCliente = null; // {id, nome, telefone, endereco}
  let carrinho = [];          // [{id, nome, precoCents, quantidade, subtotalCents, itemId?}]
  let catalogoProdutos = [];  // [{id, nome, preco | precoCentavos }]

  // =========================
  // Carregamentos Iniciais
  // =========================
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      await Promise.all([loadProdutos(), atualizarListaClientes(""), loadMotoristas()]);
      atualizarListaProdutos();
      atualizarTotais();
      configurarEventos();

      // se estiver editando, carrega a venda
      if (currentVendaId) await loadVendaExistente(currentVendaId);
    } catch (e) {
      console.error(e);
      toastError(e.message || "Falha ao inicializar a tela de vendas.");
    }
  }

  async function loadVendaExistente(vendaId) {
    const v = await api("GET", `/api/vendas/${vendaId}`); // espera include de cliente, entrega, itens.produto

    // cliente (fallback se API não enviar 'cliente')
    const cli =
      v.cliente ||
      (v.clienteId
        ? await api("GET", `/api/clientes?perPage=1&id=${v.clienteId}`).then(r => (r?.data?.[0] || r))
        : null);

    if (cli) {
      selecionarCliente({
        id: cli.id,
        nome: cli.nome,
        telefone: cli.telefone || "-",
        endereco: cli.endereco || "-",
      });
    } else {
      selectedCliente = null; // impede finalizar sem cliente
    }

    // itens -> carrinho
    carrinho = (v.itens || []).map(i => {
      const nome =
        i.produto?.nome ||
        catalogoProdutos.find(p => Number(p.id) === Number(i.produtoId))?.nome ||
        `Produto ${i.produtoId}`;
      return {
        id: String(i.produtoId),
        itemId: i.id, // necessário para remover/atualizar no backend
        nome,
        precoCents: toCents(String(i.precoUnitario)),
        quantidade: Number(i.quantidade),
        subtotalCents: toCents(String(i.subtotal)),
      };
    });
    atualizarListaProdutos();

    // totais / desconto
    descontoVenda.value = Number(v.desconto || 0).toFixed(2);
    atualizarTotais();

    // forma de pagamento (enum do backend)
    if (v.formaPagamento) formaPagamento.value = String(v.formaPagamento);

    // entrega / motorista / data (se existir)
    if (v.entrega) {
      if (v.entrega.motoristaId) motoristaVenda.value = String(v.entrega.motoristaId);
      const dPrev = v.entrega.dataPrevista || v.entrega.dataEntrega;
      if (dPrev) {
        const d = new Date(dPrev);
        if (!Number.isNaN(+d)) dataEntrega.value = d.toISOString().slice(0, 10);
      }
    }

    // observações
    if (v.observacao) observacoesVenda.value = v.observacao;

    // Se a venda não estiver ABERTA/LOJA, desabilite adição de itens
    if (v.status !== "ABERTA" && v.status !== "LOJA") {
      btnAdicionarProduto.disabled = true;
    }
  }

  // =========================
  // API: Motoristas, Clientes, Produtos
  // =========================
  async function loadMotoristas() {
    let usuarios = [];
    try {
      const resp = await api("GET", "/api/usuarios?cargo=MOTORISTA&perPage=200");
      usuarios = resp?.data || resp || [];
    } catch {
      try {
        const resp2 = await api("GET", "/api/usuarios?role=MOTORISTA&perPage=200");
        usuarios = resp2?.data || resp2 || [];
      } catch (e2) {
        console.warn("Não consegui carregar motoristas do backend:", e2);
        usuarios = [];
      }
    }

    const sel = document.getElementById("motoristaVenda");
    if (!sel) return;

    sel.innerHTML = `<option value="" selected disabled>Selecione o motorista</option>`;

    if (!usuarios.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.textContent = "Nenhum motorista cadastrado";
      sel.appendChild(opt);
      return;
    }

    usuarios.forEach(u => {
      const opt = document.createElement("option");
      opt.value = String(u.id);
      opt.textContent = u.nome || `Usuário ${u.id}`;
      sel.appendChild(opt);
    });
  }

  async function atualizarListaClientes(filtro = "") {
    listaClientesEl.innerHTML = "";

    const params = new URLSearchParams();
    params.set("perPage", "50");
    if (filtro?.trim()) params.set("geral", filtro.trim());
    params.set("incluirInativos", "false");

    const payload = await api("GET", `/api/clientes?${params.toString()}`);
    const clientes = payload?.data || payload || [];

    if (!clientes.length) {
      const li = document.createElement("li");
      li.className = "list-group-item text-center";
      li.textContent = filtro ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado.";
      listaClientesEl.appendChild(li);
      return;
    }

    clientes.forEach((c) => {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      li.setAttribute("data-id", c.id);
      li.innerHTML = `
        <div>
          <h6 class="mb-0">${c.nome}</h6>
          <small class="text-muted">${c.telefone || "-"}</small>
        </div>
        <button class="btn btn-sm btn-primary btn-selecionar">Selecionar</button>
      `;
      listaClientesEl.appendChild(li);
    });

    listaClientesEl.querySelectorAll(".btn-selecionar").forEach((btn) => {
      btn.addEventListener("click", () => {
        const li = btn.closest("li");
        const id = li.getAttribute("data-id");
        const c = clientes.find((x) => String(x.id) === String(id));
        if (c) selecionarCliente({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone || "-",
          endereco: c.endereco || "-",
        });
      });
    });
  }

  async function loadProdutos() {
    produtoSelect.innerHTML = `<option value="" selected disabled>Selecione um produto</option>`;

    const payload = await api("GET", `/api/produtos?perPage=200`);
    catalogoProdutos = payload?.data || payload || [];

    catalogoProdutos.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = p.nome;

      // suportar precoCentavos (int) ou preco (number)
      if (typeof p.precoCentavos === "number") {
        opt.setAttribute("data-preco", (p.precoCentavos / 100).toFixed(2));
      } else {
        opt.setAttribute("data-preco", Number(p.preco || 0).toFixed(2));
      }

      produtoSelect.appendChild(opt);
    });
  }

  // =========================
  // Seleção de Cliente
  // =========================
  function selecionarCliente(cliente) {
    selectedCliente = cliente;
    nomeCliente.textContent = cliente.nome;
    telefoneCliente.textContent = cliente.telefone || "-";
    enderecoCliente.textContent = cliente.endereco || "-";

    semClienteSelecionadoBox.style.display = "none";
    clienteSelecionadoBox.style.display = "block";
    clienteModal.hide();

    toastSuccess(`${cliente.nome} selecionado(a).`);
  }

  // =========================
  // Produtos na venda
  // =========================
  function atualizarSubtotalProduto() {
    const qtd = Number(quantidadeProduto.value || 0);
    const precoCents = toCents(precoProduto.value);
    subtotalProduto.value = fromCents(qtd * precoCents).toFixed(2);
  }

  function atualizarListaProdutos() {
    listaProdutos.innerHTML = "";

    if (!carrinho.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" class="text-center text-muted">Nenhum produto adicionado.</td>`;
      listaProdutos.appendChild(tr);
    } else {
      carrinho.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${item.nome}</td>
        <td>${formatBRLFromCents(item.precoCents)}</td>
        <td>${item.quantidade}</td>
        <td class="text-end">${formatBRLFromCents(item.subtotalCents)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-danger btn-remover-produto" data-id="${item.id}" data-item-id="${item.itemId || ""}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
        listaProdutos.appendChild(tr);
      });

      listaProdutos.querySelectorAll(".btn-remover-produto").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idProduto = btn.getAttribute("data-id");
          const itemId = btn.getAttribute("data-item-id"); // quando veio do backend

          const doRemoveLocal = () => {
            carrinho = carrinho.filter((x) => String(x.id) !== String(idProduto));
            atualizarListaProdutos();
            atualizarTotais();
            toastSuccess("Produto removido.");
          };

          if (!currentVendaId || !itemId) {
            if (!window.Swal) { if (confirm("Remover este produto?")) doRemoveLocal(); return; }
            Swal.fire({
              icon: "question", title: "Remover Produto", text: "Tem certeza?", showCancelButton: true,
              confirmButtonText: "Sim, remover", cancelButtonText: "Cancelar", confirmButtonColor: "#dc3545"
            }).then(r => { if (r.isConfirmed) doRemoveLocal(); });
            return;
          }

          // modo edição: remove no backend
          try {
            await api("DELETE", `/api/vendas/${currentVendaId}/itens/${itemId}`);
            await loadVendaExistente(currentVendaId);
            toastSuccess("Produto removido.");
          } catch (e) {
            toastError(e.message || "Falha ao remover item.");
          }
        });
      });
    }

    atualizarTotais();
  }

  function atualizarTotais() {
    const subtotalCents = carrinho.reduce((acc, it) => acc + it.subtotalCents, 0);
    const descontoCents = toCents(descontoVenda.value);
    const totalCents = Math.max(0, subtotalCents - descontoCents);

    subtotalVenda.textContent = formatBRLFromCents(subtotalCents);
    descontoResumo.textContent = `- ${formatBRLFromCents(descontoCents)}`;
    totalVenda.textContent = formatBRLFromCents(totalCents);
  }

  // =========================
  // Eventos
  // =========================
  function configurarEventos() {
    // selecionar cliente
    btnSelecionarCliente?.addEventListener("click", () => {
      document.getElementById("selecionar-tab")?.click();
      atualizarListaClientes("").catch((e) => toastError(e.message));
      clienteModal.show();
    });
    btnAlterarCliente?.addEventListener("click", () => {
      document.getElementById("selecionar-tab")?.click();
      atualizarListaClientes("").catch((e) => toastError(e.message));
      clienteModal.show();
    });

    // buscar cliente
    btnBuscarCliente?.addEventListener("click", () => {
      const filtro = (buscarCliente.value || "").trim();
      atualizarListaClientes(filtro).catch((e) => toastError(e.message));
    });
    buscarCliente?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const filtro = (buscarCliente.value || "").trim();
        atualizarListaClientes(filtro).catch((e2) => toastError(e2.message));
      }
    });

    // cadastrar cliente rápido
    formCliente?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const nome = document.getElementById("nomeNovoCliente").value.trim();
        const telefone = document.getElementById("telefoneNovoCliente").value.trim();
        const endereco = document.getElementById("enderecoNovoCliente").value.trim();
        if (!nome) throw new Error("Nome é obrigatório.");

        const cli = await api("POST", `/api/clientes`, {
          nome, telefone: telefone || null, endereco: endereco || null, status: "ATIVO",
        });

        selecionarCliente({
          id: cli.id, nome: cli.nome,
          telefone: cli.telefone || "-", endereco: cli.endereco || "-",
        });
        formCliente.reset();
      } catch (err) { toastError(err.message); }
    });

    // seleção de produto -> preenche preço
    produtoSelect?.addEventListener("change", () => {
      const id = produtoSelect.value;
      if (!id) { precoProduto.value = ""; subtotalProduto.value = ""; return; }
      const opt = produtoSelect.options[produtoSelect.selectedIndex];
      const preco = opt.getAttribute("data-preco") || "0";
      precoProduto.value = Number(preco).toFixed(2);
      atualizarSubtotalProduto();
    });

    quantidadeProduto?.addEventListener("input", atualizarSubtotalProduto);
    precoProduto?.addEventListener("input", atualizarSubtotalProduto);

    // adicionar item
    btnAdicionarProduto?.addEventListener("click", async () => {
      if (!produtoSelect.value) return toastWarn("Selecione um produto.");
      const qtd = Number(quantidadeProduto.value || 0);
      if (!qtd || qtd <= 0) return toastWarn("Informe uma quantidade válida.");

      const id = Number(produtoSelect.value);
      const opt = produtoSelect.options[produtoSelect.selectedIndex];
      const nome = opt.textContent;
      const precoCents = toCents(precoProduto.value);

      if (currentVendaId) {
        // edição: cria item na venda atual
        try {
          await api("POST", `/api/vendas/${currentVendaId}/itens`, {
            produtoId: id,
            quantidade: qtd,
            precoUnitario: fromCents(precoCents),
          });
          await loadVendaExistente(currentVendaId);
          toastSuccess(`${nome} adicionado.`);
        } catch (e) {
          return toastError(e.message || "Falha ao adicionar item.");
        }
      } else {
        // venda nova (local)
        const existente = carrinho.find((x) => String(x.id) === String(id));
        if (existente) {
          existente.quantidade += qtd;
          existente.subtotalCents = existente.quantidade * existente.precoCents;
          toastSuccess(`Quantidade de ${nome} atualizada.`);
        } else {
          carrinho.push({
            id: String(id),
            nome,
            precoCents,
            quantidade: qtd,
            subtotalCents: qtd * precoCents,
          });
          toastSuccess(`${nome} adicionado.`);
        }
        atualizarListaProdutos();
      }

      // limpa campos
      produtoSelect.value = "";
      quantidadeProduto.value = "1";
      precoProduto.value = "";
      subtotalProduto.value = "";
    });

    // desconto -> recalcula
    descontoVenda?.addEventListener("input", atualizarTotais);

    // finalizar venda -> abre modal
    btnFinalizarVenda?.addEventListener("click", () => {
      if (!carrinho.length) return toastWarn("Adicione ao menos um produto.");
      if (!selectedCliente) return toastWarn("Selecione um cliente.");

      clienteFinalizarVenda.textContent = selectedCliente.nome;
      formaPagamentoFinalizarVenda.textContent = formaPagamento.options[formaPagamento.selectedIndex].text;

      const totalCents = readMoneyText(totalVenda.textContent);
      totalFinalizarVenda.textContent = formatBRLFromCents(totalCents);

      valorRecebidoFinalizar.value = fromCents(totalCents).toFixed(2);
      trocoFinalizarVenda.textContent = formatBRLFromCents(0);
      trocoFinalizarVenda.classList.remove("text-danger");

      finalizarVendaModal.show();
    });

    // troco em tempo real
    valorRecebidoFinalizar?.addEventListener("input", () => {
      const recebidoCents = toCents(valorRecebidoFinalizar.value);
      const totalCents = readMoneyText(totalFinalizarVenda.textContent);
      const trocoCents = recebidoCents - totalCents;

      trocoFinalizarVenda.textContent = formatBRLFromCents(Math.max(0, trocoCents));
      if (trocoCents < 0) trocoFinalizarVenda.classList.add("text-danger");
      else trocoFinalizarVenda.classList.remove("text-danger");
    });

    // ====== CONFIRMAR FINALIZAÇÃO ======
    btnConfirmarFinalizacao?.addEventListener("click", async () => {
      try {
        const recebidoCents = toCents(valorRecebidoFinalizar.value);
        const totalCents = readMoneyText(totalFinalizarVenda.textContent);
        if (recebidoCents < totalCents) {
          return toastError("Valor recebido menor que o total.");
        }

        const descontoCents = toCents(descontoVenda.value);

        if (currentVendaId) {
          // edição: apenas confirma pagamento da venda existente
          await api("PATCH", `/api/vendas/${currentVendaId}/pagamento`, {
            formaPagamento: String(formaPagamento.value || "DINHEIRO"),
            desconto: fromCents(descontoCents),
          });
        } else {
          // nova venda: (1) cria venda, (2) confirma pagamento
          if (!carrinho.length) throw new Error("Carrinho vazio.");
          if (!selectedCliente) throw new Error("Selecione um cliente.");

          // 1) cria
          const vendaCriada = await api("POST", "/api/vendas", {
            clienteId: Number(selectedCliente.id),
            formaPagamento: String(formaPagamento.value || "DINHEIRO"),
            desconto: fromCents(descontoCents),
            observacao: (observacoesVenda?.value || "").trim() || null,
            itens: carrinho.map((it) => ({
              produtoId: Number(it.id),
              quantidade: Number(it.quantidade),
              precoUnitario: Number(fromCents(it.precoCents)),
            })),
          });

          const vendaId = vendaCriada?.id || vendaCriada?.venda?.id;
          if (!vendaId) throw new Error("Falha ao criar a venda.");

          // 2) confirma pagamento
          await api("PATCH", `/api/vendas/${vendaId}/pagamento`, {
            formaPagamento: String(formaPagamento.value || "DINHEIRO"),
            // se quiser reenviar desconto aqui, mantenha o mesmo valor:
            desconto: fromCents(descontoCents),
          });
        }

        finalizarVendaModal.hide();
        toastSuccess("Pagamento confirmado!");
        limparFormularioVenda();
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (e) {
        toastError(e.message || "Falha ao finalizar venda.");
      }
    });

    // ====== SALVAR COMO PENDENTE ======
    btnSalvarPendente?.addEventListener("click", () => {
      if (!carrinho.length) return toastWarn("Adicione ao menos um produto.");
      if (!selectedCliente) return toastWarn("Selecione um cliente.");

      // motorista obrigatório para pendente
      if (!motoristaVenda?.value) return toastWarn("Selecione um motorista/entregador.");

      // espelha dados no modal
      totalVendaPendente.textContent = totalVenda.textContent;
      let textoPagamento = formaPagamento.options[formaPagamento.selectedIndex].text;
      textoPagamento += formaPagamento.value.toUpperCase() === "DINHEIRO" ? " (a receber)" : " (a confirmar)";
      formaPagamentoPendente.textContent = textoPagamento;

      // carrega observações da venda no campo do modal pendente
      if (observacoesPendente) observacoesPendente.value = (observacoesVenda?.value || "");
      salvarPendenteModal.show();
    });

    btnConfirmarPendente?.addEventListener("click", async () => {
      try {
        const descontoCents = toCents(descontoVenda.value);

        if (currentVendaId) {
          // edição: só atualiza entrega
          await api("PUT", `/api/vendas/${currentVendaId}/entrega`, {
            motoristaId: motoristaVenda?.value ? Number(motoristaVenda.value) : null,
            status: "PENDENTE",
            dataPrevista: dataEntrega?.value || null,
            observacao: (observacoesPendente?.value || "").trim() || null,
          });
        } else {
          // nova: cria a venda ABERTA
          const created = await api("POST", "/api/vendas", {
            clienteId: Number(selectedCliente.id),
            formaPagamento: String(formaPagamento.value || "DINHEIRO"),
            desconto: fromCents(descontoCents),
            observacao: (observacoesPendente?.value || "").trim() || null,
            itens: carrinho.map((it) => ({
              produtoId: Number(it.id),
              quantidade: Number(it.quantidade),
              precoUnitario: Number(fromCents(it.precoCents)),
            })),
          });

          const vendaId = created?.id || created?.venda?.id;
          if (!vendaId) throw new Error("Falha ao criar a venda.");

          // entrega (opcional)
          if (motoristaVenda?.value || dataEntrega?.value || (observacoesPendente?.value || "").trim()) {
            await api("PUT", `/api/vendas/${vendaId}/entrega`, {
              motoristaId: motoristaVenda?.value ? Number(motoristaVenda.value) : null,
              status: "PENDENTE",
              dataPrevista: dataEntrega?.value || null,
              observacao: (observacoesPendente?.value || "").trim() || null,
            });
          }
        }

        salvarPendenteModal.hide();
        toastSuccess("Venda salva/atualizada como pendente!");
        limparFormularioVenda();
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (e) {
        toastError(e.message || "Falha ao salvar pendente.");
      }
    });

    // cancelar venda (cancelar tela, não a venda no backend)
    btnCancelarVenda?.addEventListener("click", () => {
      if (!window.Swal) {
        if (confirm("Cancelar a venda?")) { limparFormularioVenda(); window.location.href = "index.html"; }
        return;
      }
      Swal.fire({
        icon: "question",
        title: "Cancelar Venda",
        text: "Tem certeza que deseja cancelar esta venda? Todos os dados serão perdidos.",
        showCancelButton: true,
        confirmButtonText: "Sim, cancelar",
        cancelButtonText: "Não, voltar",
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
      }).then((r) => {
        if (r.isConfirmed) {
          limparFormularioVenda();
          Swal.fire({ icon: "success", title: "Venda Cancelada", text: "A venda foi cancelada com sucesso." })
            .then(() => (window.location.href = "index.html"));
        }
      });
    });
  }

  // reset
  function limparFormularioVenda() {
    carrinho = [];
    atualizarListaProdutos();

    selectedCliente = null;
    semClienteSelecionadoBox.style.display = "block";
    clienteSelecionadoBox.style.display = "none";
    nomeCliente.textContent = "";
    telefoneCliente.textContent = "";
    enderecoCliente.textContent = "";

    produtoSelect.value = "";
    quantidadeProduto.value = "1";
    precoProduto.value = "";
    subtotalProduto.value = "";
    descontoVenda.value = "0.00";
    formaPagamento.value = "DINHEIRO"; // ENUM
    if (observacoesVenda) observacoesVenda.value = "";
    if (motoristaVenda) motoristaVenda.value = "";
    if (dataEntrega) dataEntrega.value = "";
  }
})();
