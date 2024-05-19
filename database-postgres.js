import { sql } from "./db.js";
import { Resend } from 'resend';

// Configurar a chave da API do Resend
const API_KEY = 're_CNXT89Ky_Ac6NfZWhKkkrW8QL8JLQZsBK';

// Criar uma instância de Resend
const resend = new Resend(API_KEY);

export class DatabasePostgres {
  async  listAlunosByTurma(idTurma) {
    try {
        if (!idTurma) {
            throw new Error('O ID da turma não foi fornecido.');
        }

        // Log para verificar o ID da turma recebido
        console.log(`ID da turma recebido para consulta: ${idTurma}`);

        const alunos = await sql`SELECT * FROM aluno WHERE id_turma = ${idTurma}`;
        
        // Log para verificar o resultado da consulta
        console.log(`Resultado da consulta para a turma ${idTurma}:`, alunos);
        
        return alunos;
    } catch (error) {
        console.error(`Erro ao listar alunos por turma: ${error.message}`);
        throw new Error(`Erro ao listar alunos por turma: ${error.message}`);
    }
}



  
  async listTurmas(search) {
    try {
      const turmas = search ?
        await sql`SELECT * FROM turma WHERE id_turma ILIKE ${'%' + search + '%'} OR nome ILIKE ${'%' + search + '%'} OR descricao ILIKE ${'%' + search + '%'}` :
        await sql`SELECT * FROM turma`;
      return turmas;
    } catch (error) {
      throw new Error(`Erro ao listar turmas: ${error.message}`);
    }
  }
  
  async listAnos() {
    try {
      const anos = await sql`SELECT DISTINCT id FROM ano`;
      return anos;
    } catch (error) {
      throw new Error(`Erro ao listar anos: ${error.message}`);
    }
  }
  
  
  
  
  
  
  async atualizarPresencaEStatus(matricula, npresenca) {
    try {
        // Verificar se a matrícula é um valor válido
        if (!matricula || typeof matricula !== 'string' || matricula.trim() === '') {
            throw new Error('A matrícula do aluno é inválida.');
        }

        // Lógica para atualizar a presença do aluno no banco de dados
        console.log(`Buscando dados do aluno com matrícula ${matricula}...`);

        // Obter os dados do aluno
        const alunoResult = await sql`SELECT npresenca, contatoresponsavel FROM aluno WHERE matricula = ${matricula}`;

        console.log(`Resultado da busca para a matrícula ${matricula}:`, alunoResult);

        // Verificar se o aluno foi encontrado
        if (alunoResult && alunoResult.length > 0) {
            const aluno = alunoResult[0];
            const presencaAnterior = aluno.npresenca;
            const responsavelEmail = aluno.contatoresponsavel;

            // Calcular a nova presença
            const novaPresenca = presencaAnterior + npresenca;
            console.log(`Presença atualizada para o aluno com matrícula ${matricula}. Nova presença: ${novaPresenca}`);

            // Atualizar o número de presenças na tabela do banco de dados
            await sql`UPDATE aluno SET npresenca = ${novaPresenca} WHERE matricula = ${matricula}`;

            // Verificar se houve presença para atualizar o email e o status
            if (npresenca > 0) {
                const totalAulas = 300;
                // Calcular o novo status do aluno
                const novoStatus = this.calcularNovoStatus(novaPresenca, totalAulas);

                // Verificar se o status é 'Reprovado' e enviar e-mail para o responsável
                if (novoStatus === 'Reprovado') {
                    await this.enviarEmailReprovacao(responsavelEmail);
                }

                // Atualizar o status do aluno na tabela do banco de dados
                await sql`UPDATE aluno SET status = ${novoStatus} WHERE matricula = ${matricula}`;
                console.log(`Presença e status atualizados para o aluno com matrícula ${matricula}`);
            }
        } else {
            // Se o aluno não for encontrado, lançar um erro
            throw new Error('Aluno não encontrado.');
        }
    } catch (error) {
        console.error(`Erro ao atualizar presença e status do aluno para a matrícula ${matricula}:`, error);
        throw error;
    }
}








  calcularNovoStatus(novaPresenca, totalAulas) {
    const percentualPresenca = (novaPresenca / totalAulas) * 100;
    return percentualPresenca >= 80 ? 'Aprovado' : 'Reprovado';
  }

  async enviarEmailReprovacao(responsavelEmail) {
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: responsavelEmail,
        subject: 'Alerta de Reprovação',
        html: 'Seu aluno foi reprovado devido à baixa presença.'
      });
      console.log('E-mail de alerta de reprovação enviado com sucesso para:', responsavelEmail);
    } catch (error) {
      console.error(`Erro ao enviar e-mail de reprovação para ${responsavelEmail}:`, error);
      throw error;
    }
  }

  async registrarPresenca(matricula, presencaRegistrada) {
    try {
      await this.atualizarPresencaEStatus(matricula, presencaRegistrada);
      console.log(`Presença do aluno com matrícula ${matricula} registrada com sucesso`);
    } catch (error) {
      console.error(`Erro ao registrar presença do aluno:`, error);
      throw error;
    }
  }
}
