import fastify from "fastify";
import { DatabasePostgres } from "./database-postgres.js";
import fastifyFormBody from 'fastify-formbody';
import fastifyCors from "fastify-cors";

const server = fastify();
const database = new DatabasePostgres();
// eslint-disable-next-line no-undef
const port = process.env.PORT || 3000;

server.register(fastifyFormBody);
server.register(fastifyCors, {
  origin: "*",
});


server.get('/turmas/:id_turma/aluno', async (request, reply) => {
  try {
    const idTurma = request.params.id_turma; // Acessando o parâmetro de rota corretamente
    console.log(`Recebida solicitação para buscar alunos da turma com ID ${idTurma}`);
    
    if (!idTurma) {
      console.error('ID da turma não fornecido.');
      reply.code(400).send({ message: 'ID da turma não fornecido.' });
      return;
    }

    console.log(`Buscando alunos para a turma com ID ${idTurma}...`);
    const alunos = await database.listAlunosByTurma(idTurma);
    console.log(`Alunos encontrados para a turma com ID ${idTurma}:`, alunos);
    
    // Retorna a lista de alunos como resposta
    reply.send(alunos);
  } catch (error) {
    console.error('Erro ao buscar alunos por turma:', error);
    
    // Retorna uma resposta de erro com código 500
    reply.code(500).send({ message: 'Erro ao buscar alunos por turma' });
  }
});



server.get('/turmas/:id_turma', async (request) => {
  const search = request.query.search;
  const turmas = await database.listTurmas(search);
  return turmas;
});


server.get('/turmas', async (request) => {
  const search = request.query.search;
  const turmas = await database.listTurmas(search);
  return turmas;
});


server.put('/turma/:matricula', async (request, reply) => {
  try {
    const { matricula, npresenca } = request.body;

    if (!matricula) {
      return reply.code(400).send({ message: 'A propriedade matricula é obrigatória no corpo da requisição.' });
    }

    if (npresenca === undefined) {
      return reply.code(400).send({ message: 'A propriedade npresenca é obrigatória no corpo da requisição.' });
    }

    if (isNaN(npresenca)) {
      return reply.code(400).send({ message: 'npresenca deve ser um número' });
    }

    await database.atualizarPresencaEStatus(matricula, parseInt(npresenca));
    return reply.code(200).send({ message: 'Presença do aluno atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar presença do aluno:', error);
    return reply.code(500).send({ message: 'Erro ao atualizar presença do aluno' });
  }
});



server.listen(port, (err) => {
  if (err) {
    console.error(err);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
  console.log(`Server is now listening on port ${port}`);
});
