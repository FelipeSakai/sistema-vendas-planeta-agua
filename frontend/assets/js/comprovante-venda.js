(function () {
  const API_BASE = localStorage.getItem("API_BASE") || "";
  const token = localStorage.getItem("token")?.replace("Bearer ", "") || "";

  const infoVenda = document.getElementById("infoVenda");
  const btnImprimir = document.getElementById("btnImprimir");
  const btnVoltar = document.getElementById("btnVoltar");

  function authHeaders() {
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function api(path) {
    const res = await fetch(API_BASE + path, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.mensagem || "Erro ao carregar comprovante");
    }
    return data.dados || data;
  }

  // --------------------------
  // PEGAR ID DA URL
  // --------------------------
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id");

  if (!id) {
    infoVenda.innerHTML = `<div class="alert alert-danger">ID inválido!</div>`;
    throw new Error("ID inválido na URL");
  }

  // --------------------------
  // FORMATADORES
  // --------------------------
  const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  const fmtData = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    if (isNaN(d)) return "-";
    return (
      d.toLocaleDateString("pt-BR") +
      " " +
      d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // converte qualquer valor para número válido
  const toNumber = (v) => {
    if (v === null || v === undefined) return 0;
    return Number(String(v).replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
  };

  // --------------------------
  // CARREGAR VENDA
  // --------------------------
  async function carregar() {
    try {
      const venda = await api(`/api/vendas/${id}`);

      const cliente = venda.cliente || {};
      const entrega = venda.entrega || {};
      const motorista = entrega?.motorista?.nome || "-";

      // totais protegidos
      const totalBruto = toNumber(venda.totalBruto);
      const totalLiquido = toNumber(venda.totalLiquido);
      const desconto = toNumber(venda.desconto);

      let html = `
        <h5 class="mb-3">Venda #${venda.id}</h5>

        <b>Data da Venda:</b> ${fmtData(venda.dataVenda)}<br>
        <b>Status:</b> ${venda.status}<br>
        <b>Forma de Pagamento:</b> ${venda.formaPagamento || "-"}<br>

        <div class="linha"></div>

        <h5>Cliente</h5>
        <b>${cliente.nome || "-"}</b><br>
        ${cliente.telefone || "-"}<br>
        ${cliente.endereco || "-"}<br>

        <div class="linha"></div>

        <h5>Itens</h5>
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Produto</th>
              <th class="text-center">Qtd</th>
              <th class="text-end">Preço</th>
              <th class="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
      `;

      venda.itens.forEach((item) => {
        const preco = toNumber(item.precoUnit);
        const subtotal = toNumber(item.subtotal);

        html += `
          <tr>
            <td>${item.produto?.nome || "-"}</td>
            <td class="text-center">${item.quantidade}</td>
            <td class="text-end">${BRL.format(preco)}</td>
            <td class="text-end">${BRL.format(subtotal)}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>

        <div class="linha"></div>

        <h5>Total</h5>
        <b>Total Bruto:</b> ${BRL.format(totalBruto)}<br>
        <b>Desconto:</b> ${BRL.format(desconto)}<br>
        <b>Total Líquido:</b> <span class="text-success fw-bold">${BRL.format(totalLiquido)}</span><br>

        <div class="linha"></div>

        <h5>Entrega</h5>
        <b>Motorista:</b> ${motorista}<br>
        <b>Data de Entrega:</b> ${entrega?.dataEntrega ? fmtData(entrega.dataEntrega) : "-"}<br>
      `;

      infoVenda.innerHTML = html;
    } catch (e) {
      infoVenda.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  }

  // --------------------------
  // BOTÕES
  // --------------------------
  btnImprimir.addEventListener("click", () => {
    window.print();
  });

  btnVoltar.addEventListener("click", () => {
    window.close();
  });

  carregar();
})();
