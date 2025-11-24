// assets/js/dashboard.js
(function () {
  if (window.__DASHBOARD_WIRED__) return;
  window.__DASHBOARD_WIRED__ = true;

  // =============== Config & helpers ===============
  const API_BASE = localStorage.getItem("API_BASE") || "";
  const getRawToken = () => localStorage.getItem("token") || "";
  const getToken = () => getRawToken().replace(/^Bearer\s+/i, "").trim();

  function authHeaders() {
    const t = getToken();
    if (!t) {
      window.location.href = "login.html";
      return {};
    }
    return { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" };
  }

  async function api(method, path, body) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
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
    return data?.dados ?? data;
  }

  const ENDPOINTS = {
    listar: (qs) => `/api/vendas${qs ? `?${qs}` : ""}`,
    confirmarPagamento: (id) => `/api/vendas/${id}/pagamento`,
    cancelar: (id) => `/api/vendas/${id}/cancelar`,
    motoristas: `/api/usuarios?cargo=MOTORISTA&perPage=200`,
  };

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDataHora = (isoOrDate) => {
    const d = new Date(isoOrDate);
    if (Number.isNaN(+d)) return "-";
    return d.toLocaleDateString("pt-BR") +
      " " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (s) => {
    const map = {
      ABERTA: "bg-warning text-dark",
      LOJA: "bg-warning text-dark",
      PAGA: "bg-success",
      ENTREGUE: "bg-primary",
      CANCELADA: "bg-danger",
    };
    return `<span class="badge ${map[s] || "bg-secondary"}">${s}</span>`;
  };

  const formaPagamentoText = (fp) => {
    if (!fp) return "—";
    const map = {
      DINHEIRO: "Dinheiro",
      CARTAO_CREDITO: "Cartão de Crédito",
      CARTAO_DEBITO: "Cartão de Débito",
      PIX: "PIX",
      OUTRO: "Outro",
    };
    return map[fp] || fp;
  };

  // =============== DOM refs ===============
  const tbodyPendentes = document.getElementById("tbodyPendentes");
  const tbodyRecentes = document.getElementById("tbodyRecentes");

  const kpiPendentes = document.getElementById("kpiPendentes");
  const kpiVendasHoje = document.getElementById("kpiVendasHoje");
  const kpiFaturamentoHoje = document.getElementById("kpiFaturamentoHoje");
  const badgePendentes = document.getElementById("badgePendentes");
  const badgeVendasHoje = document.getElementById("badgeVendasHoje");

  // Modais
  const finalizarVendaModal = new bootstrap.Modal(document.getElementById("finalizarVendaModal"));
  const cancelarVendaModal = new bootstrap.Modal(document.getElementById("cancelarVendaModal"));

  // Finalizar modal fields
  const spanClienteFinalizar = document.getElementById("clienteFinalizarVenda");
  const spanTotalFinalizar = document.getElementById("totalFinalizarVenda");
  const spanFormaFinalizar = document.getElementById("formaPagamentoFinalizarVenda");
  const inputValorRecebido = document.getElementById("valorRecebidoFinalizar");
  const spanTroco = document.getElementById("trocoFinalizarVenda");
  const inputObsFinalizar = document.getElementById("observacoesFinalizarVenda");
  const btnConfirmarFinalizacao = document.getElementById("btnConfirmarFinalizacao");

  // Cancelar modal fields
  const spanClienteCancelar = document.getElementById("clienteCancelarVenda");
  const spanTotalCancelar = document.getElementById("totalCancelarVenda");
  const selectMotivoCancel = document.getElementById("motivoCancelamento");
  const outroMotivoBox = document.getElementById("outroMotivoCancelamento");
  const outroMotivo = document.getElementById("outroMotivo");
  const btnConfirmarCancelamento = document.getElementById("btnConfirmarCancelamento");

  // Filtros
  const filtroPeriodo = document.getElementById('filtroPeriodo');
  const periodoPesonalizado = document.getElementById('periodoPesonalizado');
  const btnLimparFiltros = document.getElementById('btnLimparFiltros');
  const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
  const filtroStatus = document.getElementById('filtroStatus');
  const filtroCliente = document.getElementById('filtroCliente');
  const filtroMotorista = document.getElementById('filtroMotorista');
  const dataInicio = document.getElementById('dataInicio');
  const dataFim = document.getElementById('dataFim');

  // estado
  let vendaSelecionada = null;
  let paying = false;
  let canceling = false;

  // =============== Abrir MODAL FINALIZAR ===============
  function abrirModalFinalizar(venda) {
    vendaSelecionada = venda;

    spanClienteFinalizar.textContent = venda.cliente?.nome || "-";
    spanTotalFinalizar.textContent = BRL.format(Number(venda.totalLiquido ?? venda.totalBruto ?? 0));
    spanFormaFinalizar.textContent = formaPagamentoText(venda.formaPagamento);

    inputValorRecebido.value = "";
    spanTroco.textContent = BRL.format(0);
    inputObsFinalizar.value = "";

    finalizarVendaModal.show();
  }

  // =============== Abrir MODAL CANCELAR ===============
  function abrirModalCancelar(venda) {
    vendaSelecionada = venda;

    spanClienteCancelar.textContent = venda.cliente?.nome || "-";
    spanTotalCancelar.textContent = BRL.format(Number(venda.totalLiquido ?? venda.totalBruto ?? 0));

    selectMotivoCancel.value = "";
    outroMotivo.value = "";
    outroMotivoBox.style.display = "none";

    cancelarVendaModal.show();
  }

  // =============== Render helpers ===============
  function rowActions(v) {
    return `
      <div class="btn-group">
        <button class="btn btn-sm btn-success js-finalizar" data-id="${v.id}"><i class="bi bi-check-circle"></i></button>
        <button class="btn btn-sm btn-primary js-editar" data-id="${v.id}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger js-cancelar" data-id="${v.id}"><i class="bi bi-x-circle"></i></button>
        <button class="btn btn-sm btn-secondary js-print" data-id="${v.id}"><i class="bi bi-printer"></i></button>
      </div>`;
  }

  function renderPendentes(list) {
    tbodyPendentes.innerHTML = "";
    if (!list.length) {
      tbodyPendentes.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Sem vendas pendentes.</td></tr>`;
      return;
    }

    for (const v of list) {
      const motorista = v.entrega?.motorista?.nome || "-";
      const itensCount = v.itens?.length || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${v.id}</td>
        <td>${fmtDataHora(v.dataVenda)}</td>
        <td>${v.cliente?.nome || "-"}</td>
        <td>${itensCount} itens</td>
        <td>${motorista}</td>
        <td>${formaPagamentoText(v.formaPagamento)}</td>
        <td class="text-end">${BRL.format(Number(v.totalLiquido ?? v.totalBruto ?? 0))}</td>
        <td class="text-center">${rowActions(v)}</td>`;
      tbodyPendentes.appendChild(tr);
    }

    badgePendentes.textContent = `${list.length}`;
  }

  function renderRecentes(list) {
    tbodyRecentes.innerHTML = "";
    if (!list.length) {
      tbodyRecentes.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Sem vendas no período.</td></tr>`;
      return;
    }

    for (const v of list) {
      const motorista = v.entrega?.motorista?.nome || "-";
      const itensCount = v.itens?.length || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${v.id}</td>
        <td>${fmtDataHora(v.dataVenda)}</td>
        <td>${v.cliente?.nome || "-"}</td>
        <td>${itensCount} itens</td>
        <td>${motorista}</td>
        <td>${formaPagamentoText(v.formaPagamento)}</td>
        <td>${statusBadge(v.status)}</td>
        <td class="text-end">${BRL.format(Number(v.totalLiquido ?? v.totalBruto ?? 0))}</td>
        <td class="text-center">${rowActions(v)}</td>`;
      tbodyRecentes.appendChild(tr);
    }
  }

  // =============== KPIs ===============
  async function loadKPIs() {
    try {
      const today = new Date();
      const ini = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0);
      const fim = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const qsHoje = new URLSearchParams({
        dataInicio: ini.toISOString(),
        dataFim: fim.toISOString(),
        perPage: "200",
      }).toString();

      const { data: vendasHoje = [] } = await api("GET", ENDPOINTS.listar(qsHoje));
      const qtdHoje = vendasHoje.length;
      const fatHoje = vendasHoje.reduce((acc, v) => acc + Number(v.totalLiquido ?? v.totalBruto ?? 0), 0);

      kpiVendasHoje.textContent = qtdHoje;
      kpiFaturamentoHoje.textContent = BRL.format(fatHoje);

      // pendentes
      const qsPend = new URLSearchParams({ status: "ABERTA", perPage: "200" }).toString();
      const pend1 = await api("GET", ENDPOINTS.listar(qsPend));

      const qsLoja = new URLSearchParams({ status: "LOJA", perPage: "200" }).toString();
      const pend2 = await api("GET", ENDPOINTS.listar(qsLoja));

      const pendentes = [...(pend1?.data || []), ...(pend2?.data || [])];

      kpiPendentes.textContent = pendentes.length;
      badgePendentes.textContent = pendentes.length;

      renderPendentes(pendentes);

      const qsRecentes = new URLSearchParams({ perPage: "30" }).toString();
      const { data: recentes = [] } = await api("GET", ENDPOINTS.listar(qsRecentes));

      renderRecentes(recentes);

    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Erro ao carregar dashboard",
        text: e.message,
      });
    }
  }

  // =============== Events table ===============
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-editar, .js-finalizar, .js-cancelar, .js-print");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (btn.classList.contains("js-print")) {
      window.open(`comprovante-venda.html?id=${id}`, "_blank");
      return;
    }

    const venda = await api("GET", `/api/vendas/${id}`).catch(() => null);
    if (!venda) {
      Swal.fire({ icon: "error", title: "Erro", text: "Venda não encontrada" });
      return;
    }

    if (btn.classList.contains("js-editar")) {
      window.location.href = `vendas.html?id=${id}`;
      return;
    }

    if (btn.classList.contains("js-finalizar")) {
      if (["CANCELADA", "ENTREGUE"].includes(venda.status)) {
        Swal.fire({ icon: "warning", title: "Ação inválida" });
        return;
      }
      abrirModalFinalizar(venda);
      return;
    }

    if (btn.classList.contains("js-cancelar")) {
      if (venda.status === "CANCELADA") {
        Swal.fire({ icon: "info", title: "Venda já cancelada" });
        return;
      }
      abrirModalCancelar(venda);
      return;
    }
  });

  // =============== Troco em tempo real ===============
  inputValorRecebido?.addEventListener("input", () => {
    const total = Number(spanTotalFinalizar.textContent.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
    const recebido = Number(inputValorRecebido.value || 0);
    const troco = recebido - total;

    spanTroco.textContent = BRL.format(Math.max(0, troco));
    spanTroco.classList.toggle("text-danger", troco < 0);
  });

  // =============== Confirmar Pagamento ===============
  btnConfirmarFinalizacao?.addEventListener("click", async () => {
    if (paying || !vendaSelecionada) return;

    const total = Number(spanTotalFinalizar.textContent.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
    const recebido = Number(inputValorRecebido.value || 0);

    if (recebido < total) {
      Swal.fire({ icon: "error", title: "Valor insuficiente" });
      return;
    }

    try {
      paying = true;
      btnConfirmarFinalizacao.disabled = true;

      await api("PATCH", ENDPOINTS.confirmarPagamento(vendaSelecionada.id), {
        formaPagamento: vendaSelecionada.formaPagamento || "DINHEIRO",
      });

      finalizarVendaModal.hide();
      Swal.fire({ icon: "success", title: "Pagamento confirmado!" })
        .then(() => location.reload());

    } catch (e) {
      Swal.fire({ icon: "error", title: "Erro ao finalizar", text: e.message });
    } finally {
      paying = false;
      btnConfirmarFinalizacao.disabled = false;
    }
  });

  // =============== Cancelamento ===============
  selectMotivoCancel.addEventListener("change", () => {
    outroMotivoBox.style.display = selectMotivoCancel.value === "outro" ? "block" : "none";
  });

  btnConfirmarCancelamento.addEventListener("click", async () => {
    if (canceling || !vendaSelecionada) return;

    if (!selectMotivoCancel.value) {
      Swal.fire({ icon: "warning", title: "Selecione o motivo" });
      return;
    }

    if (selectMotivoCancel.value === "outro" && !outroMotivo.value.trim()) {
      Swal.fire({ icon: "warning", title: "Descreva o motivo" });
      return;
    }

    try {
      canceling = true;
      btnConfirmarCancelamento.disabled = true;

      await api("PATCH", ENDPOINTS.cancelar(vendaSelecionada.id), {
        motivo: selectMotivoCancel.value,
        extra: outroMotivo.value.trim() || null,
      });

      cancelarVendaModal.hide();
      Swal.fire({ icon: "success", title: "Venda cancelada!" })
        .then(() => location.reload());

    } catch (e) {
      Swal.fire({ icon: "error", title: "Erro ao cancelar", text: e.message });
    } finally {
      canceling = false;
      btnConfirmarCancelamento.disabled = false;
    }
  });

  // =============== filtros ===============
  filtroPeriodo.addEventListener("change", () => {
    periodoPesonalizado.style.display = filtroPeriodo.value === "personalizado" ? "flex" : "none";
  });

  btnLimparFiltros.addEventListener("click", () => {
    filtroStatus.value = "todos";
    filtroCliente.value = "";
    filtroMotorista.value = "todos";
    filtroPeriodo.value = "hoje";
    periodoPesonalizado.style.display = "none";
    dataInicio.value = "";
    dataFim.value = "";

    Swal.fire({ icon: "success", title: "Filtros limpos", toast: true, timer: 1500, showConfirmButton: false });
    loadKPIs();
  });

  btnAplicarFiltros.addEventListener("click", async () => {
    try {
      const qs = new URLSearchParams({ perPage: "50", page: "1" });

      if (filtroStatus.value === "pendente") qs.set("status", "ABERTA");
      else if (filtroStatus.value === "finalizada") qs.set("status", "PAGA");
      else if (filtroStatus.value === "cancelada") qs.set("status", "CANCELADA");
      else if (filtroStatus.value === "entregue") qs.set("status", "ENTREGUE");

      if (filtroPeriodo.value === "personalizado") {
        if (!dataInicio.value || !dataFim.value) {
          Swal.fire({ icon: "warning", title: "Datas incompletas" });
          return;
        }
        qs.set("dataInicio", new Date(dataInicio.value).toISOString());
        qs.set("dataFim", new Date(dataFim.value + "T23:59:59").toISOString());
      }

      if (filtroCliente.value.trim()) qs.set("clienteNome", filtroCliente.value.trim());
      if (filtroMotorista.value !== "todos") qs.set("motoristaId", filtroMotorista.value);

      const { data: lista = [] } = await api("GET", ENDPOINTS.listar(qs.toString()));
      renderRecentes(lista);

      Swal.fire({ icon: "success", title: "Filtros aplicados", toast: true, timer: 1500, showConfirmButton: false });

    } catch (e) {
      Swal.fire({ icon: "error", title: "Erro nos filtros", text: e.message });
    }
  });

  // carregar motoristas no filtro
  (async function loadMotoristas() {
    try {
      const resp = await api("GET", ENDPOINTS.motoristas);
      const list = resp?.data || resp || [];
      for (const m of list) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.nome || `Usuário ${m.id}`;
        filtroMotorista.appendChild(opt);
      }
    } catch { }
  })();

  // =============== Start ===============
  document.addEventListener("DOMContentLoaded", loadKPIs);

})();
