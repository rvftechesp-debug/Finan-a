type Props = { symbol: string; nome: string; preco: number; variacao: number; maxDia: number; minDia: number; marketCap: number };

export function CardCrypto({ symbol, nome, preco, variacao, maxDia, minDia, marketCap }: Props) {
  const pos = variacao >= 0;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-2 hover:border-purple-500 hover:scale-[1.02] transition-all shadow-lg">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">{symbol}</span>
        <span className={`text-sm font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>{pos ? '▲' : '▼'} {Math.abs(variacao).toFixed(2)}%</span>
      </div>
      <p className="text-gray-400 text-xs">{nome}</p>
      <p className="text-white text-2xl font-bold">{preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <div className="flex justify-between text-xs text-gray-500">
        <span>↑ {maxDia?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        <span>↓ {minDia?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      {marketCap && <p className="text-gray-600 text-xs">Market Cap: R$ {(marketCap / 1e9).toFixed(1)}B</p>}
    </div>
  );
}
