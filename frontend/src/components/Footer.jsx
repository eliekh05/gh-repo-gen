import React from "react";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      padding: "32px 20px",
      textAlign: "center",
      background: "var(--bg2)",
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.1rem" }}>📄</span>
          <span style={{
            fontFamily: "var(--mono)",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--text)",
          }}>
            gh-repo-gen
          </span>
          <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>
            — zero-template README generation
          </span>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: "20px",
          fontSize: "0.78rem",
          color: "var(--text3)",
        }}>
          <a
            href="https://github.com/eliekh05/gh-repo-gen"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text2)", textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color = "var(--brand)"}
            onMouseLeave={e => e.target.style.color = "var(--text2)"}
          >
            GitHub ↗
          </a>
          <span>Powered by</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            color: "var(--text2)",
          }}>
            <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
              <path d="M0 50 L50 0 L100 50 L50 100 Z" fill="#f6821f"/>
            </svg>
            Cloudflare Workers
          </span>
          <span>·</span>
          <a
            href="https://api.github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text2)", textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color = "var(--brand)"}
            onMouseLeave={e => e.target.style.color = "var(--text2)"}
          >
            GitHub API ↗
            <span>·</span>
            <a
              href="https://gh-profile-gen.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text2)", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = "var(--brand)"}
              onMouseLeave={e => e.target.style.color = "var(--text2)"}
            >
              Profile Readme Generator ↗
          </a>
      </div>
    </footer>
  );
}
