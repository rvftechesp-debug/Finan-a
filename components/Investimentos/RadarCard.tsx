import { TrendingUp, TrendingDown, Star } from "lucide-react";
import { RadarItem } from "@/lib/radarService";

interface Props {
  item: RadarItem;
  posicao: number;
}

export function RadarCard({ item, posicao }: Props) {
  const isPositivo = item.variacao >= 0;

  const scoreCor =
    item.score >= 75
      ? "text-green-400 bg-green-400/10"
      : item.score >= 50
      ? "text-yellow-400 bg-yellow-400/10"
      : "text-red-400 bg-red-400/10";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1a2e] border border-white/5 hover:border-purple-500/30 transition-all">
      {/* Posição */}
      <span className="text-xl font-bold text-white/20 w-6 text-center">
        {posicao}
      </span>

      {/* Logo */}
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
        {item.logoUrl ? (
          <img src={item.logoUrl} alt={item.ticker} className="w-8 h-8 object-contain" />
        ) : (
          <span className="text-xs font-bold text-purple-400">
            {item.ticker.slice(0, 2)}
          </span>
        )}
      </div>

      {/* Nome e destaque */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{item.ticker}</span>
          {posicao <= 3 && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
        </div>
        <p className="text-xs text-white/40 truncate">{item.destaque}</p>
      </div>

      {/* Indicadores */}
      <div className="hidden sm:flex gap-4 text-xs text-white/50">
        {item.dyAnual != null && (
          <div className="text-center">
            <p className="text-white/30">DY</p>
            <p className="text-green-400 font-medium">{item.dyAnual.toFixed(1)}%</p>
          </div>
        )}
        {item.pl != null && (
          <div className="text-center">
            <p className="text-white/30">P/L</p>
            <p className="text-white font-medium">{item.pl.toFixed(1)}</p>
          </div>
        )}
        {item.pvp != null && (
          <div className="text-center">
            <p className="text-white/30">P/VP</p>
            <p className="text-white font-medium">{item.pvp.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Preço e variação */}
      <div className="text-right shrink-0">
        <p className="font-bold text-white text-sm">
          {item.preco.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <div className={`flex items-center justify-end gap-1 text-xs font-medium ${isPositivo ? "text-green-400" : "text-red-400"}`}>
          {isPositivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositivo ? "+" : ""}{item.variacao.toFixed(2)}%
        </div>
      </div>

      {/* Score */}
      <div className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${scoreCor}`}>
        {item.score}
      </div>
    </div>
  );
}

