document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const formDespesa = document.getElementById('formDespesa');
    const listaDespesas = document.getElementById('listaDespesas');
    const btnFiltrarDespesas = document.getElementById('btnFiltrarDespesas');
    const btnExportarDespesas = document.getElementById('btnExportarDespesas');
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    const btnSalvarEdicaoDespesa = document.getElementById('btnSalvarEdicaoDespesa');
    
    // Elementos de filtro
    const filtroMes = document.getElementById('filtroMes');
    const filtroAno = document.getElementById('filtroAno');
    const filtroCategoria = document.getElementById('filtroCategoria');
    
    // Elementos de estatísticas
    const totalDespesasMes = document.getElementById('totalDespesasMes');
    const totalReceitasMes = document.getElementById('totalReceitasMes');
    const balancoMes = document.getElementById('balancoMes');
    const totalDespesasTabela = document.getElementById('totalDespesasTabela');
    
    // Modal de edição
    const editarDespesaModal = new bootstrap.Modal(document.getElementById('editarDespesaModal'));
    
    // Inicialização
    inicializar();
    
    // Função de inicialização
    function inicializar() {
        // Definir data atual no campo de data
        const dataAtual = new Date().toISOString().split('T')[0];
        document.getElementById('dataDespesa').value = dataAtual;
        
        // Definir mês e ano atuais nos filtros
        const dataHoje = new Date();
        filtroMes.value = dataHoje.getMonth() + 1;
        filtroAno.value = dataHoje.getFullYear();
        
        // Carregar despesas
        carregarDespesas();
        
        // Atualizar estatísticas
        atualizarEstatisticas();
    }
    
    // Evento para salvar nova despesa
    formDespesa.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Obter dados do formulário
        const descricao = document.getElementById('descricaoDespesa').value;
        const valor = parseFloat(document.getElementById('valorDespesa').value);
        const data = document.getElementById('dataDespesa').value;
        const categoria = document.getElementById('categoriaDespesa').value;
        const formaPagamento = document.getElementById('formaPagamento').value;
        const responsavel = document.getElementById('responsavelDespesa').value;
        const observacao = document.getElementById('observacaoDespesa').value;
        
        // Criar objeto despesa
        const despesa = {
            id: Date.now().toString(),
            descricao,
            valor,
            data,
            categoria,
            formaPagamento,
            responsavel,
            observacao
        };
        
        // Salvar despesa
        salvarDespesa(despesa);
        
        // Limpar formulário
        formDespesa.reset();
        document.getElementById('dataDespesa').value = new Date().toISOString().split('T')[0];
        
        // Recarregar despesas
        carregarDespesas();
        
        // Atualizar estatísticas
        atualizarEstatisticas();
        
        // Notificação de sucesso
        Swal.fire({
            icon: 'success',
            title: 'Despesa Registrada',
            text: 'A despesa foi registrada com sucesso!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    });
    
    // Evento para filtrar despesas
    btnFiltrarDespesas.addEventListener('click', function() {
        carregarDespesas();
    });
    
    // Evento para exportar despesas
    btnExportarDespesas.addEventListener('click', function() {
        exportarDespesas();
    });
    
    // Evento para gerar relatório
    btnGerarRelatorio.addEventListener('click', function() {
        gerarRelatorioFinanceiro();
    });
    
    // Evento para salvar edição de despesa
    btnSalvarEdicaoDespesa.addEventListener('click', function() {
        salvarEdicaoDespesa();
    });
    
    // Função para salvar despesa
    function salvarDespesa(despesa) {
        // Carregar despesas existentes
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Adicionar nova despesa
        despesas.push(despesa);
        
        // Salvar no localStorage
        localStorage.setItem('despesas', JSON.stringify(despesas));
    }
    
    // Função para carregar despesas
    function carregarDespesas() {
        // Obter filtros
        const mes = parseInt(filtroMes.value);
        const ano = parseInt(filtroAno.value);
        const categoria = filtroCategoria.value;
        
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Filtrar despesas
        let despesasFiltradas = despesas.filter(despesa => {
            const dataDespesa = new Date(despesa.data);
            return dataDespesa.getMonth() + 1 === mes && dataDespesa.getFullYear() === ano;
        });
        
        if (categoria !== 'todas') {
            despesasFiltradas = despesasFiltradas.filter(despesa => despesa.categoria === categoria);
        }
        
        // Ordenar despesas por data (mais recentes primeiro)
        despesasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        // Limpar lista
        listaDespesas.innerHTML = '';
        
        // Verificar se há despesas
        if (despesasFiltradas.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="7" class="text-center">Nenhuma despesa encontrada para o período selecionado.</td>';
            listaDespesas.appendChild(tr);
            totalDespesasTabela.textContent = 'R$ 0,00';
            return;
        }
        
        // Calcular total
        const totalDespesas = despesasFiltradas.reduce((total, despesa) => total + despesa.valor, 0);
        totalDespesasTabela.textContent = `R$ ${totalDespesas.toFixed(2)}`;
        
        // Adicionar despesas à lista
        despesasFiltradas.forEach(despesa => {
            const tr = document.createElement('tr');
            
            // Formatar data
            const data = new Date(despesa.data);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            
            // Formatar categoria
            const categoriaFormatada = formatarCategoria(despesa.categoria);
            const categoriaClasse = `categoria-${despesa.categoria}`;
            
            // Formatar forma de pagamento
            const formaPagamentoFormatada = formatarFormaPagamento(despesa.formaPagamento);
            
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${despesa.descricao}</td>
                <td><span class="categoria-badge ${categoriaClasse}">${categoriaFormatada}</span></td>
                <td>R$ ${despesa.valor.toFixed(2)}</td>
                <td>${formaPagamentoFormatada}</td>
                <td>${despesa.responsavel}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary btn-action btn-editar-despesa" data-id="${despesa.id}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action btn-excluir-despesa" data-id="${despesa.id}" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            listaDespesas.appendChild(tr);
        });
        
        // Adicionar eventos aos botões de editar
        document.querySelectorAll('.btn-editar-despesa').forEach(btn => {
            btn.addEventListener('click', function() {
                const despesaId = this.getAttribute('data-id');
                editarDespesa(despesaId);
            });
        });
        
        // Adicionar eventos aos botões de excluir
        document.querySelectorAll('.btn-excluir-despesa').forEach(btn => {
            btn.addEventListener('click', function() {
                const despesaId = this.getAttribute('data-id');
                excluirDespesa(despesaId);
            });
        });
    }
    
    // Função para editar despesa
    function editarDespesa(despesaId) {
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Encontrar despesa
        const despesa = despesas.find(d => d.id === despesaId);
        
        if (despesa) {
            // Preencher formulário de edição
            document.getElementById('editarDespesaId').value = despesa.id;
            document.getElementById('editarDescricaoDespesa').value = despesa.descricao;
            document.getElementById('editarValorDespesa').value = despesa.valor;
            document.getElementById('editarDataDespesa').value = despesa.data;
            document.getElementById('editarCategoriaDespesa').value = despesa.categoria;
            document.getElementById('editarFormaPagamento').value = despesa.formaPagamento;
            document.getElementById('editarResponsavelDespesa').value = despesa.responsavel;
            document.getElementById('editarObservacaoDespesa').value = despesa.observacao || '';
            
            // Abrir modal
            editarDespesaModal.show();
        }
    }
    
    // Função para salvar edição de despesa
    function salvarEdicaoDespesa() {
        // Obter dados do formulário
        const id = document.getElementById('editarDespesaId').value;
        const descricao = document.getElementById('editarDescricaoDespesa').value;
        const valor = parseFloat(document.getElementById('editarValorDespesa').value);
        const data = document.getElementById('editarDataDespesa').value;
        const categoria = document.getElementById('editarCategoriaDespesa').value;
        const formaPagamento = document.getElementById('editarFormaPagamento').value;
        const responsavel = document.getElementById('editarResponsavelDespesa').value;
        const observacao = document.getElementById('editarObservacaoDespesa').value;
        
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Encontrar índice da despesa
        const index = despesas.findIndex(d => d.id === id);
        
        if (index !== -1) {
            // Atualizar despesa
            despesas[index] = {
                id,
                descricao,
                valor,
                data,
                categoria,
                formaPagamento,
                responsavel,
                observacao
            };
            
            // Salvar no localStorage
            localStorage.setItem('despesas', JSON.stringify(despesas));
            
            // Fechar modal
            editarDespesaModal.hide();
            
            // Recarregar despesas
            carregarDespesas();
            
            // Atualizar estatísticas
            atualizarEstatisticas();
            
            // Notificação de sucesso
            Swal.fire({
                icon: 'success',
                title: 'Despesa Atualizada',
                text: 'A despesa foi atualizada com sucesso!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    }
    
    // Função para excluir despesa
    function excluirDespesa(despesaId) {
        // Confirmar exclusão
        Swal.fire({
            icon: 'warning',
            title: 'Excluir Despesa',
            text: 'Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                // Carregar despesas do localStorage
                let despesas = [];
                const despesasStorage = localStorage.getItem('despesas');
                
                if (despesasStorage) {
                    despesas = JSON.parse(despesasStorage);
                }
                
                // Remover despesa
                despesas = despesas.filter(d => d.id !== despesaId);
                
                // Salvar no localStorage
                localStorage.setItem('despesas', JSON.stringify(despesas));
                
                // Recarregar despesas
                carregarDespesas();
                
                // Atualizar estatísticas
                atualizarEstatisticas();
                
                // Notificação de sucesso
                Swal.fire({
                    icon: 'success',
                    title: 'Despesa Excluída',
                    text: 'A despesa foi excluída com sucesso.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        });
    }
    
    // Função para atualizar estatísticas
    function atualizarEstatisticas() {
        // Obter mês e ano atuais
        const dataHoje = new Date();
        const mesAtual = dataHoje.getMonth() + 1;
        const anoAtual = dataHoje.getFullYear();
        
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Filtrar despesas do mês atual
        const despesasMesAtual = despesas.filter(despesa => {
            const dataDespesa = new Date(despesa.data);
            return dataDespesa.getMonth() + 1 === mesAtual && dataDespesa.getFullYear() === anoAtual;
        });
        
        // Calcular total de despesas do mês
        const totalDespesas = despesasMesAtual.reduce((total, despesa) => total + despesa.valor, 0);
        
        // Carregar vendas do localStorage (simulação)
        let vendas = [];
        const vendasStorage = localStorage.getItem('vendas');
        
        if (vendasStorage) {
            vendas = JSON.parse(vendasStorage);
        }
        
        // Filtrar vendas do mês atual
        const vendasMesAtual = vendas.filter(venda => {
            const dataVenda = new Date(venda.data);
            return dataVenda.getMonth() + 1 === mesAtual && dataVenda.getFullYear() === anoAtual;
        });
        
        // Calcular total de receitas do mês
        const totalReceitas = vendasMesAtual.reduce((total, venda) => total + venda.valorTotal, 0);
        
        // Calcular balanço
        const balanco = totalReceitas - totalDespesas;
        
        // Atualizar elementos na tela
        totalDespesasMes.textContent = `R$ ${totalDespesas.toFixed(2)}`;
        totalReceitasMes.textContent = `R$ ${totalReceitas.toFixed(2)}`;
        
        // Definir cor do balanço
        if (balanco >= 0) {
            balancoMes.textContent = `R$ ${balanco.toFixed(2)}`;
            balancoMes.classList.remove('text-danger');
            balancoMes.classList.add('text-success');
        } else {
            balancoMes.textContent = `R$ ${Math.abs(balanco).toFixed(2)}`;
            balancoMes.classList.remove('text-success');
            balancoMes.classList.add('text-danger');
        }
    }
    
    // Função para gerar relatório financeiro
    function gerarRelatorioFinanceiro() {
        // Obter mês e ano selecionados
        const mes = parseInt(filtroMes.value);
        const ano = parseInt(filtroAno.value);
        
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Filtrar despesas do período selecionado
        const despesasPeriodo = despesas.filter(despesa => {
            const dataDespesa = new Date(despesa.data);
            return dataDespesa.getMonth() + 1 === mes && dataDespesa.getFullYear() === ano;
        });
        
        // Carregar vendas do localStorage (simulação)
        let vendas = [];
        const vendasStorage = localStorage.getItem('vendas');
        
        if (vendasStorage) {
            vendas = JSON.parse(vendasStorage);
        }
        
        // Filtrar vendas do período selecionado
        const vendasPeriodo = vendas.filter(venda => {
            const dataVenda = new Date(venda.data);
            return dataVenda.getMonth() + 1 === mes && dataVenda.getFullYear() === ano;
        });
        
        // Gerar gráfico de despesas por categoria
        gerarGraficoDespesasPorCategoria(despesasPeriodo);
        
        // Gerar gráfico de receitas x despesas
        gerarGraficoReceitasDespesas(vendasPeriodo, despesasPeriodo);
        
        // Gerar gráfico de evolução financeira
        gerarGraficoEvolucaoFinanceira(vendasPeriodo, despesasPeriodo);
        
        // Notificação de sucesso
        Swal.fire({
            icon: 'success',
            title: 'Relatório Gerado',
            text: 'O relatório financeiro foi gerado com sucesso!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
    
    // Função para gerar gráfico de despesas por categoria
    function gerarGraficoDespesasPorCategoria(despesas) {
        const canvas = document.getElementById('despesasCategoriaChart');
        
        if (!canvas) return;
        
        // Limpar gráfico existente
        if (window.despesasCategoriaChart) {
            window.despesasCategoriaChart.destroy();
        }
        
        // Agrupar despesas por categoria
        const categorias = {};
        
        despesas.forEach(despesa => {
            if (!categorias[despesa.categoria]) {
                categorias[despesa.categoria] = 0;
            }
            
            categorias[despesa.categoria] += despesa.valor;
        });
        
        // Preparar dados para o gráfico
        const labels = [];
        const data = [];
        const backgroundColors = [];
        
        for (const categoria in categorias) {
            labels.push(formatarCategoria(categoria));
            data.push(categorias[categoria]);
            backgroundColors.push(obterCorCategoria(categoria));
        }
        
        // Criar gráfico
        const ctx = canvas.getContext('2d');
        window.despesasCategoriaChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `R$ ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Função para gerar gráfico de receitas x despesas
    function gerarGraficoReceitasDespesas(vendas, despesas) {
        const canvas = document.getElementById('receitasDespesasChart');
        
        if (!canvas) return;
        
        // Limpar gráfico existente
        if (window.receitasDespesasChart) {
            window.receitasDespesasChart.destroy();
        }
        
        // Calcular totais
        const totalReceitas = vendas.reduce((total, venda) => total + venda.valorTotal, 0);
        const totalDespesas = despesas.reduce((total, despesa) => total + despesa.valor, 0);
        const lucro = totalReceitas - totalDespesas;
        
        // Criar gráfico
        const ctx = canvas.getContext('2d');
        window.receitasDespesasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas', 'Lucro'],
                datasets: [{
                    label: 'Valor (R$)',
                    data: [totalReceitas, totalDespesas, lucro],
                    backgroundColor: [
                        'rgba(46, 125, 50, 0.7)',
                        'rgba(211, 47, 47, 0.7)',
                        lucro >= 0 ? 'rgba(30, 136, 229, 0.7)' : 'rgba(255, 152, 0, 0.7)'
                    ],
                    borderColor: [
                        'rgb(46, 125, 50)',
                        'rgb(211, 47, 47)',
                        lucro >= 0 ? 'rgb(30, 136, 229)' : 'rgb(255, 152, 0)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `R$ ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Função para gerar gráfico de evolução financeira
    function gerarGraficoEvolucaoFinanceira(vendas, despesas) {
        const canvas = document.getElementById('evolucaoFinanceiraChart');
        
        if (!canvas) return;
        
        // Limpar gráfico existente
        if (window.evolucaoFinanceiraChart) {
            window.evolucaoFinanceiraChart.destroy();
        }
        
        // Obter mês e ano selecionados
        const mes = parseInt(filtroMes.value);
        const ano = parseInt(filtroAno.value);
        
        // Obter número de dias no mês
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        // Preparar dados para o gráfico
        const labels = [];
        const receitasDiarias = Array(diasNoMes).fill(0);
        const despesasDiarias = Array(diasNoMes).fill(0);
        const saldoDiario = Array(diasNoMes).fill(0);
        
        // Preencher labels com os dias do mês
        for (let i = 1; i <= diasNoMes; i++) {
            labels.push(i);
        }
        
        // Calcular receitas diárias
        vendas.forEach(venda => {
            const dataVenda = new Date(venda.data);
            const dia = dataVenda.getDate();
            receitasDiarias[dia - 1] += venda.valorTotal;
        });
        
        // Calcular despesas diárias
        despesas.forEach(despesa => {
            const dataDespesa = new Date(despesa.data);
            const dia = dataDespesa.getDate();
            despesasDiarias[dia - 1] += despesa.valor;
        });
        
        // Calcular saldo diário acumulado
        let saldoAcumulado = 0;
        for (let i = 0; i < diasNoMes; i++) {
            saldoAcumulado += receitasDiarias[i] - despesasDiarias[i];
            saldoDiario[i] = saldoAcumulado;
        }
        
        // Criar gráfico
        const ctx = canvas.getContext('2d');
        window.evolucaoFinanceiraChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receitas',
                        data: receitasDiarias,
                        borderColor: 'rgb(46, 125, 50)',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Despesas',
                        data: despesasDiarias,
                        borderColor: 'rgb(211, 47, 47)',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Saldo Acumulado',
                        data: saldoDiario,
                        borderColor: 'rgb(30, 136, 229)',
                        backgroundColor: 'rgba(30, 136, 229, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Dia do Mês'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `${context.dataset.label}: R$ ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Função para exportar despesas
    function exportarDespesas() {
        // Obter filtros
        const mes = parseInt(filtroMes.value);
        const ano = parseInt(filtroAno.value);
        const categoria = filtroCategoria.value;
        
        // Carregar despesas do localStorage
        let despesas = [];
        const despesasStorage = localStorage.getItem('despesas');
        
        if (despesasStorage) {
            despesas = JSON.parse(despesasStorage);
        }
        
        // Filtrar despesas
        let despesasFiltradas = despesas.filter(despesa => {
            const dataDespesa = new Date(despesa.data);
            return dataDespesa.getMonth() + 1 === mes && dataDespesa.getFullYear() === ano;
        });
        
        if (categoria !== 'todas') {
            despesasFiltradas = despesasFiltradas.filter(despesa => despesa.categoria === categoria);
        }
        
        // Verificar se há despesas
        if (despesasFiltradas.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sem Dados',
                text: 'Não há despesas para exportar com os filtros selecionados.',
                confirmButtonColor: '#1e88e5'
            });
            return;
        }
        
        // Formatar dados para CSV
        let csvContent = 'Data,Descrição,Categoria,Valor,Forma de Pagamento,Responsável,Observação\n';
        
        despesasFiltradas.forEach(despesa => {
            const dataFormatada = new Date(despesa.data).toLocaleDateString('pt-BR');
            const categoriaFormatada = formatarCategoria(despesa.categoria);
            const formaPagamentoFormatada = formatarFormaPagamento(despesa.formaPagamento);
            
            // Escapar campos com vírgulas
            const descricao = `"${despesa.descricao.replace(/"/g, '""')}"`;
            const observacao = despesa.observacao ? `"${despesa.observacao.replace(/"/g, '""')}"` : '';
            
            csvContent += `${dataFormatada},${descricao},${categoriaFormatada},${despesa.valor.toFixed(2)},${formaPagamentoFormatada},${despesa.responsavel},${observacao}\n`;
        });
        
        // Criar blob e link para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Formatar nome do arquivo
        const nomeMes = obterNomeMes(mes);
        const nomeArquivo = `despesas_${nomeMes.toLowerCase()}_${ano}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Notificação de sucesso
        Swal.fire({
            icon: 'success',
            title: 'Exportação Concluída',
            text: `As despesas foram exportadas para o arquivo ${nomeArquivo}`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
    
    // Função para formatar categoria
    function formatarCategoria(categoria) {
        switch (categoria) {
            case 'combustivel':
                return 'Combustível';
            case 'salarios':
                return 'Salários';
            case 'aluguel':
                return 'Aluguel';
            case 'energia':
                return 'Energia Elétrica';
            case 'agua':
                return 'Água';
            case 'internet':
                return 'Internet/Telefone';
            case 'manutencao':
                return 'Manutenção';
            case 'impostos':
                return 'Impostos';
            case 'fornecedores':
                return 'Fornecedores';
            case 'outros':
                return 'Outros';
            default:
                return categoria;
        }
    }
    
    // Função para formatar forma de pagamento
    function formatarFormaPagamento(formaPagamento) {
        switch (formaPagamento) {
            case 'dinheiro':
                return 'Dinheiro';
            case 'pix':
                return 'PIX';
            case 'debito':
                return 'Cartão de Débito';
            case 'credito':
                return 'Cartão de Crédito';
            case 'transferencia':
                return 'Transferência Bancária';
            case 'boleto':
                return 'Boleto';
            default:
                return formaPagamento;
        }
    }
    
    // Função para obter cor da categoria
    function obterCorCategoria(categoria) {
        switch (categoria) {
            case 'combustivel':
                return '#ff9800';
            case 'salarios':
                return '#e91e63';
            case 'aluguel':
                return '#9c27b0';
            case 'energia':
                return '#f44336';
            case 'agua':
                return '#2196f3';
            case 'internet':
                return '#00bcd4';
            case 'manutencao':
                return '#795548';
            case 'impostos':
                return '#607d8b';
            case 'fornecedores':
                return '#3f51b5';
            case 'outros':
                return '#757575';
            default:
                return '#1e88e5';
        }
    }
    
    // Função para obter nome do mês
    function obterNomeMes(mes) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        return meses[mes - 1];
    }
    
    // Simular dados de vendas para demonstração
    function simularDadosVendas() {
        // Verificar se já existem vendas
        if (localStorage.getItem('vendas')) {
            return;
        }
        
        // Criar vendas simuladas
        const vendas = [];
        const dataAtual = new Date();
        const mesAtual = dataAtual.getMonth();
        const anoAtual = dataAtual.getFullYear();
        
        // Gerar vendas para o mês atual
        for (let i = 1; i <= 30; i++) {
            // Pular alguns dias para simular dias sem vendas
            if (i % 7 === 0) continue;
            
            // Número aleatório de vendas por dia (1 a 5)
            const numVendas = Math.floor(Math.random() * 5) + 1;
            
            for (let j = 0; j < numVendas; j++) {
                const data = new Date(anoAtual, mesAtual, i);
                const valorTotal = Math.random() * 500 + 50; // Valor entre 50 e 550
                
                vendas.push({
                    id: `venda_${i}_${j}`,
                    data: data.toISOString().split('T')[0],
                    cliente: `Cliente ${Math.floor(Math.random() * 20) + 1}`,
                    valorTotal: valorTotal,
                    itens: [
                        {
                            produto: 'Água Mineral 20L',
                            quantidade: Math.floor(Math.random() * 5) + 1,
                            valorUnitario: 15.0
                        },
                        {
                            produto: 'Galão 5L',
                            quantidade: Math.floor(Math.random() * 3) + 1,
                            valorUnitario: 8.5
                        }
                    ],
                    formaPagamento: ['dinheiro', 'pix', 'credito', 'debito'][Math.floor(Math.random() * 4)]
                });
            }
        }
        
        // Salvar vendas no localStorage
        localStorage.setItem('vendas', JSON.stringify(vendas));
    }
    
    // Iniciar simulação de dados
    simularDadosVendas();
});