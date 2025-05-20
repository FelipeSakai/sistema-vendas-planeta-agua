// Funcionalidades específicas para a página de clientes
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const btnAddCliente = document.getElementById('btnAddCliente');
  const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
  const viewClienteModal = new bootstrap.Modal(document.getElementById('viewClienteModal'));
  const deleteClienteModal = new bootstrap.Modal(document.getElementById('deleteClienteModal'));
  const tipoClienteSelect = document.getElementById('tipoCliente');
  const camposPessoaFisica = document.getElementById('camposPessoaFisica');
  const camposPessoaJuridica = document.getElementById('camposPessoaJuridica');
  const btnSalvarCliente = document.getElementById('btnSalvarCliente');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
  const searchCliente = document.getElementById('searchCliente');
  const filterTipo = document.getElementById('filterTipo');
  const filterStatus = document.getElementById('filterStatus');
  
  // Botões de ação na tabela
  const btnViewClientes = document.querySelectorAll('.btn-view');
  const btnEditClientes = document.querySelectorAll('.btn-edit');
  const btnDeleteClientes = document.querySelectorAll('.btn-delete');
  
  // Evento para alternar entre campos de pessoa física e jurídica
  if (tipoClienteSelect) {
    tipoClienteSelect.addEventListener('change', function() {
      if (this.value === 'pessoa_fisica') {
        camposPessoaFisica.style.display = 'block';
        camposPessoaJuridica.style.display = 'none';
      } else if (this.value === 'pessoa_juridica') {
        camposPessoaFisica.style.display = 'none';
        camposPessoaJuridica.style.display = 'block';
      }
    });
  }
  
  // Evento para abrir modal de adicionar cliente
  if (btnAddCliente) {
    btnAddCliente.addEventListener('click', function() {
      // Resetar formulário
      document.getElementById('clienteForm').reset();
      document.getElementById('clienteModalLabel').textContent = 'Adicionar Cliente';
      
      // Mostrar campos de pessoa física por padrão
      camposPessoaFisica.style.display = 'block';
      camposPessoaJuridica.style.display = 'none';
      
      // Exibir o modal
      clienteModal.show();
    });
  }
  
  // Evento para salvar cliente
  if (btnSalvarCliente) {
    btnSalvarCliente.addEventListener('click', function() {
      // Aqui você implementaria a lógica para salvar os dados do cliente
      // Por enquanto, apenas simularemos o salvamento
      
      // Validar formulário
      const form = document.getElementById('clienteForm');
      if (!form.checkValidity()) {
        // Trigger validation UI
        form.reportValidity();
        return;
      }
      
      // Simular salvamento
      console.log('Cliente salvo com sucesso!');
      
      // Fechar modal
      clienteModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Cliente salvo com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a tabela sem recarregar)
      // location.reload();
    });
  }
  
  // Eventos para botões de visualizar cliente
  btnViewClientes.forEach(btn => {
    btn.addEventListener('click', function() {
      const clienteId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do cliente pelo ID
      console.log('Visualizando cliente ID:', clienteId);
      
      // Simular carregamento de dados
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Exibir o modal de visualização
      viewClienteModal.show();
    });
  });
  
  // Eventos para botões de editar cliente
  btnEditClientes.forEach(btn => {
    btn.addEventListener('click', function() {
      const clienteId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do cliente pelo ID
      console.log('Editando cliente ID:', clienteId);
      
      // Simular carregamento de dados no formulário
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Atualizar título do modal
      document.getElementById('clienteModalLabel').textContent = 'Editar Cliente';
      
      // Exibir o modal de edição
      clienteModal.show();
    });
  });
  
  // Eventos para botões de excluir cliente
  btnDeleteClientes.forEach(btn => {
    btn.addEventListener('click', function() {
      const clienteId = this.getAttribute('data-id');
      
      // Aqui você buscaria o nome do cliente pelo ID
      console.log('Excluindo cliente ID:', clienteId);
      
      // Simular carregamento do nome do cliente
      // Em uma aplicação real, você buscaria esse dado do servidor
      
      // Exibir o modal de confirmação
      deleteClienteModal.show();
    });
  });
  
  // Evento para confirmar exclusão
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener('click', function() {
      // Aqui você implementaria a lógica para excluir o cliente
      console.log('Cliente excluído com sucesso!');
      
      // Fechar modal
      deleteClienteModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Cliente excluído com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a tabela sem recarregar)
      // location.reload();
    });
  }
  
  // Evento para busca de clientes
  if (searchCliente) {
    searchCliente.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      // Aqui você implementaria a lógica para filtrar os clientes
      console.log('Buscando por:', searchTerm);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  // Eventos para filtros
  if (filterTipo) {
    filterTipo.addEventListener('change', function() {
      const tipoSelecionado = this.value;
      
      // Aqui você implementaria a lógica para filtrar por tipo
      console.log('Filtrando por tipo:', tipoSelecionado);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  if (filterStatus) {
    filterStatus.addEventListener('change', function() {
      const statusSelecionado = this.value;
      
      // Aqui você implementaria a lógica para filtrar por status
      console.log('Filtrando por status:', statusSelecionado);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  // Inicializar máscaras para campos de formulário
  function initMasks() {
    // Em uma aplicação real, você usaria uma biblioteca como o inputmask.js
    // Por enquanto, apenas logamos que as máscaras foram inicializadas
    console.log('Máscaras de formulário inicializadas');
  }
  
  // Inicializar máscaras
  initMasks();
});