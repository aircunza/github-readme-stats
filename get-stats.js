import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getAuthenticatedUsername() {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

async function getAllRepos(owner) {
  let repos = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.rest.repos.listForUser({
      username: owner,
      per_page: 100,
      page,
    });
    repos = repos.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return repos;
}

async function getRepoStats(owner, repo) {
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
}

async function main() {
  const owner = await getAuthenticatedUsername(); // reemplaza si quieres usar tu usuario directo
  const repos = await getAllRepos(owner);

  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;

  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo.name);
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
