export type SearchResult = {
  text: string;
  indexes: number[];
};

export type RankedSearchResult = SearchResult & {
  score: number;
};

function isContinuous(indexes: number[]) {
  return indexes.every(
    (index, position) => position === 0 || index === indexes[position - 1] + 1,
  );
}

export function calculateScore(text: string, indexes: number[]) {
  if (indexes.length === 0) return Number.NEGATIVE_INFINITY;

  const start = indexes[0];
  const span = indexes[indexes.length - 1] - start + 1;

  let score = 0;
  score += start === 0 ? 100 : Math.max(0, 50 - start * 5);
  score += isContinuous(indexes) ? 50 : 0;
  score += indexes.length * 10;
  score += Math.max(0, 30 - span);
  score -= text.length;

  return score;
}

export function rankResults(results: SearchResult[]): RankedSearchResult[] {
  return results
    .map((result) => ({
      ...result,
      score: calculateScore(result.text, result.indexes),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const startDifference = a.indexes[0] - b.indexes[0];
      if (startDifference !== 0) return startDifference;

      const aSpan = a.indexes[a.indexes.length - 1] - a.indexes[0] + 1;
      const bSpan = b.indexes[b.indexes.length - 1] - b.indexes[0] + 1;
      if (aSpan !== bSpan) return aSpan - bSpan;

      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text.localeCompare(b.text, "zh-CN");
    });
}
