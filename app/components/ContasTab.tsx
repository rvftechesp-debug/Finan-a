"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Wallet, Plus, RefreshCw, Building2, Upload, Loader } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { splitPluggyTransactions } from "@/app/utils/mapPluggyToExpense";
import type { useFinance } from "@/app/hooks/useFinance";
import dynamic from "next/dynamic";
import { parseOFX, parseCSV, parseOFXBankName, guessCategory } from "@/app/utils/ofxParser";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => m.PluggyConnect),
  { ssr: false }
);

interface PluggyItem {
  id: string;
  item_id: string;
  connector_name: string | null;
  status: string;
}

export function ContasTab({ finance }: { finance: ReturnType<typeof useFinance> }) {
  const [items, setItems] = useState<PluggyItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // ===== Import OFX =====
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/pluggy/items");
    const { items } = await res.json();
    setItems(items ?? []);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const connect = async () => {
    setLoading(true);
    const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
    const { accessToken } = await res.json();
    setToken(accessToken);
    setOpen(true);
    setLoading(false);
  };

  const handleSuccess = async (data: { item: { id: string } }) => {
    await fetch("/api/pluggy/items", {
      method: "POST",
      body: JSON.stringify({ itemId: data.item.id }),
    });
    setOpen(false);
    loadItems();
  };

  const syncTransactions = async (itemId: string) => {
    setSyncing(itemId);
    try {
      const res = await fetch(`/api/pluggy/transactions?itemId=${itemId}`);
      const { transactions } = await res.json();
      const { expenses, incomes } = splitPluggyTransactions(transactions);

      const existing = new Set(
        finance.expenses.map(e => `${e.description}|${e.date}|${e.amount}`)
      );

      let imported = 0;

      for (const exp of expenses) {
        const key = `${exp.description}|${exp.date}|${exp.amount}`;
        if (existing.has(key)) continue;
        const ok = await finance.addExpense({
          description: exp.description!,
          category: exp.category!,
          amount: String(exp.amount),
          date: exp.date!,
        });
        if (ok) imported++;
      }

      for (const inc of incomes) {
        await finance.addIncome(
          String(inc.amount),
          inc.description,
          "Open Finance",
          inc.date
        );
        imported++;
      }

      alert(`✅ ${imported} lançamentos importados de ${transactions.length} transações.`);
    } catch (e) {
      alert("Erro ao sincronizar: " + String(e));
    } finally {
      setSyncing(null);
    }
  };

  // ===== Handler do import OFX =====
  const handleImportOFX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setResultado(null);
    try {
      const content = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const banco = ext === "csv" ? "extrato" : parseOFXBankName(content);
      const txs = ext === "csv" ? parseCSV(content) : parseOFX(content);

      if (txs.length === 0) {
        setResultado("Nenhuma transação encontrada no arquivo.");
        return;
      }

      // evita duplicar com o que já existe
      const existing = new Set(
        finance.expenses.map(ex => `${ex.description}|${ex.date}|${ex.amount}`)
      );

      let gastos = 0;
      let receitas = 0;

      for (const tx of txs) {
        if (tx.amount < 0) {
          const amountStr = String(Math.abs(tx.amount));
          const key = `${tx.description}|${tx.date}|${amountStr}`;
          if (existing.has(key)) continue;
          await finance.addExpense({
            description: tx.description,
            category: guessCategory(tx.description),
            amount: amountStr,
            date: tx.date,
            due_date: null,
            source: banco,
          });
          gastos++;
        } else if (tx.amount > 0) {
          await finance.addIncome(
            String(tx.amount),
            tx.description,
            "extrato",
            tx.date,
            banco
          );
          receitas++;
        }
      }

      setResultado(`✅ Importado: ${gastos} gasto(s) e ${receitas} receita(s).`);
    } catch (err) {
      console.error(err);
      setResultado("❌ Erro ao ler o arquivo. Verifique se é um .ofx válido.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-orange-500" /> Contas Conectadas
        </h2>
        <button
          onClick={connect}
          disabled={loading}
          className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-4 py-2 text-sm flex items-center gap-2 hover:opacity-85 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Conectar banco
        </button>
      </div>

      {/* ===== Importar Extrato OFX (grátis) ===== */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-white text-base m-0">Importar Extrato (OFX)</h3>
        </div>
        <p className="text-[#888] text-sm mb-4">
          Baixe o extrato do seu banco no formato <b>.ofx</b> e importe aqui.
          Grátis e sem conectar sua conta.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".ofx,.csv,application/x-ofx,text/csv"
          onChange={handleImportOFX}
          className="hidden"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-60"
        >
          {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? "Importando..." : "Selecionar arquivo .ofx ou .csv"}
        </button>

        {resultado && <p className="mt-3 text-sm text-[#ccc]">{resultado}</p>}

        <details className="mt-4 text-xs text-[#888]">
          <summary className="cursor-pointer hover:text-white">Como baixar o extrato OFX?</summary>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li><b>Nubank:</b> app → conta → Exportar extrato → OFX</li>
            <li><b>Itaú:</b> internet banking → Extrato → Exportar → OFX</li>
            <li><b>Inter / C6 / BB:</b> Extrato → Exportar → OFX</li>
          </ul>
        </details>
      </div>

      {items.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardContent className="p-10 text-center text-[#888]">
            Nenhuma conta conectada ainda. Clique em "Conectar banco".
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((it) => (
            <Card key={it.id} className="bg-white/[0.03] border-white/[0.07]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {it.connector_name ?? "Banco"}
                    </p>
                    <p className="text-[#888] text-xs">{it.status}</p>
                  </div>
                </div>
                <button
                  onClick={() => syncTransactions(it.item_id)}
                  disabled={syncing === it.item_id}
                  className="text-[#888] hover:text-white flex items-center gap-1 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing === it.item_id ? "animate-spin" : ""}`} />
                  {syncing === it.item_id ? "Sincronizando..." : "Sincronizar"}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && token && (
        <PluggyConnect
          connectToken={token}
          onSuccess={handleSuccess}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
