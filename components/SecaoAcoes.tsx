'use client';

import { useEffect, useState } from 'react';

interface Acao {
  ticker: string;
  segmento: string;
  nome: string;
  preco: number | null;
  variacao: number | null;
  maxDia: number | null;
  minDia: number | null;
  volume: number | null;
  moeda: string;
}

function formatBRL(value: number | null) {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatVariacao(value: number | null) {
  if (value === null) return '—';
  const sinal = value >= 0 ? '+' : '';
  return `${sinal}${value.toFixed(2)}%`;
}

function formatVolume(value: number | null) {
  if (value === null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function CardAcao({ acao }: { acao: Acao }) {
  const positivo = (acao.variacao ?? 0) >= 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
          {acao.ticker}
        </span>
        <span className={`text-sm font-semibold ${positivo ? 'text-green-500' : 'text-red-500'}`}>
          {formatVariacao(acao.variacao)}
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-3">
        {acao.nome}
      </p>

      <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {formatBRL(acao.preco)}
      </p>

      <div className="grid grid-cols-3 gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          <p className="font-medium text-zinc-400">Máx.</p>
          <p>{formatBRL(acao.maxDia)}</p>
        </div>
        <div>
          <p className="font-medium text-zinc-400">Mín.</p>
          <p>{formatBRL(acao.minDia)}</p>
        </div>
        <div>
          <p className="font-medium text-zinc-400">Vol.</p>
          <p>{formatVolume(acao.volume)}</p>
        </div>
      </div>
    </div>
  );
}

function SegmentoSection({ segmento, acoes }: { segmento: string; acoes: Acao[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-3 border-l-4 border-blue-500 pl-3">
        {segmento}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {acoes.map((acao) => (
          <CardAcao key={acao.ticker} acao={acao} />
        ))}
      </div>
    </section>
  );
}

const SEGMENTO_ICONS: Record<string, string> = {
  'Bancos': '🏦',
  'Energia / Petróleo': '🛢️',
  'Mineração / Siderurgia': '⛏️',
  'Varejo': '🛒',
  'Consumo / Alimentos': '🍖',
  'Construção / Imóveis': '🏗️',
  'Energia Elétrica': '⚡',
  'Tecnologia / Telecom': '💻',
};

export default function AcoesDashboard() {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtt, setUltimaAtt] = useState<string | null>(null);
  const [segmentoAtivo, setSegmentoAtivo] = useState<string>('Todos');

  async function fetchAcoes() {
    try {
      setLoading(true);
      setErro(null);
      const res = await fetch('/api/acoes');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAcoes(json.data);
      setUltimaAtt(new Date().toLocaleTimeString('pt-BR'));
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAcoes();
    const interval = setInterval(fetchAcoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Lista de segmentos únicos
  const segmentos = ['Todos', ...Array.from(new Set(acoes.map((a) => a.segmento)))];

  // Filtra as ações pelo segmento ativo
  const acoesFiltradas =
    segmentoAtivo === 'Todos' ? acoes : acoes.filter((a) => a.segmento === segmentoAtivo);

  // Agrupa por segmento
  const porSegmento = acoesFiltradas.reduce<Record<string, Acao[]>>((acc, acao) => {
    if (!acc[acao.segmento]) acc[acao.segmento] = [];
    acc[acao.segmento].push(acao);
    return acc;
  }, {});

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            📈 Mercado B3
          </h1>
          {ultimaAtt && (
            <p className="text-sm text-zinc-400 mt-1">
              Última atualização: {ultimaAtt}
            </p>
          )}
        </div>
        <button
          onClick={fetchAcoes}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className={loading ? 'animate-spin inline-block' : 'inline-block'}>⟳</span>
          Atualizar
        </button>
      </div>

      {/* Filtro por segmento */}
      {!loading && acoes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {segmentos.map((seg) => {
            const icon = seg === 'Todos' ? '🏛️' : (SEGMENTO_ICONS[seg] ?? '📊');
            const ativo = segmentoAtivo === seg;
            return (
              <button
                key={seg}
                onClick={() => setSegmentoAtivo(seg)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all ${
                  ativo
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                <span>{icon}</span>
                <span>{seg}</span>
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 ${
                    ativo
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {seg === 'Todos'
                    ? acoes.length
                    : acoes.filter((a) => a.segmento === seg).length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && acoes.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6">
          ⚠️ {erro}
        </div>
      )}

      {/* Segmentos com cards */}
      {!loading &&
        Object.entries(porSegmento).map(([segmento, acoes]) => (
          <SegmentoSection key={segmento} segmento={segmento} acoes={acoes} />
        ))}
    </main>
  );
}
