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
    } catch { }
    if (!res.ok) throw new Error(data?.mensagem || `Erro ${res.status}`);
    return data?.dados ?? data;
  }

  const toCents = (v) =>
    Math.round(
      Number(String(v).replace(/[^\d,.-]/g, "").replace(",", ".")) * 100
    ) || 0;
  const fromCents = (v) => (v || 0) / 100;
  const formatBRL = (v) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(fromCents(v));

  // =========================
  // DOM refs principais
  // =========================
  const inputProduto = document.getElementById("inputProduto");
  const sugestoesProduto = document.getElementById("sugestoesProduto");
  const quantidadeProduto = document.getElementById("quantidadeProduto");
  const precoProduto = document.getElementById("precoProduto");
  const subtotalProduto = document.getElementById("subtotalProduto");
  const validadeProduto = document.getElementById("validadeProduto");
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
  let clienteSelecionado = null;
  let debounce = null;

  // controle de edição
  const params = new URLSearchParams(window.location.search);
  const vendaEditId = params.get("id");
  let originalItemIds = []; // ids dos vendaItem originais (pra saber quais remover)

  // =========================
  // Inicialização
  // =========================
  document.addEventListener("DOMContentLoaded", async () => {
    await loadProdutos();
    await loadMotoristas();
    configurarAutocomplete();
    configurarEventos();
    configurarModalCliente();
    atualizarListaProdutos();
    atualizarTotais();

    if (validadeProduto) {
      validadeProduto.value = "";
      validadeProduto.disabled = true;
      validadeProduto.placeholder = "Somente para Galão";
    }

    // se for edição, carrega a venda
    if (vendaEditId) {
      try {
        const venda = await api("GET", `/api/vendas/${vendaEditId}`);
        preencherVendaParaEdicao(venda);
      } catch (e) {
        console.error("Erro ao carregar venda:", e);
        Swal.fire(
          "Erro",
          "Não foi possível carregar a venda para edição.",
          "error"
        );
      }
    }
  });

  // =========================
  // MODAL DE CLIENTE
  // =========================
  const modalCliente = new bootstrap.Modal(
    document.getElementById("modalSelecionarCliente")
  );
  const btnSelecionarCliente = document.getElementById("btnSelecionarCliente");
  const btnAlterarCliente = document.getElementById("btnAlterarCliente");
  const divSemCliente = document.getElementById("semClienteSelecionado");
  const divCliente = document.getElementById("clienteSelecionado");
  const nomeCliente = document.getElementById("nomeCliente");
  const telefoneCliente = document.getElementById("telefoneCliente");
  const enderecoCliente = document.getElementById("enderecoCliente");
  const inputBuscaCliente = document.getElementById("buscaCliente");
  const btnBuscarCliente = document.getElementById("btnBuscarCliente");
  const listaClientesModal = document.getElementById("listaClientesModal");
  const btnNovoCliente = document.getElementById("btnNovoCliente");

  function configurarModalCliente() {
    btnSelecionarCliente?.addEventListener("click", () => {
      inputBuscaCliente.value = "";
      listaClientesModal.innerHTML = `
        <tr><td colspan="5" class="text-center text-muted">
          Digite o nome ou telefone do cliente e clique em "Buscar".
        </td></tr>`;
      modalCliente.show();
    });

    btnBuscarCliente?.addEventListener("click", buscarClientes);
    btnNovoCliente?.addEventListener("click", cadastrarNovoCliente);
  }

  async function buscarClientes() {
    const termo = inputBuscaCliente.value.trim();
    if (!termo) {
      Swal.fire("Atenção", "Digite o nome ou telefone do cliente.", "info");
      return;
    }

    try {
      const dados = await api(
        "GET",
        `/api/clientes?geral=${encodeURIComponent(termo)}&perPage=50`
      );
      const lista = dados?.data || dados || [];
      if (!lista.length) {
        listaClientesModal.innerHTML =
          '<tr><td colspan="5" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>';
        return;
      }

      listaClientesModal.innerHTML = lista
        .map(
          (c) => `
        <tr>
          <td>${c.nome}</td>
          <td>${c.telefone || "-"}</td>
          <td>${c.email || "-"}</td>
          <td>${c.endereco || "-"}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary btn-selecionar" data-id="${c.id}">
              <i class="bi bi-check-circle"></i> Selecionar
            </button>
          </td>
        </tr>`
        )
        .join("");

      listaClientesModal.querySelectorAll(".btn-selecionar").forEach((btn) =>
        btn.addEventListener("click", () => {
          const cli = lista.find((x) => String(x.id) === btn.dataset.id);
          clienteSelecionado = cli;
          renderClienteSelecionado();
          modalCliente.hide();
        })
      );
    } catch (e) {
      console.error(e);
      Swal.fire("Erro", "Falha ao buscar clientes.", "error");
    }
  }

  function maskPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(
        6
      )}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function cadastrarNovoCliente() {
    modalCliente.hide();
    const { value: formValues } = await Swal.fire({
      didOpen: () => {
        const telInput = document.getElementById("swal-telefone");
        telInput.addEventListener("input", (e) => {
          e.target.value = maskPhone(e.target.value);
        });
      },
      title: "Cadastrar Novo Cliente",
      html: `
        <input id="swal-nome" class="swal2-input" placeholder="Nome completo">
        <input id="swal-telefone" class="swal2-input" placeholder="Telefone (opcional)">
        <input id="swal-email" class="swal2-input" placeholder="E-mail (opcional)">
        <input id="swal-endereco" class="swal2-input" placeholder="Endereço (opcional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        return {
          nome: document.getElementById("swal-nome").value.trim(),
          telefone: document.getElementById("swal-telefone").value.trim(),
          email: document.getElementById("swal-email").value.trim(),
          endereco: document.getElementById("swal-endereco").value.trim(),
        };
      },
    });

    if (!formValues?.nome)
      return Swal.fire("Atenção", "O nome é obrigatório.", "warning");

    try {
      const novo = await api("POST", "/api/clientes", formValues);
      clienteSelecionado = novo?.dados || novo;
      renderClienteSelecionado();
      Swal.fire("Sucesso", "Cliente cadastrado e selecionado.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Erro", "Não foi possível cadastrar o cliente.", "error");
    }
  }

  function renderClienteSelecionado() {
    if (!clienteSelecionado) {
      divSemCliente.style.display = "block";
      divCliente.style.display = "none";
      return;
    }

    nomeCliente.textContent = clienteSelecionado.nome;
    telefoneCliente.textContent = clienteSelecionado.telefone || "—";
    enderecoCliente.textContent = clienteSelecionado.endereco || "—";

    divSemCliente.style.display = "none";
    divCliente.style.display = "block";
  }

  btnAlterarCliente?.addEventListener("click", () => {
    clienteSelecionado = null;
    renderClienteSelecionado();
    modalCliente.show();
  });

  // =========================
  // Produtos
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
  // Motoristas
  // =========================
  async function loadMotoristas() {
    const selectMotorista = document.getElementById("motoristaVenda");
    if (!selectMotorista) return;

    try {
      const dados = await api(
        "GET",
        "/api/usuarios?cargo=MOTORISTA&perPage=100"
      );
      const motoristas = dados?.data || dados || [];

      selectMotorista.innerHTML = `
      <option value="" selected disabled>Selecione o motorista</option>
      ${motoristas.map((m) => `<option value="${m.id}">${m.nome}</option>`).join("")}
    `;
    } catch (e) {
      console.error("Erro ao carregar motoristas:", e);
      selectMotorista.innerHTML = `<option value="">Erro ao carregar motoristas</option>`;
    }
  }

  // =========================
  // Autocomplete de produtos
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
          ? catalogoProdutos.filter((p) =>
            p.nome.toLowerCase().includes(termo)
          )
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
    const produtoId = item.dataset.id;
    const produto = catalogoProdutos.find(
      (p) => String(p.id) === String(produtoId)
    );
    const isGalao = produto?.tipo === "GALAO";

    inputProduto.value = item.querySelector("span").textContent;
    inputProduto.dataset.produtoId = produtoId;
    precoProduto.value = Number(item.dataset.preco || 0).toFixed(2);

    if (isGalao) {
      // Galão → sempre 1 por vez, validade obrigatória
      quantidadeProduto.value = "1";
      quantidadeProduto.setAttribute("disabled", "disabled");

      if (validadeProduto) {
        validadeProduto.disabled = false;
        validadeProduto.placeholder = "Informe o ano (obrigatório)";
      }
    } else {
      // Outros produtos → quantidade livre, sem validade
      quantidadeProduto.removeAttribute("disabled");
      if (validadeProduto) {
        validadeProduto.value = "";
        validadeProduto.disabled = true;
        validadeProduto.placeholder = "Somente para Galão";
      }
    }

    if (!quantidadeProduto.value || Number(quantidadeProduto.value) <= 0)
      quantidadeProduto.value = "1";

    atualizarSubtotalProduto();
    sugestoesProduto.style.display = "none";
  }

  function atualizarSubtotalProduto() {
    const qtd = Number(quantidadeProduto.value || 0);
    const preco = toCents(precoProduto.value);
    subtotalProduto.value = fromCents(qtd * preco).toFixed(2);
  }

  function atualizarListaProdutos() {
    listaProdutos.innerHTML = "";

    if (!carrinho.length) {
      listaProdutos.innerHTML =
        '<tr><td colspan="6" class="text-center text-muted py-3">Nenhum produto adicionado.</td></tr>';
      return;
    }

    carrinho.forEach((it) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
      <td class="fw-semibold">${it.nome}</td>
      <td class="text-end">${formatBRL(it.precoCents)}</td>
      <td class="text-center">${it.quantidade}</td>
      <td class="text-center">${it.validade ? it.validade : "<span class='text-muted'>—</span>"
        }</td>
      <td class="text-end fw-bold text-success">${formatBRL(
          it.subtotalCents
        )}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger btn-remover" data-id="${it._cartId
        }" title="Remover produto">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

      listaProdutos.appendChild(tr);
    });

    // evento de remover produto
    listaProdutos.querySelectorAll(".btn-remover").forEach((btn) => {
      btn.addEventListener("click", () => {
        carrinho = carrinho.filter((x) => x._cartId !== btn.dataset.id);
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
  // Eventos gerais
  // =========================
  function configurarEventos() {
    quantidadeProduto.addEventListener("input", atualizarSubtotalProduto);
    precoProduto.addEventListener("input", atualizarSubtotalProduto);
    descontoVenda.addEventListener("input", atualizarTotais);

    btnAdicionarProduto.addEventListener("click", () => {
      const id = inputProduto.dataset.produtoId;
      const validadeAno = (validadeProduto?.value || "").trim();
      if (!id)
        return Swal.fire("Atenção", "Selecione um produto.", "warning");

      const produto = catalogoProdutos.find(
        (p) => String(p.id) === String(id)
      );
      const isGalao = produto?.tipo === "GALAO";

      // Galão → 1 por vez, validade obrigatória
      if (isGalao && !validadeAno) {
        return Swal.fire(
          "Atenção",
          "Informe o ano de validade do galão.",
          "warning"
        );
      }

      let qtd = Number(quantidadeProduto.value || 0);
      if (!qtd)
        return Swal.fire("Atenção", "Informe uma quantidade.", "warning");

      const precoCents = toCents(precoProduto.value);
      const nome = produto?.nome || inputProduto.value || "Produto";

      if (isGalao) {
        // cada galão vira uma linha separada
        qtd = 1;
        carrinho.push({
          _cartId: `${id}_${Date.now()}_${Math.random()
            .toString(16)
            .slice(2)}`,
          _itemId: null, // ainda não tem no banco
          produtoId: id,
          nome,
          precoCents,
          quantidade: 1,
          subtotalCents: precoCents,
          validade: validadeAno,
          _isGalao: true,
        });
      } else {
        // produtos normais → podem somar na mesma linha
        const existente = carrinho.find(
          (x) =>
            String(x.produtoId) === String(id) &&
            !x._isGalao && // só agrupa não-galão
            !x._itemId === false // tanto faz ser novo ou velho
        );
        if (existente) {
          existente.quantidade += qtd;
          existente.subtotalCents = existente.quantidade * existente.precoCents;
        } else {
          carrinho.push({
            _cartId: `${id}_${Date.now()}_${Math.random()
              .toString(16)
              .slice(2)}`,
            _itemId: null,
            produtoId: id,
            nome,
            precoCents,
            quantidade: qtd,
            subtotalCents: qtd * precoCents,
            validade: null,
            _isGalao: false,
          });
        }
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
      if (validadeProduto) {
        validadeProduto.value = "";
        validadeProduto.disabled = true;
        validadeProduto.placeholder = "Somente para Galão";
      }
      quantidadeProduto.removeAttribute("disabled");
    });
  }

  // =========================
  // Finalizar Venda (criação)
  // =========================
  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");

  if (btnFinalizarVenda && !vendaEditId) {
    // MODO CRIAÇÃO
    btnFinalizarVenda.addEventListener("click", async () => {
      if (!clienteSelecionado) {
        return Swal.fire(
          "Atenção",
          "Selecione um cliente antes de finalizar.",
          "info"
        );
      }
      if (!carrinho.length) {
        return Swal.fire(
          "Atenção",
          "Adicione produtos à venda antes de finalizar.",
          "info"
        );
      }

      const motoristaId =
        document.getElementById("motoristaVenda")?.value || null;

      const payload = {
        clienteId: clienteSelecionado.id,
        usuarioId: JSON.parse(localStorage.getItem("user") || "{}").id,
        motoristaId: motoristaId ? Number(motoristaId) : null,
        dataEntregaPrevista: document.getElementById("dataEntrega")?.value || null,
        itens: carrinho.map((it) => ({
          produtoId: Number(it.produtoId),
          quantidade: it.quantidade,
          precoUnitario: fromCents(it.precoCents),
          validade: it.validade ? `${it.validade}-12-31` : null,
        })),
        formaPagamento: document.getElementById("formaPagamento")?.value || "DINHEIRO",
        desconto: Number(descontoVenda.value || 0),
      };


      try {
        const venda = await api("POST", "/api/vendas", payload);

        const motoristaIdSelecionado =
          document.getElementById("motoristaVenda")?.value || null;
        const dataPrevistaInput =
          document.getElementById("dataEntrega")?.value || null;

        if (motoristaIdSelecionado || dataPrevistaInput) {
          await api("PUT", `/api/vendas/${venda.id}/entrega`, {
            motoristaId: motoristaIdSelecionado ? Number(motoristaIdSelecionado) : null,
            dataPrevista: dataPrevistaInput || null,
          });
        }
        Swal.fire({
          icon: "success",
          title: "Venda concluída com sucesso!",
          html: `
            <p>Venda nº <strong>${venda.id}</strong> registrada para <strong>${clienteSelecionado.nome}</strong>.</p>
          `,
          timer: 2000,
          showConfirmButton: false,
        });

        carrinho = [];
        clienteSelecionado = null;
        atualizarListaProdutos();
        atualizarTotais();
        renderClienteSelecionado();
      } catch (e) {
        console.error(e);
        Swal.fire("Erro", e.message || "Falha ao registrar a venda.", "error");
      }
    });
  }

  // ======================================================
  //   MODO DE EDIÇÃO DE VENDA
  // ======================================================

  function preencherVendaParaEdicao(v) {
    // CLIENTE
    clienteSelecionado = v.cliente;
    renderClienteSelecionado();

    // PAGAMENTO
    document.getElementById("formaPagamento").value =
      v.formaPagamento || "DINHEIRO";
    document.getElementById("descontoVenda").value = Number(v.desconto || 0);

    // OBSERVAÇÃO
    document.getElementById("observacoesVenda").value = v.observacao || "";

    // ENTREGA
    if (v.entrega) {
      const selectMotorista = document.getElementById("motoristaVenda");
      if (selectMotorista && v.entrega.motoristaId) {
        selectMotorista.value = String(v.entrega.motoristaId);
      }

      if (v.entrega.dataPrevista) {
        document.getElementById("dataEntrega").value =
          v.entrega.dataPrevista.substring(0, 10);
      }
    } else {
      const selectMotorista = document.getElementById("motoristaVenda");
      if (selectMotorista) selectMotorista.value = "";
      const inputData = document.getElementById("dataEntrega");
      if (inputData) inputData.value = "";
    }


    // RECRIAR CARRINHO
    originalItemIds = v.itens.map((it) => it.id);

    carrinho = v.itens.map((it) => ({
      _cartId: `${it.id}_${Math.random().toString(16).slice(2)}`,
      _itemId: it.id, // <- ID REAL DO VENDA_ITEM
      produtoId: it.produtoId,
      nome: it.produto?.nome || "Produto",
      precoCents: Math.round(Number(it.precoUnitario) * 100),
      quantidade: it.quantidade,
      subtotalCents: Math.round(Number(it.subtotal) * 100),
      validade: it.validade ? String(it.validade).substring(0, 4) : null,
      _isGalao: it.produto?.tipo === "GALAO",
    }));

    atualizarListaProdutos();
    atualizarTotais();

    // Botão vira "Salvar Alterações"
    if (btnFinalizarVenda) {
      btnFinalizarVenda.innerHTML =
        '<i class="bi bi-save me-2"></i> Salvar Alterações';
      btnFinalizarVenda.onclick = salvarEdicaoDaVenda;
    }
  }

  // ======================================================
  // FUNÇÃO PARA SALVAR ALTERAÇÕES
  // ======================================================
  async function salvarEdicaoDaVenda() {
    try {
      if (!clienteSelecionado) {
        return Swal.fire("Atenção", "Selecione um cliente.", "info");
      }

      if (!carrinho.length) {
        return Swal.fire("Atenção", "Adicione produtos.", "info");
      }

      const idsMantidos = [];

      // 1) Atualizar / criar itens
      for (const it of carrinho) {
        const payloadItem = {
          quantidade: it.quantidade,
          precoUnitario: fromCents(it.precoCents),
          validade: it.validade ? `${it.validade}-12-31` : null,
          // se você quiser permitir observação por item, dá pra colocar aqui
        };

        if (it._itemId) {
          // item já existe → PUT
          idsMantidos.push(it._itemId);
          await api(
            "PUT",
            `/api/vendas/${vendaEditId}/itens/${it._itemId}`,
            payloadItem
          );
        } else {
          // item novo → POST
          await api("POST", `/api/vendas/${vendaEditId}/itens`, {
            ...payloadItem,
            produtoId: Number(it.produtoId),
          });
        }
      }

      // 2) Remover itens que existiam e foram tirados do carrinho
      const idsParaRemover = originalItemIds.filter(
        (id) => !idsMantidos.includes(id)
      );
      for (const id of idsParaRemover) {
        await api("DELETE", `/api/vendas/${vendaEditId}/itens/${id}`);
      }

      // 3) Atualizar cabeçalho da venda (forma de pagamento, desconto, observação...)
      await api("PATCH", `/api/vendas/${vendaEditId}`, {
        formaPagamento: document.getElementById("formaPagamento").value,
        desconto: Number(descontoVenda.value || 0),
        observacao: document.getElementById("observacoesVenda").value || null,
        motoristaId: Number(document.getElementById("motoristaVenda").value) || null,
        dataEntregaPrevista:
          document.getElementById("dataEntrega")?.value || null,
      });

      const motoristaIdSelecionado =
        document.getElementById("motoristaVenda")?.value || null;
      const dataPrevistaInput =
        document.getElementById("dataEntrega")?.value || null;

      if (motoristaIdSelecionado || dataPrevistaInput) {
        await api("PUT", `/api/vendas/${vendaEditId}/entrega`, {
          motoristaId: motoristaIdSelecionado ? Number(motoristaIdSelecionado) : null,
          dataPrevista: dataPrevistaInput || null,
        });
      }

      Swal.fire({
        icon: "success",
        title: "Venda atualizada com sucesso!",
        timer: 1600,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = "vendas.html";
      });
    } catch (e) {
      console.error(e);
      Swal.fire("Erro", e.message || "Falha ao salvar alterações.", "error");
    }
    
  }
})();
