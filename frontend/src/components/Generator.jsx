import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STEPS = [
  { key: "repo",      icon: "📂", label: "Fetching repo" },
  { key: "tree",      icon: "🌳", label: "Reading file tree" },
  { key: "languages", icon: "🔤", label: "Analyzing languages" },
  { key: "manifests", icon: "📦", label: "Detecting stack" },
  { key: "building",  icon: "✍️",  label: "Building README" },
];

function parseRepo(input) {
  // Handle "owner/repo" or "github.com/owner/repo" or full URL
  const clean = input.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

function ProgressLog({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const completedKeys = new Set(logs.map(l => l.step));
  const lastLog = logs[logs.length - 1];

  return (
    <div style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r)",
      overflow: "hidden",
      fontFamily: "var(--mono)",
    }}>
      {/* Terminal header */}
      <div style={{
        padding: "10px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {["#ff5f57","#febc2e","#28c840"].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ color: "var(--text3)", fontSize: "0.75rem", marginLeft: "8px" }}>
          gh-repo-gen — analyzing repository
        </span>
      </div>

      <div style={{ padding: "20px", minHeight: "160px" }}>
        {STEPS.map((step, i) => {
          const isDone = completedKeys.has(step.key);
          const isActive = lastLog?.step === step.key;
          const isPending = !isDone && !isActive;

          return (
            <div key={step.key} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "6px 0",
              opacity: isPending ? 0.3 : 1,
              animation: isActive ? "slideIn 0.3s ease" : isDone ? "slideIn 0.3s ease" : "none",
              transition: "opacity 0.3s",
            }}>
              <span style={{ fontSize: "1rem" }}>
                {isDone ? "✅" : isActive ? (
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                ) : "○"}
              </span>
              <span style={{
                fontSize: "0.8rem",
                color: isDone ? "var(--green)" : isActive ? "var(--text)" : "var(--text3)",
              }}>
                {step.icon} {step.label}
              </span>
              {isActive && (
                <span style={{
                  fontSize: "0.75rem",
                  color: "var(--text3)",
                  animation: "blink 1s ease-in-out infinite",
                }}>
                  {lastLog?.message || "…"}
                </span>
              )}
            </div>
          );
        })}

        {/* Blinking cursor */}
        <span style={{
          display: "inline-block",
          width: "8px", height: "14px",
          background: "var(--brand)",
          marginTop: "8px",
          animation: "blink 1s step-end infinite",
          verticalAlign: "middle",
        }} />
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

function MetaBadges({ meta }) {
  if (!meta) return null;
  const items = [
    { label: "Type", value: meta.projectType, color: "blue" },
    { label: "Stars", value: `⭐ ${meta.stars}`, color: "yellow" },
    { label: "Files", value: meta.totalFiles, color: "purple" },
    { label: "Contributors", value: meta.contributors, color: "green" },
    meta.hasTests && { label: "Tests", value: "✓", color: "green" },
    meta.hasCi && { label: "CI/CD", value: "✓", color: "green" },
    meta.hasDocker && { label: "Docker", value: "✓", color: "blue" },
  ].filter(Boolean);

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "8px",
      marginBottom: "20px",
      animation: "fadeUp 0.4s ease",
    }}>
      {items.map(item => (
        <span key={item.label} className={`badge badge-${item.color}`}>
          <span style={{ opacity: 0.7 }}>{item.label}</span> {item.value}
        </span>
      ))}
    </div>
  );
}

function ReadmePreview({ readme }) {
  const [view, setView] = useState("preview"); // preview | raw

  const copyReadme = () => {
    navigator.clipboard.writeText(readme);
  };

  const downloadReadme = () => {
    const blob = new Blob([readme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {["preview", "raw"].map(v => (
            <button key={v} onClick={() => setView(v)} className="btn btn-ghost" style={{
              padding: "8px 16px",
              fontSize: "0.8rem",
              background: view === v ? "rgba(99,137,255,0.15)" : "transparent",
              borderColor: view === v ? "var(--brand)" : "var(--border)",
              color: view === v ? "var(--brand)" : "var(--text2)",
            }}>
              {v === "preview" ? "👁 Preview" : "📄 Raw"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={copyReadme} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "8px 14px" }}>
            📋 Copy
          </button>
          <button onClick={downloadReadme} className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
            ⬇ Download README.md
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        background: view === "preview" ? "#0d1117" : "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "auto",
        maxHeight: "70vh",
        transition: "background 0.2s",
      }}>
        {view === "preview" ? (
          <div style={{ padding: "32px", maxWidth: "860px", margin: "0 auto" }}>
            <ReadmeRenderer content={readme} />
          </div>
        ) : (
          <pre style={{
            padding: "24px",
            margin: 0,
            fontFamily: "var(--mono)",
            fontSize: "0.78rem",
            color: "var(--text2)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {readme}
          </pre>
        )}
      </div>

      {/* Char/line count */}
      <div style={{
        display: "flex", gap: "16px",
        marginTop: "10px",
        fontSize: "0.75rem",
        color: "var(--text3)",
        fontFamily: "var(--mono)",
      }}>
        <span>{readme.split("\n").length} lines</span>
        <span>{readme.length.toLocaleString()} chars</span>
        <span>{Math.ceil(readme.length / 1000)}kb</span>
      </div>
    </div>
  );
}

function ReadmeRenderer({ content }) {
  return (
    <div className="md-body">
      <style>{`
        .md-body { color: #e6edf3; line-height: 1.7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .md-body h1 { font-size: 2em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; margin: 0 0 1em; color: #fff; }
        .md-body h2 { font-size: 1.5em; border-bottom: 1px solid #21262d; padding-bottom: 0.3em; margin: 1.5em 0 0.8em; color: #f0f6fc; }
        .md-body h3 { font-size: 1.25em; margin: 1.2em 0 0.6em; color: #e6edf3; }
        .md-body h4, .md-body h5, .md-body h6 { margin: 1em 0 0.5em; color: #e6edf3; }
        .md-body p { margin: 0 0 1em; }
        .md-body a { color: #58a6ff; text-decoration: none; }
        .md-body a:hover { text-decoration: underline; }
        .md-body code { background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 2px 6px; font-size: 0.85em; font-family: 'SFMono-Regular', Consolas, monospace; color: #e6edf3; }
        .md-body pre { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; overflow: auto; margin: 0 0 1em; }
        .md-body pre code { background: none; border: none; padding: 0; font-size: 0.85em; }
        .md-body blockquote { border-left: 4px solid #30363d; margin: 0 0 1em; padding: 0 16px; color: #8b949e; }
        .md-body ul, .md-body ol { padding-left: 2em; margin: 0 0 1em; }
        .md-body li { margin: 0.25em 0; }
        .md-body table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
        .md-body th { background: #161b22; border: 1px solid #30363d; padding: 8px 12px; text-align: left; font-weight: 600; }
        .md-body td { border: 1px solid #21262d; padding: 8px 12px; }
        .md-body tr:nth-child(even) td { background: rgba(22,27,34,0.5); }
        .md-body hr { border: none; border-top: 1px solid #30363d; margin: 2em 0; }
        .md-body img { max-width: 100%; border-radius: 4px; }
        .md-body strong { color: #f0f6fc; }
        .md-body div[align="center"] { text-align: center; }
        .md-body div[align="left"] { text-align: left; }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Generator({ phase, logs, readme, meta, errorMsg, onGenerate, onReset }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError("");
    const parsed = parseRepo(input);
    if (!parsed) {
      setError("Enter a GitHub repo like owner/repo or a GitHub URL");
      return;
    }
    onGenerate(parsed.owner, parsed.repo);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  useEffect(() => {
    if (phase === "idle") inputRef.current?.focus();
  }, [phase]);

  return (
    <main style={{
      flex: 1,
      maxWidth: "900px",
      margin: "0 auto",
      padding: "60px 20px",
      width: "100%",
    }}>

      {/* Input card — always visible */}
      <div className="card" style={{
        marginBottom: "32px",
        background: "var(--surface)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Card glow effect */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--brand), var(--brand2), transparent)",
          opacity: phase === "running" ? 1 : 0.4,
          animation: phase === "running" ? "shimmer 2s linear infinite" : "none",
          backgroundSize: "200% auto",
        }} />

        <h2 style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "8px",
          color: "var(--text)",
        }}>
          Generate README for a repository
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "20px" }}>
          Enter a GitHub repo URL or <code style={{ fontSize: "0.8em" }}>owner/repo</code> format.
          Works with any public repository.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
            <span style={{
              position: "absolute",
              left: "14px", top: "50%", transform: "translateY(-50%)",
              color: "var(--text3)", fontSize: "1rem", pointerEvents: "none",
            }}>
              ⌗
            </span>
            <input
              ref={inputRef}
              className="input"
              style={{ paddingLeft: "36px" }}
              placeholder="e.g. vercel/next.js  or  github.com/torvalds/linux"
              value={input}
              onChange={e => { setInput(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              disabled={phase === "running"}
              autoFocus
            />
          </div>

          {phase === "idle" || phase === "done" || phase === "error" ? (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || phase === "running"}
              style={{ minWidth: "140px" }}
            >
              {phase === "done" ? "⟳ Regenerate" : "✨ Generate"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onReset}
            >
              ⬛ Cancel
            </button>
          )}
        </form>

        {error && (
          <p style={{
            marginTop: "10px",
            fontSize: "0.8rem",
            color: "var(--red)",
            animation: "fadeIn 0.2s ease",
          }}>
            ⚠ {error}
          </p>
        )}

        {/* Example repos */}
        {phase === "idle" && (
          <div style={{ marginTop: "16px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Try: </span>
            {["vercel/next.js", "tiangolo/fastapi", "denoland/deno", "charmbracelet/glow"].map(r => (
              <button
                key={r}
                onClick={() => setInput(r)}
                style={{
                  background: "none", border: "none",
                  color: "var(--brand)",
                  fontFamily: "var(--mono)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.target.style.background = "rgba(99,137,255,0.1)"}
                onMouseLeave={e => e.target.style.background = "none"}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Running state */}
      {phase === "running" && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <ProgressLog logs={logs} />
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div className="card" style={{
          borderColor: "rgba(248,113,113,0.3)",
          background: "rgba(248,113,113,0.05)",
          animation: "fadeUp 0.4s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>💥</span>
            <div>
              <h3 style={{ color: "var(--red)", marginBottom: "8px", fontSize: "1rem" }}>
                Failed to generate README
              </h3>
              <p style={{ color: "var(--text2)", fontSize: "0.875rem", fontFamily: "var(--mono)" }}>
                {errorMsg}
              </p>
              <button onClick={onReset} className="btn btn-ghost" style={{ marginTop: "16px", fontSize: "0.8rem" }}>
                ← Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done state */}
      {phase === "done" && readme && (
        <div style={{ animation: "fadeUp 0.5s ease" }}>
          {/* Success banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.25)",
            borderRadius: "var(--r)",
            padding: "14px 20px",
            marginBottom: "24px",
          }}>
            <span style={{ fontSize: "1.5rem" }}>🎉</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: "var(--green)", fontSize: "0.9rem" }}>
                README generated successfully!
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: "2px" }}>
                Built from real repo data — no templates, no filler.
              </p>
            </div>
            <button onClick={onReset} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "8px 14px" }}>
              ← New repo
            </button>
          </div>

          {/* Meta badges */}
          <MetaBadges meta={meta} />

          {/* Tech stack tags */}
          {meta?.frameworks?.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text3)", marginRight: "8px" }}>
                Detected stack:
              </span>
              {meta.frameworks.map(f => (
                <span key={f} className="tag">{f}</span>
              ))}
            </div>
          )}

          {/* README output */}
          <ReadmePreview readme={readme} />
        </div>
      )}
    </main>
  );
}
