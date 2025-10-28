// tests/integration/clientes.integration.test.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';

describe('Rotas de /api/clientes (com autenticação)', () => {
  let token: string;

  beforeAll(async () => {
    const adminEmail = 'admin@meusistema.com';
    const adminSenha = 'admin123';

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: adminEmail, senha: adminSenha });

    if (loginRes.status !== 200 || !loginRes.body?.dados?.token) {
      throw new Error('⚠ Falha no login. Garanta que o admin existe e está seedado no BD de teste.');
    }

    token = loginRes.body.dados.token;
  });

  // 🔹 Gera dados únicos a cada execução
  const gerarCpf = () => {
    const base = Math.floor(100000000 + Math.random() * 900000000);
    return `${String(base).slice(0, 3)}.${String(base).slice(3, 6)}.${String(base).slice(6, 9)}-00`;
  };

  const clienteBase = {
    nome: 'Cliente Teste',
    cpfCnpj: gerarCpf(),
    telefone: '(67) 99999-0000',
    email: `cliente_${Date.now()}@email.com`,
    endereco: 'Rua A, 123 - Centro',
  };

  it('✅ deve criar um novo cliente com sucesso', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send(clienteBase);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('id');
  });

  it('🚫 deve falhar ao tentar criar cliente com e-mail duplicado', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...clienteBase,
        cpfCnpj: gerarCpf(), // CPF novo, mas e-mail igual
      });

    expect([400, 409]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(false);
    expect(String(res.body.mensagem || res.body.error || '')).toMatch(/já cadast|existe/i);
  });

  it('📋 deve retornar uma lista de clientes', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('data');
    expect(Array.isArray(res.body.dados.data)).toBe(true);
  });

  describe('🧩 GET/PUT/DELETE /api/clientes/:id', () => {
    let clienteId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Cliente Para Operações',
          email: `ops_${Date.now()}@email.com`,
          cpfCnpj: gerarCpf(),
          telefone: '(67) 98888-7777',
          endereco: 'Rua B, 45',
        });

      if (![200, 201].includes(res.status)) {
        console.error('❌ Erro ao criar cliente para testes:', res.body);
        throw new Error('❌ Não foi possível criar cliente para testes de GET/PUT/DELETE');
      }
      clienteId = res.body.dados.id;
    });

    it('🔍 deve obter o cliente por ID', async () => {
      const res = await request(app)
        .get(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id', clienteId);
    });

    it('✏ deve atualizar o cliente com sucesso', async () => {
      const res = await request(app)
        .put(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Cliente Atualizado' });

      expect(res.statusCode).toBe(200);
      expect(String(res.body.mensagem || '')).toMatch(/atualizado/i);
    });

    it('🗑 deve excluir (inativar) o cliente com sucesso', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.statusCode);
      expect(String(res.body.mensagem || '')).toMatch(/inativ|excluíd/i);
    });
  });
});
