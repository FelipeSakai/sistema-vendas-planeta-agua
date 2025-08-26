import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';
import { Cargo } from '@prisma/client';

describe('Rotas de /api/clientes (com autenticação)', () => {
  let token: string;

  beforeAll(async () => {
    // Requer que exista um ADMIN no banco de testes
    // Dica: defina no .env.test -> TEST_ADMIN_EMAIL/TEST_ADMIN_SENHA
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
    const adminSenha = process.env.TEST_ADMIN_SENHA || '123456';

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: adminEmail, senha: adminSenha });

    if (loginRes.status !== 200 || !loginRes.body?.dados?.token) {
      throw new Error(
        'Falha no login para testes. Garanta um ADMIN seedado no BD de teste (email/senha em .env.test).'
      );
    }

    token = loginRes.body.dados.token;
  });

  const clienteBase = {
    nome: 'Cliente Teste',
    cpfCnpj: `123.456.789-09`,
    telefone: '(67) 99999-0000',
    email: `cliente_${Date.now()}@email.com`,
    endereco: 'Rua A, 123 - Centro',
  };

  it('deve criar um novo cliente com sucesso', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send(clienteBase);

    expect(res.statusCode).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('id');
  });

  it('deve falhar ao tentar criar cliente com e-mail duplicado', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...clienteBase,
        // mantém o mesmo e-mail; cpfCnpj pode mudar
        cpfCnpj: '987.654.321-00',
      });

    // seu service lança 409 em unicidade; ajuste aqui se seu handler padroniza para 400
    expect([400, 409]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(false);
    expect(String(res.body.mensagem || res.body.error || '')).toMatch(/já cadast|existe/i);
  });

  it('deve retornar uma lista de clientes', async () => {
    const res = await request(app)
      .get('/api/clientes?q=cliente')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('data');
    expect(Array.isArray(res.body.dados.data)).toBe(true);
  });

  describe('GET/PUT/DELETE /api/clientes/:id', () => {
    let clienteId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Cliente Para Operações',
          email: `ops_${Date.now()}@email.com`,
          cpfCnpj: '111.222.333-44',
          telefone: '(67) 98888-7777',
          endereco: 'Rua B, 45',
        });

      if (res.status !== 201) {
        throw new Error('Não foi possível criar cliente para testes de GET/PUT/DELETE');
      }
      clienteId = res.body.dados.id;
    });

    it('deve obter o cliente por ID', async () => {
      const res = await request(app)
        .get(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id', clienteId);
    });

    it('deve atualizar o cliente com sucesso', async () => {
      const res = await request(app)
        .put(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Cliente Atualizado' });

      expect(res.statusCode).toBe(200);
      expect(String(res.body.mensagem || '')).toMatch(/atualizado/i);
    });

    it('deve excluir (inativar) o cliente com sucesso', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(String(res.body.mensagem || '')).toMatch(/inativ|excluíd/i);
    });
  });
});
