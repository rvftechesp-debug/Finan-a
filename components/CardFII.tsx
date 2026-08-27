type Props = { ticker: string; nome: string; preco: number; variacao: number; dividendYield: number; pvp: number; ultimoDividendo: number | null };

export function CardFII({ ticker, nome, preco, variacao, dividendYield, pvp, ultimoDividendo }: Props) {
  const pos = variacao >= 0;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-2 hover:border-yellow-500 hover:scale-[1.02] transition-all shadow-lg">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold bg-yellow-600 text-white px-2 py-0.5 rounded-full">{ticker}</span>
        <span className={`text-sm font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>{pos ? '?' : '?'} {Math.abs(variacao).toFixed(2)}%</span>
      </div>
      <p className="text-gray-400 text-xs truncate">{nome}</p>
      <p className="text-white text-2xl font-bold">{preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-yellow-400">DY: {dividendYield?.toFixed(2) ?? "--"}%</span>
        <span className="text-gray-400">P/VP: {pvp?.toFixed(2) ?? "--"}</span>
      </div>
      {ultimoDividendo && <p className="text-gray-500 text-xs">?? Último: {ultimoDividendo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
    </div>
  );
}
