import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getAuthenticatedUsername() {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

async function getAllRepos() {
  let repos = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      visibility: "all", // incluye públicos y privados
    });
    repos = repos.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return repos;
}

async function getRepoStats(owner, repo) {
  try {
    const commitsResp = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });
    const commits = commitsResp.headers.link
      ? Number(commitsResp.headers.link.match(/&page=(\d+)>; rel="last"/)?.[1] ?? 1)
      : commitsResp.data.length;

    const prsResp = await octokit.rest.pulls.list({
      owner,
      repo,
      per_page: 1,
      state: "all",
    });
    const prs = prsResp.headers.link
      ? Number(prsResp.headers.link.match(/&page=(\d+)>; rel="last"/)?.[1] ?? 1)
      : prsResp.data.length;

    const issuesResp = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      per_page: 1,
      state: "all",
    });
    const issues = issuesResp.headers.link
      ? Number(issuesResp.headers.link.match(/&page=(\d+)>; rel="last"/)?.[1] ?? 1)
      : issuesResp.data.length;

    return { commits, prs, issues };
  } catch (error) {
    // Si el repositorio está vacío (error 409), retorna 0 para todo
    if (error.status === 409) {
      console.warn(`Repo ${repo} is empty, skipping stats.`);
      return { commits: 0, prs: 0, issues: 0 };
    }
    // Para otros errores, re-lanzar
    throw error;
  }
}

async function main() {
  const owner = await getAuthenticatedUsername();
  const repos = await getAllRepos();

  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;

  for (const repo of repos) {
    const stats = await getRepoStats(repo.owner.login, repo.name);
    totalCommits += stats.commits;
    totalPRs += stats.prs;
    totalIssues += stats.issues;
  }

const svg = `
<svg width="440" height="140" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f2027"/>
      <stop offset="100%" stop-color="#203a43"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%" >
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="440" height="140" rx="14" fill="url(#bgGradient)" filter="url(#shadow)"/>
  
  <text x="30" y="40" fill="#f0f6fc" font-size="22" font-weight="600">GitHub Stats for ${owner}</text>
  
  <g transform="translate(30, 70)" fill="#58a6ff" font-size="18" font-weight="500" letter-spacing="0.02em">
    <g>
      <text x="30" y="0">📝 Total Commits:</text>
      <text x="180" y="0" fill="#c9d1d9" font-weight="700">${totalCommits}</text>
    </g>
    <g transform="translate(0, 30)">
      <text x="30" y="0">🔀 Total PRs:</text>
      <text x="180" y="0" fill="#c9d1d9" font-weight="700">${totalPRs}</text>
    </g>
    <g transform="translate(0, 60)">
      <text x="30" y="0">❗ Total Issues:</text>
      <text x="180" y="0" fill="#c9d1d9" font-weight="700">${totalIssues}</text>
    </g>
  </g>
</svg>
`;

  fs.writeFileSync("stats.svg", svg);
  console.log("✅ SVG stats file generated!");
}

main().catch(err => {
  console.error("❌ Error generating stats:", err);
  process.exit(1);
});
