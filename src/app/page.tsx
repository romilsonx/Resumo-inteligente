'use client';

import { useState, useEffect } from 'react';
import SummaryCard from '@/components/SummaryCard';
import { TwitterIcon, LinkedInIcon, EmailIcon } from '@/components/Icons';

// --- Definição de Tipos e Constantes ---

// Descreve a estrutura esperada dos resultados da API.
interface SummaryResults {
  tweet: string;
  linkedin: string;
  email: string;
}

// Descreve a estrutura dos dados de uso armazenados no localStorage.
interface UsageInfo {
  count: number;
  firstAttempt: number; // Timestamp da primeira tentativa
}

// Constantes para a lógica de limitação de uso.
const MAX_ATTEMPTS = 5; // Limite de 5 tentativas...
const TIME_WINDOW_MS = 60 * 60 * 1000; // ...a cada 1 hora.

// --- Componente Principal da Página ---

export default function Home() {
  // --- Estados do Componente ---

  // Armazena o texto que o usuário digita na textarea.
  const [text, setText] = useState('');
  // Controla a exibição de indicadores de carregamento (ex: spinner) durante a chamada da API.
  const [loading, setLoading] = useState(false);
  // Armazena os resumos recebidos da API.
  const [results, setResults] = useState<SummaryResults | null>(null);
  // Armazena mensagens de erro para serem exibidas ao usuário.
  const [error, setError] = useState<string | null>(null);
  // Armazena o estado de uso atual para controlar o rate limit.
  const [usage, setUsage] = useState({ attempts: 0, canSubmit: true });

  // --- Lógica de Limitação de Uso (Rate Limiting) ---

  /**
   * Verifica o localStorage para ver se o usuário ainda pode fazer uma requisição.
   * Reseta a contagem se a janela de tempo (1 hora) já passou.
   */
  const checkUsage = () => {
    const usageData = localStorage.getItem('summaryUsage');
    if (!usageData) return { canSubmit: true, attempts: 0 };

    const parsedData: UsageInfo = JSON.parse(usageData);
    const now = Date.now();

    // Se a primeira tentativa foi há mais de uma hora, limpa o registro.
    if (now - parsedData.firstAttempt > TIME_WINDOW_MS) {
      localStorage.removeItem('summaryUsage');
      return { canSubmit: true, attempts: 0 };
    }

    // Bloqueia se o número de tentativas exceder o máximo.
    if (parsedData.count >= MAX_ATTEMPTS) {
      return { canSubmit: false, attempts: parsedData.count };
    }

    return { canSubmit: true, attempts: parsedData.count };
  };

  /**
   * Registra uma nova tentativa de uso no localStorage.
   * É chamado apenas quando a chamada à API tem sucesso.
   */
  const recordUsage = () => {
    const usageData = localStorage.getItem('summaryUsage');
    const now = Date.now();
    let newUsage: UsageInfo;

    if (usageData) {
      const parsedData: UsageInfo = JSON.parse(usageData);
      newUsage = { ...parsedData, count: parsedData.count + 1 };
    } else {
      // Se for a primeira vez, cria o registro.
      newUsage = { count: 1, firstAttempt: now };
    }
    localStorage.setItem('summaryUsage', JSON.stringify(newUsage));
    setUsage({ attempts: newUsage.count, canSubmit: newUsage.count < MAX_ATTEMPTS });
  };

  // Efeito que roda uma vez quando o componente é montado para verificar o uso.
  useEffect(() => {
    const usageStatus = checkUsage();
    setUsage({ attempts: usageStatus.attempts, canSubmit: usageStatus.canSubmit });
  }, []);

  // --- Handler de Submissão do Formulário ---

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Re-verifica o limite de uso no momento da submissão.
    const usageStatus = checkUsage();
    if (!usageStatus.canSubmit) {
      setError(`Você atingiu o limite de ${MAX_ATTEMPTS} resumos por hora. Tente novamente mais tarde.`);
      return;
    }

    if (!text.trim()) {
      setError('Por favor, insira um texto para resumir.');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Faz a chamada de API para o nosso endpoint backend.
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar resumo da API.');
      }

      const data: SummaryResults = await response.json();
      setResults(data); // Salva os resultados no estado
      recordUsage(); // Registra o uso bem-sucedido

    } catch (err) {
      let errorMessage = 'Ocorreu um erro ao gerar o resumo. Tente novamente.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false); // Garante que o estado de loading termine
    }
  };

  // --- Renderização do Componente (JSX) ---
  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-3xl mb-10">
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-800 dark:text-white text-center mb-2">
          Resumo Inteligente
        </h1>
        <p className="text-md sm:text-lg text-gray-600 dark:text-gray-300 text-center mb-8">
          Cole seu texto e deixe a IA criar resumos para você em segundos. (Limite: {usage.attempts}/{MAX_ATTEMPTS} por hora)
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-60 sm:h-72 p-3 bg-transparent text-gray-700 dark:text-gray-200 border-none focus:ring-0 resize-none"
              placeholder="Digite ou cole seu texto aqui..."
            />
          </div>
          <button
            type="submit"
            disabled={loading || !text || !usage.canSubmit}
            className="mt-5 w-full bg-blue-600 text-white py-3.5 px-6 rounded-lg text-lg font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-500"
          >
            {loading ? 'Gerando Resumo...' : 'Gerar Resumo'}
          </button>
        </form>

        {/* Seção de Erro: aparece apenas se houver uma mensagem de erro no estado */}
        {error && (
          <div className="mt-8 text-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Seção de Loading: aparece apenas durante a chamada da API */}
        {loading && (
            <div className="mt-8 w-full flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 dark:text-gray-300 mt-4">Analisando o texto e gerando os resumos...</p>
            </div>
        )}

        {/* Seção de Resultados: aparece apenas após um sucesso da API */}
        {results && (
          <div className="mt-10 w-full">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">Seus Resumos Gerados:</h2>
            <div className="space-y-6">
              <SummaryCard title="Tweet" content={results.tweet} icon={<TwitterIcon />} colorClass="border-t-sky-500" />
              <SummaryCard title="LinkedIn" content={results.linkedin} icon={<LinkedInIcon />} colorClass="border-t-blue-700" />
              <SummaryCard title="E-mail" content={results.email} icon={<EmailIcon />} colorClass="border-t-gray-600" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
