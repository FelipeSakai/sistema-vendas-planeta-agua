document.addEventListener('DOMContentLoaded', function () {
    // Referência ao formulário de login
    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm?.querySelector('button[type="submit"]');

    // Ajuste se sua API estiver em outro host/porta
    const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3333';
    const LOGIN_PATH = '/auth/login'; // ajuste se seu backend usar outro caminho

    // Função para chamada ao backend
    async function loginRequest(credentials) {
        const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        let data = null;
        try { data = await res.json(); } catch (e) {}

        if (!res.ok) {
            const msg = (data && (data.error || data.message)) || `Erro ${res.status}`;
            throw new Error(msg);
        }
        return data; // esperado: { token, user }
    }

    function setLoading(loading) {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? 'Entrando...' : 'Entrar';
    }

    // Verificar se o usuário já está logado
    const isLoggedIn = !!localStorage.getItem('token');
    if (isLoggedIn) {
        // Se já estiver logado, redirecionar para a página principal
        window.location.href = 'index.html';
        return;
    }

    // Adicionar evento de submit ao formulário
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            // Prevenir o comportamento padrão do formulário
            event.preventDefault();

            // Obter valores dos campos
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

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

            setLoading(true);
            try {
                // Ajuste os campos conforme seu backend espera
                const payload = { login: username, senha: password };

                const data = await loginRequest(payload);

                if (!data || !data.token) {
                    throw new Error('Resposta inválida do servidor.');
                }

                // Salvar informação de login no localStorage
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.user.role) localStorage.setItem('role', data.user.role);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Login realizado com sucesso!',
                    text: 'Você será redirecionado para o dashboard.',
                    confirmButtonColor: '#1e88e5',
                    timer: 1200,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Falha no login',
                    text: err.message || 'Usuário ou senha incorretos. Tente novamente.',
                    confirmButtonColor: '#1e88e5'
                });
            } finally {
                setLoading(false);
            }
        });
    }
});
