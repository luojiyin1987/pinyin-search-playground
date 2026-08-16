import {
  defaultFuzzyRuleIds,
  fuzzyRuleDefinitions,
  type FuzzyRuleId,
} from "./fuzzy";
import type { SearchMode } from "./search";

export type ShareableSearchState = {
  query: string;
  searchMode: SearchMode;
  continuous: boolean;
  useV: boolean;
  fuzzyEnabled: boolean;
  fuzzyRules: FuzzyRuleId[];
};

export const defaultShareableSearchState: ShareableSearchState = {
  query: "zgyh",
  searchMode: "auto",
  continuous: false,
  useV: true,
  fuzzyEnabled: false,
  fuzzyRules: [...defaultFuzzyRuleIds],
};

const searchModes = new Set<SearchMode>([
  "auto",
  "every",
  "first",
  "start",
  "any",
]);

const fuzzyRuleIds = fuzzyRuleDefinitions.map(({ id }) => id);
const fuzzyRuleIdSet = new Set<FuzzyRuleId>(fuzzyRuleIds);

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

function normalizeFuzzyRules(rules: FuzzyRuleId[]) {
  const selected = new Set(rules);
  return fuzzyRuleIds.filter((rule) => selected.has(rule));
}

function sameRules(a: FuzzyRuleId[], b: FuzzyRuleId[]) {
  const normalizedA = normalizeFuzzyRules(a);
  const normalizedB = normalizeFuzzyRules(b);
  return (
    normalizedA.length === normalizedB.length &&
    normalizedA.every((rule, index) => rule === normalizedB[index])
  );
}

export function parseShareableSearchState(
  search: string,
  fallback: ShareableSearchState = defaultShareableSearchState,
): ShareableSearchState {
  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  const rawRules = params.get("rules");

  const fuzzyRules = params.has("rules")
    ? normalizeFuzzyRules(
        Array.from(
          new Set(
            (rawRules ?? "")
              .split(",")
              .filter((rule): rule is FuzzyRuleId =>
                fuzzyRuleIdSet.has(rule as FuzzyRuleId),
              ),
          ),
        ),
      )
    : [...fallback.fuzzyRules];

  return {
    query: params.get("q") ?? fallback.query,
    searchMode:
      mode && searchModes.has(mode as SearchMode)
        ? (mode as SearchMode)
        : fallback.searchMode,
    continuous: parseBoolean(
      params.get("continuous"),
      fallback.continuous,
    ),
    useV: parseBoolean(params.get("v"), fallback.useV),
    fuzzyEnabled: parseBoolean(params.get("fuzzy"), fallback.fuzzyEnabled),
    fuzzyRules,
  };
}

export function serializeShareableSearchState(state: ShareableSearchState) {
  const params = new URLSearchParams();
  const normalizedRules = normalizeFuzzyRules(state.fuzzyRules);

  params.set("q", state.query);

  if (state.searchMode !== defaultShareableSearchState.searchMode) {
    params.set("mode", state.searchMode);
  }
  if (state.continuous !== defaultShareableSearchState.continuous) {
    params.set("continuous", state.continuous ? "1" : "0");
  }
  if (state.useV !== defaultShareableSearchState.useV) {
    params.set("v", state.useV ? "1" : "0");
  }
  if (state.fuzzyEnabled !== defaultShareableSearchState.fuzzyEnabled) {
    params.set("fuzzy", state.fuzzyEnabled ? "1" : "0");
  }
  if (!sameRules(normalizedRules, defaultShareableSearchState.fuzzyRules)) {
    params.set("rules", normalizedRules.join(","));
  }

  return params.toString();
}

export function buildShareableSearchUrl(
  baseUrl: string,
  state: ShareableSearchState,
) {
  const url = new URL(baseUrl);
  url.search = serializeShareableSearchState(state);
  return url.toString();
}
