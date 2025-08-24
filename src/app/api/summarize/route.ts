import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Carrega a chave de API do ambiente. É crucial para a segurança que a chave não esteja no código.
const API_KEY = process.env.GOOGLE_API_KEY;

// Validação inicial para garantir que a chave de API foi configurada antes de continuar.
if (!API_KEY) {
  throw new Error('Google API key is not set in environment variables');
}

// Inicializa o cliente da Google AI com a chave de API.
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Handler para requisições POST. Este endpoint recebe um texto e retorna resumos gerados pela IA.
 * @param {Request} request - O objeto da requisição, contendo o corpo JSON.
 * @returns {NextResponse} - Uma resposta JSON com os resumos ou uma mensagem de erro.
 */
export async function POST(request: Request) {
  try {
    // Extrai o texto do corpo da requisição.
    const { text } = await request.json();

    // Validação de entrada: garante que o texto não seja nulo ou inválido.
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
    }

    // Configurações de segurança para instruir a IA a bloquear conteúdo potencialmente prejudicial.
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Seleciona o modelo de IA a ser usado e aplica as configurações de segurança na inicialização.
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings });

    // --- Engenharia de Prompt ---
    // O prompt é a instrução enviada para a IA. É cuidadosamente construído para:
    // 1. Dar um papel à IA ("especialista em comunicação").
    // 2. Forçar a saída para ser um objeto JSON válido, o que facilita o uso no frontend.
    // 3. Dar instruções claras para cada tipo de resumo desejado.
    const prompt = `
      Analise o texto abaixo e gere três resumos distintos. A sua resposta DEVE ser um objeto JSON válido, sem nenhuma formatação extra, texto ou marcações de código.

      O objeto JSON deve ter exatamente três chaves: "tweet", "linkedin", e "email".

      Texto para resumir:
      ---
      ${text}
      ---

      Instruções para cada resumo:
      1. "tweet": Um resumo curto e impactante para o Twitter (máximo 280 caracteres). Use 2 a 3 hashtags relevantes.
      2. "linkedin": Um resumo profissional para uma postagem no LinkedIn. Deve ser um pouco mais detalhado, engajante e pode terminar com uma chamada para ação.
      3. "email": Um resumo formal e objetivo, ideal para um e-mail de negócios. Deve focar nos pontos-chave de forma clara e direta.

      Retorne apenas o objeto JSON.
    `;

    // Envia o prompt para o modelo da IA e aguarda a resposta.
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // A IA deve retornar um texto que é uma string JSON. Fazemos o parse para transformá-la em um objeto JavaScript.
    const summaries = JSON.parse(responseText);

    // Retorna os resumos com sucesso para o frontend.
    return NextResponse.json(summaries);

  } catch (error) {
    // Tratamento de erros robusto.
    console.error('Error in API route:', error);
    
    // Se o erro for de sintaxe, provavelmente a IA não retornou um JSON válido.
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Falha ao processar a resposta da IA. O formato pode estar incorreto.' }, { status: 500 });
    }
    // Para todos os outros erros, retorna uma mensagem genérica.
    return NextResponse.json({ error: 'Ocorreu um erro interno ao gerar o resumo.' }, { status: 500 });
  }
}