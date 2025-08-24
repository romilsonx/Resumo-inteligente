import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  throw new Error('Google API key is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent(prompt, { safetySettings });
    const response = result.response;
    const responseText = response.text();

    // Tenta fazer o parse do texto da resposta, que deve ser um JSON
    const summaries = JSON.parse(responseText);

    return NextResponse.json(summaries);

  } catch (error) {
    console.error('Error in API route:', error);
    // Verifica se o erro é de parsing, o que pode indicar uma resposta mal formatada da IA
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Failed to parse summary from AI response. The format might be incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'An internal error occurred while generating the summary.' }, { status: 500 });
  }
}
