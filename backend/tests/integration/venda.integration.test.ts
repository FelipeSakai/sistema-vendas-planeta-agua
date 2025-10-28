import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';

describe('Rotas /api/vendas (integração)', () => {
  let token: string;

  beforeAll(async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@meusistema.com', senha: 'admin123' });

    token = login.body?.dados?.token;
    if (!token) throw new Error('⚠ Falha no login para testes de vendas.');
  });

  let clienteId: number;
  let produtoId: number;

  beforeAll(async () => {
    // cria cliente
    const cli = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Cliente Venda',
        cpfCnpj: `123456${Date.now()}`,
        telefone: '67999990000',
        email: `venda_${Date.now()}@email.com`,
        endereco: 'Rua A',
      });
    clienteId = cli.body.dados.id;

    // cria produto
    const prod = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .field('nome', `Galão Venda ${Date.now()}L`)
      .field('preco', 25.0)
      .field('tipo', 'água')
      .field('estoque', 30);
    produtoId = prod.body.dados.id;
  });

  it('✅ deve registrar uma nova venda com sucesso', async () => {
    const res = await request(app)
      .post('/api/vendas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId,
        itens: [{ produtoId, quantidade: 2 }],
        formaPagamento: 'DINHEIRO',
      });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('id');
  });

  it('📋 deve listar as vendas', async () => {
    const res = await request(app)
      .get('/api/vendas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados.data)).toBe(true);
  });
});
