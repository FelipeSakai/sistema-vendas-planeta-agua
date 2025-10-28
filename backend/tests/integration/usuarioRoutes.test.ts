// tests/integration/usuarioRoutes.test.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';
import { Cargo } from '@prisma/client';

describe('Rotas de /api/usuarios (com autenticação)', () => {
  let token: string;

  beforeAll(async () => {
    const adminEmail = 'admin@meusistema.com';
    const adminSenha = 'admin123';

    // login direto
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: adminEmail, senha: adminSenha });

    // se admin ainda não existir, cria e refaz o login
    if (loginRes.status !== 200 || !loginRes.body?.dados?.token) {
      await request(app)
        .post('/api/usuarios')
        .send({
          nome: 'Administrador',
          email: adminEmail,
          senha: adminSenha,
          cargo: Cargo.ADMIN,
        });
    }

    const relogin = await request(app)
      .post('/auth/login')
      .send({ email: adminEmail, senha: adminSenha });

    token = relogin.body?.dados?.token;
    expect(token).toBeTruthy();
  });

  const usuarioBase = {
    nome: 'Usuário Teste',
    email: `teste${Date.now()}@email.com`,
    senha: 'admin123',
    cargo: Cargo.ADMIN,
  };

  it('deve criar um novo usuário com sucesso', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send(usuarioBase);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(true);
  });

  it('deve falhar ao tentar criar com e-mail duplicado', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send(usuarioBase);

    expect([400, 409]).toContain(res.statusCode);
    expect(res.body.sucesso).toBe(false);
    expect(String(res.body.mensagem || '')).toMatch(/já existe|duplicad/i);
  });

  it('deve retornar uma lista de usuários', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados)).toBe(true);

    if (res.body.dados.length > 0) {
      expect(res.body.dados[0]).toHaveProperty('email');
      expect(res.body.dados[0]).toHaveProperty('nome');
    }
  });

  describe('PUT /api/usuarios/:id', () => {
    let userId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Usuário Atualizar',
          email: `atualiza${Date.now()}@email.com`,
          senha: 'admin123',
          cargo: Cargo.ADMIN,
        });

      expect([200, 201]).toContain(res.statusCode);
      userId = res.body.dados.id;
    });

    it('deve atualizar o nome do usuário com sucesso', async () => {
      const res = await request(app)
        .put(`/api/usuarios/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Nome Atualizado' });

      expect([200, 204]).toContain(res.statusCode);
      expect(String(res.body.mensagem || '')).toMatch(/atualizad/i);
    });
  });

  describe('DELETE /api/usuarios/:id', () => {
    let userId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: 'Usuário Deletar',
          email: `deleta${Date.now()}@email.com`,
          senha: 'admin123',
          cargo: Cargo.ADMIN,
        });

      expect([200, 201]).toContain(res.statusCode);
      userId = res.body.dados.id;
    });

    it('deve excluir o usuário com sucesso', async () => {
      const res = await request(app)
        .delete(`/api/usuarios/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.statusCode);
      expect(String(res.body.mensagem || '')).toMatch(/excluíd|inativ/i);
    });
  });
});
