'use client';

import { useState, useEffect } from 'react';
import SummaryCard from '@/components/SummaryCard';

// --- Interfaces e Constantes ---
interface SummaryResults {
  tweet: string;
  linkedin: string;
  email: string;
}

interface UsageInfo {
  count: number;
  firstAttempt: number;
}

const MAX_ATTEMPTS = 5;
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hora

// --- Ícones ---
const TwitterIcon = () => <svg className="w-6 h-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.39.106-.803.163-1.227.163-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></svg>;
const LinkedInIcon = () => <svg className="w-6 h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z"></path></svg>;
const EmailIcon = () => <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>;

export default function Home() {
  // --- Estados ---
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SummaryResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState({ attempts: 0, canSubmit: true });

  // --- Lógica de Limitação de Uso ---
  const checkUsage = () => {
    const usageData = localStorage.getItem('summaryUsage');
    if (!usageData) return { canSubmit: true, attempts: 0 };

    const parsedData: UsageInfo = JSON.parse(usageData);
    const now = Date.now();

    if (now - parsedData.firstAttempt > TIME_WINDOW_MS) {
      localStorage.removeItem('summaryUsage');
      return { canSubmit: true, attempts: 0 };
    }

    if (parsedData.count >= MAX_ATTEMPTS) {
      return { canSubmit: false, attempts: parsedData.count };
    }

    return { canSubmit: true, attempts: parsedData.count };
  };

  const recordUsage = () => {
    const usageData = localStorage.getItem('summaryUsage');
    const now = Date.now();
    let newUsage: UsageInfo;

    if (usageData) {
      const parsedData: UsageInfo = JSON.parse(usageData);
      newUsage = { ...parsedData, count: parsedData.count + 1 };
    } else {
      newUsage = { count: 1, firstAttempt: now };
    }
    localStorage.setItem('summaryUsage', JSON.stringify(newUsage));
    setUsage({ attempts: newUsage.count, canSubmit: newUsage.count < MAX_ATTEMPTS });
  };

  useEffect(() => {
    const usageStatus = checkUsage();
    setUsage({ attempts: usageStatus.attempts, canSubmit: usageStatus.canSubmit });
  }, []);

  // --- Handler de Submissão ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

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
      setResults(data);
      recordUsage(); // Registra o uso apenas em caso de sucesso

    } catch (err) {
      let errorMessage = 'Ocorreu um erro ao gerar o resumo. Tente novamente.';
      if (err instanceof Error) {
        // Now it's safe to access err.message
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderização ---
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

        {error && (
          <div className="mt-8 text-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {loading && (
            <div className="mt-8 w-full flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 dark:text-gray-300 mt-4">Analisando o texto e gerando os resumos...</p>
            </div>
        )}

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