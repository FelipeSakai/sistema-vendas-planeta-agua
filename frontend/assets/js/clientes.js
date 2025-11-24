// === Clientes.js (COMPLETO – COM CRIAR + EDITAR) ===
(function () {
  const API_BASE = localStorage.getItem("API_BASE") || "";
  const getRawToken = () => localStorage.getItem("token") || "";
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, "").trim();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    page: 1,
    perPage: 10,
    totalPages: 1,
    geral: "",
    tipo: "todos",
    status: "todos",
    currentEditId: null,
    currentDeleteId: null,
    currentViewId: null,
  };

  // ============================
  // Helpers
  // ============================
  const digits = (s) => (s || "").replace(/\D+/g, "");

  function formatPhone(value) {
    const d = digits(value).slice(0, 11);
    if (!d) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10)
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const isCNPJ = (v) => digits(v).length === 14;
  const deriveTipo = (cpfCnpj) =>
    isCNPJ(cpfCnpj) ? "pessoa_juridica" : "pessoa_fisica";

  const fmtInitials = (nome) =>
    (nome || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "CL";

  const badgeStatus = (status) =>
    status === "ATIVO"
      ? '<span class="badge bg-success">Ativo</span>'
      : '<span class="badge bg-secondary">Inativo</span>';

  function authHeaders() {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // ============================
  // DOM
  // ============================
  const $tbody = $("table.table tbody");
  const $pagination = $(".pagination");
  const $logout = $(".sidebar-footer .nav-link");

  const btnNovoCliente = $("#btnAddCliente");

  // modal view
  const $viewNome = $("#viewNomeCliente");
  const $viewTipo = $("#viewTipoCliente");
  const $viewStatus = $("#viewStatusCliente");
  const $viewTelefone = $("#viewTelefoneCliente");
  const $viewEmail = $("#viewEmailCliente");
  const $viewCpf = $("#viewCpfCliente");
  const $viewDesde = $("#viewDataCadastroCliente");
  const $viewEndereco = $("#viewEnderecoCompletoCliente");
  const $viewHistorico = $("#viewHistoricoCliente");

  const viewModal = new bootstrap.Modal($("#viewClienteModal"));
  const editModal = new bootstrap.Modal($("#clienteModal"));
  const deleteModal = new bootstrap.Modal($("#deleteClienteModal"));

  // ============================
  // Format date
  // ============================
  function formatDate(d) {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("pt-BR", {
        timeZone: "America/Campo_Grande",
      });
    } catch {
      return "-";
    }
  }

  // ============================
  // Render tabela cliente
  // ============================
  function renderRows(list) {
    const rows = list
      .map((cli) => {
        const initials = fmtInitials(cli.nome);
        const tipo =
          deriveTipo(cli.cpfCnpj || "") === "pessoa_juridica"
            ? "Pessoa Jurídica"
            : "Pessoa Física";

        return `
        <tr data-id="${cli.id}">
          <td>
            <div class="d-flex align-items-center">
              <div class="avatar">${initials}</div>
              <div class="ms-2">
                <div class="fw-bold">${cli.nome}</div>
                <div class="text-muted small">Cliente desde ${formatDate(
          cli.criadoEm
        )}</div>
              </div>
            </div>
          </td>
          <td>${tipo}</td>
          <td>${cli.telefone ? formatPhone(cli.telefone) : "-"}</td>
          <td>${cli.email || "-"}</td>
          <td>${cli.endereco || "-"}</td>
          <td>${badgeStatus(cli.status)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-view" data-id="${cli.id
          }"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${cli.id
          }"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${cli.id
          }"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
      })
      .join("");

    $tbody.innerHTML =
      rows ||
      `<tr><td colspan="7" class="text-center text-muted">Nenhum cliente encontrado</td></tr>`;
  }

  // ============================
  // Histórico de Compras
  // ============================
  async function carregarHistorico(clienteId) {
    $viewHistorico.innerHTML =
      `<div class="text-muted small text-center">Carregando...</div>`;

    try {
      const res = await api("GET", `/api/vendas?clienteId=${clienteId}`);
      const vendas = res?.dados?.data || [];

      if (!vendas.length) {
        $viewHistorico.innerHTML =
          `<div class="text-muted small text-center">Nenhuma compra encontrada</div>`;
        return;
      }

      const html = vendas
        .map((v) => {
          const total = parseFloat(v.totalLiquido || 0);

          return `
          <div class="border rounded p-2 mb-2">
            <div><strong>Venda #${v.id}</strong></div>
            <div>Data: ${formatDate(v.dataVenda)}</div>
            <div>Total: <strong>R$ ${total.toFixed(2)}</strong></div>
            <div>Status: ${v.status}</div>
            <div>Pagamento: ${v.formaPagamento || "-"}</div>
          </div>
        `;
        })
        .join("");

      $viewHistorico.innerHTML = html;
    } catch (e) {
      console.error(e);
      $viewHistorico.innerHTML =
        `<div class="text-danger small text-center">Erro ao carregar histórico</div>`;
    }
  }

  // ============================
  // Abrir view cliente
  // ============================
  async function abrirView(id) {
    const res = await api("GET", `/api/clientes/${id}`);
    const cli = res?.dados || res;

    $viewNome.textContent = cli.nome;
    const tipo = deriveTipo(cli.cpfCnpj || "");
    $viewTipo.textContent =
      tipo === "pessoa_juridica" ? "Pessoa Jurídica" : "Pessoa Física";
    $viewStatus.textContent = cli.status === "INATIVO" ? "Inativo" : "Ativo";
    $viewTelefone.textContent = cli.telefone
      ? formatPhone(cli.telefone)
      : "-";
    $viewEmail.textContent = cli.email || "-";
    $viewCpf.textContent = cli.cpfCnpj || "-";
    $viewDesde.textContent = formatDate(cli.criadoEm);
    $viewEndereco.textContent = cli.endereco || "-";

    state.currentViewId = id;

    carregarHistorico(id);

    viewModal.show();
  }

  // ============================
  // Limpar formulário (novo cliente)
  // ============================
  function limparFormularioCliente() {
    $("#clienteModalLabel").textContent = "Novo Cliente";
    $("#tipoCliente").value = "pessoa_fisica";  // ajuste conforme seu select
    $("#statusCliente").value = "ativo";

    $("#nomeCliente").value = "";
    $("#cpfCliente").value = "";
    $("#razaoSocialCliente").value = "";
    $("#nomeFantasiaCliente").value = "";
    $("#cnpjCliente").value = "";

    $("#telefoneCliente").value = "";
    $("#emailCliente").value = "";
    $("#cepCliente").value = "";
    $("#enderecoCliente").value = "";
    $("#numeroCliente").value = "";
    $("#complementoCliente").value = "";
    $("#bairroCliente").value = "";
    $("#cidadeCliente").value = "";
    $("#estadoCliente").value = "";
    $("#observacoesCliente").value = "";
  }

  // ============================
  // Abrir "Novo Cliente"
  // ============================
  function abrirNovoCliente() {
    state.currentEditId = null; // modo criação
    limparFormularioCliente();
    editModal.show();
  }

  // ============================
  // Abrir edição
  // ============================
  async function abrirEdicao(id) {
    state.currentEditId = id;

    const res = await api("GET", `/api/clientes/${id}`);
    const cli = res?.dados || res;

    $("#clienteModalLabel").textContent = "Editar Cliente";

    $("#tipoCliente").value = deriveTipo(cli.cpfCnpj);
    $("#statusCliente").value = cli.status.toLowerCase();

    $("#nomeCliente").value = cli.nome || "";
    $("#cpfCliente").value = cli.cpfCnpj || "";
    $("#razaoSocialCliente").value = cli.razaoSocial || "";
    $("#nomeFantasiaCliente").value = cli.nomeFantasia || "";
    $("#cnpjCliente").value = cli.cpfCnpj || "";

    $("#telefoneCliente").value = cli.telefone || "";
    $("#emailCliente").value = cli.email || "";
    $("#cepCliente").value = cli.cep || "";
    $("#enderecoCliente").value = cli.endereco || "";
    $("#numeroCliente").value = cli.numero || "";
    $("#complementoCliente").value = cli.complemento || "";
    $("#bairroCliente").value = cli.bairro || "";
    $("#cidadeCliente").value = cli.cidade || "";
    $("#estadoCliente").value = cli.estado || "";
    $("#observacoesCliente").value = cli.observacoes || "";

    editModal.show();
  }

  // ============================
  // Salvar (criar ou editar) cliente
  // ============================
  async function salvarCliente() {
    const id = state.currentEditId;

    const payload = {
      nome: $("#nomeCliente").value.trim(),
      telefone: $("#telefoneCliente").value.trim(),
      email: $("#emailCliente").value.trim(),
      endereco: $("#enderecoCliente").value.trim(),
      status: $("#statusCliente").value.toUpperCase(),
      cpfCnpj: $("#cpfCliente").value.trim() || $("#cnpjCliente").value.trim(),
    };

    // valida mínima
    if (!payload.nome) {
      Swal.fire("Atenção", "Nome do cliente é obrigatório.", "warning");
      return;
    }

    try {
      const btn = $("#btnSalvarCliente");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

      if (id) {
        // edição
        await api("PUT", `/api/clientes/${id}`, payload);
      } else {
        // criação
        await api("POST", `/api/clientes`, payload);
      }

      Swal.fire({
        icon: "success",
        title: id ? "Cliente atualizado!" : "Cliente criado!",
        timer: 1400,
        showConfirmButton: false,
      });

      setTimeout(() => {
        editModal.hide();
      }, 300);

      setTimeout(() => {
        loadClientes();
      }, 500);
    } catch (e) {
      Swal.fire("Erro", e.message || "Falha ao salvar cliente.", "error");
    } finally {
      const btn = $("#btnSalvarCliente");
      btn.disabled = false;
      btn.innerHTML = "Salvar";
    }
  }

  // ============================
  // Abrir delete
  // ============================
  async function abrirDelete(id) {
    state.currentDeleteId = id;

    const res = await api("GET", `/api/clientes/${id}`);
    const cli = res?.dados || res;

    $("#deleteClienteNome").textContent = cli.nome;

    deleteModal.show();
  }

  // ============================
  // Confirmar delete
  // ============================
  async function confirmarDelete() {
    const id = state.currentDeleteId;

    try {
      await api("DELETE", `/api/clientes/${id}`);
      Swal.fire("Excluído!", "Cliente removido com sucesso.", "success");

      deleteModal.hide();
      loadClientes();
    } catch (e) {
      Swal.fire("Erro", "Não foi possível excluir o cliente.", "error");
    }
  }

  $("#btnConfirmarExclusao").addEventListener("click", confirmarDelete);

  // ============================
  // Load clientes
  // ============================
  async function loadClientes() {
    const params = new URLSearchParams();
    params.set("page", state.page);
    params.set("perPage", state.perPage);

    const res = await api("GET", `/api/clientes?${params.toString()}`);
    const payload = res?.dados || res;

    renderRows(payload.data || []);
  }

  // ============================
  // Eventos
  // ============================
  $tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.classList.contains("btn-view")) abrirView(id).catch(console.error);
    if (btn.classList.contains("btn-edit")) abrirEdicao(id).catch(console.error);
    if (btn.classList.contains("btn-delete"))
      abrirDelete(id).catch(console.error);
  });

  $("#btnSalvarCliente").addEventListener("click", salvarCliente);

  // botão "Novo Cliente"
  if (btnNovoCliente) {
    btnNovoCliente.addEventListener("click", abrirNovoCliente);
  }

  $logout.addEventListener("click", () => {
    localStorage.removeItem("token");
    location.assign("login.html");
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadClientes();
  });
})();
