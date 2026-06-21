type Props = { nome: string; vencimento: string; taxaCompra: number; taxaVenda: number; precoCompra: number; precoVenda: number };

export function CardTesouro({ nome, vencimento, taxaCompra, taxaVenda, precoCompra, precoVenda }: Props) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-2 hover:border-green-500 hover:scale-[1.02] transition-all shadow-lg">
      <span className="text-xs font-bold bg-green-700 text-white px-2 py-0.5 rounded-full w-fit">Tesouro Direto</span>
      <p className="text-white text-sm font-semibold leading-tight">{nome}</p>
      <p className="text-gray-400 text-xs">📅 Vence: {new Date(vencimento).toLocaleDateString('pt-BR')}</p>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-green-400">Compra: {taxaCompra?.toFixed(2)}% a.a.</span>
        <span className="text-red-400">Venda: {taxaVenda?.toFixed(2)}% a.a.</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>💵 {precoCompra?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        <span>💴 {precoVenda?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </div>
  );
}
