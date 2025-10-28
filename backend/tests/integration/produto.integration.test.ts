import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';

describe('Rotas /api/produtos (integração)', () => {
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

  const gerarNomeProduto = () => `Galão ${Math.floor(Math.random() * 10000)}L`;

  it('✅ deve criar um novo produto com sucesso', async () => {
    const produtoBase = {
      nome: gerarNomeProduto(),
      preco: 20.5,
      tipo: 'água',
      estoque: 50,
    };

    const res = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .field('nome', produtoBase.nome)
      .field('preco', produtoBase.preco)
      .field('tipo', produtoBase.tipo)
      .field('estoque', produtoBase.estoque);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toHaveProperty('id');
  });

  it('📋 deve retornar lista de produtos', async () => {
    const res = await request(app)
      .get('/api/produtos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados.data)).toBe(true);
  });

  describe('🧩 GET/PUT/DELETE /api/produtos/:id', () => {
    let produtoId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${token}`)
        .field('nome', gerarNomeProduto())
        .field('preco', 15.0)
        .field('tipo', 'água')
        .field('estoque', 30);

      if (![200, 201].includes(res.status)) {
        console.error('❌ Erro ao criar produto para testes:', res.body);
        throw new Error('❌ Não foi possível criar produto para testes de GET/PUT/DELETE');
      }

      produtoId = res.body.dados.id;
    });

    it('🔍 deve obter o produto por ID', async () => {
      const res = await request(app)
        .get(`/api/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toHaveProperty('id', produtoId);
    });

    it('✏ deve atualizar o produto com sucesso', async () => {
      const res = await request(app)
        .put(`/api/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ preco: 25.0 });

      expect(res.statusCode).toBe(200);
      expect(String(res.body.mensagem || '')).toMatch(/atualizado/i);
    });

    it('🗑 deve excluir (inativar) o produto com sucesso', async () => {
      const res = await request(app)
        .delete(`/api/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.statusCode);
      expect(String(res.body.mensagem || '')).toMatch(/exclu|inativ/i);
    });
  });
});
