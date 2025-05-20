// Funcionalidades específicas para a tela de vendas
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM - Modais
  const finalizarVendaModal = new bootstrap.Modal(document.getElementById('finalizarVendaModal'));
  const salvarPendenteModal = new bootstrap.Modal(document.getElementById('salvarPendenteModal'));
  const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
  
  // Elementos do DOM - Formulários
  const formCliente = document.getElementById('formCliente');
  
  // Elementos do DOM - Botões
  const btnSelecionarCliente = document.getElementById('btnSelecionarCliente');
  const btnAlterarCliente = document.getElementById('btnAlterarCliente');
  const btnAdicionarProduto = document.getElementById('btnAdicionarProduto');
  const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
  const btnSalvarPendente = document.getElementById('btnSalvarPendente');
  const btnCancelarVenda = document.getElementById('btnCancelarVenda');
  const btnConfirmarFinalizacao = document.getElementById('btnConfirmarFinalizacao');
  const btnConfirmarPendente = document.getElementById('btnConfirmarPendente');
  const btnBuscarCliente = document.getElementById('btnBuscarCliente');
  
  // Elementos do DOM - Campos
  const clienteSelecionado = document.getElementById('clienteSelecionado');
  const semClienteSelecionado = document.getElementById('semClienteSelecionado');
  const nomeCliente = document.getElementById('nomeCliente');
  const telefoneCliente = document.getElementById('telefoneCliente');
  const enderecoCliente = document.getElementById('enderecoCliente');
  const produtoSelect = document.getElementById('produtoSelect');
  const quantidadeProduto = document.getElementById('quantidadeProduto');
  const precoProduto = document.getElementById('precoProduto');
  const subtotalProduto = document.getElementById('subtotalProduto');
  const listaProdutos = document.getElementById('listaProdutos');
  const subtotalVenda = document.getElementById('subtotalVenda');
  const descontoVenda = document.getElementById('descontoVenda');
  const descontoResumo = document.getElementById('descontoResumo');
  const totalVenda = document.getElementById('totalVenda');
  const formaPagamento = document.getElementById('formaPagamento');
  const valorRecebidoFinalizar = document.getElementById('valorRecebidoFinalizar');
  const trocoFinalizarVenda = document.getElementById('trocoFinalizarVenda');
  const buscarCliente = document.getElementById('buscarCliente');
  
  // Variáveis globais
  let produtos = [];
  let clientes = [
    { id: '1', nome: 'Maria Silva', telefone: '(11) 98765-4321', endereco: 'Rua das Flores, 123 - Centro' },
    { id: '2', nome: 'João Oliveira', telefone: '(11) 91234-5678', endereco: 'Av. Principal, 456 - Jardim América' },
    { id: '3', nome: 'Ana Santos', telefone: '(11) 99876-5432', endereco: 'Rua dos Pinheiros, 789 - Vila Nova' }
  ];
  
  // Carregar dados iniciais
  carregarDados();
  
  // Função para carregar dados iniciais
  function carregarDados() {
    // Carregar clientes do localStorage
    const clientesStorage = localStorage.getItem('clientes');
    if (clientesStorage) {
      const clientesFromStorage = JSON.parse(clientesStorage);
      if (clientesFromStorage.length > 0) {
        clientes = clientesFromStorage;
      }
    } else {
      // Salvar clientes iniciais no localStorage
      localStorage.setItem('clientes', JSON.stringify(clientes));
    }
    
    // Verificar se há produtos no localStorage
    const produtosStorage = localStorage.getItem('produtos');
    if (!produtosStorage) {
      // Criar produtos iniciais
      const produtosIniciais = [
        { id: '1', nome: 'Galão 20L', preco: 15.00, estoque: 100 },
        { id: '2', nome: 'Água Mineral 500ml', preco: 2.50, estoque: 500 },
        { id: '3', nome: 'Água Mineral 1,5L', preco: 5.00, estoque: 200 },
        { id: '4', nome: 'Suporte para Galão', preco: 35.90, estoque: 50 },
        { id: '5', nome: 'Água Mineral com Gás 500ml', preco: 3.50, estoque: 150 }
      ];
      
      // Salvar produtos iniciais no localStorage
      localStorage.setItem('produtos', JSON.stringify(produtosIniciais));
    }
    
    // Atualizar lista de clientes no modal
    atualizarListaClientes();
  }
  
  // Função para atualizar lista de clientes no modal
  function atualizarListaClientes(filtro = '') {
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = '';
    
    // Filtrar clientes se necessário
    let clientesFiltrados = clientes;
    if (filtro) {
      const filtroLower = filtro.toLowerCase();
      clientesFiltrados = clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(filtroLower) || 
        cliente.telefone.includes(filtro)
      );
    }
    
    // Verificar se há clientes
    if (clientesFiltrados.length === 0) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-center';
      li.textContent = filtro ? 'Nenhum cliente encontrado com este filtro.' : 'Nenhum cliente cadastrado.';
      listaClientes.appendChild(li);
      return;
    }
    
    // Adicionar clientes à lista
    clientesFiltrados.forEach(cliente => {
      const li = document.createElement('li');
      li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      li.setAttribute('data-id', cliente.id);
      
      li.innerHTML = `
        <div>
          <h6 class="mb-0">${cliente.nome}</h6>
          <small class="text-muted">${cliente.telefone}</small>
        </div>
        <button class="btn btn-sm btn-primary btn-selecionar">Selecionar</button>
      `;
      
      listaClientes.appendChild(li);
    });
    
    // Adicionar eventos aos botões de selecionar
    document.querySelectorAll('.btn-selecionar').forEach(btn => {
      btn.addEventListener('click', function() {
        const clienteId = this.closest('li').getAttribute('data-id');
        const cliente = clientes.find(c => c.id === clienteId);
        
        if (cliente) {
          selecionarCliente(cliente);
        }
      });
    });
  }
  
  // Função para selecionar cliente
  function selecionarCliente(cliente) {
    // Atualizar campos
    nomeCliente.textContent = cliente.nome;
    telefoneCliente.textContent = cliente.telefone;
    enderecoCliente.textContent = cliente.endereco;
    
    // Mostrar cliente selecionado
    semClienteSelecionado.style.display = 'none';
    clienteSelecionado.style.display = 'block';
    
    // Fechar modal
    clienteModal.hide();
    
    // Notificação de cliente selecionado
    Swal.fire({
      icon: 'success',
      title: 'Cliente Selecionado',
      text: `${cliente.nome} foi selecionado para esta venda.`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }
  
  // Evento para selecionar produto
  if (produtoSelect) {
    produtoSelect.addEventListener('change', function() {
      if (this.value) {
        const option = this.options[this.selectedIndex];
        const preco = option.getAttribute('data-preco');
        
        precoProduto.value = preco;
        atualizarSubtotalProduto();
      } else {
        precoProduto.value = '';
        subtotalProduto.value = '';
      }
    });
  }
  
  // Evento para atualizar subtotal do produto
  if (quantidadeProduto) {
    quantidadeProduto.addEventListener('input', atualizarSubtotalProduto);
  }
  
  if (precoProduto) {
    precoProduto.addEventListener('input', atualizarSubtotalProduto);
  }
  
  // Função para atualizar subtotal do produto
  function atualizarSubtotalProduto() {
    const quantidade = parseFloat(quantidadeProduto.value) || 0;
    const preco = parseFloat(precoProduto.value) || 0;
    
    const subtotal = quantidade * preco;
    subtotalProduto.value = subtotal.toFixed(2);
  }
  
  // Evento para adicionar produto à venda
  if (btnAdicionarProduto) {
    btnAdicionarProduto.addEventListener('click', function() {
      // Validar campos
      if (!produtoSelect.value) {
        Swal.fire({
          icon: 'warning',
          title: 'Produto Não Selecionado',
          text: 'Por favor, selecione um produto.',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      if (!quantidadeProduto.value || parseFloat(quantidadeProduto.value) <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Quantidade Inválida',
          text: 'Por favor, informe uma quantidade válida.',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Obter dados do produto
      const produtoId = produtoSelect.value;
      const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;
      const quantidade = parseFloat(quantidadeProduto.value);
      const preco = parseFloat(precoProduto.value);
      const subtotal = parseFloat(subtotalProduto.value);
      
      // Verificar se o produto já está na lista
      const produtoExistente = produtos.find(p => p.id === produtoId);
      
      if (produtoExistente) {
        // Atualizar quantidade e subtotal
        produtoExistente.quantidade += quantidade;
        produtoExistente.subtotal = produtoExistente.quantidade * produtoExistente.preco;
        
        // Notificação de produto atualizado
        Swal.fire({
          icon: 'success',
          title: 'Produto Atualizado',
          text: `Quantidade de ${produtoNome} atualizada para ${produtoExistente.quantidade}.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        // Adicionar novo produto
        produtos.push({
          id: produtoId,
          nome: produtoNome,
          quantidade: quantidade,
          preco: preco,
          subtotal: subtotal
        });
        
        // Notificação de produto adicionado
        Swal.fire({
          icon: 'success',
          title: 'Produto Adicionado',
          text: `${produtoNome} adicionado à venda.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
      
      // Atualizar lista de produtos
      atualizarListaProdutos();
      
      // Limpar campos
      produtoSelect.value = '';
      quantidadeProduto.value = '1';
      precoProduto.value = '';
      subtotalProduto.value = '';
    });
  }
  
  // Função para atualizar lista de produtos
  function atualizarListaProdutos() {
    // Limpar lista
    listaProdutos.innerHTML = '';
    
    // Verificar se há produtos
    if (produtos.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="text-center">Nenhum produto adicionado.</td>';
      listaProdutos.appendChild(tr);
    } else {
      // Adicionar produtos à lista
      produtos.forEach(produto => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
          <td>${produto.nome}</td>
          <td>R$ ${produto.preco.toFixed(2)}</td>
          <td>${produto.quantidade}</td>
          <td class="text-end">R$ ${produto.subtotal.toFixed(2)}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-danger btn-remover-produto" data-id="${produto.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        
        listaProdutos.appendChild(tr);
      });
      
      // Adicionar eventos aos botões de remover
      document.querySelectorAll('.btn-remover-produto').forEach(btn => {
        btn.addEventListener('click', function() {
          const produtoId = this.getAttribute('data-id');
          
          // Confirmar remoção
          Swal.fire({
            icon: 'question',
            title: 'Remover Produto',
            text: 'Tem certeza que deseja remover este produto da venda?',
            showCancelButton: true,
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
          }).then((result) => {
            if (result.isConfirmed) {
              // Remover produto
              produtos = produtos.filter(p => p.id !== produtoId);
              
              // Atualizar lista
              atualizarListaProdutos();
              
              // Notificação de produto removido
              Swal.fire({
                icon: 'success',
                title: 'Produto Removido',
                text: 'O produto foi removido da venda.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
              });
            }
          });
        });
      });
    }
    
    // Atualizar totais
    atualizarTotais();
  }
  
  // Evento para atualizar desconto
  if (descontoVenda) {
    descontoVenda.addEventListener('input', atualizarTotais);
  }
  
  // Função para atualizar totais
  function atualizarTotais() {
    // Calcular subtotal
    const subtotalValor = produtos.reduce((total, produto) => total + produto.subtotal, 0);
    
    // Calcular desconto
    const descontoValor = parseFloat(descontoVenda.value) || 0;
    
    // Calcular total
    const totalValor = subtotalValor - descontoValor;
    
    // Atualizar campos
    subtotalVenda.textContent = `R$ ${subtotalValor.toFixed(2)}`;
    descontoResumo.textContent = `- R$ ${descontoValor.toFixed(2)}`;
    totalVenda.textContent = `R$ ${totalValor.toFixed(2)}`;
  }
  
  // Evento para selecionar cliente
  if (btnSelecionarCliente) {
    btnSelecionarCliente.addEventListener('click', function() {
      // Verificar se há clientes cadastrados
      if (clientes.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Nenhum Cliente Cadastrado',
          text: 'Não há clientes cadastrados. Deseja cadastrar um novo cliente?',
          showCancelButton: true,
          confirmButtonText: 'Sim, cadastrar',
          cancelButtonText: 'Não',
          confirmButtonColor: '#1e88e5',
          cancelButtonColor: '#6c757d'
        }).then((result) => {
          if (result.isConfirmed) {
            // Mostrar tab de cadastro
            document.getElementById('cadastrar-tab').click();
            clienteModal.show();
          }
        });
        return;
      }
      
      // Mostrar tab de seleção
      document.getElementById('selecionar-tab').click();
      
      // Atualizar lista de clientes
      atualizarListaClientes();
      
      // Exibir modal
      clienteModal.show();
    });
  }
  
  // Evento para alterar cliente
  if (btnAlterarCliente) {
    btnAlterarCliente.addEventListener('click', function() {
      // Mostrar tab de seleção
      document.getElementById('selecionar-tab').click();
      
      // Atualizar lista de clientes
      atualizarListaClientes();
      
      // Exibir modal
      clienteModal.show();
    });
  }
  
  // Evento para buscar cliente
  if (btnBuscarCliente) {
    btnBuscarCliente.addEventListener('click', function() {
      const filtro = buscarCliente.value.trim();
      atualizarListaClientes(filtro);
    });
  }
  
  // Evento para buscar cliente ao pressionar Enter
  if (buscarCliente) {
    buscarCliente.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const filtro = this.value.trim();
        atualizarListaClientes(filtro);
      }
    });
  }
  
  // Evento para adicionar cliente
  if (formCliente) {
    formCliente.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Obter dados do formulário
      const nome = document.getElementById('nomeNovoCliente').value;
      const telefone = document.getElementById('telefoneNovoCliente').value;
      const endereco = document.getElementById('enderecoNovoCliente').value;
      
      // Gerar ID único
      const id = Date.now().toString();
      
      // Criar objeto cliente
      const cliente = {
        id: id,
        nome: nome,
        telefone: telefone,
        endereco: endereco
      };
      
      // Adicionar cliente à lista
      clientes.push(cliente);
      
      // Salvar no localStorage
      localStorage.setItem('clientes', JSON.stringify(clientes));
      
      // Selecionar o cliente
      selecionarCliente(cliente);
      
      // Limpar formulário
      formCliente.reset();
    });
  }
  
  // Evento para finalizar venda
  if (btnFinalizarVenda) {
    btnFinalizarVenda.addEventListener('click', function() {
      // Verificar se há produtos na venda
      if (produtos.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Nenhum Produto',
          text: 'Adicione pelo menos um produto à venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Verificar se um cliente foi selecionado
      if (clienteSelecionado.style.display === 'none') {
        Swal.fire({
          icon: 'warning',
          title: 'Cliente Não Selecionado',
          text: 'Selecione um cliente para a venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Atualizar informações no modal
      document.getElementById('clienteFinalizarVenda').textContent = nomeCliente.textContent;
      document.getElementById('totalFinalizarVenda').textContent = totalVenda.textContent;
      document.getElementById('formaPagamentoFinalizarVenda').textContent = formaPagamento.options[formaPagamento.selectedIndex].text;
      
      // Definir valor recebido igual ao total da venda
      const totalValor = parseFloat(totalVenda.textContent.replace('R$ ', '').replace(',', '.'));
      valorRecebidoFinalizar.value = totalValor.toFixed(2);
      trocoFinalizarVenda.textContent = 'R$ 0,00';
      
      // Exibir modal de confirmação
      finalizarVendaModal.show();
    });
  }
  
  // Evento para atualizar troco na finalização
  if (valorRecebidoFinalizar) {
    valorRecebidoFinalizar.addEventListener('input', function() {
      const valorRecebido = parseFloat(this.value) || 0;
      const totalVendaValor = parseFloat(document.getElementById('totalFinalizarVenda').textContent.replace('R$ ', '').replace(',', '.')) || 0;
      
      const troco = valorRecebido - totalVendaValor;
      trocoFinalizarVenda.textContent = `R$ ${Math.max(0, troco).toFixed(2)}`;
      
      // Destacar troco negativo
      if (troco < 0) {
        trocoFinalizarVenda.classList.add('text-danger');
      } else {
        trocoFinalizarVenda.classList.remove('text-danger');
      }
    });
  }
  
  // Evento para salvar venda como pendente
  if (btnSalvarPendente) {
    btnSalvarPendente.addEventListener('click', function() {
      // Verificar se há produtos na venda
      if (produtos.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Nenhum Produto',
          text: 'Adicione pelo menos um produto à venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Verificar se um cliente foi selecionado
      if (clienteSelecionado.style.display === 'none') {
        Swal.fire({
          icon: 'warning',
          title: 'Cliente Não Selecionado',
          text: 'Selecione um cliente para a venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Verificar se um motorista foi selecionado
      const motoristaVenda = document.getElementById('motoristaVenda');
      if (!motoristaVenda.value) {
        Swal.fire({
          icon: 'warning',
          title: 'Motorista Não Selecionado',
          text: 'Selecione um motorista/entregador para a venda!',
          confirmButtonColor: '#1e88e5'
        });
        return;
      }
      
      // Atualizar informações no modal
      document.getElementById('totalVendaPendente').textContent = totalVenda.textContent;
      
      // Obter texto da forma de pagamento e adicionar "(a receber)" ou "(a confirmar)"
      let textoPagamento = formaPagamento.options[formaPagamento.selectedIndex].text;
      
      if (formaPagamento.value === 'dinheiro') {
        textoPagamento += ' (a receber)';
      } else {
        textoPagamento += ' (a confirmar)';
      }
      
      document.getElementById('formaPagamentoPendente').textContent = textoPagamento;
      
      // Copiar observações se existirem
      const observacoesVenda = document.getElementById('observacoesVenda').value;
      document.getElementById('observacoesPendente').value = observacoesVenda;
      
      // Exibir modal de confirmação
      salvarPendenteModal.show();
    });
  }
  
  // Evento para cancelar venda
  if (btnCancelarVenda) {
    btnCancelarVenda.addEventListener('click', function() {
      // Confirmar cancelamento
      Swal.fire({
        icon: 'question',
        title: 'Cancelar Venda',
        text: 'Tem certeza que deseja cancelar esta venda? Todos os dados serão perdidos.',
        showCancelButton: true,
        confirmButtonText: 'Sim, cancelar',
        cancelButtonText: 'Não, voltar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          // Limpar formulário
          limparFormularioVenda();
          
          // Notificação de venda cancelada
          Swal.fire({
            icon: 'success',
            title: 'Venda Cancelada',
            text: 'A venda foi cancelada com sucesso.',
            confirmButtonColor: '#1e88e5'
          }).then(() => {
            // Redirecionar para o dashboard
            window.location.href = 'index.html';
          });
        }
      });
    });
  }
  
  // Evento para confirmar finalização
  if (btnConfirmarFinalizacao) {
    btnConfirmarFinalizacao.addEventListener('click', function() {
      // Verificar se o valor recebido é suficiente
      const valorRecebido = parseFloat(valorRecebidoFinalizar.value) || 0;
      const totalVendaValor = parseFloat(document.getElementById('totalFinalizarVenda').textContent.replace('R$ ', '').replace(',', '.')) || 0;
      
      if (valorRecebido < totalVendaValor) {
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
      }).then(() => {
        // Limpar formulário
        limparFormularioVenda();
        
        // Redirecionar para o dashboard
        window.location.href = 'index.html';
      });
    });
  }
  
  // Evento para confirmar salvamento como pendente
  if (btnConfirmarPendente) {
    btnConfirmarPendente.addEventListener('click', function() {
      // Simular salvamento da venda como pendente
      console.log('Venda salva como pendente com sucesso!');
      
      // Fechar modal
      salvarPendenteModal.hide();
      
      // Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Venda Salva como Pendente',
        text: 'A venda foi salva como pendente com sucesso! Você poderá finalizá-la quando o pagamento for confirmado.',
        confirmButtonColor: '#1e88e5'
      }).then(() => {
        // Limpar formulário
        limparFormularioVenda();
        
        // Redirecionar para o dashboard
        window.location.href = 'index.html';
      });
    });
  }
  
  // Função para limpar formulário de venda
  function limparFormularioVenda() {
    // Limpar produtos
    produtos = [];
    atualizarListaProdutos();
    
    // Limpar cliente
    semClienteSelecionado.style.display = 'block';
    clienteSelecionado.style.display = 'none';
    
    // Limpar campos
    produtoSelect.value = '';
    quantidadeProduto.value = '1';
    precoProduto.value = '';
    subtotalProduto.value = '';
    descontoVenda.value = '0.00';
    formaPagamento.value = 'dinheiro';
    
    // Limpar observações
    if (document.getElementById('observacoesVenda')) {
      document.getElementById('observacoesVenda').value = '';
    }
    
    // Limpar motorista
    if (document.getElementById('motoristaVenda')) {
      document.getElementById('motoristaVenda').value = '';
    }
    
    // Limpar data de entrega
    if (document.getElementById('dataEntrega')) {
      document.getElementById('dataEntrega').value = '';
    }
  }
  
  // Inicializar a página
  atualizarListaProdutos();
});