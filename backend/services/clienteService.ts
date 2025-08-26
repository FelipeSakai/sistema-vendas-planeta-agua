import { Status } from "@prisma/client";
import { prisma } from "../database/prisma";

export type ListarClientesFiltro = {
  geral?: string;          // busca livre: nome/email + dígitos em cpfCnpj/telefone
  cpfCnpj?: string;
  email?: string;
  page?: number;
  perPage?: number;
  incluirInativos?: boolean; // legado (mantido p/ compatibilidade)
  status?: "ATIVO" | "INATIVO" | "TODOS"; // NOVO: filtra status exatamente
};

type CriarClienteDTO = {
  nome: string;
  cpfCnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  status?: Status;
};

type AtualizarClienteDTO = Partial<CriarClienteDTO>;

// ===== Helpers =====
const digits = (s?: string | null) => (s ?? "").replace(/\D+/g, "");
const emptyToNull = <T extends Record<string, any>>(obj: T): T => {
  const out: any = { ...obj };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string" && out[k].trim() === "") out[k] = null;
  }
  return out;
};

function normalizarEntrada<T extends CriarClienteDTO | AtualizarClienteDTO>(data: T): T {
  const out: any = { ...data };
  if (typeof out.cpfCnpj === "string") out.cpfCnpj = digits(out.cpfCnpj);
  if (typeof out.telefone === "string") out.telefone = digits(out.telefone);
  if (typeof out.email === "string") out.email = out.email.trim().toLowerCase();
  if (typeof out.nome === "string") out.nome = out.nome.trim();
  if (typeof out.endereco === "string") out.endereco = out.endereco.trim();
  return emptyToNull(out);
}

async function assertUnicos({
  cpfCnpj,
  email,
  ignoreId,
}: { cpfCnpj?: string | null; email?: string | null; ignoreId?: number }) {
  if (cpfCnpj) {
    const jaExisteCpf = await prisma.cliente.findFirst({
      where: {
        cpfCnpj,
        NOT: ignoreId ? { id: ignoreId } : undefined,
      },
      select: { id: true },
    });
    if (jaExisteCpf) {
      const err = new Error("CPF/CNPJ já cadastrado para outro cliente.");
      (err as any).status = 409;
      throw err;
    }
  }

  if (email) {
    const jaExisteEmail = await prisma.cliente.findFirst({
      where: {
        email,
        NOT: ignoreId ? { id: ignoreId } : undefined,
      },
      select: { id: true },
    });
    if (jaExisteEmail) {
      const err = new Error("E-mail já cadastrado para outro cliente.");
      (err as any).status = 409;
      throw err;
    }
  }
}

// ===== CRUD =====

/** Criar Cliente */
export async function criarCliente(data: CriarClienteDTO) {
  const payload = normalizarEntrada(data);

  if (!payload.nome) {
    const err = new Error("Nome é obrigatório.");
    (err as any).status = 400;
    throw err;
  }

  await assertUnicos({
    cpfCnpj: payload.cpfCnpj ?? undefined,
    email: payload.email ?? undefined,
  });

  const cliente = await prisma.cliente.create({
    data: {
      nome: payload.nome,
      cpfCnpj: payload.cpfCnpj ?? null,
      telefone: payload.telefone ?? null,
      email: payload.email ?? null,
      endereco: payload.endereco ?? null,
      status: payload.status ?? Status.ATIVO,
    },
  });

  return cliente;
}

/** Listar Clientes com filtros e paginação */
export async function listarClientes(filtro?: ListarClientesFiltro) {
  const {
    geral,
    cpfCnpj,
    email,
    page = 1,
    perPage = 10,
    incluirInativos = false,
    status, // <- NOVO
  } = filtro || {};

  const where: any = {};

  // Se "status" foi informado, ele manda; senão preserva regra antiga
  if (status === "ATIVO" || status === "INATIVO") {
    where.status = status as Status;
  } else if (!incluirInativos) {
    // legado: sem incluirInativos => somente ATIVOS
    where.status = Status.ATIVO;
  }
  // status === "TODOS" => não filtra status

  if (cpfCnpj) {
    where.cpfCnpj = digits(cpfCnpj);
  }

  if (email) {
    where.email = email.trim().toLowerCase();
  }

  if (geral && geral.trim()) {
    const termo = geral.trim();
    const termoDigits = digits(termo);

    where.OR = [
      { nome:   { contains: termo, mode: "insensitive" } },
      { email:  { contains: termo, mode: "insensitive" } },
      ...(termoDigits
        ? [
            { cpfCnpj:  { contains: termoDigits } },
            { telefone: { contains: termoDigits } },
          ]
        : []),
    ];
  }

  const take = Math.max(1, perPage);
  const skip = (Math.max(1, page) - 1) * take;

  const [total, data] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip,
      take,
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        email: true,
        endereco: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  return { page, perPage: take, total, totalPages, data };
}

/** Buscar Cliente por ID */
export async function buscarClientePorId(id: string) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    const err = new Error("ID inválido.");
    (err as any).status = 400;
    throw err;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: idNum },
  });

  if (!cliente) {
    const err = new Error("Cliente não encontrado.");
    (err as any).status = 404;
    throw err;
  }

  return cliente;
}

/** Atualizar Cliente */
export async function atualizarCliente(id: string, data: AtualizarClienteDTO) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    const err = new Error("ID inválido.");
    (err as any).status = 400;
    throw err;
  }

  const existente = await prisma.cliente.findUnique({
    where: { id: idNum },
    select: { id: true },
  });

  if (!existente) {
    const err = new Error("Cliente não encontrado.");
    (err as any).status = 404;
    throw err;
  }

  const payload = normalizarEntrada(data);

  await assertUnicos({
    cpfCnpj: payload.cpfCnpj ?? undefined,
    email: payload.email ?? undefined,
    ignoreId: idNum,
  });

  await prisma.cliente.update({
    where: { id: idNum },
    data: {
      nome: payload.nome ?? undefined,
      cpfCnpj: payload.cpfCnpj ?? undefined,
      telefone: payload.telefone ?? undefined,
      email: payload.email ?? undefined,
      endereco: payload.endereco ?? undefined,
      status: payload.status ?? undefined,
    },
  });

  return { mensagem: "Cliente atualizado com sucesso" };
}

/** Excluir Cliente (soft delete → INATIVO) */
export async function excluirCliente(id: string) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    const err = new Error("ID inválido.");
    (err as any).status = 400;
    throw err;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: idNum },
    select: { id: true, status: true },
  });

  if (!cliente) {
    const err = new Error("Cliente não encontrado.");
    (err as any).status = 404;
    throw err;
  }

  if (cliente.status === Status.INATIVO) {
    return { mensagem: "Cliente já estava inativo" };
  }

  await prisma.cliente.update({
    where: { id: idNum },
    data: { status: Status.INATIVO },
  });

  return { mensagem: "Cliente excluído (inativado) com sucesso" };
}
