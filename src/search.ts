import { match } from "pinyin-pro";
import {
  generateFuzzyVariants,
  type FuzzyRuleId,
  type FuzzyVariant,
} from "./fuzzy";

export type MatchPrecision = "first" | "start" | "every" | "any";
export type SearchMode = "auto" | MatchPrecision;

export type MatchResult = {
  text: string;
  indexes: number[];
  matchMode: MatchPrecision;
  matchedQuery: string;
  fuzzyRules: FuzzyRuleId[];
  fuzzyDistance: number;
};

type MatchOptions = {
  continuous?: boolean;
  v?: boolean;
  fuzzyRules?: FuzzyRuleId[];
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

function getQueryVariants(query: string, options: MatchOptions): FuzzyVariant[] {
  if (!options.fuzzyRules?.length) {
    return [{ query, rules: [], distance: 0 }];
  }

  return generateFuzzyVariants(query, options.fuzzyRules);
}

export function findMatch(
  text: string,
  query: string,
  mode: SearchMode,
  options: MatchOptions = {},
): MatchResult | null {
  const precisions = mode === "auto" ? autoPrecisionOrder : [mode];
  const variants = getQueryVariants(query, options);

  for (const precision of precisions) {
    // `any` is already intentionally broad. Fuzzy-expanding it creates too many
    // weak matches, so only the original query participates at this tier.
    const precisionVariants =
      precision === "any"
        ? variants.filter(({ distance }) => distance === 0)
        : variants;

    for (const variant of precisionVariants) {
      const indexes = matchWithPrecision(
        text,
        variant.query,
        precision,
        options,
        mode === "auto",
      );

      if (indexes) {
        return {
          text,
          indexes,
          matchMode: precision,
          matchedQuery: variant.query,
          fuzzyRules: variant.rules,
          fuzzyDistance: variant.distance,
        };
      }
    }
  }

  return null;
}
