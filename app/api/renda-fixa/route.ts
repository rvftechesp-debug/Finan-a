import { NextResponse } from 'next/server';

const INDICES = [
  { nome: 'SELIC',  codigo: 11,  descricao: 'Taxa SELIC' },
  { nome: 'CDI',    codigo: 12,  descricao: 'CDI diário' },
  { nome: 'IPCA',   codigo: 433, descricao: 'Inflação IPCA' },
  { nome: 'POUPANÇA', codigo: 195, descricao: 'Rendimento Poupança' },
];

export async function GET() {
  try {
    const results = await Promise.all(
      INDICES.map(async ({ nome, codigo, descricao }) => {
        const res = await fetch(
          `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`,
          { next: { revalidate: 3600 } } // cache 1h
        );
        const data = await res.json();
        const ultimo = data?.[0];

        return {
          nome,
          descricao,
          valor: ultimo?.valor ? parseFloat(ultimo.valor) : null,
          data: ultimo?.data ?? null,
        };
      })
    );

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar renda fixa' }, { status: 500 });
  }
}
