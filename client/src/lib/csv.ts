/**
 * Utilitário único para exportação CSV compatível com Excel em português:
 *
 * - BOM UTF-8 no início do arquivo — sem ele o Excel ignora o charset e
 *   corrompe os acentos;
 * - separador ";" — no Excel pt-BR a vírgula é o separador decimal, então
 *   CSVs separados por vírgula abrem com todos os dados numa única coluna;
 * - células sempre entre aspas, com aspas internas escapadas ("" no padrão CSV);
 * - quebra de linha \r\n (RFC 4180, esperada pelo Excel).
 */
export function downloadCsv(
  filename: string,
  rows: (string | number | null | undefined)[][]
) {
  const escapeCell = (cell: string | number | null | undefined) => {
    const value = cell == null ? "" : String(cell);
    return `"${value.replace(/"/g, '""')}"`;
  };

  const content = rows.map(row => row.map(escapeCell).join(";")).join("\r\n");

  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
