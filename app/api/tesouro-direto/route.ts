import { NextResponse } from "next/server";

const RESOURCE_ID = "796d2059-14e9-44e3-80c9-2d9e30b405c1";
const CKAN_BASE =
  "https://www.tesourotransparente.gov.br/ckan/api/3/action/datastore_search";

export async function GET() {
  try {
    console.log("🔍 [tesouro] Buscando via CKAN datastore...");

    // Passo 1: pega os últimos 50 registros SEM sort (evita 400)
    const url1 = `${CKAN_BASE}?resource_id=${RESOURCE_ID}&limit=50`;
    console.log("🔍 [tesouro] URL:", url1);

    const res1 = await fetch(url1, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    console.log("🔍 [tesouro] HTTP Status:", res1.status);

    if (!res1.ok) {
      const errBody = await res1.text();
      console.error("❌ [tesouro] Body do erro:", errBody.slice(0, 500));
      throw new Error(`CKAN HTTP: ${res1.status}`);
    }

    const json1 = await res1.json();
    console.log("🔍 [tesouro] success:", json1.success);
    console.log("🔍 [tesouro] total:", json1.result?.total);

    if (!json1.success) {
      console.error("❌ [tesouro] CKAN error:", json1.error);
      throw new Error(`CKAN error: ${JSON.stringify(json1.error)}`);
    }

    const records: any[] = json1.result?.records ?? [];
    const fields: string[] = json1.result?.fields?.map((f: any) => f.id) ?? [];

    console.log("🔍 [tesouro] Campos:", fields);
    console.log("🔍 [tesouro] record[0]:", JSON.stringify(records[0]));

    if (!records.length) throw new Error("Nenhum registro retornado");

    // Descobre o campo de data base
    const campoDataBase =
      fields.find((f) => f.toLowerCase().includes("base")) ?? "Data Base";
    console.log("🔍 [tesouro] Campo data base detectado:", campoDataBase);

    // Pega a data mais recente presente nos registros
    const datasUnicas = [...new Set(records.map((r) => r[campoDataBase] as string))].sort();
    const dataBase = datasUnicas[datasUnicas.length - 1];
    console.log("🔍 [tesouro] Data base mais recente:", dataBase);

    // Passo 2: busca todos os títulos filtrando por essa data base
    const filters = encodeURIComponent(JSON.stringify({ [campoDataBase]: dataBase }));
    const url2 = `${CKAN_BASE}?resource_id=${RESOURCE_ID}&limit=50&filters=${filters}`;
    console.log("🔍 [tesouro] URL filtrada:", url2);

    const res2 = await fetch(url2, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });

    console.log("🔍 [tesouro] HTTP Status (filtrado):", res2.status);

    if (!res2.ok) {
      const errBody = await res2.text();
      console.error("❌ [tesouro] Body erro filtrado:", errBody.slice(0, 500));
      throw new Error(`CKAN filtrado HTTP: ${res2.status}`);
    }

    const json2 = await res2.json();
    const titulos: any[] = json2.result?.records ?? [];
    console.log("✅ [tesouro] Títulos encontrados:", titulos.length);

    if (!titulos.length) throw new Error("Nenhum título para a data base: " + dataBase);

    // Mapeamento dinâmico pelos nomes reais dos campos
    const find = (keywords: string[]) =>
      fields.find((f) => keywords.every((k) => f.toLowerCase().includes(k))) ?? "";

    const campoTitulo    = find(["tipo"]) || find(["titulo"]) || fields[1] || "";
    const campoVenc      = find(["vencimento"]) || "";
    const campoTaxaC     = find(["taxa", "compra"]) || "";
    const campoTaxaV     = find(["taxa", "venda"]) || "";
    const campoPUC       = find(["pu", "compra"]) || find(["pre", "compra"]) || "";
    const campoPUV       = find(["pu", "venda"])  || find(["pre", "venda"])  || "";

    console.log("🔍 [tesouro] Mapeamento:", {
      campoTitulo, campoVenc, campoTaxaC, campoTaxaV, campoPUC, campoPUV,
    });

    const recentes = titulos.map((r) => ({
      titulo:               r[campoTitulo] ?? "",
      vencimento:           r[campoVenc] ?? null,
      dataBase:             r[campoDataBase] ?? null,
      taxaCompra:           parseFloat(String(r[campoTaxaC]).replace(",", ".")) || null,
      taxaVenda:            parseFloat(String(r[campoTaxaV]).replace(",", ".")) || null,
      precoUnitarioCompra:  parseFloat(String(r[campoPUC]).replace(",", ".")) || null,
      precoUnitarioVenda:   parseFloat(String(r[campoPUV]).replace(",", ".")) || null,
    }));

    return NextResponse.json(recentes);
  } catch (error: any) {
    console.error("❌ [tesouro] Erro final:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
