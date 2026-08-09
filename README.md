# gh-repo-gen

> Generate accurate, content-driven README files for any GitHub repository. No templates. Real analysis.

[![Live](https://img.shields.io/badge/Live-gh--repo--gen.pages.dev-blue?style=flat-square)](https://gh-repo-gen.pages.dev)

## What makes it different

Most README generators use templates and fill in blanks. This one:

- Reads the actual file tree
- Parses `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.
- Detects frameworks, CI/CD, Docker, tests, and more from real file evidence
- Fetches contributors, releases, open issues, topics, and language stats from the GitHub API
- Builds a README that reflects what the repo actually **is**, not a generic placeholder

## Architecture

```
gh-repo-gen/
├── worker/        Cloudflare Worker — GitHub API proxy + analysis + README builder
└── frontend/      React + Vite — Cloudflare Pages
```

## Deploy

### Worker (Cloudflare Workers)

```bash
cd worker
npm install
npx wrangler secret put GITHUB_TOKEN   # optional but increases rate limits
npx wrangler deploy
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name=gh-repo-gen
```

Or connect the GitHub repo to Cloudflare Pages with build command `npm run build` and output `dist`.

Set `VITE_API_BASE` in Pages environment variables to point at your deployed worker URL.

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `GITHUB_TOKEN` | Worker secret | GitHub PAT for higher rate limits (optional) |
| `VITE_API_BASE` | Pages env | URL of the deployed worker |

## Tech stack

- **Worker:** Cloudflare Workers (no dependencies, vanilla JS)
- **Frontend:** React 18, Vite, react-markdown
- **Hosting:** Cloudflare Workers + Pages (zero infra)
- **Data:** GitHub REST API only

## License

MIT
