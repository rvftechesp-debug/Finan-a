import type { Transaction } from "@/app/types";

const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

export interface MonthlyReportData {
  userName: string;
  monthIndex: number;
  year: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

function buildReportHtml(data: MonthlyReportData): string {
  const monthName = MONTH_NAMES_FULL[data.monthIndex];
  const generatedAt = new Date().toLocaleString("pt-BR");
  const sorted = [...data.transactions].sort(
    (a, b) => +new Date(a.date + "T00:00:00") - +new Date(b.date + "T00:00:00")
  );

  const rows = sorted.length > 0
    ? sorted.map(tx => {
        const isIncome = tx.type === "income";
        const tipo = isIncome ? "Receita" : "Gasto";
        const valor = isIncome
          ? `+${formatBRL(tx.amount)}`
          : `-${formatBRL(tx.amount)}`;
        const rowClass = isIncome ? "income" : "expense";
        return `
          <tr class="${rowClass}">
            <td>${formatDate(tx.date)}</td>
            <td><span class="badge ${rowClass}">${tipo}</span></td>
            <td>${tx.description}</td>
            <td>${tx.category}</td>
            <td class="amount">${valor}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5" class="empty">Nenhum lançamento neste período.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Extrato FinançasPRO — ${monthName}/${data.year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #1a1a2e;
      background: #f5f5f8;
      padding: 32px 24px;
      line-height: 1.5;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f97316, #ec4899);
      color: #fff;
      padding: 28px 32px;
    }
    .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.9; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 24px 32px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .meta div span { display: block; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 24px 32px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }
    .summary-card {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }
    .summary-card .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .summary-card .value { font-size: 16px; font-weight: 700; }
    .summary-card.income .value { color: #10b981; }
    .summary-card.expense .value { color: #f97316; }
    .summary-card.balance .value { color: ${data.balance >= 0 ? "#10b981" : "#ef4444"}; }
    .summary-card.savings .value { color: #6366f1; }
    .section-title {
      padding: 20px 32px 12px;
      font-size: 14px;
      font-weight: 700;
      color: #444;
    }
    table {
      width: calc(100% - 64px);
      margin: 0 32px 32px;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      background: #f0f0f5;
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e8;
    }
    td {
      padding: 11px 12px;
      border-bottom: 1px solid #f0f0f5;
    }
    tr.income td { background: #f0fdf4; }
    tr.expense td { background: #fff; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge.income { background: #d1fae5; color: #065f46; }
    .badge.expense { background: #ffedd5; color: #9a3412; }
    .amount { font-weight: 700; text-align: right; white-space: nowrap; }
    tr.income .amount { color: #10b981; }
    tr.expense .amount { color: #f97316; }
    .empty { text-align: center; color: #888; padding: 24px !important; }
    .footer {
      padding: 16px 32px 24px;
      font-size: 11px;
      color: #aaa;
      text-align: center;
      border-top: 1px solid #eee;
    }
    .actions {
      padding: 0 32px 24px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-print { background: linear-gradient(135deg, #f97316, #ec4899); color: #fff; }
    .btn-download { background: #f0f0f5; color: #444; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; }
      .actions { display: none; }
      .summary { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 600px) {
      .summary { grid-template-columns: repeat(2, 1fr); }
      .meta { grid-template-columns: 1fr; }
      table { width: calc(100% - 32px); margin: 0 16px 24px; font-size: 12px; }
      th, td { padding: 8px 6px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>FinançasPRO — Extrato Mensal</h1>
      <p>Relatório completo de receitas e gastos</p>
    </div>

    <div class="meta">
      <div><span>Usuário</span><strong>${data.userName}</strong></div>
      <div><span>Período</span><strong>${monthName} de ${data.year}</strong></div>
      <div><span>Gerado em</span><strong>${generatedAt}</strong></div>
      <div><span>Total de lançamentos</span><strong>${data.transactions.length}</strong></div>
    </div>

    <div class="summary">
      <div class="summary-card income">
        <div class="label">Renda Total</div>
        <div class="value">${formatBRL(data.totalIncome)}</div>
      </div>
      <div class="summary-card expense">
        <div class="label">Gastos Total</div>
        <div class="value">${formatBRL(data.totalExpenses)}</div>
      </div>
      <div class="summary-card balance">
        <div class="label">Saldo</div>
        <div class="value">${formatBRL(data.balance)}</div>
      </div>
      <div class="summary-card savings">
        <div class="label">Taxa de Economia</div>
        <div class="value">${data.savingsRate.toFixed(1)}%</div>
      </div>
    </div>

    <div class="section-title">Lançamentos do período</div>

    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Tipo</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th style="text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="actions">
      <button class="btn btn-download" onclick="downloadReport()">Baixar HTML</button>
      <button class="btn btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>

    <div class="footer">
      FinançasPRO — Controle financeiro pessoal · Documento gerado automaticamente
    </div>
  </div>
  <script>
    function downloadReport() {
      const blob = new Blob([document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extrato-financaspro-${monthName.toLowerCase()}-${data.year}.html";
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

export function exportMonthlyReport(data: MonthlyReportData): void {
  const html = buildReportHtml(data);
  const monthName = MONTH_NAMES_FULL[data.monthIndex].toLowerCase();
  const fileName = `extrato-financaspro-${monthName}-${data.year}.html`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    return;
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
