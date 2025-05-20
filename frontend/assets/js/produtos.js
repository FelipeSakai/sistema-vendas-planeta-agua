// Funcionalidades específicas para a página de produtos
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const btnAddProduto = document.getElementById('btnAddProduto');
  const produtoModal = new bootstrap.Modal(document.getElementById('produtoModal'));
  const viewProdutoModal = new bootstrap.Modal(document.getElementById('viewProdutoModal'));
  const deleteProdutoModal = new bootstrap.Modal(document.getElementById('deleteProdutoModal'));
  const btnSalvarProduto = document.getElementById('btnSalvarProduto');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
  const searchProduto = document.getElementById('searchProduto');
  const filterCategoria = document.getElementById('filterCategoria');
  const filterEstoque = document.getElementById('filterEstoque');
  
  // Botões de ação nos cards
  const btnViewProdutos = document.querySelectorAll('.btn-view');
  const btnEditProdutos = document.querySelectorAll('.btn-edit');
  const btnDeleteProdutos = document.querySelectorAll('.btn-delete');
  
  // Evento para abrir modal de adicionar produto
  if (btnAddProduto) {
    btnAddProduto.addEventListener('click', function() {
      // Resetar formulário
      document.getElementById('produtoForm').reset();
      document.getElementById('produtoModalLabel').textContent = 'Adicionar Produto';
      
      // Exibir o modal
      produtoModal.show();
    });
  }
  
  // Evento para salvar produto
  if (btnSalvarProduto) {
    btnSalvarProduto.addEventListener('click', function() {
      // Aqui você implementaria a lógica para salvar os dados do produto
      // Por enquanto, apenas simularemos o salvamento
      
      // Validar formulário
      const form = document.getElementById('produtoForm');
      if (!form.checkValidity()) {
        // Trigger validation UI
        form.reportValidity();
        return;
      }
      
      // Simular salvamento
      console.log('Produto salvo com sucesso!');
      
      // Fechar modal
      produtoModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Produto salvo com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a grade sem recarregar)
      // location.reload();
    });
  }
  
  // Eventos para botões de visualizar produto
  btnViewProdutos.forEach(btn => {
    btn.addEventListener('click', function() {
      const produtoId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do produto pelo ID
      console.log('Visualizando produto ID:', produtoId);
      
      // Simular carregamento de dados
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Exibir o modal de visualização
      viewProdutoModal.show();
    });
  });
  
  // Eventos para botões de editar produto
  btnEditProdutos.forEach(btn => {
    btn.addEventListener('click', function() {
      const produtoId = this.getAttribute('data-id');
      
      // Aqui você buscaria os dados do produto pelo ID
      console.log('Editando produto ID:', produtoId);
      
      // Simular carregamento de dados no formulário
      // Em uma aplicação real, você buscaria esses dados do servidor
      
      // Atualizar título do modal
      document.getElementById('produtoModalLabel').textContent = 'Editar Produto';
      
      // Exibir o modal de edição
      produtoModal.show();
    });
  });
  
  // Eventos para botões de excluir produto
  btnDeleteProdutos.forEach(btn => {
    btn.addEventListener('click', function() {
      const produtoId = this.getAttribute('data-id');
      
      // Aqui você buscaria o nome do produto pelo ID
      console.log('Excluindo produto ID:', produtoId);
      
      // Simular carregamento do nome do produto
      // Em uma aplicação real, você buscaria esse dado do servidor
      
      // Exibir o modal de confirmação
      deleteProdutoModal.show();
    });
  });
  
  // Evento para confirmar exclusão
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener('click', function() {
      // Aqui você implementaria a lógica para excluir o produto
      console.log('Produto excluído com sucesso!');
      
      // Fechar modal
      deleteProdutoModal.hide();
      
      // Exibir mensagem de sucesso
      alert('Produto excluído com sucesso!');
      
      // Recarregar a página (em uma aplicação real, você atualizaria a grade sem recarregar)
      // location.reload();
    });
  }
  
  // Evento para busca de produtos
  if (searchProduto) {
    searchProduto.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      // Aqui você implementaria a lógica para filtrar os produtos
      console.log('Buscando por:', searchTerm);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  // Eventos para filtros
  if (filterCategoria) {
    filterCategoria.addEventListener('change', function() {
      const categoriaSelecionada = this.value;
      
      // Aqui você implementaria a lógica para filtrar por categoria
      console.log('Filtrando por categoria:', categoriaSelecionada);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  if (filterEstoque) {
    filterEstoque.addEventListener('change', function() {
      const estoqueSelecionado = this.value;
      
      // Aqui você implementaria a lógica para filtrar por nível de estoque
      console.log('Filtrando por estoque:', estoqueSelecionado);
      
      // Em uma aplicação real, você faria uma requisição ao servidor ou filtraria os dados localmente
    });
  }
  
  // Função para formatar valores monetários
  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
  
  // Função para verificar nível de estoque
  function verificarNivelEstoque(quantidade, minimo) {
    if (quantidade <= minimo * 0.5) {
      return 'baixo';
    } else if (quantidade <= minimo * 1.5) {
      return 'normal';
    } else {
      return 'alto';
    }
  }
});