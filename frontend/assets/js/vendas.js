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
    return data; // esperado: {sucesso, mensagem, dados} ou objeto direto
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
  function centsToNumber(cents) {
    return fromCents(cents);
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

  // Lista do modal clientes
  const listaClientesEl = document.getElementById("listaClientes");

  // =========================
  // Estado
  // =========================
  let selectedCliente = null; // {id, nome, telefone, endereco}
  let carrinho = [];          // [{id, nome, precoCents, quantidade, subtotalCents}]
  let catalogoProdutos = [];  // [{id, nome, preco (number)|precoCentavos (int), ...}]

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
    } catch (e) {
      console.error(e);
      toastError(e.message || "Falha ao inicializar a tela de vendas.");
    }
  }

  // =========================
  // API: Motoristas, Clientes, Produtos
  // =========================
  async function loadMotoristas() {
    let usuarios = [];
    try {
      const resp = await api("GET", "/api/usuarios?cargo=MOTORISTA&perPage=200");
      const payload = resp?.dados || resp;
      usuarios = payload?.data || payload || [];
    } catch {
      try {
        const resp2 = await api("GET", "/api/usuarios?role=MOTORISTA&perPage=200");
        const payload2 = resp2?.dados || resp2;
        usuarios = payload2?.data || payload2 || [];
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

    const data = await api("GET", `/api/clientes?${params.toString()}`);
    const payload = data?.dados || data;
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

    const data = await api("GET", `/api/produtos?perPage=200`);
    const payload = data?.dados || data;
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
            <button class="btn btn-sm btn-danger btn-remover-produto" data-id="${item.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        listaProdutos.appendChild(tr);
      });

      listaProdutos.querySelectorAll(".btn-remover-produto").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (!window.Swal) {
            if (confirm("Remover este produto?")) {
              carrinho = carrinho.filter((x) => String(x.id) !== String(id));
              atualizarListaProdutos(); atualizarTotais();
            }
            return;
          }
          Swal.fire({
            icon: "question",
            title: "Remover Produto",
            text: "Tem certeza que deseja remover este produto da venda?",
            showCancelButton: true,
            confirmButtonText: "Sim, remover",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
          }).then((r) => {
            if (r.isConfirmed) {
              carrinho = carrinho.filter((x) => String(x.id) !== String(id));
              atualizarListaProdutos(); atualizarTotais();
              toastSuccess("Produto removido.");
            }
          });
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

        const resp = await api("POST", `/api/clientes`, {
          nome, telefone: telefone || null, endereco: endereco || null, status: "ATIVO",
        });
        const cli = resp?.dados || resp;

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
    btnAdicionarProduto?.addEventListener("click", () => {
      if (!produtoSelect.value) return toastWarn("Selecione um produto.");
      const qtd = Number(quantidadeProduto.value || 0);
      if (!qtd || qtd <= 0) return toastWarn("Informe uma quantidade válida.");

      const id = produtoSelect.value;
      const opt = produtoSelect.options[produtoSelect.selectedIndex];
      const nome = opt.textContent;
      const precoCents = toCents(precoProduto.value);
      const subtotalCents = precoCents * qtd;

      const existente = carrinho.find((x) => String(x.id) === String(id));
      if (existente) {
        existente.quantidade += qtd;
        existente.subtotalCents = existente.quantidade * existente.precoCents;
        toastSuccess(`Quantidade de ${nome} atualizada.`);
      } else {
        carrinho.push({ id, nome, precoCents, quantidade: qtd, subtotalCents });
        toastSuccess(`${nome} adicionado.`);
      }

      atualizarListaProdutos();

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

    // confirmar finalização -> envia pro backend
    btnConfirmarFinalizacao?.addEventListener("click", async () => {
      try {
        const recebidoCents = toCents(valorRecebidoFinalizar.value);
        const totalCents = readMoneyText(totalFinalizarVenda.textContent);
        if (recebidoCents < totalCents) {
          return toastError("Valor recebido menor que o total.");
        }

        const descontoCents = toCents(descontoVenda.value);

        const body = {
          clienteId: Number(selectedCliente.id),
          formaPagamento: String(formaPagamento.value), // DINHEIRO/CARTAO_CREDITO/...
          desconto: Number(fromCents(descontoCents)),
          observacao: (observacoesVenda?.value || "").trim() || null,
          // entrega não se aplica aqui; é retirada na loja
          itens: carrinho.map((it) => ({
            produtoId: Number(it.id),
            quantidade: Number(it.quantidade),
            precoUnitario: Number(fromCents(it.precoCents)),
            // se você capturar validade por item no front, adicione aqui
          })),
          status: "LOJA",
        };

        await api("POST", "/api/vendas", body);

        finalizarVendaModal.hide();
        toastSuccess("Venda finalizada com sucesso!");
        limparFormularioVenda();
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (e) {
        toastError(e.message || "Falha ao finalizar venda.");
      }
    });

    // salvar como pendente (abre modal de pendente)
    btnSalvarPendente?.addEventListener("click", () => {
      if (!carrinho.length) return toastWarn("Adicione ao menos um produto.");
      if (!selectedCliente) return toastWarn("Selecione um cliente.");

      // motorista obrigatório para pendente (como você pediu)
      if (!motoristaVenda?.value) {
        return toastWarn("Selecione um motorista/entregador.");
      }

      // espelha dados no modal
      totalVendaPendente.textContent = totalVenda.textContent;

      let textoPagamento = formaPagamento.options[formaPagamento.selectedIndex].text;
      textoPagamento += formaPagamento.value.toUpperCase() === "DINHEIRO" ? " (a receber)" : " (a confirmar)";
      formaPagamentoPendente.textContent = textoPagamento;

      // carrega observações da venda no campo do modal pendente
      observacoesPendente.value = (observacoesVenda?.value || "");
      salvarPendenteModal.show();
    });

    // --- confirmar pendente -> cria VENDA ABERTA no backend ---
    btnConfirmarPendente?.addEventListener("click", async () => {
      try {
        if (!carrinho.length) return toastWarn("Adicione ao menos um produto.");
        if (!selectedCliente) return toastWarn("Selecione um cliente.");
        if (!motoristaVenda?.value) return toastWarn("Selecione um motorista/entregador.");

        const descontoCents = toCents(descontoVenda.value);

        // IMPORTANTE: o service aceita tanto "idProduto" quanto "produtoId".
        // Vamos mandar "idProduto" para ficar 100% compatível com o normalizador.
        const body = {
          clienteId: Number(selectedCliente.id),
          // formaPagamento pode vir em minúsculas; garanto UPPER aqui:
          formaPagamento: String(formaPagamento.value || "").trim().toUpperCase(),
          desconto: Number(fromCents(descontoCents)),
          observacao: (observacoesPendente?.value || "").trim() || null, // <- singular (backend espera "observacao")
          // Itens em formato aceito pelo normalizador
          itens: carrinho.map((it) => ({
            idProduto: Number(it.id),
            quantidade: Number(it.quantidade),
            precoUnitario: Number(fromCents(it.precoCents)), // número com 2 casas
          })),
          // Opcional: dizer explicitamente que é ABERTA (pendente de pagamento)
          status: "ABERTA",
        };

        // cria a venda
        const vendaResp = await api("POST", "/api/vendas", body);

        // Se quiser já gravar info de entrega vinculada:
        // (define motorista e data prevista/entrega inicial)
        if (motoristaVenda?.value || dataEntrega?.value) {
          await api("PUT", `/api/vendas/${vendaResp.id || vendaResp?.dados?.id || vendaResp?.venda?.id}/entrega`, {
            motoristaId: motoristaVenda?.value ? Number(motoristaVenda.value) : null,
            status: "PENDENTE",
            dataPrevista: dataEntrega?.value || null,
            observacao: (observacoesPendente?.value || "").trim() || null,
          });
        }

        salvarPendenteModal.hide();
        toastSuccess("Venda salva como pendente!");
        limparFormularioVenda();
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (e) {
        toastError(e.message || "Falha ao salvar como pendente.");
      }
    });

    // confirmar pendente -> envia pro backend
    btnConfirmarFinalizacao?.addEventListener("click", async () => {
      try {
        const recebidoCents = toCents(valorRecebidoFinalizar.value);
        const totalCents = readMoneyText(totalFinalizarVenda.textContent);
        if (recebidoCents < totalCents) {
          return toastError("Valor recebido menor que o total.");
        }

        const descontoCents = toCents(descontoVenda.value);

        const body = {
          clienteId: Number(selectedCliente.id),
          formaPagamento: String(formaPagamento.value), // DINHEIRO/CARTAO_CREDITO/...
          desconto: Number(fromCents(descontoCents)),
          observacao: (observacoesVenda?.value || "").trim() || null,
          // entrega não se aplica aqui; é retirada na loja
          itens: carrinho.map((it) => ({
            produtoId: Number(it.id),
            quantidade: Number(it.quantidade),
            precoUnitario: Number(fromCents(it.precoCents)),
            // se você capturar validade por item no front, adicione aqui
          })),
          status: "LOJA",
        };

        await api("POST", "/api/vendas", body);

        finalizarVendaModal.hide();
        toastSuccess("Venda finalizada com sucesso!");
        limparFormularioVenda();
        setTimeout(() => (window.location.href = "index.html"), 600);
      } catch (e) {
        toastError(e.message || "Falha ao finalizar venda.");
      }
    });

    // cancelar venda
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
