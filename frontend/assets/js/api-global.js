// =======================
// API GLOBAL — USAR EM TODAS AS TELAS
// =======================
window.api = async function api(method, path, body = null) {
  const API_BASE = localStorage.getItem("API_BASE") || "";
  const token = (localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "").trim();

  const headers = {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = null; }

  // ===== 401 — Token inválido ou expirado =====
  if (res.status === 401) {
    Swal.fire({
      icon: "warning",
      title: "Sessão expirada",
      text: "Faça login novamente.",
      confirmButtonColor: "#1e88e5",
    }).then(() => {
      localStorage.clear();
      window.location.href = "login.html";
    });
    throw new Error("Sessão expirada.");
  }

  // ===== 403 — Sem permissão =====
  if (res.status === 403) {
    Swal.fire({
      icon: "error",
      title: "Acesso negado",
      text: "Você não tem permissão para executar esta ação.",
      confirmButtonColor: "#d33",
    });
    throw new Error("Sem permissão.");
  }

  // ===== Erros gerais =====
  if (!res.ok) {
    const msg = data?.mensagem || data?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }

  return data?.dados ?? data;
};
