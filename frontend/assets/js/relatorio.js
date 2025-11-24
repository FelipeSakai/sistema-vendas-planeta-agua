// assets/js/relatorio.js
(function () {
    // =========================
    // Config & Helpers
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
        return { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" };
    }

    async function apiGet(path) {
        const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
        let data = null;
        try { data = await res.json(); } catch { /* ignore */ }
        if (!res.ok) {
            const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
            throw new Error(msg);
        }
        return data?.dados ?? data;
    }

    const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const fmtBRL = (n) => BRL.format(Number(n || 0));
    const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);

    function todayISO() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    function toPTDate(iso) {
        if (!iso) return "—";
        try {
            const [yyyy, mm, dd] = iso.split("T")[0].split("-");
            return `${dd}/${mm}/${yyyy}`;
        } catch {
            return "—";
        }
    }

    function getMonthName(m) {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return meses[Number(m) - 1] || "";
    }

    // =========================
    // Endpoints previstos
    // =========================
    const ENDPOINTS = {
        // vendas
        vendasDiario: (data, vendedorId) => {
            const qs = new URLSearchParams({ data });
            if (vendedorId && vendedorId !== "todos") qs.set("vendedorId", vendedorId);
            return `/api/relatorios/vendas/diario?${qs}`;
        },
        vendasMensal: (ano, mes) => `/api/relatorios/vendas/mensal?ano=${ano}&mes=${mes}`,
        vendasAnual: (ano) => `/api/relatorios/vendas/anual?ano=${ano}`,
        vendasPersonalizado: (inicio, fim) => `/api/relatorios/vendas/personalizado?inicio=${inicio}&fim=${fim}`,

        // estoque
        estoqueAtual: (categoria, status) => {
            const qs = new URLSearchParams();
            if (categoria && categoria !== "todos") qs.set("categoria", categoria);
            if (status) qs.set("status", status); // baixo|normal|alto|todos
            return `/api/relatorios/estoque/atual?${qs.toString()}`;
        },
        estoqueMov: (inicio, fim) => `/api/relatorios/estoque/movimentacao?inicio=${inicio}&fim=${fim}`,
        estoqueVal: (dias) => `/api/relatorios/estoque/validade?dias=${dias}`,

        // aux (para filtros)
        vendedores: `/api/usuarios?perPage=200`,
        produtos: `/api/produtos?perPage=500`,
    };

    // =========================
    // DOM
    // =========================
    // Vendas - filtros
    const dataVendaDiaria = document.getElementById("dataVendaDiaria");
    const vendedorVendasDiario = document.getElementById("vendedorVendasDiario");
    const btnRelDiario = document.getElementById("gerarRelatorioDiario");

    const mesVendaMensal = document.getElementById("mesVendaMensal");
    const anoVendaMensal = document.getElementById("anoVendaMensal");
    const btnRelMensal = document.getElementById("gerarRelatorioMensal");

    const anoVendaAnual = document.getElementById("anoVendaAnual");
    const btnRelAnual = document.getElementById("gerarRelatorioAnual");

    const dataInicioPers = document.getElementById("dataInicio");
    const dataFimPers = document.getElementById("dataFim");
    const btnRelPers = document.getElementById("gerarRelatorioPersonalizado");

    // Vendas - saídas
    const lblDataRelatorio = document.getElementById("dataRelatorio");
    const faturamentoDia = document.getElementById("faturamentoDia");
    const totalVendas = document.getElementById("totalVendas");
    const ticketMedio = document.getElementById("ticketMedio");
    const clientesAtendidos = document.getElementById("clientesAtendidos");
    const produtosVendidosContainer = document.getElementById("produtosVendidosContainer");
    const totalDiaVendas = document.getElementById("totalDiaVendas");
    const tabelaVendasBody = document.getElementById("tabelaVendasBody");
    const totalTabelaVendas = document.getElementById("totalTabelaVendas");

    const lblMesAnoRel = document.getElementById("mesAnoRelatorio");
    const faturamentoMes = document.getElementById("faturamentoMes");
    const totalVendasMes = document.getElementById("totalVendasMes");
    const ticketMedioMes = document.getElementById("ticketMedioMes");
    const novosClientesMes = document.getElementById("novosClientesMes");
    const tabelaProdutosMensalBody = document.getElementById("tabelaProdutosMensalBody");
    const totalProdutosMensal = document.getElementById("totalProdutosMensal");

    // Estoque - filtros
    const categoriaEstoqueAtual = document.getElementById("categoriaEstoqueAtual");
    const statusEstoqueAtual = document.getElementById("statusEstoqueAtual");
    const btnEstoqueAtual = document.getElementById("gerarRelatorioEstoqueAtual");

    const dataInicioMov = document.getElementById("dataInicioMovimentacao");
    const dataFimMov = document.getElementById("dataFimMovimentacao");
    const btnMov = document.getElementById("gerarRelatorioMovimentacao");

    const periodoValidade = document.getElementById("periodoValidade");
    const btnValidade = document.getElementById("gerarRelatorioValidade");

    // Estoque - saídas
    const dataEstoqueAtual = document.getElementById("dataEstoqueAtual");
    const totalProdutosEstoque = document.getElementById("totalProdutosEstoque");
    const estoqueBaixo = document.getElementById("estoqueBaixo");
    const proximosVencer = document.getElementById("proximosVencer");
    const valorEstoque = document.getElementById("valorEstoque");
    const totalValorEstoque = document.getElementById("totalValorEstoque");
    const tabelaEstoqueBody = document.getElementById("tabelaEstoqueBody");

    const periodoMovimentacao = document.getElementById("periodoMovimentacao");
    const totalEntradas = document.getElementById("totalEntradas");
    const totalSaidas = document.getElementById("totalSaidas");
    const saldoMovimentacao = document.getElementById("saldoMovimentacao");
    const valorMovimentado = document.getElementById("valorMovimentado");
    const tabelaMovimentacaoBody = document.getElementById("tabelaMovimentacaoBody");

    const periodoValidadeTexto = document.getElementById("periodoValidadeTexto");
    const tabelaValidadeBody = document.getElementById("tabelaValidadeBody");

    // Gráficos
    let chartVendasMensal = null;
    let chartProdutosMensal = null;

    function destroyChart(c) { if (c && typeof c.destroy === "function") c.destroy(); }

    // =========================
    // Carregadores / Renderers
    // =========================

    // Vendedores e categorias (para filtros)
    async function loadVendedores() {
        try {
            const data = await apiGet(ENDPOINTS.vendedores);
            const list = (data?.data || data || []).filter(u => u.status !== "INATIVO");
            // Mantém "todos"
            vendedorVendasDiario.innerHTML = `<option value="todos" selected>Todos os vendedores</option>`;
            list.forEach(u => {
                const opt = document.createElement("option");
                opt.value = String(u.id);
                opt.textContent = u.nome || `Usuário ${u.id}`;
                vendedorVendasDiario.appendChild(opt);
            });
        } catch { /* ignora */ }
    }

    async function loadCategorias() {
        try {
            const data = await apiGet(ENDPOINTS.produtos);
            const produtos = data?.data || data || [];
            const tipos = Array.from(new Set(produtos.map(p => p.tipo).filter(Boolean)));
            categoriaEstoqueAtual.innerHTML = `<option value="todos" selected>Todas as categorias</option>`;
            tipos.forEach(t => {
                const opt = document.createElement("option");
                opt.value = String(t);
                opt.textContent = t;
                categoriaEstoqueAtual.appendChild(opt);
            });
        } catch { /* ignora */ }
    }

    // ======= VENDAS: Diário =======
    async function gerarDiario() {
        const data = dataVendaDiaria.value || todayISO();
        const vend = vendedorVendasDiario.value || "todos";
        const payload = await apiGet(ENDPOINTS.vendasDiario(data, vend));

        // esperado do backend:
        // { data, faturamento, totalVendas, ticketMedio, clientesAtendidos,
        //   produtos: [{nome, quantidade, valor}],
        //   vendas: [{hora, cliente, produtos, vendedor, pagamento, valor}],
        //   totalTabela, totalDia }
        lblDataRelatorio.textContent = toPTDate(payload?.data || data);
        faturamentoDia.textContent = fmtBRL(payload?.faturamento || 0);
        totalVendas.textContent = safe(payload?.totalVendas, 0);
        ticketMedio.textContent = fmtBRL(payload?.ticketMedio || 0);
        clientesAtendidos.textContent = safe(payload?.clientesAtendidos, 0);
        totalDiaVendas.textContent = fmtBRL(payload?.totalDia || payload?.faturamento || 0);
        totalTabelaVendas.textContent = fmtBRL(payload?.totalTabela || payload?.faturamento || 0);

        // produtos vendidos
        produtosVendidosContainer.innerHTML = "";
        (payload?.produtos || []).forEach(p => {
            const div = document.createElement("div");
            div.className = "product-item";
            div.innerHTML = `
        <div class="product-info">
          <div class="product-name">${safe(p.nome)}</div>
          <div class="product-quantity">${safe(p.quantidade)}</div>
        </div>
        <div class="product-value">${fmtBRL(p.valor)}</div>
      `;
            produtosVendidosContainer.appendChild(div);
        });

        // tabela vendas
        tabelaVendasBody.innerHTML = "";
        (payload?.vendas || []).forEach(v => {
            const tr = document.createElement("tr");

            // monta a lista de produtos: nome + (quantidade)
            let produtosTexto = "—";
            if (Array.isArray(v.itens) && v.itens.length) {
                produtosTexto = v.itens
                    .map(it => `${safe(it.nome)} (${safe(it.quantidade)})`)
                    .join(", ");
            } else if (v.produtos) {
                produtosTexto = v.produtos;
            }

            tr.innerHTML = `
        <td>${safe(v.hora)}</td>
        <td>${safe(v.cliente)}</td>
        <td>${produtosTexto}</td>
        <td>${safe(v.vendedor)}</td>
        <td>${safe(v.pagamento)}</td>
        <td class="text-end">${fmtBRL(v.valor)}</td>
        `;

            tabelaVendasBody.appendChild(tr);
        })
    }

    // ======= VENDAS: Mensal =======
    async function gerarMensal() {
        const mes = mesVendaMensal.value || String(new Date().getMonth() + 1);
        const ano = anoVendaMensal.value || String(new Date().getFullYear());
        const payload = await apiGet(ENDPOINTS.vendasMensal(ano, mes));

        lblMesAnoRel.textContent = `${getMonthName(mes)}/${ano}`;
        faturamentoMes.textContent = fmtBRL(payload?.faturamento || 0);
        totalVendasMes.textContent = safe(payload?.totalVendas, 0);
        ticketMedioMes.textContent = fmtBRL(payload?.ticketMedio || 0);
        novosClientesMes.textContent = safe(payload?.novosClientes, 0);
        totalProdutosMensal.textContent = fmtBRL(payload?.faturamento || 0);

        // gráfico evolução
        const ctxEvol = document.getElementById("vendasMensalChart");
        if (ctxEvol) {
            const labels = payload?.grafico?.labels || [];
            const valores = payload?.grafico?.valores || [];
            destroyChart(chartVendasMensal);
            chartVendasMensal = new Chart(ctxEvol.getContext("2d"), {
                type: "line",
                data: { labels, datasets: [{ label: "Vendas (R$)", data: valores, tension: 0.3, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // produtos mês (tabela + pizza)
        const produtos = payload?.produtos || [];
        tabelaProdutosMensalBody.innerHTML = "";
        produtos.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${safe(p.nome)}</td>
        <td>${safe(p.quantidade)}</td>
        <td class="text-end">${fmtBRL(p.valor)}</td>
      `;
            tabelaProdutosMensalBody.appendChild(tr);
        });

        const ctxProd = document.getElementById("produtosMensalChart");
        if (ctxProd) {
            destroyChart(chartProdutosMensal);
            chartProdutosMensal = new Chart(ctxProd.getContext("2d"), {
                type: "pie",
                data: {
                    labels: produtos.map(p => p.nome),
                    datasets: [{ data: produtos.map(p => Number(p.valor || 0)) }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // ======= VENDAS: Anual =======
    async function gerarAnual() {
        const ano = anoVendaAnual.value || String(new Date().getFullYear());
        const payload = await apiGet(ENDPOINTS.vendasAnual(ano));
        const holder = document.getElementById("relatorioAnualGerado");
        holder.innerHTML = `
      <div class="row mb-4">
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-cash-coin summary-icon"></i><div class="summary-title">Faturamento</div><div class="summary-value">${fmtBRL(payload?.faturamento || 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-cart-check summary-icon"></i><div class="summary-title">Total de Vendas</div><div class="summary-value">${safe(payload?.totalVendas, 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-currency-dollar summary-icon"></i><div class="summary-title">Ticket Médio</div><div class="summary-value">${fmtBRL(payload?.ticketMedio || 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-people summary-icon"></i><div class="summary-title">Clientes Únicos</div><div class="summary-value">${safe(payload?.clientesUnicos, 0)}</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h5 class="mb-0">Faturamento Mensal</h5></div>
        <div class="card-body">
          <div class="chart-container"><canvas id="vendasAnualChart"></canvas></div>
        </div>
      </div>
    `;
        const ctx = document.getElementById("vendasAnualChart");
        if (ctx) {
            const labels = payload?.grafico?.labels || [];
            const valores = payload?.grafico?.valores || [];
            new Chart(ctx.getContext("2d"), {
                type: "bar",
                data: { labels, datasets: [{ label: "Faturamento (R$)", data: valores }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // ======= VENDAS: Personalizado =======
    async function gerarPersonalizado() {
        const ini = dataInicioPers.value;
        const fim = dataFimPers.value;
        if (!ini || !fim) {
            Swal.fire({ icon: "warning", title: "Selecione as datas inicial e final" });
            return;
        }
        const payload = await apiGet(ENDPOINTS.vendasPersonalizado(ini, fim));
        const holder = document.getElementById("relatorioPersonalizadoGerado");
        holder.innerHTML = `
      <div class="daily-report-header">
        <div class="daily-report-date">Período: ${toPTDate(ini)} a ${toPTDate(fim)}</div>
        <button class="btn btn-outline-primary print-btn" onclick="window.print()"><i class="bi bi-printer"></i> Imprimir</button>
      </div>
      <div class="row mb-4">
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-cash-coin summary-icon"></i><div class="summary-title">Faturamento</div><div class="summary-value">${fmtBRL(payload?.faturamento || 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-cart-check summary-icon"></i><div class="summary-title">Total de Vendas</div><div class="summary-value">${safe(payload?.totalVendas, 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-currency-dollar summary-icon"></i><div class="summary-title">Ticket Médio</div><div class="summary-value">${fmtBRL(payload?.ticketMedio || 0)}</div></div></div>
        <div class="col-md-3"><div class="summary-card position-relative"><i class="bi bi-people summary-icon"></i><div class="summary-title">Clientes</div><div class="summary-value">${safe(payload?.clientes, 0)}</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h5 class="mb-0">Vendas</h5></div>
        <div class="card-body">
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Pagamento</th><th class="text-end">Valor</th></tr></thead>
              <tbody id="tabelaPersBody"></tbody>
              <tfoot><tr class="table-light"><td colspan="4" class="text-end fw-bold">Total</td><td class="text-end fw-bold">${fmtBRL(payload?.faturamento || 0)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
        const tbody = document.getElementById("tabelaPersBody");
        tbody.innerHTML = "";
        (payload?.vendas || []).forEach(v => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${toPTDate(v.data || v.dataVenda)}</td>
        <td>${safe(v.cliente)}</td>
        <td>${safe(v.vendedor)}</td>
        <td>${safe(v.pagamento)}</td>
        <td class="text-end">${fmtBRL(v.valor)}</td>
      `;
            tbody.appendChild(tr);
        });
    }

    // ======= ESTOQUE: Atual =======
    async function gerarEstoqueAtual() {
        const cat = categoriaEstoqueAtual.value || "todos";
        const st = statusEstoqueAtual.value || "todos"; // baixo|normal|alto|todos
        const payload = await apiGet(ENDPOINTS.estoqueAtual(cat, st));

        dataEstoqueAtual.textContent = toPTDate(payload?.dataRef || todayISO());
        totalProdutosEstoque.textContent = safe(payload?.totalProdutos, 0);
        estoqueBaixo.textContent = safe(payload?.estoqueBaixo, 0);
        proximosVencer.textContent = safe(payload?.proximosVencer, 0);
        valorEstoque.textContent = fmtBRL(payload?.valorEstoque || 0);
        totalValorEstoque.textContent = fmtBRL(payload?.valorEstoque || 0);

        tabelaEstoqueBody.innerHTML = "";
        (payload?.produtos || []).forEach(p => {
            const tr = document.createElement("tr");
            const statusLabel = p.status || "—"; // "Estoque Baixo", etc.
            const badgeClass =
                /baixo/i.test(statusLabel) ? "badge-low" :
                    /alto/i.test(statusLabel) ? "badge-high" : "badge-medium";

            tr.innerHTML = `
        <td>${safe(p.produto || p.nome)}</td>
        <td>${safe(p.categoria || p.tipo || "-")}</td>
        <td>${safe(p.quantidade, 0)}</td>
        <td>${p.validade ? toPTDate(p.validade) : "-"}</td>
        <td><span class="badge ${badgeClass} badge-status">${statusLabel}</span></td>
        <td class="text-end">${fmtBRL(p.valorTotal || (p.precoTotal || 0))}</td>
      `;
            tabelaEstoqueBody.appendChild(tr);
        });
    }

    // ======= ESTOQUE: Movimentação =======
    async function gerarMovimentacao() {
        const ini = dataInicioMov.value;
        const fim = dataFimMov.value;
        if (!ini || !fim) {
            Swal.fire({ icon: "warning", title: "Selecione as datas de movimentação" });
            return;
        }
        const payload = await apiGet(ENDPOINTS.estoqueMov(ini, fim));
        periodoMovimentacao.textContent = `${toPTDate(ini)} a ${toPTDate(fim)}`;
        totalEntradas.textContent = `${safe(payload?.entradas, 0)} unidades`;
        totalSaidas.textContent = `${safe(payload?.saidas, 0)} unidades`;
        const saldo = Number(payload?.entradas || 0) - Number(payload?.saidas || 0);
        saldoMovimentacao.textContent = `${saldo >= 0 ? "+" : ""}${saldo} unidades`;
        valorMovimentado.textContent = fmtBRL(payload?.valorMovimentado || 0);

        tabelaMovimentacaoBody.innerHTML = "";
        (payload?.movimentacoes || []).forEach(m => {
            const tipo = (m.tipo || "").toLowerCase(); // entrada | saida
            const cls = tipo === "entrada" ? "text-success" : "text-danger";
            const qtd = Number(m.quantidade || 0);
            const qtdFmt = `${tipo === "entrada" ? "+" : "-"}${Math.abs(qtd)} unidades`;
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${toPTDate(m.data)}</td>
        <td>${safe(m.produto)}</td>
        <td class="${cls}">${tipo === "entrada" ? "Entrada" : "Saída"}</td>
        <td class="${cls}">${qtdFmt}</td>
        <td>${safe(m.responsavel || m.usuario || "-")}</td>
        <td class="text-end">${fmtBRL(m.valor)}</td>
      `;
            tabelaMovimentacaoBody.appendChild(tr);
        });
    }

    // ======= ESTOQUE: Validade =======
    async function gerarValidade() {
        const dias = periodoValidade.value || "30";
        const payload = await apiGet(ENDPOINTS.estoqueVal(dias));
        periodoValidadeTexto.textContent = dias === "todos" ? "Todos" : `Próximos ${dias} dias`;

        tabelaValidadeBody.innerHTML = "";
        (payload?.produtos || []).forEach(p => {
            const statusLabel = p.status || (p.diasRestantes <= 30 ? "Próximo a vencer" : "Normal");
            const badgeClass = /próximo|proximo/i.test(statusLabel) ? "badge-low" : "badge-medium";
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${safe(p.produto || p.nome)}</td>
        <td>${safe(p.lote || "-")}</td>
        <td>${toPTDate(p.validade)}</td>
        <td>${safe(p.diasRestantes, "-")}</td>
        <td>${safe(p.quantidade, 0)}</td>
        <td><span class="badge ${badgeClass} badge-status">${statusLabel}</span></td>
      `;
            tabelaValidadeBody.appendChild(tr);
        });
    }

    // =========================
    // Eventos
    // =========================
    btnRelDiario?.addEventListener("click", async () => {
        try { await gerarDiario(); Swal.fire({ icon: "success", title: "Relatório diário atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });
    btnRelMensal?.addEventListener("click", async () => {
        try { await gerarMensal(); Swal.fire({ icon: "success", title: "Relatório mensal atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });
    btnRelAnual?.addEventListener("click", async () => {
        try { await gerarAnual(); Swal.fire({ icon: "success", title: "Relatório anual atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });
    btnRelPers?.addEventListener("click", async () => {
        try { await gerarPersonalizado(); Swal.fire({ icon: "success", title: "Relatório personalizado atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });

    btnEstoqueAtual?.addEventListener("click", async () => {
        try { await gerarEstoqueAtual(); Swal.fire({ icon: "success", title: "Estoque atual atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });
    btnMov?.addEventListener("click", async () => {
        try { await gerarMovimentacao(); Swal.fire({ icon: "success", title: "Movimentação atualizada" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });
    btnValidade?.addEventListener("click", async () => {
        try { await gerarValidade(); Swal.fire({ icon: "success", title: "Relatório de validade atualizado" }); } catch (e) { Swal.fire({ icon: "error", title: "Erro", text: e.message }); }
    });

    // Quando mudar de aba (mensal/movimentação/validade), recarrega dados
    document.getElementById("mensal-tab")?.addEventListener("click", () => setTimeout(gerarMensal, 50));
    document.getElementById("anual-tab")?.addEventListener("click", () => setTimeout(gerarAnual, 50));
    document.getElementById("personalizado-tab")?.addEventListener("click", () => { /* fica aguardando clique do botão */ });

    document.getElementById("movimentacao-tab")?.addEventListener("click", () => {
        // só gera quando o user clicar no botão, mas deixamos datas default
    });
    document.getElementById("validade-tab")?.addEventListener("click", () => setTimeout(gerarValidade, 50));


    // === IMPRESSÃO: abre o resumo pronto em nova aba ===
    window.imprimirRelatorio = function () {
        // Descobre qual aba PRINCIPAL está ativa (Vendas | Estoque)
        const vendasAtiva = !!document.querySelector('#pane-vendas.tab-pane.show.active');
        const estoqueAtiva = !!document.querySelector('#pane-estoque.tab-pane.show.active');

        // Helper para abrir com os parâmetros certos
        const openResumo = (type, paramsObj) => {
            const qs = new URLSearchParams(paramsObj || {}).toString();
            // como relatorio-resumo.html está na MESMA pasta de relatorios.html:
            window.open(`./relatorio-resumo.html?type=${encodeURIComponent(type)}${qs ? '&' + qs : ''}`, '_blank');
        };

        // ---- VENDAS ----
        if (vendasAtiva) {
            const activeVendasTabId = document.querySelector('#vendasTabs .nav-link.active')?.id;

            if (activeVendasTabId === 'diario-tab') {
                const data = document.getElementById('dataVendaDiaria')?.value;
                const vend = document.getElementById('vendedorVendasDiario')?.value || 'todos';
                const params = {};
                // se não tiver data, manda hoje p/ evitar resumo vazio
                params.data = data || (() => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })();
                if (vend && vend !== 'todos') params.vendedorId = vend;
                openResumo('vendas-diario', params);
                return;
            }

            if (activeVendasTabId === 'mensal-tab') {
                const mes = document.getElementById('mesVendaMensal')?.value;
                const ano = document.getElementById('anoVendaMensal')?.value;
                openResumo('vendas-mensal', { ano, mes });
                return;
            }

            if (activeVendasTabId === 'anual-tab') {
                const ano = document.getElementById('anoVendaAnual')?.value;
                openResumo('vendas-anual', { ano });
                return;
            }

            if (activeVendasTabId === 'personalizado-tab') {
                const inicio = document.getElementById('dataInicio')?.value;
                const fim = document.getElementById('dataFim')?.value;
                if (!inicio || !fim) {
                    return Swal?.fire({ icon: 'warning', title: 'Informe o período para imprimir.' });
                }
                openResumo('vendas-personalizado', { inicio, fim });
                return;
            }
        }

        // ---- ESTOQUE ----
        if (estoqueAtiva) {
            const activeEstoqueTabId = document.querySelector('#estoqueTabs .nav-link.active')?.id;

            if (activeEstoqueTabId === 'atual-tab') {
                const categoria = document.getElementById('categoriaEstoqueAtual')?.value || 'todos';
                const status = document.getElementById('statusEstoqueAtual')?.value || 'todos';
                openResumo('estoque-atual', { categoria, status });
                return;
            }

            if (activeEstoqueTabId === 'movimentacao-tab') {
                const inicio = document.getElementById('dataInicioMovimentacao')?.value;
                const fim = document.getElementById('dataFimMovimentacao')?.value;
                if (!inicio || !fim) {
                    return Swal?.fire({ icon: 'warning', title: 'Informe o período para imprimir.' });
                }
                openResumo('estoque-movimentacao', { inicio, fim });
                return;
            }

            if (activeEstoqueTabId === 'validade-tab') {
                const dias = document.getElementById('periodoValidade')?.value || '30';
                openResumo('estoque-validade', { dias });
                return;
            }
        }

        Swal?.fire({ icon: 'info', title: 'Abra um relatório e selecione a aba antes de imprimir.' });
    };
    document.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".print-btn");
        if (!btn) return;
        ev.preventDefault();
        // chama a função que já monta a URL baseada na aba ativa e filtros selecionados
        window.imprimirRelatorio();
    });

    // =========================
    // Boot
    // =========================
    document.addEventListener("DOMContentLoaded", async () => {
        try {
            // defaults
            if (dataVendaDiaria) dataVendaDiaria.value = todayISO();

            // mensal defaults
            if (mesVendaMensal) mesVendaMensal.value = String(new Date().getMonth() + 1);
            if (anoVendaMensal) anoVendaMensal.value = String(new Date().getFullYear());

            // anual defaults
            if (anoVendaAnual) anoVendaAnual.value = String(new Date().getFullYear());

            // personalizado defaults (últimos 7 dias)
            if (dataInicioPers && dataFimPers) {
                const d = new Date();
                const fim = todayISO();
                const iniDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
                const ini = `${iniDate.getFullYear()}-${String(iniDate.getMonth() + 1).padStart(2, "0")}-${String(iniDate.getDate()).padStart(2, "0")}`;
                dataInicioPers.value = ini;
                dataFimPers.value = fim;
            }

            // mov estq defaults (últimos 7 dias)
            if (dataInicioMov && dataFimMov) {
                const d = new Date();
                const fim = todayISO();
                const iniDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
                const ini = `${iniDate.getFullYear()}-${String(iniDate.getMonth() + 1).padStart(2, "0")}-${String(iniDate.getDate()).padStart(2, "0")}`;
                dataInicioMov.value = ini;
                dataFimMov.value = fim;
            }

            await Promise.all([loadVendedores(), loadCategorias()]);

            // carregamentos iniciais para não ficar em branco
            await gerarDiario();           // Vendas diário
            await gerarEstoqueAtual();     // Estoque atual
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: "error", title: "Falha ao carregar relatórios", text: e.message || "Erro" });
        }
    });
})();
