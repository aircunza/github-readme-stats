import { Octokit } from "octokit";
import fs from "fs";
import path from "path";

const octokit = new Octokit({ auth: process.env.GH_TOKEN });

async function getAllRepos(owner) {
  let repos = [];
  let page = 1;

  while (true) {
    const response = await octokit.rest.repos.listForUser({
      username: owner,
      per_page: 100,
      page,
    });
    repos = repos.concat(response.data);
    if (response.data.length < 100) break;
    page++;
  }
  return repos;
}

async function getCommitCount(owner, repo, branch) {
  let count = 0;
  let page = 1;

  while (true) {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 100,
      page,
    });
    count += response.data.length;
    if (response.data.length < 100) break;
    page++;
  }

  return count;
}

async function getIssuesCount(owner, repo, state) {
  let count = 0;
  let page = 1;

  while (true) {
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 100,
      page,
    });
    // Excluir pull requests (issues incluye PRs)
    const issuesOnly = response.data.filter(issue => !issue.pull_request);
    count += issuesOnly.length;
    if (response.data.length < 100) break;
    page++;
  }

  return count;
}

async function getPRsCount(owner, repo, state) {
  let count = 0;
  let page = 1;

  while (true) {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
      page,
    });
    count += response.data.length;
    if (response.data.length < 100) break;
    page++;
  }

  return count;
}

async function main() {
  const owner = "aircunza";

  console.log("Fetching repos...");
  const repos = await getAllRepos(owner);

  let totalCommits = 0;
  let totalIssuesOpen = 0;
  let totalIssuesClosed = 0;
  let totalPRsOpen = 0;
  let totalPRsClosed = 0;

  for (const repo of repos) {
    const defaultBranch = repo.default_branch;

    console.log(`Processing repo: ${repo.name}`);

    const commits = await getCommitCount(owner, repo.name, defaultBranch);
    const issuesOpen = await getIssuesCount(owner, repo.name, "open");
    const issuesClosed = await getIssuesCount(owner, repo.name, "closed");
    const prsOpen = await getPRsCount(owner, repo.name, "open");
    const prsClosed = await getPRsCount(owner, repo.name, "closed");

    totalCommits += commits;
    totalIssuesOpen += issuesOpen;
    totalIssuesClosed += issuesClosed;
    totalPRsOpen += prsOpen;
    totalPRsClosed += prsClosed;
  }

  // Crear SVG
  const svgContent = `
  <svg width="500" height="160" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="500" height="160" fill="#0d1117" rx="10" />
    <text x="20" y="30" fill="#c9d1d9" font-size="22" font-weight="bold">GitHub Stats for ${owner}</text>
    
    <text x="20" y="65" fill="#58a6ff" font-size="18" font-weight="bold">Total commits:</text>
    <text x="180" y="65" fill="#8b949e" font-size="18">${totalCommits.toLocaleString()}</text>

    <text x="20" y="95" fill="#58a6ff" font-size="18" font-weight="bold">Issues (Open / Closed):</text>
    <text x="280" y="95" fill="#8b949e" font-size="18">${totalIssuesOpen.toLocaleString()} / ${totalIssuesClosed.toLocaleString()}</text>

    <text x="20" y="125" fill="#58a6ff" font-size="18" font-weight="bold">PRs (Open / Closed):</text>
    <text x="240" y="125" fill="#8b949e" font-size="18">${totalPRsOpen.toLocaleString()} / ${totalPRsClosed.toLocaleString()}</text>
  </svg>
  `;

  const outputDir = path.resolve("docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, "stats.svg");
  fs.writeFileSync(outputFile, svgContent);

  console.log("SVG stats file generated in docs/stats.svg");
}

main().catch(console.error);
