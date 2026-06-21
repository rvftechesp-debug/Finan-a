"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Tickers por Filtro ───────────────────────────────────────────────────────
const TICKERS_BY_FILTER: Record<string, string[]> = {
  "Ações": [
    "PETR4", "VALE3", "ITUB4", "BBDC4", "WEGE3",
    "RENT3", "ABEV3", "SUZB3", "GGBR4", "RADL3",
  ],
  "FIIs": [
    "MXRF11", "HGLG11", "KNRI11", "XPML11", "VISC11",
    "BCFF11", "HGRE11", "VRTA11", "RBRF11", "BTLG11",
  ],
  "ETFs": [
    "BOVA11", "SMAL11", "IVVB11", "HASH11", "GOLD11",
    "DIVO11", "SPXI11", "NASD11", "GOVE11", "ACWI11",
  ],
  "Criptomoedas": [
    "BTC", "ETH", "SOL", "XRP", "BNB",
    "ADA", "DOGE", "AVAX", "DOT", "MATIC",
  ],
  "Renda Fixa": [
    "IMAB11", "FIXA11", "GOVE11", "IRFM11",
    "LFTE11", "B5P211", "KDIF11", "XFIX11",
  ],
  "Tesouro Direto": [],
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Asset {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  isTesouroDireto?: boolean;
}

interface TesouroDiretoRaw {
  Nm_Titulo: string;
  Dt_Vencimento: string;
  Vl_PU_Compra_Manha: number;
  Vl_PU_Venda_Manha: number;
  Vl_PU_Base_Manha: number;
  Tx_Venda_Manha: number;
}

const FILTERS = [
  "Ações", "FIIs", "ETFs", "Criptomoedas", "Renda Fixa", "Tesouro Direto",
] as const;
type Filter = (typeof FILTERS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtVol(vol: number) {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="overflow-hidden bg-[#1a1a2e] border border-white/10 rounded-xl p-4 animate-pulse flex flex-col gap-3">
      <div className="h-4 w-20 bg-white/10 rounded" />
      <div className="h-3 w-32 bg-white/10 rounded" />
      <div className="h-6 w-24 bg-white/10 rounded" />
      <div className="flex gap-2">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>
    </div>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset }: { asset: Asset }) {
  const isPositive = asset.regularMarketChange >= 0;
  const isTD = asset.isTesouroDireto === true;
  const initials = asset.symbol.slice(0, 2);
  const logoUrl = `https://s3-symbol-logo.tradingview.com/${asset.symbol.toLowerCase()}--big.svg`;

  return (
    <div className="overflow-hidden bg-[#1a1a2e] border border-white/10 hover:border-purple-500/50 rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10">
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          {isTD ? (
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-400 text-[10px] font-bold">TD</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <img
                src={logoUrl}
                alt={asset.symbol}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="text-purple-300 text-xs font-bold">${initials}</span>`;
                  }
                }}
              />
            </div>
          )}
          <span className="text-white font-bold text-xs tracking-wide truncate">
            {asset.symbol}
          </span>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
            isPositive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isTD
            ? `${asset.regularMarketChangePercent.toFixed(2)}% a.a.`
            : `${isPositive ? "▲" : "▼"} ${Math.abs(asset.regularMarketChangePercent).toFixed(2)}%`}
        </span>
      </div>

      {/* Nome */}
      <p className="text-[#888] text-xs truncate">{asset.shortName || "—"}</p>

      {/* Preço */}
      <p className="text-white text-lg font-bold">
        {fmtBRL(asset.regularMarketPrice)}
      </p>

      {/* Variação */}
      {!isTD && (
        <p className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{fmtBRL(asset.regularMarketChange)} hoje
        </p>
      )}

      {/* Footer */}
      <div className="flex gap-3 text-[10px] text-[#666] pt-1 border-t border-white/5">
        {isTD ? (
          <>
            <span>Compra: {fmtBRL(asset.regularMarketDayLow)}</span>
            <span>Venda: {fmtBRL(asset.regularMarketDayHigh)}</span>
          </>
        ) : (
          <>
            <span>↓ {fmtBRL(asset.regularMarketDayLow)}</span>
            <span>↑ {fmtBRL(asset.regularMarketDayHigh)}</span>
            {asset.regularMarketVolume > 0 && (
              <span className="ml-auto">Vol: {fmtVol(asset.regularMarketVolume)}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function RadarTab() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Ações");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

 const fetchAssets = useCallback(async (filter: string) => {
  setLoading(true);
  setError(null);
  setAssets([]);

  try {
    // ── 1. Tesouro Direto ─────────────────────────────────────────────
    if (filter === "Tesouro Direto") {
      const res = await fetch("/api/tesouro-direto");
if (!res.ok) throw new Error(`Tesouro API: ${res.status}`);

const titulos = await res.json();
if (titulos.error) throw new Error(titulos.error);

const lista: any[] = Array.isArray(titulos) ? titulos : (titulos.data ?? []);
if (lista.length === 0) throw new Error("Nenhum título disponível");

const mapped: Asset[] = lista.map((item: any) => {

        const symbol = item.nome
          .replace("Tesouro ", "")
          .replace(" com Juros Semestrais", "+J")
          .slice(0, 12);

        const vencimento = item.vencimento
          ? ` · ${new Date(item.vencimento).getFullYear()}`
          : "";

        return {
          symbol,
          shortName: `${item.nome}${vencimento}`,
          regularMarketPrice: item.precoCompra ?? 0,
          regularMarketChange: 0,
          regularMarketChangePercent: item.taxaVenda ?? 0,
          regularMarketVolume: 0,
          regularMarketDayHigh: item.precoVenda ?? 0,
          regularMarketDayLow: item.precoCompra ?? 0,
          isTesouroDireto: true,
        };
      });

      setAssets(mapped);
      setLastUpdated(new Date());
      return;
    }

    // ── 2. Criptomoedas ───────────────────────────────────────────────
    if (filter === "Criptomoedas") {
      const res = await fetch("/api/crypto");
      if (!res.ok) throw new Error(`Crypto API: ${res.status}`);

      const cryptos = await res.json();
      if (cryptos.error) throw new Error(cryptos.error);

      const mapped: Asset[] = cryptos.map((c: any) => ({
        symbol: c.symbol ?? "",
        shortName: c.nome ?? "",
        regularMarketPrice: c.preco ?? 0,
        regularMarketChange: 0,
        regularMarketChangePercent: c.variacao ?? 0,
        regularMarketVolume: 0,
        regularMarketDayHigh: c.maxDia ?? 0,
        regularMarketDayLow: c.minDia ?? 0,
      }));

      setAssets(mapped);
      setLastUpdated(new Date());
      return;
    }

    // ── 3. FIIs ───────────────────────────────────────────────────────
    if (filter === "FIIs") {
      const res = await fetch("/api/fiis");
      if (!res.ok) throw new Error(`FIIs API: ${res.status}`);

      const fiis = await res.json();
      if (fiis.error) throw new Error(fiis.error);

      const mapped: Asset[] = fiis.map((f: any) => ({
        symbol: f.ticker ?? "",
        shortName: f.nome ?? "",
        regularMarketPrice: f.preco ?? 0,
        regularMarketChange: 0,
        regularMarketChangePercent: f.variacao ?? 0,
        regularMarketVolume: 0,
        regularMarketDayHigh: 0,
        regularMarketDayLow: 0,
      }));

      setAssets(mapped);
      setLastUpdated(new Date());
      return;
    }

    // ── 4. Ações / ETFs / Renda Fixa ──────────────────────────────────
const res = await fetch("/api/acoes");
if (!res.ok) throw new Error(`Ações API: ${res.status}`);

const data = await res.json();
if (data.error) throw new Error(data.error);

// ✅ Garante que é array antes de usar .filter()
const acoes: any[] = Array.isArray(data) ? data : [];
if (acoes.length === 0) throw new Error("Nenhum dado retornado pela API de ações");

const tickers = TICKERS_BY_FILTER[filter] ?? [];
const filtrados = tickers.length > 0
  ? acoes.filter((a) => tickers.includes(a.ticker))
  : acoes;

const mapped: Asset[] = filtrados.map((a) => ({
  symbol: a.ticker ?? "",
  shortName: a.nome ?? "",
  regularMarketPrice: a.preco ?? 0,
  regularMarketChange: 0,
  regularMarketChangePercent: a.variacao ?? 0,
  regularMarketVolume: a.volume ?? 0,
  regularMarketDayHigh: a.maxDia ?? 0,
  regularMarketDayLow: a.minDia ?? 0,
}));


    if (mapped.length === 0) {
      setError("Nenhum resultado retornado para este filtro.");
      return;
    }

    setAssets(mapped);
    setLastUpdated(new Date());

  } catch (err) {
    console.error("[RadarTab] Erro:", err);
    setError(
      err instanceof Error
        ? `Erro: ${err.message}`
        : "Não foi possível carregar os dados. Tente novamente."
    );
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchAssets(activeFilter);
  }, [activeFilter, fetchAssets]);

  // Auto-refresh a cada 2 minutos
  useEffect(() => {
    const interval = setInterval(() => fetchAssets(activeFilter), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeFilter, fetchAssets]);

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base">Radar de Mercado</h2>
          <p className="text-[#888] text-xs mt-0.5">
            Top 10 ativos em tempo real · B3
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[#555] text-[10px]">
              Atualizado{" "}
              {lastUpdated.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={() => fetchAssets(activeFilter)}
            disabled={loading}
            className="text-[10px] text-purple-400 border border-purple-500/30 rounded-lg px-3 py-1.5 hover:bg-purple-500/10 transition disabled:opacity-40"
          >
            {loading ? "⏳" : "↺ Atualizar"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeFilter === f
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-white/5 text-[#888] hover:bg-white/10 hover:text-white border border-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          <p className="font-semibold mb-1">⚠️ Falha ao carregar dados</p>
          <p className="text-xs opacity-80">{error}</p>
          <button
            onClick={() => fetchAssets(activeFilter)}
            className="mt-3 text-xs underline text-red-300 hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : assets.map((asset) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
      </div>

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && (
        <div className="text-center text-[#666] text-sm py-10">
          Nenhum dado disponível para este filtro.
        </div>
      )}
    </div>
  );
}
