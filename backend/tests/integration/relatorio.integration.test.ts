// tests/integration/relatorio.integration.test.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';

describe('Rotas de /api/relatorios', () => {
  let token: string;

  beforeAll(async () => {
    const adminEmail = 'admin@meusistema.com';
    const adminSenha = 'admin123';

    // Login com o admin criado pelo seed
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: adminEmail, senha: adminSenha });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body?.dados?.token).toBeTruthy();

    token = loginRes.body.dados.token;
  });

  it('GET /api/relatorios/vendas/diario deve retornar relatório diário', async () => {
    const res = await request(app)
      .get('/api/relatorios/vendas/diario')
      .set('Authorization', `Bearer ${token}`)
      .query({ data: new Date().toISOString() });

    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('dados');
    if (res.body.dados) {
      expect(res.body.dados).toHaveProperty('totalVendas');
    }
  });

  it('GET /api/relatorios/estoque/atual deve retornar resumo do estoque', async () => {
    const res = await request(app)
      .get('/api/relatorios/estoque/atual')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'todos' });

    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('dados');
    if (res.body.dados) {
      expect(res.body.dados).toHaveProperty('valorEstoque');
    }
  });
});
