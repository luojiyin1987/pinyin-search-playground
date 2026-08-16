import { match } from "pinyin-pro";

export type MatchPrecision = "first" | "start" | "every" | "any";
export type SearchMode = "auto" | MatchPrecision;

export type MatchResult = {
  text: string;
  indexes: number[];
  matchMode: MatchPrecision;
};

type MatchOptions = {
  continuous?: boolean;
  v?: boolean;
};

export const autoPrecisionOrder: MatchPrecision[] = [
  "every",
  "first",
  "start",
  "any",
];

function matchWithPrecision(
  text: string,
  query: string,
  precision: MatchPrecision,
  options: MatchOptions,
  normalizeLastPrecision: boolean,
) {
  return match(text, query, {
    precision,
    continuous: options.continuous,
    v: options.v,
    ...(normalizeLastPrecision ? { lastPrecision: precision } : {}),
  });
}

export function findMatch(
  text: string,
  query: string,
  mode: SearchMode,
  options: MatchOptions = {},
): MatchResult | null {
  const precisions = mode === "auto" ? autoPrecisionOrder : [mode];

  for (const precision of precisions) {
    const indexes = matchWithPrecision(
      text,
      query,
      precision,
      options,
      mode === "auto",
    );

    if (indexes) {
      return { text, indexes, matchMode: precision };
    }
  }

  return null;
}
