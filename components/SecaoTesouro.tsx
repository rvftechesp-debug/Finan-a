'use client';

import { useEffect, useState } from 'react';
import { CardTesouro } from './CardTesouro';

type Titulo = {
  titulo: string;
  vencimento: string;
  taxaCompra: number;
  taxaVenda: number;
  precoUnitarioCompra: number;
  precoUnitarioVenda: number;
};

export function SecaoTesouro() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tesouro-direto')
      .then((res) => res.json())
      .then((json) => setTitulos(json.data ?? []))
      .catch(() => setErro('Erro ao carregar Tesouro Direto'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (erro) return <p className="text-red-400 text-sm">{erro}</p>;

  return (
    <section>
      <h2 className="text-white text-lg font-bold mb-4">🏛️ Tesouro Direto</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {titulos.map((t) => (
          <CardTesouro
            key={`${t.titulo}-${t.vencimento}`}
            nome={t.titulo}
            vencimento={t.vencimento}
            taxaCompra={t.taxaCompra}
            taxaVenda={t.taxaVenda}
            precoCompra={t.precoUnitarioCompra}
            precoVenda={t.precoUnitarioVenda}
          />
        ))}
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-2xl p-4 h-36 animate-pulse"
        />
      ))}
    </div>
  );
}
