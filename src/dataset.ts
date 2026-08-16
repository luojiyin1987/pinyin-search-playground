export const DATASET_STORAGE_KEY = "pinyin-search-playground.dataset";

export function parseDataset(value: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const line of value.split(/\r?\n/)) {
    const term = line.trim();
    if (!term || seen.has(term)) continue;

    seen.add(term);
    terms.push(term);
  }

  return terms;
}

export function serializeDataset(terms: readonly string[]): string {
  return terms.join("\n");
}
