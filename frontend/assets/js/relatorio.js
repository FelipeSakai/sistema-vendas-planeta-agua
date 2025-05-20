// Funcionalidades específicas para a página de relatórios
document.addEventListener('DOMContentLoaded', function () {
    // Elementos de relatórios
    const reportSelection = document.getElementById('reportSelection');
    const reportCards = document.querySelectorAll('.report-card');
    const vendasReport = document.getElementById('vendasReport');
    const estoqueReport = document.getElementById('estoqueReport');
    const voltarBtn = document.getElementById('voltarBtn');
    const voltarBtnEstoque = document.getElementById('voltarBtnEstoque');

    // Dados para os relatórios (simulação de banco de dados)
    const dadosVendas = {
        diario: {
            data: '15/05/2023',
            faturamento: 'R$ 1.580,00',
            totalVendas: 15,
            ticketMedio: 'R$ 105,33',
            clientesAtendidos: 12,
            produtos: [
                { nome: 'Galão 20L', quantidade: '25 unidades', valor: 'R$ 375,00' },
                { nome: 'Água Mineral 500ml', quantidade: '120 unidades', valor: 'R$ 300,00' },
                { nome: 'Água Mineral 1,5L', quantidade: '45 unidades', valor: 'R$ 225,00' },
                { nome: 'Suporte para Galão', quantidade: '8 unidades', valor: 'R$ 287,20' },
                { nome: 'Água Mineral com Gás 500ml', quantidade: '35 unidades', valor: 'R$ 122,50' },
                { nome: 'Bombona 5L', quantidade: '12 unidades', valor: 'R$ 270,00' }
            ],
            vendas: [
                { hora: '08:15', cliente: 'Maria Silva', produtos: 'Galão 20L (3x)', vendedor: 'Carlos Oliveira', pagamento: 'Dinheiro', valor: 'R$ 45,00' },
                { hora: '09:30', cliente: 'João Oliveira', produtos: 'Água Mineral 500ml (24x), Suporte para Galão (1x)', vendedor: 'Maria Silva', pagamento: 'Cartão de Crédito', valor: 'R$ 95,90' },
                { hora: '10:45', cliente: 'Ana Santos', produtos: 'Galão 20L (2x)', vendedor: 'Carlos Oliveira', pagamento: 'PIX', valor: 'R$ 30,00' },
                { hora: '11:20', cliente: 'Carlos Ferreira', produtos: 'Água Mineral 500ml (12x), Água Mineral 1,5L (6x)', vendedor: 'Maria Silva', pagamento: 'Dinheiro', valor: 'R$ 69,00' },
                { hora: '13:05', cliente: 'Juliana Costa', produtos: 'Galão 20L (5x), Suporte para Galão (1x)', vendedor: 'Carlos Oliveira', pagamento: 'Cartão de Débito', valor: 'R$ 110,90' },
                { hora: '14:30', cliente: 'Roberto Almeida', produtos: 'Bombona 5L (4x), Água Mineral 500ml (12x)', vendedor: 'Maria Silva', pagamento: 'PIX', valor: 'R$ 120,00' },
                { hora: '15:45', cliente: 'Fernanda Lima', produtos: 'Galão 20L (3x), Água com Gás 500ml (12x)', vendedor: 'Carlos Oliveira', pagamento: 'Cartão de Crédito', valor: 'R$ 87,00' },
                { hora: '16:20', cliente: 'Marcelo Santos', produtos: 'Bombona 5L (3x), Suporte para Galão (2x)', vendedor: 'Maria Silva', pagamento: 'Dinheiro', valor: 'R$ 139,80' }
            ]
        },
        mensal: {
            mes: 'Maio',
            ano: '2023',
            faturamento: 'R$ 45.780,00',
            totalVendas: 387,
            ticketMedio: 'R$ 118,29',
            novosClientes: 42,
            produtos: [
                { nome: 'Galão 20L', quantidade: '720 unidades', valor: 'R$ 10.800,00' },
                { nome: 'Água Mineral 500ml', quantidade: '3.450 unidades', valor: 'R$ 8.625,00' },
                { nome: 'Água Mineral 1,5L', quantidade: '1.250 unidades', valor: 'R$ 6.250,00' },
                { nome: 'Suporte para Galão', quantidade: '185 unidades', valor: 'R$ 6.641,50' },
                { nome: 'Água com Gás 500ml', quantidade: '980 unidades', valor: 'R$ 3.430,00' },
                { nome: 'Bombona 5L', quantidade: '450 unidades', valor: 'R$ 10.125,00' }
            ],
            dadosGrafico: {
                labels: ['01/05', '05/05', '10/05', '15/05', '20/05', '25/05', '30/05'],
                valores: [1250, 1680, 1450, 1580, 1720, 1890, 1750]
            }
        }
    };

    const dadosEstoque = {
        atual: {
            data: '15/05/2023',
            totalProdutos: 28,
            estoqueBaixo: 5,
            proximosVencer: 3,
            valorEstoque: 'R$ 32.450',
            produtos: [
                { produto: 'Água Mineral 500ml', categoria: 'Água Mineral', quantidade: '450 unidades', validade: '30/06/2024', status: 'Estoque Alto', statusClass: 'badge-high', valor: 'R$ 1.125,00' },
                { produto: 'Galão 20L', categoria: 'Galão', quantidade: '85 unidades', validade: 'N/A', status: 'Estoque Normal', statusClass: 'badge-medium', valor: 'R$ 1.275,00' },
                { produto: 'Água Mineral 1,5L', categoria: 'Água Mineral', quantidade: '120 unidades', validade: '15/07/2024', status: 'Estoque Normal', statusClass: 'badge-medium', valor: 'R$ 600,00' },
                { produto: 'Suporte para Galão', categoria: 'Acessório', quantidade: '12 unidades', validade: 'N/A', status: 'Estoque Baixo', statusClass: 'badge-low', valor: 'R$ 430,80' },
                { produto: 'Água Mineral com Gás 500ml', categoria: 'Água Mineral', quantidade: '85 unidades', validade: '10/06/2024', status: 'Estoque Baixo', statusClass: 'badge-low', valor: 'R$ 255,00' }
            ]
        },
        movimentacao: {
            dataInicio: '01/05/2023',
            dataFim: '15/05/2023',
            totalEntradas: '350 unidades',
            totalSaidas: '245 unidades',
            saldo: '+105 unidades',
            valorMovimentado: 'R$ 12.850',
            movimentacoes: [
                { data: '12/05/2023', produto: 'Água Mineral 500ml', tipo: 'Entrada', quantidade: '+200 unidades', responsavel: 'Maria Silva', valor: 'R$ 500,00' },
                { data: '10/05/2023', produto: 'Galão 20L', tipo: 'Saída', quantidade: '-15 unidades', responsavel: 'Carlos Oliveira', valor: 'R$ 225,00' },
                { data: '08/05/2023', produto: 'Água Mineral 1,5L', tipo: 'Entrada', quantidade: '+100 unidades', responsavel: 'Maria Silva', valor: 'R$ 500,00' },
                { data: '05/05/2023', produto: 'Suporte para Galão', tipo: 'Saída', quantidade: '-8 unidades', responsavel: 'Carlos Oliveira', valor: 'R$ 287,20' },
                { data: '03/05/2023', produto: 'Bombona 5L', tipo: 'Entrada', quantidade: '+50 unidades', responsavel: 'Maria Silva', valor: 'R$ 1.125,00' }
            ]
        },
        validade: {
            periodo: '30 dias',
            produtos: [
                { produto: 'Água Mineral 500ml', lote: 'AM500-052023', validade: '15/06/2023', diasRestantes: 30, quantidade: '120 unidades', status: 'Próximo a vencer' },
                { produto: 'Água Mineral com Gás 500ml', lote: 'AMG500-052023', validade: '10/06/2023', diasRestantes: 25, quantidade: '85 unidades', status: 'Próximo a vencer' },
                { produto: 'Água Mineral 1,5L', lote: 'AM15-052023', validade: '30/06/2023', diasRestantes: 45, quantidade: '50 unidades', status: 'Normal' }
            ]
        }
    };

    // Selecionar tipo de relatório
    if (reportCards) {
        reportCards.forEach(card => {
            card.addEventListener('click', () => {
                const reportType = card.getAttribute('data-report');

                if (reportSelection) {
                    reportSelection.style.display = 'none';
                }

                if (reportType === 'vendas' && vendasReport) {
                    vendasReport.style.display = 'block';
                    if (estoqueReport) estoqueReport.style.display = 'none';
                    initVendasCharts();
                    carregarDadosVendasDiario();
                } else if (reportType === 'estoque' && estoqueReport) {
                    estoqueReport.style.display = 'block';
                    if (vendasReport) vendasReport.style.display = 'none';
                    carregarDadosEstoqueAtual();
                }
            });
        });
    }

    // Voltar para seleção de relatórios
    if (voltarBtn) {
        voltarBtn.addEventListener('click', () => {
            if (vendasReport) vendasReport.style.display = 'none';
            if (reportSelection) reportSelection.style.display = '';
        });
    }

    if (voltarBtnEstoque) {
        voltarBtnEstoque.addEventListener('click', () => {
            if (estoqueReport) estoqueReport.style.display = 'none';
            if (reportSelection) reportSelection.style.display = '';
        });
    }

    // Carregar dados do relatório de vendas diário
    function carregarDadosVendasDiario() {
        const dados = dadosVendas.diario;

        // Atualizar resumo
        document.getElementById('dataRelatorio').textContent = dados.data;
        document.getElementById('faturamentoDia').textContent = dados.faturamento;
        document.getElementById('totalVendas').textContent = dados.totalVendas;
        document.getElementById('ticketMedio').textContent = dados.ticketMedio;
        document.getElementById('clientesAtendidos').textContent = dados.clientesAtendidos;
        document.getElementById('totalDiaVendas').textContent = dados.faturamento;
        document.getElementById('totalTabelaVendas').textContent = dados.faturamento;

        // Atualizar produtos vendidos
        const produtosContainer = document.getElementById('produtosVendidosContainer');
        if (produtosContainer) {
            produtosContainer.innerHTML = '';

            dados.produtos.forEach(produto => {
                const produtoItem = document.createElement('div');
                produtoItem.className = 'product-item';
                produtoItem.innerHTML = `
          <div class="product-info">
            <div class="product-name">${produto.nome}</div>
            <div class="product-quantity">${produto.quantidade}</div>
          </div>
          <div class="product-value">${produto.valor}</div>
        `;
                produtosContainer.appendChild(produtoItem);
            });
        }

        // Atualizar tabela de vendas
        const tabelaVendasBody = document.getElementById('tabelaVendasBody');
        if (tabelaVendasBody) {
            tabelaVendasBody.innerHTML = '';

            dados.vendas.forEach(venda => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${venda.hora}</td>
          <td>${venda.cliente}</td>
          <td>${venda.produtos}</td>
          <td>${venda.vendedor}</td>
          <td>${venda.pagamento}</td>
          <td class="text-end">${venda.valor}</td>
        `;
                tabelaVendasBody.appendChild(tr);
            });
        }
    }

    // Carregar dados do relatório de vendas mensal
    function carregarDadosVendasMensal() {
        const dados = dadosVendas.mensal;

        // Atualizar resumo
        document.getElementById('mesAnoRelatorio').textContent = `${dados.mes}/${dados.ano}`;
        document.getElementById('faturamentoMes').textContent = dados.faturamento;
        document.getElementById('totalVendasMes').textContent = dados.totalVendas;
        document.getElementById('ticketMedioMes').textContent = dados.ticketMedio;
        document.getElementById('novosClientesMes').textContent = dados.novosClientes;
        document.getElementById('totalProdutosMensal').textContent = dados.faturamento;

        // Atualizar tabela de produtos
        const tabelaProdutosMensalBody = document.getElementById('tabelaProdutosMensalBody');
        if (tabelaProdutosMensalBody) {
            tabelaProdutosMensalBody.innerHTML = '';

            dados.produtos.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${produto.nome}</td>
          <td>${produto.quantidade}</td>
          <td class="text-end">${produto.valor}</td>
        `;
                tabelaProdutosMensalBody.appendChild(tr);
            });
        }

        // Atualizar gráficos
        initVendasCharts();
    }

    // Carregar dados do relatório de estoque atual
    function carregarDadosEstoqueAtual() {
        const dados = dadosEstoque.atual;

        // Atualizar resumo
        document.getElementById('dataEstoqueAtual').textContent = dados.data;
        document.getElementById('totalProdutosEstoque').textContent = dados.totalProdutos;
        document.getElementById('estoqueBaixo').textContent = dados.estoqueBaixo;
        document.getElementById('proximosVencer').textContent = dados.proximosVencer;
        document.getElementById('valorEstoque').textContent = dados.valorEstoque;
        document.getElementById('totalValorEstoque').textContent = dados.valorEstoque;

        // Atualizar tabela de produtos
        const tabelaEstoqueBody = document.getElementById('tabelaEstoqueBody');
        if (tabelaEstoqueBody) {
            tabelaEstoqueBody.innerHTML = '';

            dados.produtos.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${produto.produto}</td>
          <td>${produto.categoria}</td>
          <td>${produto.quantidade}</td>
          <td>${produto.validade}</td>
          <td><span class="badge ${produto.statusClass} badge-status">${produto.status}</span></td>
          <td class="text-end">${produto.valor}</td>
        `;
                tabelaEstoqueBody.appendChild(tr);
            });
        }
    }

    // Carregar dados do relatório de movimentação de estoque
    function carregarDadosEstoqueMovimentacao() {
        const dados = dadosEstoque.movimentacao;

        // Atualizar resumo
        document.getElementById('periodoMovimentacao').textContent = `${dados.dataInicio} a ${dados.dataFim}`;
        document.getElementById('totalEntradas').textContent = dados.totalEntradas;
        document.getElementById('totalSaidas').textContent = dados.totalSaidas;
        document.getElementById('saldoMovimentacao').textContent = dados.saldo;
        document.getElementById('valorMovimentado').textContent = dados.valorMovimentado;

        // Atualizar tabela de movimentações
        const tabelaMovimentacaoBody = document.getElementById('tabelaMovimentacaoBody');
        if (tabelaMovimentacaoBody) {
            tabelaMovimentacaoBody.innerHTML = '';

            dados.movimentacoes.forEach(mov => {
                const tr = document.createElement('tr');
                const tipoClass = mov.tipo === 'Entrada' ? 'text-success' : 'text-danger';

                tr.innerHTML = `
          <td>${mov.data}</td>
          <td>${mov.produto}</td>
          <td class="${tipoClass}">${mov.tipo}</td>
          <td class="${tipoClass}">${mov.quantidade}</td>
          <td>${mov.responsavel}</td>
          <td class="text-end">${mov.valor}</td>
        `;
                tabelaMovimentacaoBody.appendChild(tr);
            });
        }
    }

    // Carregar dados do relatório de validade de produtos
    function carregarDadosEstoqueValidade() {
        const dados = dadosEstoque.validade;

        // Atualizar resumo
        document.getElementById('periodoValidadeTexto').textContent = `Próximos ${dados.periodo}`;

        // Atualizar tabela de produtos
        const tabelaValidadeBody = document.getElementById('tabelaValidadeBody');
        if (tabelaValidadeBody) {
            tabelaValidadeBody.innerHTML = '';

            dados.produtos.forEach(produto => {
                const tr = document.createElement('tr');
                const statusClass = produto.status === 'Próximo a vencer' ? 'badge-low' : 'badge-medium';

                tr.innerHTML = `
          <td>${produto.produto}</td>
          <td>${produto.lote}</td>
          <td>${produto.validade}</td>
          <td>${produto.diasRestantes}</td>
          <td>${produto.quantidade}</td>
          <td><span class="badge ${statusClass} badge-status">${produto.status}</span></td>
        `;
                tabelaValidadeBody.appendChild(tr);
            });
        }
    }

    // Inicializar gráficos de vendas
    function initVendasCharts() {
        // Gráfico de evolução de vendas mensais
        const vendasMensalCtx = document.getElementById('vendasMensalChart');
        if (vendasMensalCtx) {
            // Verificar se já existe um gráfico e destruí-lo
            if (vendasMensalCtx.chart) {
                vendasMensalCtx.chart.destroy();
            }

            const dados = dadosVendas.mensal.dadosGrafico;

            vendasMensalCtx.chart = new Chart(vendasMensalCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: dados.labels,
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: dados.valores,
                        borderColor: '#1e88e5',
                        backgroundColor: 'rgba(30, 136, 229, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return 'R$ ' + value;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de produtos mais vendidos no mês
        const produtosMensalCtx = document.getElementById('produtosMensalChart');
        if (produtosMensalCtx) {
            // Verificar se já existe um gráfico e destruí-lo
            if (produtosMensalCtx.chart) {
                produtosMensalCtx.chart.destroy();
            }

            const produtos = dadosVendas.mensal.produtos;
            const labels = produtos.map(p => p.nome);
            const valores = produtos.map(p => parseFloat(p.valor.replace('R$ ', '').replace('.', '').replace(',', '.')));

            produtosMensalCtx.chart = new Chart(produtosMensalCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: valores,
                        backgroundColor: [
                            '#1e88e5',
                            '#26c6da',
                            '#66bb6a',
                            '#ffa726',
                            '#ef5350',
                            '#ab47bc'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
    }

    // Eventos para botões de geração de relatório
    const gerarRelatorioDiario = document.getElementById('gerarRelatorioDiario');
    const Swal = window.Swal; // Declare the Swal variable here
    if (gerarRelatorioDiario) {
        gerarRelatorioDiario.addEventListener('click', () => {
            const data = document.getElementById('dataVendaDiaria').value;
            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório diário gerado para ${formatarData(data)}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
            carregarDadosVendasDiario();
        });
    }

    const gerarRelatorioMensal = document.getElementById('gerarRelatorioMensal');
    if (gerarRelatorioMensal) {
        gerarRelatorioMensal.addEventListener('click', () => {
            const mes = document.getElementById('mesVendaMensal').value;
            const ano = document.getElementById('anoVendaMensal').value;
            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório mensal gerado para ${getNomeMes(mes)}/${ano}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
            carregarDadosVendasMensal();
        });
    }

    const gerarRelatorioAnual = document.getElementById('gerarRelatorioAnual');
    if (gerarRelatorioAnual) {
        gerarRelatorioAnual.addEventListener('click', () => {
            const ano = document.getElementById('anoVendaAnual').value;
            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório anual gerado para ${ano}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
        });
    }

    const gerarRelatorioPersonalizado = document.getElementById('gerarRelatorioPersonalizado');
    if (gerarRelatorioPersonalizado) {
        gerarRelatorioPersonalizado.addEventListener('click', () => {
            const dataInicio = document.getElementById('dataInicio').value;
            const dataFim = document.getElementById('dataFim').value;

            if (!dataInicio || !dataFim) {
                Swal.fire({
                    title: 'Atenção',
                    text: 'Por favor, selecione as datas inicial e final',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório personalizado gerado de ${formatarData(dataInicio)} até ${formatarData(dataFim)}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
        });
    }

    const gerarRelatorioEstoqueAtual = document.getElementById('gerarRelatorioEstoqueAtual');
    if (gerarRelatorioEstoqueAtual) {
        gerarRelatorioEstoqueAtual.addEventListener('click', () => {
            const categoria = document.getElementById('categoriaEstoqueAtual').value;
            const status = document.getElementById('statusEstoqueAtual').value;

            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório de estoque atual gerado com sucesso`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            carregarDadosEstoqueAtual();
        });
    }

    const gerarRelatorioMovimentacao = document.getElementById('gerarRelatorioMovimentacao');
    if (gerarRelatorioMovimentacao) {
        gerarRelatorioMovimentacao.addEventListener('click', () => {
            const dataInicio = document.getElementById('dataInicioMovimentacao').value;
            const dataFim = document.getElementById('dataFimMovimentacao').value;

            if (!dataInicio || !dataFim) {
                Swal.fire({
                    title: 'Atenção',
                    text: 'Por favor, selecione as datas inicial e final',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório de movimentação gerado de ${formatarData(dataInicio)} até ${formatarData(dataFim)}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            carregarDadosEstoqueMovimentacao();
        });
    }

    const gerarRelatorioValidade = document.getElementById('gerarRelatorioValidade');
    if (gerarRelatorioValidade) {
        gerarRelatorioValidade.addEventListener('click', () => {
            const periodo = document.getElementById('periodoValidade').value;

            Swal.fire({
                title: 'Relatório Gerado',
                text: `Relatório de validade gerado com sucesso`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            carregarDadosEstoqueValidade();
        });
    }

    // Configurar tabs
    const tabGroups = document.querySelectorAll('.nav-tabs');

    tabGroups.forEach(tabGroup => {
        const tabLinks = tabGroup.querySelectorAll('.nav-link');
        tabLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                // Remover classe active de todas as tabs do grupo
                tabLinks.forEach(tab => tab.classList.remove('active'));

                // Adicionar classe active à tab clicada
                this.classList.add('active');

                // Mostrar conteúdo da tab
                const tabId = this.getAttribute('href').substring(1);
                const tabContent = document.getElementById(tabId);

                // Esconder todos os painéis do mesmo grupo
                const tabPanes = tabContent.parentElement.querySelectorAll('.tab-pane');
                tabPanes.forEach(pane => pane.classList.remove('show', 'active'));

                // Mostrar o painel selecionado
                tabContent.classList.add('show', 'active');

                // Carregar dados específicos
                if (tabId === 'mensal') {
                    carregarDadosVendasMensal();
                } else if (tabId === 'movimentacao') {
                    carregarDadosEstoqueMovimentacao();
                } else if (tabId === 'validade') {
                    carregarDadosEstoqueValidade();
                }
            });
        });
    });


    // Função para imprimir relatório
    window.imprimirRelatorio = function () {
        Swal.fire({
            title: 'Imprimindo...',
            text: 'O relatório está sendo enviado para impressão',
            icon: 'info',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.print();
        });
    };

    // Funções auxiliares
    function formatarData(dataISO) {
        if (!dataISO) return '';
        const data = new Date(dataISO);
        return data.toLocaleDateString('pt-BR');
    }

    function getNomeMes(mes) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return meses[parseInt(mes) - 1];
    }

    // Inicializar a página com os relatórios ocultos
    if (vendasReport) vendasReport.style.display = 'none';
    if (estoqueReport) estoqueReport.style.display = 'none';

    // Corrigir o texto "Planeta Água" apenas na página de relatórios
    const sidebarHeaders = document.querySelectorAll('.sidebar-header h4');
    sidebarHeaders.forEach(header => {
        if (header.textContent.includes('Planeta Agua') || header.textContent.includes('Planeta agua')) {
            header.textContent = 'Planeta Água'; // Corrige o texto com o acento correto
        }
    });
});