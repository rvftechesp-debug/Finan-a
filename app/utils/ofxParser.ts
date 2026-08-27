export interface OFXTransaction {
  date: string;        // "2026-08-01"
  amount: number;      // negativo = gasto, positivo = receita
  description: string;
  fitid: string;       // id único da transação no banco (evita duplicar)
}

export function parseOFX(content: string): OFXTransaction[] {
  const txs: OFXTransaction[] = [];

  // Pega cada bloco <STMTTRN>...</STMTTRN>
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  for (const block of blocks) {
    const get = (tag: string) => {
      // OFX pode vir sem tag de fechamento: <TAG>valor
      const m = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };

    const rawDate = get("DTPOSTED");     // ex: 20260801 ou 20260801120000
    const rawAmount = get("TRNAMT");     // ex: -50.00
    const memo = get("MEMO") || get("NAME") || "Transação";
    const fitid = get("FITID");

    if (!rawDate || !rawAmount) continue;

    // Data: YYYYMMDD -> YYYY-MM-DD
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    const amount = parseFloat(rawAmount.replace(",", "."));

    if (isNaN(amount)) continue;

    txs.push({
      date,
      amount,
      description: decodeOFXText(memo),
      fitid: fitid || `${date}-${amount}-${memo}`,
    });
  }

  return txs;
}

// Corrige acentos/entidades comuns em arquivos OFX
function decodeOFXText(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
export function parseOFXBankName(content: string): string {
  const org = content.match(/<ORG>([^<\r\n]*)/i)?.[1]?.trim();
  const fid = content.match(/<FID>([^<\r\n]*)/i)?.[1]?.trim();
  return org || fid || "Banco importado";
}
// Tenta adivinhar a categoria pela descrição da transação
export function guessCategory(description: string): string {
  const desc = description.toLowerCase();

  if (/(ifood|rappi|restaurante|lanche|padaria|mercado|supermercado|hortifruti|acougue)/.test(desc)) return "Alimentação";
  if (/(uber|99|cabify|posto|combustivel|gasolina|etanol|estacionamento|pedagio|metro|onibus)/.test(desc)) return "Transporte";
  if (/(netflix|spotify|amazon prime|disney|hbo|assinatura|streaming|youtube)/.test(desc)) return "Assinaturas";
  if (/(aluguel|condominio|iptu|imobiliaria|luz|energia|enel|cpfl|agua|sabesp|internet|vivo|claro|tim|oi|telefone|celular|gas)/.test(desc)) return "Moradia";
  if (/(cinema|show|bar|balada|viagem|jogo|game|netshoes)/.test(desc)) return "Lazer";

  return "Outros";
}

// ===================== PARSE CSV =====================

type OFXTx = ReturnType<typeof parseOFX>[number];

export function parseCSV(content: string): OFXTx[] {
  const txs: OFXTx[] = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return txs;

  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = lines[0].toLowerCase().split(sep).map(h => h.trim());

  const findCol = (...keys: string[]) =>
    header.findIndex(h => keys.some(k => h.includes(k)));

  const iDate = findCol("data", "date");
  const iDesc = findCol("descri", "histó", "histo", "lançamento", "lancamento", "memo", "title");
  const iAmount = findCol("valor", "amount", "montante");

  if (iDate < 0 || iAmount < 0) return txs;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    const date = parseDateBR(cols[iDate]);
    const amount = parseAmountBR(cols[iAmount]);
    if (!date || isNaN(amount)) continue;

    const description = (iDesc >= 0 ? cols[iDesc] : "Transação") || "Transação";
    txs.push({ date, amount, description } as OFXTx);
  }

  return txs;
}

function parseDateBR(s: string): string | null {
  s = s?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseAmountBR(s: string): number {
  s = s?.trim().replace(/[R$\s]/g, "") ?? "";
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}
