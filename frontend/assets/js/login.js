document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const submitBtn = loginForm?.querySelector('button[type="submit"]');

  const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3333';
  const LOGIN_PATH = '/auth/login';

  async function loginRequest(credentials) {
    const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `Erro ${res.status}`;
      throw new Error(msg);
    }

    if (!data?.token && !data?.dados?.token) {
      throw new Error('Resposta inválida do servidor: token ausente.');
    }

    return data;
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Entrando...' : 'Entrar';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        if (window.Swal?.fire) {
          Swal.fire({
            icon: 'warning',
            title: 'Campos obrigatórios',
            text: 'Por favor, preencha todos os campos.',
            confirmButtonColor: '#1e88e5'
          });
        } else {
          alert('Preencha email e senha.');
        }
        return;
      }

      setLoading(true);
      try {
        const payload = { email: username, senha: password };
        const data = await loginRequest(payload);

        localStorage.setItem('token', data.dados?.token || data.token);

        if (data.dados?.user || data.user) {
          const userData = data.dados?.user || data.user;
          localStorage.setItem('user', JSON.stringify(userData));
          if (userData.cargo) localStorage.setItem('role', userData.cargo);
        }

        if (window.Swal?.fire) {
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
        } else {
          alert('Login OK!');
          window.location.href = 'index.html';
        }
      } catch (err) {
        if (window.Swal?.fire) {
          Swal.fire({
            icon: 'error',
            title: 'Falha no login',
            text: err.message || 'Usuário ou senha incorretos.',
            confirmButtonColor: '#1e88e5'
          });
        } else {
          alert(err.message || 'Falha no login');
        }
      } finally {
        setLoading(false);
      }
    });
  }
});
