document.addEventListener('DOMContentLoaded', function() {
    // Referência ao formulário de login
    const loginForm = document.getElementById('loginForm');
    
    // Usuários de teste (em um sistema real, isso seria verificado no servidor)
    const users = [
        { username: 'admin', password: 'admin123' },
        { username: 'usuario', password: 'senha123' }
    ];
    
    // Adicionar evento de submit ao formulário
    loginForm.addEventListener('submit', function(event) {
        // Prevenir o comportamento padrão do formulário
        event.preventDefault();
        
        // Obter valores dos campos
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Verificar se os campos estão preenchidos
        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos obrigatórios',
                text: 'Por favor, preencha todos os campos.',
                confirmButtonColor: '#1e88e5'
            });
            return;
        }
        
        // Verificar credenciais
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Login bem-sucedido
            Swal.fire({
                icon: 'success',
                title: 'Login realizado com sucesso!',
                text: 'Você será redirecionado para o dashboard.',
                confirmButtonColor: '#1e88e5'
            }).then(() => {
                // Salvar informação de login no localStorage
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('username', username);
                
                // Redirecionar para a página principal
                // Em um ambiente real, você redirecionaria para o dashboard
                window.location.href = 'index.html';
            });
        } else {
            // Login falhou
            Swal.fire({
                icon: 'error',
                title: 'Falha no login',
                text: 'Usuário ou senha incorretos. Tente novamente.',
                confirmButtonColor: '#1e88e5'
            });
        }
    });
    
    // Verificar se o usuário já está logado
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    
    if (isLoggedIn) {
        // Se já estiver logado, redirecionar para a página principal
        window.location.href = 'index.html';
    }
});