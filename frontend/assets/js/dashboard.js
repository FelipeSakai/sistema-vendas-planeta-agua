// Funcionalidades específicas para o dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM - Modais
  const finalizarVendaModal = new bootstrap.Modal(document.getElementById('finalizarVendaModal'));
  const cancelarVendaModal = new bootstrap.Modal(document.getElementById('cancelarVendaModal'));
  const detalhesVendaModal = new bootstrap.Modal(document.getElementById('detalhesVendaModal'));
  
  // Elementos do DOM - Filtros
  const filtroPeriodo = document.getElementById('filtroPeriodo');
  const periodoPesonalizado = document.getElementById('periodoPesonalizado');
  const btnLimparFiltros = document.getElementById('btnLimparFiltros');
  const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
  
  // Elementos do DOM - Botões de ação
  const btnFinalizarVenda = document.querySelectorAll('.btn-finalizar-venda');
  const btnEditarVenda = document.querySelectorAll('.btn-editar-venda');
  const btnCancelarVenda = document.querySelectorAll('.btn-cancelar-venda');
  const btnViewVenda = document.querySelectorAll('.btn-view-venda');
  const btnPrintVenda = document.querySelectorAll('.btn-print-venda');
  
  // Elementos do DOM - Confirmação
  const btnConfirmarFinalizacao = document.getElementById('btnConfirmarFinalizacao');
  const btnConfirmarCancelamento = document.getElementById('btnConfirmarCancelamento');
  const motivoCancelamento = document.getElementById('motivoCancelamento');
  const outroMotivoCancelamento = document.getElementById('outroMotivoCancelamento');
  
  // Elementos do DOM - Finalizar Venda
  const valorRecebidoFinalizar = document.getElementById('valorRecebidoFinalizar');
  const trocoFinalizarVenda = document.getElementById('trocoFinalizarVenda');
  
  // Evento para mostrar/ocultar período personalizado
  if (filtroPeriodo) {
    filtroPeriodo.addEventListener('change', function() {
      if (this.value === 'personalizado') {
        periodoPesonalizado.style.display = 'flex';
      } else {
        periodoPesonalizado.style.display = 'none';
      }
    });
  }
  
  // Evento para limpar filtros
  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener('click', function() {
      document.getElementById('filtroStatus').value = 'todos';
      document.getElementById('filtroPeriodo').value = 'hoje';
      document.getElementById('filtroCliente').value = '';
      document.getElementById('filtroMotorista').value = 'todos';
      periodoPesonalizado.style.display = 'none';
      
      // Limpar datas se estiverem preenchidas
      if (document.getElementById('dataInicio')) {
        document.getElementById('dataInicio').value = '';
      }
      if (document.getElementById('dataFim')) {
        document.getElementById('dataFim').value = '';
      }
      
      // Notificação de filtros limpos
      Swal.fire({
        icon: 'success',
        title: 'Filtros Limpos',
        text: 'Todos os filtros foram redefinidos.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    });
  }
  
  // Evento para aplicar filtros
  if (btnAplicarFiltros) {
    btnAplicarFiltros.addEventListener('click', function() {
      // Obter valores dos filtros
      const status = document.getElementById('filtroStatus').value;
      const periodo = document.getElementById('filtroPeriodo').value;
      const cliente = document.getElementById('filtroCliente').value;
      const motorista = document.getElementById('filtroMotorista').value;
      
      // Obter datas personalizadas se aplicável
      let dataInicio = '';
      let dataFim = '';
      if (periodo === 'personalizado') {
        dataInicio = document.getElementById('dataInicio').value;
        dataFim = document.getElementById('dataFim').value;
        
        if (!dataInicio || !dataFim) {
          Swal.fire({
            icon: 'warning',
            title: 'Datas Incompletas',
            text: 'Por favor, preencha as datas inicial e final para o período personalizado.',
            confirmButtonColor: '#1e88e5'
          });
          return;
        }
      }
      
      // Simular aplicação de filtros
      console.log('Filtros aplicados:', { status, periodo, cliente, motorista, dataInicio, dataFim });
      
      // Em uma aplicação real, você faria uma requisição ao servidor com esses filtros
      // e atualizaria a tabela com os resultados
      
      // Notificação de filtros aplicados
      Swal.fire({
        icon: 'success',
        title: 'Filtros Aplicados',
        text: 'Os resultados foram atualizados conforme os filtros selecionados.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    });
  }
  
  // Evento para mostrar modal de finalização de venda
  btnFinalizarVenda.forEach(btn => {
    btn.addEventListener('click', function() {
      const vendaId = this.getAttribute('data-id');
      
      // Atualizar título do modal
      document.getElementById('finalizarVendaModalLabel').textContent = `Finalizar Venda #${vendaId}`;
      
      // Simular carregamento de dados da venda
      // Em uma aplicação real, você buscaria esses dados do servidor
      let clienteNome = 'Cliente não encontrado';
      let totalVenda = 'R$ 0,00';
      let formaPagamento = 'Não definida';
      
      // Encontrar a linha da tabela correspondente à venda
      const tr = this.closest('tr');
      if (tr) {
        clienteNome = tr.cells[2].textContent;
        totalVenda = tr.cells[6].textContent;
        formaPagamento = tr.cells[5].textContent.replace(' (a receber)', '').replace(' (a confirmar)', '');
      }
      
      // Atualizar dados no modal
      document.getElementById('clienteFinalizarVenda').textContent = clienteNome;
      document.getElementById('totalFinalizarVenda').textContent = totalVenda;
      document.getElementById('formaPagamentoFinalizarVenda').textContent = formaPagamento;
      
      // Definir valor recebido igual ao total da venda
      const totalValor = parseFloat(totalVenda.replace('R$ ', '').replace(',', '.'));
      valorRecebidoFinalizar.value = totalValor.toFixed(2);
      trocoFinalizarVenda.textContent = 'R$ 0,00';
      
      // Exibir o modal
      finalizarVendaModal.show();
    });
  });
  
  // Evento para atualizar troco na finalização
  if (valorRecebidoFinalizar) {
    valorRecebidoFinalizar.addEventListener('input', function() {
      const valorRecebido = parseFloat(this.value) || 0;
      const totalVenda = parseFloat(document.getElementById('totalFinalizarVenda').textContent.replace('R$ ', '').replace(',', '.')) || 0;
      
      const troco = valorRecebido - totalVenda;
      trocoFinalizarVenda.textContent = `R$ ${Math.max(0, troco).toFixed(2)}`;
      
      // Destacar troco negativo
      if (troco < 0) {
        trocoFinalizarVenda.classList.add('text-danger');
      } else {
        trocoFinalizarVenda.classList.remove('text-danger');
      }
    });
  }
  
  // Evento para mostrar modal de cancelamento de venda
  btnCancelarVenda.forEach(btn => {
    btn.addEventListener('click', function() {
      const vendaId = this.getAttribute('data-id');
      
      // Atualizar título do modal
      document.getElementById('cancelarVendaModalLabel').textContent = `Cancelar Venda #${vendaId}`;
      
      // Simular carregamento de dados da venda
      // Em uma aplicação real, você buscaria esses dados do servidor
      let clienteNome = 'Cliente não encontrado';
      let totalVenda = 'R$ 0,00';
      
      // Encontrar a linha da tabela correspondente à venda
      const tr = this.closest('tr');
      if (tr) {
        clienteNome = tr.cells[2].textContent;
        totalVenda = tr.cells[6].textContent;
      }
      
      // Atualizar dados no modal
      document.getElementById('clienteCancelarVenda').textContent = clienteNome;
      document.getElementById('totalCancelarVenda').textContent = totalVenda;
      
      // Resetar campos do formulário
      document.getElementById('motivoCancelamento').value = '';
      document.getElementById('outroMotivoCancelamento').style.display = 'none';
      if (document.getElementById('outroMotivo')) {
        document.getElementById('outroMotivo').value = '';
      }
      
      // Exibir o modal
      cancelarVendaModal.show();
    });
  });
  
  // Evento para mostrar/ocultar campo de outro motivo
  if (motivoCancelamento) {
    motivoCancelamento.addEventListener('change', function() {
      if (this.value === 'outro') {
        outroMotivoCancelamento.style.display = 'block';
      } else {
        outroMotivoCancelamento.style.display = 'none';
      }
    });
  }
  
  // Evento para editar venda
  btnEditarVenda.forEach(btn => {
    btn.addEventListener('click', function() {
      const vendaId = this.getAttribute('data-id');
      
      // Redirecionar para a página de vendas com o ID da venda
      window.location.href = `vendas.html?id=${vendaId}`;
    });
  });
  
  // Evento para visualizar detalhes da venda
  btnViewVenda.forEach(btn => {
    btn.addEventListener('click', function() {
      const vendaId = this.getAttribute('data-id');
      
      // Atualizar título do modal
      document.getElementById('detalhesVendaModalLabel').textContent = `Detalhes da Venda #${vendaId}`;
      
      // Aqui você buscaria os dados da venda pelo ID
      console.log('Visualizando venda ID:', vendaId);
      
      // Exibir o modal de detalhes
      detalhesVendaModal.show();
    });
  });
  
  // Evento para imprimir venda
  btnPrintVenda.forEach(btn => {
    btn.addEventListener('click', function() {
      const vendaId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados da venda pelo ID
      console.log('Imprimindo venda ID:', vendaId);
      
      // Notificação antes de imprimir
      Swal.fire({
        icon: 'info',
        title: 'Preparando Impressão',
        text: `Preparando impressão da venda #${vendaId}...`,
        timer: 1500,
        showConfirmButton: false,
        willClose: () => {
          // Em uma aplicação real, você abriria uma janela de impressão
          window.print();
        }
      });
    });
  });
  
  // Evento para confirmar finalização da venda
  if (btnConfirmarFinalizacao) {
    btnConfirmarFinalizacao.addEventListener('click', function() {
      // Verificar se o valor recebido é suficiente
      const valorRecebido = parseFloat(valorRecebidoFinalizar.value) || 0;
      const totalVenda = parseFloat(document.getElementById('totalFinalizarVenda').textContent.replace('R$ ', '').replace(',', '.')) || 0;
      
      if (valorRecebido < totalVenda) {
        Swal.fire({
          icon: 'error',
          title: 'Valor Insuficiente',
          text: 'O valor recebido é menor que o total da venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Simular finalização da venda
      console.log('Venda finalizada com sucesso!');
      
      // Fechar modal
      finalizarVendaModal.hide();
      
      // Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Venda Finalizada',
        text: 'A venda foi finalizada com sucesso!',
        confirmButtonColor: '#1e88e5'
      }).then((result) => {
        // Recarregar a página para atualizar a lista
        window.location.reload();
      });
    });
  }
  
  // Evento para confirmar cancelamento da venda
  if (btnConfirmarCancelamento) {
    btnConfirmarCancelamento.addEventListener('click', function() {
      // Validar motivo
      if (!motivoCancelamento.value) {
        Swal.fire({
          icon: 'warning',
          title: 'Motivo Necessário',
          text: 'Por favor, selecione o motivo do cancelamento.',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      if (motivoCancelamento.value === 'outro' && (!document.getElementById('outroMotivo').value)) {
        Swal.fire({
          icon: 'warning',
          title: 'Motivo Necessário',
          text: 'Por favor, especifique o motivo do cancelamento.',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Simular cancelamento da venda
      console.log('Venda cancelada com sucesso!');
      
      // Fechar modal
      cancelarVendaModal.hide();
      
      // Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Venda Cancelada',
        text: 'A venda foi cancelada com sucesso!',
        confirmButtonColor: '#1e88e5'
      }).then((result) => {
        // Recarregar a página para atualizar a lista
        window.location.reload();
      });
    });
  }
  
  // Evento para imprimir detalhes da venda
  const btnImprimirVendaDetalhes = document.getElementById('btnImprimirVendaDetalhes');
  if (btnImprimirVendaDetalhes) {
    btnImprimirVendaDetalhes.addEventListener('click', function() {
      Swal.fire({
        icon: 'info',
        title: 'Preparando Impressão',
        text: 'Preparando impressão dos detalhes da venda...',
        timer: 1500,
        showConfirmButton: false,
        willClose: () => {
          window.print();
        }
      });
    });
  }
});