import { useEffect, useMemo, useState } from "react";
import { exampleQueries, sampleTerms } from "./data";
import {
  DATASET_STORAGE_KEY,
  parseDataset,
  serializeDataset,
} from "./dataset";
import "./dataset.css";
import "./diagnostics.css";
import {
  defaultFuzzyRuleIds,
  fuzzyRuleDefinitions,
  type FuzzyRuleId,
} from "./fuzzy";
import { rankResults, type ScoreBreakdown } from "./ranking";
import {
  buildShareableSearchUrl,
  defaultShareableSearchState,
  parseShareableSearchState,
  type ShareableSearchState,
} from "./share-state";
import "./share-state.css";
import { findMatch, type SearchMode } from "./search";

const defaultDatasetText = serializeDataset(sampleTerms);

const searchModeOptions: Array<{
  value: SearchMode;
  label: string;
  description: string;
}> = [
  { value: "auto", label: "自动", description: "严格到宽松" },
  { value: "every", label: "完整", description: "完整拼音" },
  { value: "first", label: "首字母", description: "首字母或全拼" },
  { value: "start", label: "前缀", description: "拼音前缀" },
  { value: "any", label: "任意", description: "更宽松匹配" },
];

const scoreParts: Array<{
  key: keyof ScoreBreakdown;
  label: string;
}> = [
  { key: "mode", label: "匹配模式" },
  { key: "fuzzy", label: "模糊音" },
  { key: "start", label: "起始位置" },
  { key: "continuous", label: "连续命中" },
  { key: "coverage", label: "命中字符" },
  { key: "span", label: "命中跨度" },
  { key: "length", label: "文本长度" },
];

function readStoredDataset() {
  if (typeof window === "undefined") return defaultDatasetText;

  try {
    return window.localStorage.getItem(DATASET_STORAGE_KEY) ?? defaultDatasetText;
  } catch {
    return defaultDatasetText;
  }
}

function readInitialSearchState() {
  if (typeof window === "undefined") return defaultShareableSearchState;
  return parseShareableSearchState(window.location.search);
}

function formatScorePart(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function HighlightedText({ text, indexes }: { text: string; indexes: number[] }) {
  const matchedIndexes = new Set(indexes);
  let utf16Offset = 0;

  return (
    <span className="result-text">
      {Array.from(text).map((char) => {
        const start = utf16Offset;
        utf16Offset += char.length;
        const isMatched = Array.from(
          { length: char.length },
          (_, offset) => start + offset,
        ).some((index) => matchedIndexes.has(index));

        return isMatched ? (
          <mark key={start}>{char}</mark>
        ) : (
          <span key={start}>{char}</span>
        );
      })}
    </span>
  );
}

export default function App() {
  const [initialSearchState] = useState(readInitialSearchState);
  const [query, setQuery] = useState(initialSearchState.query);
  const [datasetText, setDatasetText] = useState(readStoredDataset);
  const [searchMode, setSearchMode] = useState<SearchMode>(
    initialSearchState.searchMode,
  );
  const [continuous, setContinuous] = useState(initialSearchState.continuous);
  const [useV, setUseV] = useState(initialSearchState.useV);
  const [fuzzyEnabled, setFuzzyEnabled] = useState(
    initialSearchState.fuzzyEnabled,
  );
  const [fuzzyRules, setFuzzyRules] = useState<FuzzyRuleId[]>(
    initialSearchState.fuzzyRules,
  );
  const [shareStatus, setShareStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  const datasetTerms = useMemo(() => parseDataset(datasetText), [datasetText]);
  const shareableSearchState = useMemo<ShareableSearchState>(
    () => ({
      query,
      searchMode,
      continuous,
      useV,
      fuzzyEnabled,
      fuzzyRules,
    }),
    [query, searchMode, continuous, useV, fuzzyEnabled, fuzzyRules],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(DATASET_STORAGE_KEY, datasetText);
    } catch {
      // The playground remains usable when browser storage is unavailable.
    }
  }, [datasetText]);

  useEffect(() => {
    const shareUrl = buildShareableSearchUrl(
      window.location.href,
      shareableSearchState,
    );
    const url = new URL(shareUrl);

    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setShareStatus("idle");
  }, [shareableSearchState]);

  const toggleFuzzyRule = (rule: FuzzyRuleId) => {
    setFuzzyRules((current) =>
      current.includes(rule)
        ? current.filter((item) => item !== rule)
        : [...current, rule],
    );
  };

  const copyShareLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      const shareUrl = buildShareableSearchUrl(
        window.location.href,
        shareableSearchState,
      );
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  };

  const results = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const matchedResults = datasetTerms.flatMap((text) => {
      const result = findMatch(text, normalizedQuery, searchMode, {
        continuous,
        v: useV,
        fuzzyRules: fuzzyEnabled ? fuzzyRules : [],
      });

      return result ? [result] : [];
    });

    return rankResults(matchedResults);
  }, [
    query,
    datasetTerms,
    searchMode,
    continuous,
    useV,
    fuzzyEnabled,
    fuzzyRules,
  ]);

  const normalizedQuery = query.trim();

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">pinyin-pro · match()</div>
        <h1>中文拼音搜索 Playground</h1>
        <p>
          输入拼音、首字母或缩写，实时查看匹配结果、命中字符、匹配模式、模糊音改写和评分明细。
        </p>
      </section>

      <section className="panel controls-panel" aria-label="搜索设置">
        <label className="search-field">
          <span>搜索</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="试试 zgyh、zongguo、sanghai、beijin"
            spellCheck={false}
          />
        </label>

        <div className="examples" aria-label="示例查询">
          <span>试一试</span>
          {exampleQueries.map((example) => (
            <button
              type="button"
              key={example}
              className="example-button"
              onClick={() => setQuery(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <div className="share-controls">
          <small>
            当前搜索设置会同步到 URL；自定义测试数据不会包含在分享链接中。
          </small>
          <button
            type="button"
            className="example-button share-button"
            onClick={copyShareLink}
          >
            {shareStatus === "copied"
              ? "已复制"
              : shareStatus === "failed"
                ? "复制失败"
                : "复制分享链接"}
          </button>
        </div>

        <section className="dataset-editor" aria-labelledby="dataset-title">
          <div className="dataset-header">
            <div>
              <strong id="dataset-title">测试数据</strong>
              <small>{datasetTerms.length} 条有效词条</small>
            </div>
            <button
              type="button"
              className="example-button"
              onClick={() => setDatasetText(defaultDatasetText)}
              disabled={datasetText === defaultDatasetText}
            >
              恢复示例数据
            </button>
          </div>

          <textarea
            value={datasetText}
            onChange={(event) => setDatasetText(event.target.value)}
            rows={8}
            spellCheck={false}
            aria-describedby="dataset-help"
            placeholder="一行一个中文词条"
          />
          <small id="dataset-help" className="dataset-help">
            一行一个词条；空行和重复项会自动忽略。内容只保存在当前浏览器的 localStorage 中。
          </small>
        </section>

        <fieldset className="precision-fieldset">
          <legend>匹配模式</legend>
          <div className="precision-grid">
            {searchModeOptions.map((option) => (
              <label
                className={
                  searchMode === option.value
                    ? "precision-option is-active"
                    : "precision-option"
                }
                key={option.value}
              >
                <input
                  type="radio"
                  name="search-mode"
                  value={option.value}
                  checked={searchMode === option.value}
                  onChange={() => setSearchMode(option.value)}
                />
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="toggle-row">
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(event) => setContinuous(event.target.checked)}
            />
            <span>
              <strong>连续匹配</strong>
              <small>只接受连续的汉字下标</small>
            </span>
          </label>

          <label className="toggle-option">
            <input
              type="checkbox"
              checked={useV}
              onChange={(event) => setUseV(event.target.checked)}
            />
            <span>
              <strong>v 匹配 ü</strong>
              <small>例如 lvbu → 吕布</small>
            </span>
          </label>
        </div>

        <fieldset className="precision-fieldset">
          <legend>模糊音</legend>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={fuzzyEnabled}
              onChange={(event) => setFuzzyEnabled(event.target.checked)}
            />
            <span>
              <strong>开启模糊音</strong>
              <small>原始 query 优先，模糊改写会降低 ranking score</small>
            </span>
          </label>

          <div className="precision-grid">
            {fuzzyRuleDefinitions.map((rule) => {
              const checked = fuzzyRules.includes(rule.id);
              return (
                <label
                  className={
                    fuzzyEnabled && checked
                      ? "precision-option is-active"
                      : "precision-option"
                  }
                  key={rule.id}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!fuzzyEnabled}
                    onChange={() => toggleFuzzyRule(rule.id)}
                  />
                  <strong>{rule.label}</strong>
                  <small>{checked ? "已启用" : "已关闭"}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="results-section" aria-live="polite">
        <div className="results-heading">
          <div>
            <span className="section-kicker">RESULTS</span>
            <h2>匹配结果</h2>
          </div>
          <span className="result-count">{results.length} 条</span>
        </div>

        {normalizedQuery && results.length > 0 ? (
          <div className="result-list">
            {results.map(
              ({
                text,
                indexes,
                score,
                diagnostics,
                matchMode,
                matchedQuery,
                fuzzyRules: matchedFuzzyRules,
                fuzzyDistance,
              }) => (
                <article className="result-card" key={text}>
                  <div className="result-summary">
                    <HighlightedText text={text} indexes={indexes} />
                    <div className="result-meta">
                      {matchMode ? (
                        <>
                          <span>mode</span>
                          <code>{matchMode}</code>
                        </>
                      ) : null}
                      {fuzzyDistance ? (
                        <>
                          <span>fuzzy</span>
                          <code>{matchedFuzzyRules?.join(" · ")}</code>
                          <span>query</span>
                          <code>{matchedQuery}</code>
                        </>
                      ) : null}
                      <span>score</span>
                      <code>{score}</code>
                      <span>indexes</span>
                      <code>[{indexes.join(", ")}]</code>
                    </div>
                  </div>

                  <details className="diagnostics">
                    <summary>查看评分明细</summary>
                    <div className="diagnostics-context">
                      <span>输入 query</span>
                      <code>{normalizedQuery}</code>
                      <span>实际匹配</span>
                      <code>{matchedQuery ?? normalizedQuery}</code>
                      <span>匹配模式</span>
                      <code>{matchMode ?? "—"}</code>
                      <span>命中 indexes</span>
                      <code>[{indexes.join(", ")}]</code>
                      <span>模糊音规则</span>
                      <code>
                        {matchedFuzzyRules?.length
                          ? matchedFuzzyRules.join(" · ")
                          : "none"}
                      </code>
                    </div>

                    <div className="score-breakdown">
                      {scoreParts.map(({ key, label }) => (
                        <div className="score-row" key={key}>
                          <span>{label}</span>
                          <code>{formatScorePart(diagnostics.breakdown[key])}</code>
                        </div>
                      ))}
                      <div className="score-row total">
                        <span>总分</span>
                        <code>{diagnostics.total}</code>
                      </div>
                    </div>
                  </details>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="empty-state">
            {datasetTerms.length === 0
              ? "测试数据为空，请先添加至少一个词条。"
              : normalizedQuery
                ? "没有找到匹配项，试试其他拼音、切换匹配模式或开启模糊音。"
                : "输入拼音开始搜索。"}
          </div>
        )}
      </section>

      <footer>
        Automatic matching tries <code>every → first → start → any</code>. Search
        settings can be shared through the URL without exposing the custom dataset,
        while each result can expose the exact ranking signals behind its score.
      </footer>
    </main>
  );
}
