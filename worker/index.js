/**
 * gh-repo-gen — Cloudflare Worker
 *
 * Generates accurate, content-rich README files for GitHub repositories.
 * Analyzes the actual repo: code structure, dependencies, CI, tests, docs,
 * languages, frameworks, file tree, contributor count, license, etc.
 *
 * POST /generate { owner, repo, token? } → SSE stream → { type: "done", readme }
 */

const GH_API = "https://api.github.com";
const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

// ── Devicon map ───────────────────────────────────────────────────────────────
const DEVICON_MAP = {
  "Python":      { slug: "python",        variant: "original" },
  "JavaScript":  { slug: "javascript",    variant: "original" },
  "TypeScript":  { slug: "typescript",    variant: "original" },
  "Go":          { slug: "go",            variant: "original" },
  "Rust":        { slug: "rust",          variant: "original" },
  "Java":        { slug: "java",          variant: "original" },
  "Kotlin":      { slug: "kotlin",        variant: "original" },
  "C":           { slug: "c",             variant: "original" },
  "C++":         { slug: "cplusplus",     variant: "original" },
  "C#":          { slug: "csharp",        variant: "original" },
  "Ruby":        { slug: "ruby",          variant: "original" },
  "PHP":         { slug: "php",           variant: "original" },
  "Swift":       { slug: "swift",         variant: "original" },
  "Dart":        { slug: "dart",          variant: "original" },
  "Shell":       { slug: "bash",          variant: "original" },
  "HTML":        { slug: "html5",         variant: "original" },
  "CSS":         { slug: "css3",          variant: "original" },
  "Vue":         { slug: "vuejs",         variant: "original" },
  "Svelte":      { slug: "svelte",        variant: "original" },
  "React":       { slug: "react",         variant: "original" },
  "Next.js":     { slug: "nextjs",        variant: "original" },
  "Angular":     { slug: "angular",       variant: "original" },
  "Django":      { slug: "django",        variant: "plain"    },
  "Flask":       { slug: "flask",         variant: "original" },
  "FastAPI":     { slug: "fastapi",       variant: "original" },
  "Express":     { slug: "express",       variant: "original" },
  "NestJS":      { slug: "nestjs",        variant: "original" },
  "TensorFlow":  { slug: "tensorflow",    variant: "original" },
  "PyTorch":     { slug: "pytorch",       variant: "original" },
  "Docker":      { slug: "docker",        variant: "original" },
  "Kubernetes":  { slug: "kubernetes",    variant: "original" },
  "PostgreSQL":  { slug: "postgresql",    variant: "original" },
  "MongoDB":     { slug: "mongodb",       variant: "original" },
  "Redis":       { slug: "redis",         variant: "original" },
  "MySQL":       { slug: "mysql",         variant: "original" },
  "SQLite":      { slug: "sqlite",        variant: "original" },
  "Tailwind CSS":{ slug: "tailwindcss",   variant: "original" },
  "GraphQL":     { slug: "graphql",       variant: "plain"    },
  "Prisma":      { slug: "prisma",        variant: "original" },
  "Terraform":   { slug: "terraform",     variant: "original" },
  "GitHub Actions": { slug: "githubactions", variant: "original" },
  "Nuxt":        { slug: "nuxtjs",        variant: "original" },
  "Electron":    { slug: "electron",      variant: "original" },
  "Vite":        { slug: "vitejs",        variant: "original" },
};

function deviconUrl(name) {
  const e = DEVICON_MAP[name];
  if (!e) return null;
  return `${DEVICON}/${e.slug}/${e.slug}-${e.variant}.svg`;
}

// ── Framework signals ─────────────────────────────────────────────────────────
const FRAMEWORK_SIGNALS = {
  "React":          ['"react"', '"react-dom"'],
  "Next.js":        ['"next"'],
  "Vue":            ['"vue"'],
  "Nuxt":           ['"nuxt"'],
  "Svelte":         ['"svelte"', "@sveltejs"],
  "Angular":        ["@angular/core"],
  "Electron":       ['"electron"'],
  "Vite":           ['"vite"'],
  "Django":         ["django"],
  "Flask":          ["flask"],
  "FastAPI":        ["fastapi"],
  "Express":        ['"express"'],
  "NestJS":         ["@nestjs/core"],
  "Spring Boot":    ["spring-boot"],
  "Rails":          ["railties"],
  "Laravel":        ["laravel/framework"],
  "TensorFlow":     ["tensorflow"],
  "PyTorch":        ["torch"],
  "scikit-learn":   ["scikit-learn"],
  "Pandas":         ["pandas"],
  "NumPy":          ["numpy"],
  "GraphQL":        ["graphql", "apollo-server"],
  "PostgreSQL":     ["psycopg2", '"pg"', "asyncpg"],
  "MySQL":          ["mysqlclient", "mysql2", "pymysql"],
  "SQLite":         ["sqlite3", "better-sqlite3"],
  "MongoDB":        ["pymongo", "mongoose"],
  "Redis":          ["redis", "ioredis"],
  "Prisma":         ["prisma", "@prisma/client"],
  "Tailwind CSS":   ["tailwindcss"],
  "Gin":            ["gin-gonic/gin"],
  "Fiber":          ["gofiber/fiber"],
  "Actix":          ["actix-web"],
  "Axum":           ["axum"],
  "SQLAlchemy":     ["sqlalchemy"],
  "Drizzle":        ['"drizzle-orm"'],
  "tRPC":           ['"@trpc/server"'],
  "Hono":           ['"hono"'],
  "Elysia":         ['"elysia"'],
  "Astro":          ['"astro"'],
  "Remix":          ['"@remix-run/react"'],
};

// ── GitHub API helpers ────────────────────────────────────────────────────────
function ghHeaders(token) {
  const h = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "gh-repo-gen/1.0",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function ghGet(url, token) {
  const resp = await fetch(url, { headers: ghHeaders(token) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub ${resp.status} @ ${url}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function ghGetSafe(url, token) {
  try { return await ghGet(url, token); }
  catch { return null; }
}

async function fetchFile(owner, repo, path, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, token);
    if (data.encoding === "base64" && data.content)
      return atob(data.content.replace(/\n/g, ""));
    return null;
  } catch { return null; }
}

async function fetchTree(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, token);
    return (data.tree || []).map(f => ({ path: f.path, type: f.type, size: f.size || 0 }));
  } catch { return []; }
}

async function fetchLanguages(owner, repo, token) {
  return await ghGetSafe(`${GH_API}/repos/${owner}/${repo}/languages`, token) || {};
}

async function fetchContributors(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/contributors?per_page=30&anon=1`, token);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchTopics(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/topics`, token);
    return data.names || [];
  } catch { return []; }
}

async function fetchReleases(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/releases?per_page=5`, token);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchWorkflows(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/actions/workflows`, token);
    return data.workflows || [];
  } catch { return []; }
}

async function fetchOpenIssues(owner, repo, token) {
  try {
    const data = await ghGet(`${GH_API}/repos/${owner}/${repo}/issues?state=open&per_page=5`, token);
    return Array.isArray(data) ? data.filter(i => !i.pull_request) : [];
  } catch { return []; }
}

// ── Detect frameworks from manifest files ─────────────────────────────────────
function detectFromContent(content, found) {
  if (!content) return;
  const lower = content.toLowerCase();
  for (const [fw, sigs] of Object.entries(FRAMEWORK_SIGNALS))
    for (const s of sigs)
      if (lower.includes(s.toLowerCase())) { found.add(fw); break; }
}

function detectFromPackageJson(content, found) {
  if (!content) return;
  try {
    const data = JSON.parse(content);
    const keys = Object.keys({
      ...data.dependencies, ...data.devDependencies,
      ...data.peerDependencies, ...data.optionalDependencies,
    }).join(" ").toLowerCase();
    for (const [fw, sigs] of Object.entries(FRAMEWORK_SIGNALS))
      for (const s of sigs) {
        const sl = s.toLowerCase().replace(/['"]/g, "");
        if (keys.includes(sl)) { found.add(fw); break; }
      }
    // Extract scripts
    const scripts = data.scripts || {};
    return { scripts, name: data.name, description: data.description, version: data.version };
  } catch { detectFromContent(content, found); return {}; }
}

// ── Analyze the full file tree ────────────────────────────────────────────────
function analyzeTree(tree) {
  const paths = tree.map(f => f.path);
  const rootFiles = new Set(paths.filter(p => !p.includes("/")).map(p => p.toLowerCase()));
  const allDirs = new Set(paths.map(p => p.split("/")[0]).filter(Boolean));
  const allFiles = new Set(paths.map(p => p.toLowerCase()));

  const hasFile = (...names) => names.some(n => rootFiles.has(n.toLowerCase()) || allFiles.has(n.toLowerCase()));
  const hasDir = (...names) => names.some(n => allDirs.has(n));

  return {
    hasTests: hasDir("tests", "test", "__tests__", "spec") ||
              hasFile("jest.config.js", "vitest.config.ts", "pytest.ini", "setup.cfg") ||
              paths.some(p => /\.(test|spec)\.(js|ts|jsx|tsx|py|rb|go|rs)$/.test(p)),
    hasDocker: hasFile("Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"),
    hasCi: hasDir(".github/workflows") || hasFile(".travis.yml", "Jenkinsfile", ".circleci/config.yml", ".gitlab-ci.yml"),
    hasLicense: hasFile("LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"),
    hasContributing: hasFile("CONTRIBUTING.md", "CONTRIBUTING.rst", "CONTRIBUTING"),
    hasChangelog: hasFile("CHANGELOG.md", "CHANGELOG.rst", "CHANGELOG", "HISTORY.md"),
    hasCodeOfConduct: hasFile("CODE_OF_CONDUCT.md"),
    hasDocs: hasDir("docs", "doc", "documentation") || hasFile("docs/index.md"),
    hasMakefile: hasFile("Makefile", "makefile"),
    hasEnvExample: hasFile(".env.example", ".env.sample", ".env.template"),
    hasTerraform: paths.some(p => p.endsWith(".tf")),
    hasKubernetes: hasDir("k8s", "kubernetes", "helm") || hasFile("Chart.yaml"),
    srcDir: ["src", "lib", "pkg", "app", "core"].find(d => allDirs.has(d)) || null,
    testFiles: paths.filter(p => /\.(test|spec)\.(js|ts|jsx|tsx|py|rb|go|rs)$/.test(p) ||
                                  p.includes("/tests/") || p.includes("/__tests__/")).slice(0, 3),
    configFiles: paths.filter(p => {
      const l = p.toLowerCase();
      return (l.includes("config") || l.includes(".env.")) && !l.includes("node_modules");
    }).slice(0, 5),
    totalFiles: tree.filter(f => f.type === "blob").length,
    totalDirs: tree.filter(f => f.type === "tree").length,
  };
}

// ── Detect installation method from files ─────────────────────────────────────
function detectInstallMethod(tree, pkg, req, gomod, cargo) {
  const paths = tree.map(f => f.path.toLowerCase());
  const hasPackageJson = paths.includes("package.json");
  const hasPipfile = paths.includes("pipfile") || paths.includes("pipfile.lock");
  const hasMakefile = paths.some(p => p.endsWith("makefile") || p.endsWith("makefile.toml"));
  const hasSetupPy = paths.includes("setup.py");
  const hasPoetry = paths.includes("pyproject.toml");

  if (gomod) return { type: "go", cmd: "go mod download", run: "go run ." };
  if (cargo) return { type: "cargo", cmd: "cargo build", run: "cargo run" };
  if (hasPackageJson && pkg) {
    let mgr = "npm";
    if (paths.includes("pnpm-lock.yaml")) mgr = "pnpm";
    else if (paths.includes("yarn.lock")) mgr = "yarn";
    else if (paths.includes("bun.lockb") || paths.includes("bun.lock")) mgr = "bun";

    let parsedPkg = {};
    try { parsedPkg = JSON.parse(pkg); } catch {}
    const scripts = parsedPkg.scripts || {};
    const devScript = scripts.dev || scripts.start || scripts.serve;
    const buildScript = scripts.build;

    return {
      type: mgr,
      cmd: `${mgr} install`,
      run: devScript ? `${mgr} run dev` : `${mgr} start`,
      build: buildScript ? `${mgr} run build` : null,
    };
  }
  if (req || hasPipfile || hasSetupPy || hasPoetry) {
    if (hasPoetry) return { type: "poetry", cmd: "poetry install", run: "poetry run python main.py" };
    if (hasPipfile) return { type: "pipenv", cmd: "pipenv install", run: "pipenv run python main.py" };
    return { type: "pip", cmd: "pip install -r requirements.txt", run: "python main.py" };
  }
  return null;
}

// ── Infer what type of project this is ───────────────────────────────────────
function inferProjectType(repo, tree, frameworks, langs, pkg) {
  const topics = (repo.topics || []).join(" ").toLowerCase();
  const desc = (repo.description || "").toLowerCase();
  const allText = `${topics} ${desc}`;

  let parsedPkg = {};
  try { parsedPkg = JSON.parse(pkg || "{}"); } catch {}

  const fwSet = new Set(frameworks.map(f => f.toLowerCase()));
  const langSet = new Set(Object.keys(langs).map(l => l.toLowerCase()));

  // Heuristics in priority order
  if (fwSet.has("next.js") || fwSet.has("nuxt") || fwSet.has("sveltekit") || fwSet.has("astro") || fwSet.has("remix"))
    return "Full-Stack Web App";
  if (fwSet.has("react") || fwSet.has("vue") || fwSet.has("angular") || fwSet.has("svelte"))
    return "Frontend Web App";
  if (fwSet.has("express") || fwSet.has("nestjs") || fwSet.has("fastapi") || fwSet.has("django") ||
      fwSet.has("flask") || fwSet.has("gin") || fwSet.has("fiber") || fwSet.has("actix") || fwSet.has("axum") || fwSet.has("hono"))
    return "Backend API / Server";
  if (fwSet.has("electron")) return "Desktop Application";
  if (fwSet.has("tensorflow") || fwSet.has("pytorch") || fwSet.has("scikit-learn"))
    return "Machine Learning / AI";
  if (allText.includes("cli") || allText.includes("command line") || allText.includes("terminal"))
    return "CLI Tool";
  if (allText.includes("library") || allText.includes("package") || allText.includes("sdk") || allText.includes("util"))
    return "Library / Package";
  if (allText.includes("bot") || allText.includes("discord") || allText.includes("telegram"))
    return "Bot";
  if (allText.includes("game") || allText.includes("unity") || allText.includes("godot"))
    return "Game";
  if (langSet.has("python") && !Object.keys(langs).some(l => ["javascript","typescript","html"].includes(l.toLowerCase())))
    return "Python Project";
  if (langSet.has("go")) return "Go Project";
  if (langSet.has("rust")) return "Rust Project";
  if (langSet.has("java") || langSet.has("kotlin")) return "JVM Project";

  return "Software Project";
}

// ── Build the README ──────────────────────────────────────────────────────────
function buildReadme(data) {
  const {
    repo, owner, languages, frameworks, contributors,
    topics, releases, workflows, openIssues, treeAnalysis,
    pkgMeta, installMethod, projectType,
    pkg, gomod, cargo, req,
  } = data;

  const name = repo.full_name;
  const repoName = repo.name;
  const description = repo.description || "";
  const homepage = repo.homepage || "";
  const license = repo.license ? repo.license.spdx_id : null;
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const openIssueCount = repo.open_issues_count || 0;
  const defaultBranch = repo.default_branch || "main";
  const language = repo.language || "";
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
  const createdAt = repo.created_at ? new Date(repo.created_at).getFullYear() : "";
  const size = repo.size || 0;
  const isForked = repo.fork;

  const langBytes = languages;
  const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
  const langPct = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([l, b]) => ({ lang: l, pct: totalBytes ? Math.round((b / totalBytes) * 100) : 0 }));

  const topLangs = langPct.map(l => l.lang);

  // Shields.io badges
  const badge = (label, msg, color, logo) => {
    const encoded = encodeURIComponent(msg.replace(/-/g, "--").replace(/_/g, "__"));
    const logoParam = logo ? `&logo=${encodeURIComponent(logo)}` : "";
    return `![${label}](https://img.shields.io/badge/${encodeURIComponent(label)}-${encoded}-${color}?style=flat-square${logoParam}&logoColor=white)`;
  };

  const repoBadges = [
    `[![Stars](https://img.shields.io/github/stars/${name}?style=flat-square)](https://github.com/${name}/stargazers)`,
    `[![Forks](https://img.shields.io/github/forks/${name}?style=flat-square)](https://github.com/${name}/network/members)`,
    `[![Issues](https://img.shields.io/github/issues/${name}?style=flat-square)](https://github.com/${name}/issues)`,
    license ? `[![License](https://img.shields.io/github/license/${name}?style=flat-square)](LICENSE)` : "",
    treeAnalysis.hasCi && workflows.length > 0
      ? `[![CI](https://img.shields.io/github/actions/workflow/status/${name}/${workflows[0].path.split("/").pop()}?style=flat-square&label=CI)](https://github.com/${name}/actions)`
      : "",
    releases.length > 0
      ? `[![Release](https://img.shields.io/github/v/release/${name}?style=flat-square)](https://github.com/${name}/releases/latest)`
      : "",
  ].filter(Boolean);

  // Tech stack icons
  function iconImg(name) {
    const url = deviconUrl(name);
    if (!url) return "";
    return `<img src="${url}" alt="${name}" width="36" height="36" title="${name}"/>`;
  }
  const stackIcons = [...topLangs, ...frameworks.filter(f => !topLangs.includes(f))]
    .map(iconImg).filter(Boolean).join(" ");

  // Contributors section
  const mainContributors = contributors.slice(0, 10);
  const contributorCount = contributors.length;

  // Installation steps
  let installSection = "";
  if (installMethod) {
    const cloneCmd = `git clone https://github.com/${name}.git\ncd ${repoName}`;
    const envNote = treeAnalysis.hasEnvExample
      ? `\n# Copy and configure environment variables\ncp .env.example .env\n# Edit .env with your settings`
      : "";
    installSection = `## 🚀 Installation

\`\`\`bash
${cloneCmd}
\`\`\`

${treeAnalysis.hasMakefile ? `\`\`\`bash\nmake install\n\`\`\`` : `\`\`\`bash\n${installMethod.cmd}${envNote}\n\`\`\``}
`;
  }

  // Usage section
  let usageSection = "";
  if (installMethod) {
    usageSection = `## 💻 Usage

\`\`\`bash
${installMethod.run}
\`\`\`
`;
    if (installMethod.build) {
      usageSection += `\n**Build for production:**\n\`\`\`bash\n${installMethod.build}\n\`\`\`\n`;
    }
  }

  // Configuration section
  let configSection = "";
  if (treeAnalysis.hasEnvExample) {
    configSection = `## ⚙️ Configuration

Copy \`.env.example\` to \`.env\` and configure the required environment variables:

\`\`\`bash
cp .env.example .env
\`\`\`

> Check [.env.example](.env.example) for all available configuration options.
`;
  }

  // Testing section
  let testSection = "";
  if (treeAnalysis.hasTests) {
    let testCmd = "# Run tests";
    if (installMethod?.type === "npm") testCmd = "npm test";
    else if (installMethod?.type === "yarn") testCmd = "yarn test";
    else if (installMethod?.type === "pnpm") testCmd = "pnpm test";
    else if (installMethod?.type === "bun") testCmd = "bun test";
    else if (installMethod?.type === "pip" || installMethod?.type === "poetry") testCmd = "pytest";
    else if (installMethod?.type === "go") testCmd = "go test ./...";
    else if (installMethod?.type === "cargo") testCmd = "cargo test";

    testSection = `## 🧪 Testing

\`\`\`bash
${testCmd}
\`\`\`
`;
    if (treeAnalysis.testFiles.length > 0) {
      testSection += `\nTest files are located in:\n${treeAnalysis.testFiles.map(f => `- \`${f}\``).join("\n")}\n`;
    }
  }

  // Latest release
  let releaseSection = "";
  if (releases.length > 0) {
    const latest = releases[0];
    const releaseDate = latest.published_at
      ? new Date(latest.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "";
    releaseSection = `## 📦 Latest Release

**${latest.tag_name}** ${releaseDate ? `(${releaseDate})` : ""} — [View on GitHub](https://github.com/${name}/releases/tag/${latest.tag_name})

${latest.body ? latest.body.split("\n").slice(0, 6).join("\n") : ""}
`;
  }

  // Open issues preview
  let issuesSection = "";
  if (openIssues.length > 0) {
    issuesSection = `## 🐛 Open Issues

| # | Title | Labels |
|---|-------|--------|
${openIssues.map(i =>
  `| [#${i.number}](${i.html_url}) | ${i.title.slice(0, 60)} | ${(i.labels || []).map(l => `\`${l.name}\``).join(" ") || "—"} |`
).join("\n")}

[View all issues →](https://github.com/${name}/issues)
`;
  }

  // Contributing
  let contributeSection = treeAnalysis.hasContributing
    ? `## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.
`
    : `## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request
`;

  // Topics as shields
  const topicBadges = topics.slice(0, 12)
    .map(t => `\`${t}\``)
    .join(" ");

  // Language stats bar (text version)
  const langBar = langPct.map(l => `${l.lang} ${l.pct}%`).join(" · ");

  // CI workflows
  const workflowList = workflows.slice(0, 5)
    .map(w => `- **${w.name}** — \`${w.path}\``)
    .join("\n");

  // Project structure snippet (top-level only)
  const topLevelItems = [
    ...new Set(data.fullTree.filter(f => !f.path.includes("/")).map(f => f.path))
  ].slice(0, 20);
  const treeSnippet = topLevelItems.length > 0
    ? `\`\`\`\n${repoName}/\n${topLevelItems.map(p => `├── ${p}`).join("\n")}\n\`\`\``
    : "";

  // Assemble
  const parts = [
    // Title
    `<div align="center">\n\n# ${repoName}\n\n${description ? `**${description}**\n\n` : ""}${homepage ? `🌐 [Live Demo / Website](${homepage})\n\n` : ""}${repoBadges.join(" ")}\n\n</div>`,

    // Tech stack
    stackIcons ? `## 🛠️ Built With\n\n<p align="left">\n${stackIcons}\n</p>\n\n${langBar}` : "",

    // Topics
    topicBadges ? `**Topics:** ${topicBadges}` : "",

    // Project type / about
    [
      `## 📋 About`,
      `- **Type:** ${projectType}`,
      language ? `- **Primary Language:** ${language}` : "",
      `- **Repository:** [${name}](https://github.com/${name})`,
      createdAt ? `- **Created:** ${createdAt}` : "",
      pushedAt ? `- **Last Updated:** ${pushedAt}` : "",
      `- **Stars:** ⭐ ${stars}  **Forks:** 🍴 ${forks}`,
      treeAnalysis.totalFiles > 0 ? `- **Files:** ${treeAnalysis.totalFiles}` : "",
      license ? `- **License:** ${license}` : "",
      isForked ? `- **Forked from:** [${repo.parent?.full_name}](https://github.com/${repo.parent?.full_name})` : "",
    ].filter(Boolean).join("\n"),

    // Install
    installSection,

    // Usage
    usageSection,

    // Config
    configSection,

    // Testing
    testSection,

    // CI/CD
    (treeAnalysis.hasCi && workflowList) ? `## ⚙️ CI/CD\n\n${workflowList}` : "",

    // Project structure
    treeSnippet ? `## 📁 Project Structure\n\n${treeSnippet}` : "",

    // Release
    releaseSection,

    // Open issues
    issuesSection,

    // Contributing
    contributeSection,

    // Contributors
    contributorCount > 0 ? `## 👥 Contributors\n\nThanks to ${contributorCount} contributor${contributorCount !== 1 ? "s" : ""}!\n\n[![Contributors](https://contrib.rocks/image?repo=${name})](https://github.com/${name}/graphs/contributors)` : "",

    // Changelog
    treeAnalysis.hasChangelog ? `## 📝 Changelog\n\nSee [CHANGELOG.md](CHANGELOG.md) for a history of changes.` : "",

    // License
    license ? `## 📄 License\n\nThis project is licensed under the **${license}** license. See the [LICENSE](LICENSE) file for details.` : "",

    // Footer
    `---\n\n<div align="center">\n  <sub>Generated by <a href="https://gh-repo-gen.pages.dev">gh-repo-gen</a> · Data sourced from <a href="https://api.github.com">api.github.com</a></sub>\n</div>`,
  ];

  return parts.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ── SSE helpers ───────────────────────────────────────────────────────────────
const sse = data => `data: ${JSON.stringify(data)}\n\n`;
const cors = () => ({
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options":       "nosniff",
});

// ── Worker ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors() });

    if (url.pathname === "/health")
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors(), "Content-Type": "application/json" },
      });

    if (url.pathname !== "/generate" || request.method !== "POST")
      return new Response("Not found", { status: 404, headers: cors() });

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...cors(), "Content-Type": "application/json" },
      });
    }

    const rawOwner = (body.owner || "").trim();
    const rawRepo  = (body.repo  || "").trim();

    if (!rawOwner || !rawRepo)
      return new Response(JSON.stringify({ error: "owner and repo are required" }), {
        status: 400, headers: { ...cors(), "Content-Type": "application/json" },
      });

    const owner = rawOwner.toLowerCase();
    const repo  = rawRepo.toLowerCase();

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,98}$/.test(owner) ||
        !/^[a-zA-Z0-9._-]{1,100}$/.test(repo))
      return new Response(JSON.stringify({ error: "Invalid owner or repo name" }), {
        status: 400, headers: { ...cors(), "Content-Type": "application/json" },
      });

    const token = env.GITHUB_TOKEN || "";

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc    = new TextEncoder();
    const send   = async d => writer.write(enc.encode(sse(d)));

    (async () => {
      try {
        await send({ type: "progress", step: "repo", message: `Fetching ${owner}/${repo}…` });
        const repoData = await ghGet(`${GH_API}/repos/${owner}/${repo}`, token);

        await send({ type: "progress", step: "tree", message: "Reading file tree…" });
        const fullTree = await fetchTree(owner, repo, token);

        await send({ type: "progress", step: "languages", message: "Analyzing languages…" });
        const [languages, contributors, topics, releases, workflows, openIssues] = await Promise.all([
          fetchLanguages(owner, repo, token),
          fetchContributors(owner, repo, token),
          fetchTopics(owner, repo, token),
          fetchReleases(owner, repo, token),
          fetchWorkflows(owner, repo, token),
          fetchOpenIssues(owner, repo, token),
        ]);

        await send({ type: "progress", step: "manifests", message: "Reading manifests & detecting stack…" });
        const [pkg, req, gomod, cargo, pyproject] = await Promise.all([
          fetchFile(owner, repo, "package.json",     token),
          fetchFile(owner, repo, "requirements.txt", token),
          fetchFile(owner, repo, "go.mod",           token),
          fetchFile(owner, repo, "Cargo.toml",       token),
          fetchFile(owner, repo, "pyproject.toml",   token),
        ]);

        const found = new Set();
        const pkgMeta = detectFromPackageJson(pkg, found) || {};
        detectFromContent(req,       found);
        detectFromContent(gomod,     found);
        detectFromContent(cargo,     found);
        detectFromContent(pyproject, found);

        const treeAnalysis = analyzeTree(fullTree);
        if (treeAnalysis.hasDocker) found.add("Docker");
        if (treeAnalysis.hasKubernetes) found.add("Kubernetes");
        if (treeAnalysis.hasTerraform) found.add("Terraform");
        if (treeAnalysis.hasCi) found.add("GitHub Actions");

        const frameworks = [...found].sort();
        const installMethod = detectInstallMethod(fullTree, pkg, req, gomod, cargo);
        const projectType = inferProjectType(repoData, fullTree, frameworks, languages, pkg);

        await send({ type: "progress", step: "building", message: "Building README…" });
        const readme = buildReadme({
          repo: repoData, owner, languages, frameworks, contributors,
          topics, releases, workflows, openIssues, treeAnalysis,
          pkgMeta, installMethod, projectType,
          pkg, gomod, cargo, req, fullTree,
        });

        await send({
          type: "done",
          readme,
          meta: {
            projectType,
            language: repoData.language,
            frameworks,
            languages: Object.keys(languages),
            contributors: contributors.length,
            stars: repoData.stargazers_count,
            hasTests: treeAnalysis.hasTests,
            hasCi: treeAnalysis.hasCi,
            hasDocker: treeAnalysis.hasDocker,
            totalFiles: treeAnalysis.totalFiles,
          },
        });

      } catch (err) {
        await send({ type: "error", message: err.message || "Unknown error" });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...cors(),
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  },
};
