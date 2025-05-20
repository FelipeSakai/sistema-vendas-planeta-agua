// Funcionalidades específicas para a página de usuários
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const btnAddUsuario = document.getElementById('btnAddUsuario');
  const usuarioModal = new bootstrap.Modal(document.getElementById('usuarioModal'));
  const viewUsuarioModal = new bootstrap.Modal(document.getElementById('viewUsuarioModal'));
  const deleteUsuarioModal = new bootstrap.Modal(document.getElementById('deleteUsuarioModal'));
  const tipoUsuarioSelect = document.getElementById('tipoUsuario');
  const camposMotorista = document.getElementById('camposMotorista');
  const btnSalvarUsuario = document.getElementById('btnSalvarUsuario');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
  const searchUsuario = document.getElementById('searchUsuario');
  const filterTipo = document.getElementById('filterTipo');
  const filterStatus = document.getElementById('filterStatus');
  
  // Botões de ação na tabela
  const btnViewUsuarios = document.querySelectorAll('.btn-view');
  const btnEditUsuarios = document.querySelectorAll('.btn-edit');
  const btnDeleteUsuarios = document.querySelectorAll('.btn-delete');
  
  // Evento para mostrar/ocultar campos específicos para motoristas
  if (tipoUsuarioSelect) {
    tipoUsuarioSelect.addEventListener('change', function() {
      if (this.value === 'motorista') {
        camposMotorista.style.display = 'block';
      } else {
        camposMotorista.style.display = 'none';
      }
    });
  }
  
  // Evento para abrir modal de adicionar usuário
  if (btnAddUsuario) {
    btnAddUsuario.addEventListener('click', function() {
      // Resetar formulário
      document.getElementById('usuarioForm').reset();
      document.getElementById('usuarioModalLabel').textContent = 'Adicionar Usuário';
      
      // Ocultar campos de motorista por padrão
      camposMotorista.style.display = 'none';
      
      // Exibir o modal
      usuarioModal.show();
    });
  }
  
  // Evento para salvar usuário
  if (btnSalvarUsuario) {
    btnSalvarUsuario.addEventListener('click', function() {
      // Aqui você implementaria a lógica para salvar os dados do usuário
      // Por enquanto, apenas simularemos o salvamento
      
      // Validar formulário
      const form = document.getElementById('usuarioForm');
      if (!form.checkValidity()) {
        // Trigger validation UI
        form.reportValidity();
        return;
      }
      
      // Validar senhas
      const senha = document.getElementById('senhaUsuario').value;
      const confirmarSenha = document.getElementById('confirmarSenhaUsuario').value;
      
      if (senha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
      }
      
      // Simular salvamento
      console.log('Usuário salvo com sucesso!');
      
      // Fechar modal
      usuarioModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Usuário salvo com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a tabela sem recarregar)
      // location.reload();
    });
  }
  
  // Eventos para botões de visualizar usuário
  btnViewUsuarios.forEach(btn => {
    btn.addEventListener('click', function() {
      const usuarioId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do usuário pelo ID
      console.log('Visualizando usuário ID:', usuarioId);
      
      // Simular carregamento de dados
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Verificar se é motorista para mostrar/ocultar seção específica
      const viewInfoMotorista = document.getElementById('viewInfoMotorista');
      if (usuarioId === '3' || usuarioId === '5' || usuarioId === '8') {
        viewInfoMotorista.style.display = 'block';
      } else {
        viewInfoMotorista.style.display = 'none';
      }
      
      // Exibir o modal de visualização
      viewUsuarioModal.show();
    });
  });
  
  // Eventos para botões de editar usuário
  btnEditUsuarios.forEach(btn => {
    btn.addEventListener('click', function() {
      const usuarioId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do usuário pelo ID
      console.log('Editando usuário ID:', usuarioId);
      
      // Simular carregamento de dados no formulário
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Verificar se é motorista para mostrar/ocultar campos específicos
      if (usuarioId === '3' || usuarioId === '5' || usuarioId === '8') {
        camposMotorista.style.display = 'block';
        document.getElementById('tipoUsuario').value = 'motorista';
      } else if (usuarioId === '1' || usuarioId === '6') {
        camposMotorista.style.display = 'none';
        document.getElementById('tipoUsuario').value = 'admin';
      } else {
        camposMotorista.style.display = 'none';
        document.getElementById('tipoUsuario').value = 'funcionario';
      }
      
      // Atualizar título do modal
      document.getElementById('usuarioModalLabel').textContent = 'Editar Usuário';
      
      // Exibir o modal de edição
      usuarioModal.show();
    });
  });
  
  // Eventos para botões de excluir usuário
  btnDeleteUsuarios.forEach(btn => {
    btn.addEventListener('click', function() {
      const usuarioId = this.getAttribute('data-id');
      
      // Aqui você buscaria o nome do usuário pelo ID
      console.log('Excluindo usuário ID:', usuarioId);
      
      // Simular carregamento do nome do usuário
      // Em uma aplicação real, você buscaria esse dado do servidor
      
      // Exibir o modal de confirmação
      deleteUsuarioModal.show();
    });
  });
  
  // Evento para confirmar exclusão
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener('click', function() {
      // Aqui você implementaria a lógica para excluir o usuário
      console.log('Usuário excluído com sucesso!');
      
      // Fechar modal
      deleteUsuarioModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Usuário excluído com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a tabela sem recarregar)
      // location.reload();
    });
  }
  
  // Evento para busca de usuários
  if (searchUsuario) {
    searchUsuario.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      // Aqui você implementaria a lógica para filtrar os usuários
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