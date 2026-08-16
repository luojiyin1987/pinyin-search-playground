import type { FuzzyRuleId } from "./fuzzy";
import type { MatchPrecision } from "./search";

export type SearchResult = {
  text: string;
  indexes: number[];
  matchMode?: MatchPrecision;
  matchedQuery?: string;
  fuzzyRules?: FuzzyRuleId[];
  fuzzyDistance?: number;
};

export type ScoreBreakdown = {
  mode: number;
  fuzzy: number;
  start: number;
  continuous: number;
  coverage: number;
  span: number;
  length: number;
};

export type ScoreDiagnostics = {
  total: number;
  breakdown: ScoreBreakdown;
};

export type RankedSearchResult = SearchResult & {
  score: number;
  diagnostics: ScoreDiagnostics;
};

const matchModeScores: Record<MatchPrecision, number> = {
  every: 400,
  first: 300,
  start: 200,
  any: 100,
};

const FUZZY_DISTANCE_PENALTY = 120;

function isContinuous(indexes: number[]) {
  return indexes.every(
    (index, position) => position === 0 || index === indexes[position - 1] + 1,
  );
}

export function calculateScoreDiagnostics(
  text: string,
  indexes: number[],
  matchMode?: MatchPrecision,
  fuzzyDistance = 0,
): ScoreDiagnostics {
  if (indexes.length === 0) {
    return {
      total: Number.NEGATIVE_INFINITY,
      breakdown: {
        mode: 0,
        fuzzy: 0,
        start: 0,
        continuous: 0,
        coverage: 0,
        span: 0,
        length: 0,
      },
    };
  }

  const startIndex = indexes[0];
  const matchedSpan = indexes[indexes.length - 1] - startIndex + 1;
  const breakdown: ScoreBreakdown = {
    mode: matchMode ? matchModeScores[matchMode] : 0,
    fuzzy: -fuzzyDistance * FUZZY_DISTANCE_PENALTY,
    start: startIndex === 0 ? 100 : Math.max(0, 50 - startIndex * 5),
    continuous: isContinuous(indexes) ? 50 : 0,
    coverage: indexes.length * 10,
    span: Math.max(0, 30 - matchedSpan),
    length: -text.length,
  };

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return { total, breakdown };
}

export function calculateScore(
  text: string,
  indexes: number[],
  matchMode?: MatchPrecision,
  fuzzyDistance = 0,
) {
  return calculateScoreDiagnostics(
    text,
    indexes,
    matchMode,
    fuzzyDistance,
  ).total;
}

export function rankResults(results: SearchResult[]): RankedSearchResult[] {
  return results
    .map((result) => {
      const diagnostics = calculateScoreDiagnostics(
        result.text,
        result.indexes,
        result.matchMode,
        result.fuzzyDistance,
      );

      return {
        ...result,
        score: diagnostics.total,
        diagnostics,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const fuzzyDifference =
        (a.fuzzyDistance ?? 0) - (b.fuzzyDistance ?? 0);
      if (fuzzyDifference !== 0) return fuzzyDifference;

      const startDifference = a.indexes[0] - b.indexes[0];
      if (startDifference !== 0) return startDifference;

      const aSpan = a.indexes[a.indexes.length - 1] - a.indexes[0] + 1;
      const bSpan = b.indexes[b.indexes.length - 1] - b.indexes[0] + 1;
      if (aSpan !== bSpan) return aSpan - bSpan;

      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text.localeCompare(b.text, "zh-CN");
    });
}
