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

  const svg = `<svg width="400" height="110" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="400" height="110" fill="#0d1117" rx="10"/>
    <text x="20" y="30" fill="#c9d1d9" font-size="18">GitHub Stats for ${owner}</text>
    <text x="20" y="60" fill="#58a6ff" font-size="16">📝 Total Commits: ${totalCommits}</text>
    <text x="20" y="80" fill="#58a6ff" font-size="16">🔀 Total PRs: ${totalPRs}</text>
    <text x="20" y="100" fill="#58a6ff" font-size="16">❗ Total Issues: ${totalIssues}</text>
  </svg>`;

  fs.writeFileSync("stats.svg", svg);
  console.log("✅ SVG stats file generated!");
}

main().catch(err => {
  console.error("❌ Error generating stats:", err);
  process.exit(1);
});
