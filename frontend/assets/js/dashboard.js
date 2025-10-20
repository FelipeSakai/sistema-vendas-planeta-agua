// assets/js/dashboard.js
(function () {
  // Evita registrar handlers 2x se o script for carregado novamente
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
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data?.dados ?? data;
  }

  const ENDPOINTS = {
    listar: (qs) => `/api/vendas${qs ? `?${qs}` : ""}`,
    confirmarPagamento: (id) => `/api/vendas/${id}/pagamento`,  // PATCH
    cancelar: (id) => `/api/vendas/${id}/cancelar`,              // PATCH
    motoristas: `/api/usuarios?cargo=MOTORISTA&perPage=200`,
  };

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDataHora = (isoOrDate) => {
    const d = new Date(isoOrDate);
    if (Number.isNaN(+d)) return "-";
    const dd = d.toLocaleDateString("pt-BR");
    const hh = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${dd} ${hh}`;
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

  // =============== DOM refs (principais) ===============
  const tbodyPendentes = document.getElementById("tbodyPendentes");
  const tbodyRecentes = document.getElementById("tbodyRecentes");

  const kpiPendentes = document.getElementById("kpiPendentes");
  const kpiVendasHoje = document.getElementById("kpiVendasHoje");
  const kpiFaturamentoHoje = document.getElementById("kpiFaturamentoHoje");
  const kpiEntregasPendentes = document.getElementById("kpiEntregasPendentes");
  const badgePendentes = document.getElementById("badgePendentes");
  const badgeVendasHoje = document.getElementById("badgeVendasHoje");

  // Modais
  const finalizarVendaModal = new bootstrap.Modal(document.getElementById("finalizarVendaModal"));
  const cancelarVendaModal = new bootstrap.Modal(document.getElementById("cancelarVendaModal"));
  const detalhesVendaModal = new bootstrap.Modal(document.getElementById("detalhesVendaModal"));

  // Campos modal Finalizar
  const spanClienteFinalizar = document.getElementById("clienteFinalizarVenda");
  const spanTotalFinalizar = document.getElementById("totalFinalizarVenda");
  const spanFormaFinalizar = document.getElementById("formaPagamentoFinalizarVenda");
  const inputValorRecebido = document.getElementById("valorRecebidoFinalizar");
  const spanTroco = document.getElementById("trocoFinalizarVenda");
  const inputObsFinalizar = document.getElementById("observacoesFinalizarVenda");
  const btnConfirmarFinalizacao = document.getElementById("btnConfirmarFinalizacao");

  // Campos modal Cancelar
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

  // estado do modal
  let vendaSelecionada = null; // {id, total, cliente, formaPagamento}
  let paying = false;   // lock anti duplo-clique
  let canceling = false;

  // =============== Render helpers ===============
  function rowActions(v) {
    return `
      <div class="btn-group">
        <button class="btn btn-sm btn-success js-finalizar" data-id="${v.id}" title="Finalizar/Pagar"><i class="bi bi-check-circle"></i></button>
        <button class="btn btn-sm btn-primary js-editar" data-id="${v.id}" title="Editar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger js-cancelar" data-id="${v.id}" title="Cancelar"><i class="bi bi-x-circle"></i></button>
      </div>
    `;
  }

  function renderPendentes(list) {
    tbodyPendentes.innerHTML = "";
    if (!list.length) {
      tbodyPendentes.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Sem vendas pendentes.</td></tr>`;
      return;
    }
    for (const v of list) {
      const itensCount = v.itens?.length || 0;
      const motorista = v.entrega?.motorista?.nome || "-";
      const forma = v.formaPagamento ? `${formaPagamentoText(v.formaPagamento)}${v.status === "ABERTA" ? " (a confirmar)" : ""}` : "—";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${v.id}</td>
        <td>${fmtDataHora(v.dataVenda)}</td>
        <td>${v.cliente?.nome || "-"}</td>
        <td>${itensCount} ${itensCount === 1 ? "item" : "itens"}</td>
        <td>${motorista}</td>
        <td>${forma}</td>
        <td class="text-end">${BRL.format(Number(v.totalLiquido ?? v.totalBruto ?? 0))}</td>
        <td class="text-center">${rowActions(v)}</td>
      `;
      tbodyPendentes.appendChild(tr);
    }
    badgePendentes.textContent = `${list.length} venda${list.length === 1 ? "" : "s"}`;
  }

  function renderRecentes(list) {
    tbodyRecentes.innerHTML = "";
    if (!list.length) {
      tbodyRecentes.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Sem vendas no período.</td></tr>`;
      return;
    }
    for (const v of list) {
      const itensCount = v.itens?.length || 0;
      const motorista = v.entrega?.motorista?.nome || "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${v.id}</td>
        <td>${fmtDataHora(v.dataVenda)}</td>
        <td>${v.cliente?.nome || "-"}</td>
        <td>${itensCount} ${itensCount === 1 ? "item" : "itens"}</td>
        <td>${motorista}</td>
        <td>${formaPagamentoText(v.formaPagamento)}</td>
        <td>${statusBadge(v.status)}</td>
        <td class="text-end">${BRL.format(Number(v.totalLiquido ?? v.totalBruto ?? 0))}</td>
        <td class="text-center">${rowActions(v)}</td>
      `;
      tbodyRecentes.appendChild(tr);
    }
  }

  // =============== Carregamento principal ===============
  async function loadKPIs() {
    try {
      // hoje
      const today = new Date();
      const ini = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const fim = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const qsHoje = new URLSearchParams({
        dataInicio: ini.toISOString(),
        dataFim: fim.toISOString(),
        perPage: "100",
        page: "1",
      }).toString();

      const { data: vendasHoje = [] } = await api("GET", ENDPOINTS.listar(qsHoje));
      const qtdHoje = vendasHoje.length;
      const fatHoje = vendasHoje.reduce((acc, v) => acc + Number(v.totalLiquido ?? v.totalBruto ?? 0), 0);

      kpiVendasHoje.textContent = String(qtdHoje);
      kpiFaturamentoHoje.textContent = BRL.format(fatHoje);
      badgeVendasHoje.textContent = `${qtdHoje} venda${qtdHoje === 1 ? "" : "s"} hoje`;

      // pendentes (ABERTA ou LOJA)
      const qsPend = new URLSearchParams({
        status: "ABERTA",
        perPage: "100",
        page: "1",
      }).toString();
      const pend1 = await api("GET", ENDPOINTS.listar(qsPend));
      const qsLoja = new URLSearchParams({
        status: "LOJA",
        perPage: "100",
        page: "1",
      }).toString();
      const pend2 = await api("GET", ENDPOINTS.listar(qsLoja)).catch(() => ({ data: [] }));

      const pendentes = [...(pend1?.data || []), ...(pend2?.data || [])];
      kpiPendentes.textContent = String(pendentes.length);

      // entregas pendentes (estimado)
      const entregasPend = (vendasHoje || []).filter(v => v.status === "PAGA" && v.entrega?.status !== "ENTREGUE").length;
      kpiEntregasPendentes.textContent = String(entregasPend);

      renderPendentes(pendentes);

      // recentes (últimos 30)
      const qsRecentes = new URLSearchParams({ perPage: "30", page: "1" }).toString();
      const { data: recentes = [] } = await api("GET", ENDPOINTS.listar(qsRecentes));
      renderRecentes(recentes);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Erro ao carregar dashboard", text: e.message || "Falha" });
    }
  }

  // =============== Ações (delegação) ===============
  function abrirModalFinalizar(venda) {
    vendaSelecionada = venda;
    document.getElementById("finalizarVendaModalLabel").textContent = `Finalizar Venda #${venda.id}`;
    spanClienteFinalizar.textContent = venda?.cliente?.nome || "-";
    const total = Number(venda.totalLiquido ?? venda.totalBruto ?? 0);
    spanTotalFinalizar.textContent = BRL.format(total);
    spanFormaFinalizar.textContent = formaPagamentoText(venda.formaPagamento) || "—";
    inputValorRecebido.value = total.toFixed(2);
    spanTroco.textContent = BRL.format(0);
    spanTroco.classList.remove("text-danger");
    inputObsFinalizar.value = "";
    finalizarVendaModal.show();
  }

  function abrirModalCancelar(venda) {
    vendaSelecionada = venda;
    document.getElementById("cancelarVendaModalLabel").textContent = `Cancelar Venda #${venda.id}`;
    spanClienteCancelar.textContent = venda?.cliente?.nome || "-";
    const total = Number(venda.totalLiquido ?? venda.totalBruto ?? 0);
    spanTotalCancelar.textContent = BRL.format(total);
    selectMotivoCancel.value = "";
    outroMotivoBox.style.display = "none";
    outroMotivo.value = "";
    cancelarVendaModal.show();
  }

  // Clique nos botões da tabela (delegação)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-editar, .js-finalizar, .js-cancelar");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;

    const venda = await api("GET", `/api/vendas/${id}`).catch(() => null);
    if (!venda) {
      Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível obter a venda." });
      return;
    }

    if (btn.classList.contains("js-editar")) {
      window.location.href = `vendas.html?id=${id}`;
      return;
    }

    if (btn.classList.contains("js-finalizar")) {
      if (venda.status === "CANCELADA" || venda.status === "ENTREGUE") {
        Swal.fire({ icon: "warning", title: "Ação inválida", text: "Essa venda não pode ser finalizada." });
        return;
      }
      abrirModalFinalizar(venda);
      return;
    }

    if (btn.classList.contains("js-cancelar")) {
      if (venda.status === "CANCELADA") {
        Swal.fire({ icon: "info", title: "Já cancelada", text: "Essa venda já está cancelada." });
        return;
      }
      abrirModalCancelar(venda);
      return;
    }
  });

  // troco em tempo real
  inputValorRecebido?.addEventListener("input", () => {
    const totalTxt = spanTotalFinalizar.textContent || "R$ 0,00";
    const total = Number(totalTxt.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
    const recebido = Number(inputValorRecebido.value || 0);
    const troco = recebido - total;
    spanTroco.textContent = BRL.format(Math.max(0, troco));
    if (troco < 0) spanTroco.classList.add("text-danger"); else spanTroco.classList.remove("text-danger");
  });

  // ====== AÇÃO: confirmar pagamento (PATCH) ======
  btnConfirmarFinalizacao?.addEventListener("click", async () => {
    if (paying) return;
    if (!vendaSelecionada) return;
    const totalTxt = spanTotalFinalizar.textContent || "R$ 0,00";
    const total = Number(totalTxt.replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
    const recebido = Number(inputValorRecebido.value || 0);
    if (recebido < total) {
      Swal.fire({ icon: "error", title: "Valor insuficiente", text: "O valor recebido é menor que o total." });
      return;
    }

    try {
      paying = true;
      btnConfirmarFinalizacao.disabled = true;
      const formaPg = vendaSelecionada.formaPagamento || "DINHEIRO";
      await api("PATCH", ENDPOINTS.confirmarPagamento(vendaSelecionada.id), {
        formaPagamento: formaPg,
        // desconto: 0
      });

      finalizarVendaModal.hide();
      Swal.fire({ icon: "success", title: "Pagamento confirmado" }).then(() => location.reload());
    } catch (e) {
      Swal.fire({ icon: "error", title: "Erro ao finalizar", text: e.message || "Falha" });
    } finally {
      paying = false;
      btnConfirmarFinalizacao.disabled = false;
    }
  });

  // cancelar: select "outro" mostra textarea
  selectMotivoCancel?.addEventListener("change", () => {
    outroMotivoBox.style.display = selectMotivoCancel.value === "outro" ? "block" : "none";
  });

  // ====== AÇÃO: cancelar venda (PATCH) ======
  btnConfirmarCancelamento?.addEventListener("click", async () => {
    if (canceling) return;
    if (!vendaSelecionada) return;
    if (!selectMotivoCancel.value) {
      Swal.fire({ icon: "warning", title: "Motivo necessário", text: "Selecione o motivo do cancelamento." });
      return;
    }
    if (selectMotivoCancel.value === "outro" && !outroMotivo.value.trim()) {
      Swal.fire({ icon: "warning", title: "Informe o motivo", text: "Descreva o motivo do cancelamento." });
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
      Swal.fire({ icon: "success", title: "Venda cancelada" }).then(() => location.reload());
    } catch (e) {
      Swal.fire({ icon: "error", title: "Erro ao cancelar", text: e.message || "Falha" });
    } finally {
      canceling = false;
      btnConfirmarCancelamento.disabled = false;
    }
  });

  // ====== Filtros (UI) ======
  filtroPeriodo?.addEventListener('change', function () {
    periodoPesonalizado.style.display = this.value === 'personalizado' ? 'flex' : 'none';
  });

  btnLimparFiltros?.addEventListener('click', () => {
    filtroStatus.value = 'todos';
    filtroPeriodo.value = 'hoje';
    filtroCliente.value = '';
    filtroMotorista.value = 'todos';
    periodoPesonalizado.style.display = 'none';
    if (dataInicio) dataInicio.value = '';
    if (dataFim) dataFim.value = '';
    Swal.fire({ icon: 'success', title: 'Filtros limpos', toast: true, timer: 1800, showConfirmButton: false });
    loadKPIs();
  });

  btnAplicarFiltros?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams({ perPage: "50", page: "1" });
      if (filtroStatus.value === "pendente") qs.set("status", "ABERTA");
      else if (filtroStatus.value === "finalizada") qs.set("status", "PAGA");
      else if (filtroStatus.value === "cancelada") qs.set("status", "CANCELADA");

      if (filtroPeriodo.value === "personalizado") {
        if (!dataInicio.value || !dataFim.value) {
          Swal.fire({ icon: "warning", title: "Datas incompletas" });
          return;
        }
        qs.set("dataInicio", new Date(dataInicio.value).toISOString());
        qs.set("dataFim", new Date(dataFim.value + "T23:59:59").toISOString());
      }

      const { data: list = [] } = await api("GET", ENDPOINTS.listar(qs.toString()));
      renderRecentes(list);
      Swal.fire({ icon: 'success', title: 'Filtros aplicados', toast: true, timer: 1800, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Falha ao aplicar filtros", text: e.message || "Erro" });
    }
  });

  // carrega motoristas no filtro
  (async function loadMotoristasFiltro() {
    try {
      const resp = await api("GET", ENDPOINTS.motoristas);
      const payload = resp?.data || resp || [];
      for (const u of payload) {
        const opt = document.createElement("option");
        opt.value = String(u.id);
        opt.textContent = u.nome || `Usuário ${u.id}`;
        filtroMotorista.appendChild(opt);
      }
    } catch { /* ignora */ }
  })();

  // =============== Boot ===============
  document.addEventListener("DOMContentLoaded", loadKPIs);
})();
