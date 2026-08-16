export type FuzzyRuleId =
  | "zh-z"
  | "ch-c"
  | "sh-s"
  | "n-l"
  | "an-ang"
  | "en-eng"
  | "in-ing";

export type FuzzyVariant = {
  query: string;
  rules: FuzzyRuleId[];
  distance: number;
};

export const fuzzyRuleDefinitions: Array<{
  id: FuzzyRuleId;
  label: string;
}> = [
  { id: "zh-z", label: "zh ↔ z" },
  { id: "ch-c", label: "ch ↔ c" },
  { id: "sh-s", label: "sh ↔ s" },
  { id: "n-l", label: "n ↔ l" },
  { id: "an-ang", label: "an ↔ ang" },
  { id: "en-eng", label: "en ↔ eng" },
  { id: "in-ing", label: "in ↔ ing" },
];

export const defaultFuzzyRuleIds = fuzzyRuleDefinitions.map(({ id }) => id);

type ReplacementPattern = {
  pattern: RegExp;
  replacement: string;
};

const fuzzyPatterns: Record<FuzzyRuleId, ReplacementPattern[]> = {
  "zh-z": [
    { pattern: /zh(?=[aeiouvü])/g, replacement: "z" },
    { pattern: /z(?=[aeiouvü])/g, replacement: "zh" },
  ],
  "ch-c": [
    { pattern: /ch(?=[aeiouvü])/g, replacement: "c" },
    { pattern: /c(?=[aeiouvü])/g, replacement: "ch" },
  ],
  "sh-s": [
    { pattern: /sh(?=[aeiouvü])/g, replacement: "s" },
    { pattern: /s(?=[aeiouvü])/g, replacement: "sh" },
  ],
  "n-l": [
    { pattern: /n(?=[aeiouvü])/g, replacement: "l" },
    { pattern: /l(?=[aeiouvü])/g, replacement: "n" },
  ],
  "an-ang": [
    { pattern: /ang/g, replacement: "an" },
    { pattern: /an(?!g)/g, replacement: "ang" },
  ],
  "en-eng": [
    { pattern: /eng/g, replacement: "en" },
    { pattern: /en(?!g)/g, replacement: "eng" },
  ],
  "in-ing": [
    { pattern: /ing/g, replacement: "in" },
    { pattern: /in(?!g)/g, replacement: "ing" },
  ],
};

function replaceOneAtATime(
  source: string,
  { pattern, replacement }: ReplacementPattern,
) {
  const variants: string[] = [];

  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;

    variants.push(
      source.slice(0, match.index) +
        replacement +
        source.slice(match.index + match[0].length),
    );
  }

  return variants;
}

function applyRule(source: string, rule: FuzzyRuleId) {
  return Array.from(
    new Set(
      fuzzyPatterns[rule].flatMap((pattern) =>
        replaceOneAtATime(source, pattern),
      ),
    ),
  );
}

export function generateFuzzyVariants(
  query: string,
  enabledRules: FuzzyRuleId[],
  maxVariants = 48,
): FuzzyVariant[] {
  const normalizedQuery = query.toLowerCase();
  const original: FuzzyVariant = {
    query: normalizedQuery,
    rules: [],
    distance: 0,
  };

  if (!normalizedQuery || enabledRules.length === 0 || maxVariants <= 1) {
    return [original];
  }

  const activeRules = Array.from(new Set(enabledRules));
  const variants = new Map<string, FuzzyVariant>([
    [normalizedQuery, original],
  ]);
  const queue: FuzzyVariant[] = [original];

  while (queue.length > 0 && variants.size < maxVariants) {
    const current = queue.shift();
    if (!current) break;

    for (const rule of activeRules) {
      for (const nextQuery of applyRule(current.query, rule)) {
        const nextDistance = current.distance + 1;
        const existing = variants.get(nextQuery);

        if (existing && existing.distance <= nextDistance) continue;

        const nextVariant: FuzzyVariant = {
          query: nextQuery,
          rules: current.rules.includes(rule)
            ? current.rules
            : [...current.rules, rule],
          distance: nextDistance,
        };

        variants.set(nextQuery, nextVariant);
        queue.push(nextVariant);

        if (variants.size >= maxVariants) break;
      }

      if (variants.size >= maxVariants) break;
    }
  }

  return Array.from(variants.values()).sort(
    (a, b) => a.distance - b.distance || a.query.localeCompare(b.query),
  );
}
