import { useMemo, useState } from "react";
import { exampleQueries, sampleTerms } from "./data";
import { rankResults } from "./ranking";
import { findMatch, type SearchMode } from "./search";

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
  const [query, setQuery] = useState("zgyh");
  const [searchMode, setSearchMode] = useState<SearchMode>("auto");
  const [continuous, setContinuous] = useState(false);
  const [useV, setUseV] = useState(true);

  const results = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const matchedResults = sampleTerms.flatMap((text) => {
      const result = findMatch(text, normalizedQuery, searchMode, {
        continuous,
        v: useV,
      });

      return result ? [result] : [];
    });

    return rankResults(matchedResults);
  }, [query, searchMode, continuous, useV]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">pinyin-pro · match()</div>
        <h1>中文拼音搜索 Playground</h1>
        <p>
          输入拼音、首字母或缩写，实时查看匹配结果、命中字符、匹配模式和原文索引。
        </p>
      </section>

      <section className="panel controls-panel" aria-label="搜索设置">
        <label className="search-field">
          <span>搜索</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="试试 zgyh、cq、kuaiji、lvbu"
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
      </section>

      <section className="results-section" aria-live="polite">
        <div className="results-heading">
          <div>
            <span className="section-kicker">RESULTS</span>
            <h2>匹配结果</h2>
          </div>
          <span className="result-count">{results.length} 条</span>
        </div>

        {query.trim() && results.length > 0 ? (
          <div className="result-list">
            {results.map(({ text, indexes, score, matchMode }) => (
              <article className="result-card" key={text}>
                <HighlightedText text={text} indexes={indexes} />
                <div className="result-meta">
                  {matchMode ? (
                    <>
                      <span>mode</span>
                      <code>{matchMode}</code>
                    </>
                  ) : null}
                  <span>score</span>
                  <code>{score}</code>
                  <span>indexes</span>
                  <code>[{indexes.join(", ")}]</code>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {query.trim()
              ? "没有找到匹配项，试试其他拼音或切换匹配模式。"
              : "输入拼音开始搜索。"}
          </div>
        )}
      </section>

      <footer>
        Automatic matching tries <code>every → first → start → any</code>, then
        ranks results by match mode and positional relevance. Fuzzy pronunciation
        rules are intentionally left for later iterations.
      </footer>
    </main>
  );
}
