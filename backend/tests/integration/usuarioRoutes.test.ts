import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../app';

describe('POST /api/usuarios', () => {
  const usuarioBase = {
    nome: 'Usuário Teste',
    email: `teste${Date.now()}@email.com`,
    senha: '123456',
    cargo: 'admin'
  };

  it('deve criar um novo usuário com sucesso', async () => {
    const res = await request(app).post('/api/usuarios').send(usuarioBase);
    expect(res.statusCode).toBe(201);
    expect(res.body.sucesso).toBe(true);
  });

  it('deve falhar ao tentar criar com e-mail duplicado', async () => {
    const res = await request(app).post('/api/usuarios').send(usuarioBase);
    expect(res.statusCode).toBe(400);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.mensagem).toMatch(/já existe/i);
  });
});

describe('GET /api/usuarios', () => {
  it('deve retornar uma lista de usuários', async () => {
    const res = await request(app).get('/api/usuarios');

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados)).toBe(true);

    if (res.body.dados.length > 0) {
      expect(res.body.dados[0]).toHaveProperty('email');
      expect(res.body.dados[0]).toHaveProperty('nome');
    }
  });
});

describe('PUT /api/usuarios/:id', () => {
  let userId: number;

  beforeAll(async () => {
    const res = await request(app).post('/api/usuarios').send({
      nome: 'Usuário Atualizar',
      email: `atualiza${Date.now()}@email.com`,
      senha: '123456',
      cargo: 'admin'
    });

    userId = res.body.dados.id;
  });

  it('deve atualizar o nome do usuário com sucesso', async () => {
    const res = await request(app)
      .put(`/api/usuarios/${userId}`)
      .send({ nome: 'Nome Atualizado' });

    expect(res.statusCode).toBe(200);
    expect(res.body.mensagem).toMatch(/atualizado/i);
  });
});

describe('DELETE /api/usuarios/:id', () => {
  let userId: number;

  beforeAll(async () => {
    const res = await request(app).post('/api/usuarios').send({
      nome: 'Usuário Deletar',
      email: `deleta${Date.now()}@email.com`,
      senha: '123456',
      cargo: 'admin'
    });

    userId = res.body.dados.id;
  });

  it('deve excluir o usuário com sucesso', async () => {
    const res = await request(app).delete(`/api/usuarios/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.mensagem).toMatch(/excluído/i);
  });
});