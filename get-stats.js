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
    // Count all commits
    let commitPage = 1;
    let totalCommits = 0;
    while (true) {
      const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 100,
        page: commitPage,
      });
      totalCommits += data.length;
      if (data.length < 100) break;
      commitPage++;
    }

    // Count all PRs (state: all)
    let prPage = 1;
    let totalPRs = 0;
    while (true) {
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        per_page: 100,
        page: prPage,
        state: "all",
      });
      totalPRs += data.length;
      if (data.length < 100) break;
      prPage++;
    }

    // Count all issues (including PRs)
    let issuePage = 1;
    let totalIssues = 0;
    while (true) {
      const { data } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        per_page: 100,
        page: issuePage,
        state: "all",
      });
      totalIssues += data.length;
      if (data.length < 100) break;
      issuePage++;
    }

    return {
      commits: totalCommits,
      prs: totalPRs,
      issues: totalIssues,
    };
  } catch (error) {
    // Repo vacío (sin commits) lanza 409
    if (error.status === 409) {
      console.warn(`⚠️ Repo ${repo} is empty, skipping stats.`);
      return { commits: 0, prs: 0, issues: 0 };
    }

    // Otros errores: relanzar
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
<svg width="420" height="160" viewBox="0 0 420 160" fill="none" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Inter', sans-serif;">
  <defs>
    <style>
      .bg { fill: #071533; stroke: #7B8DB0; stroke-width: 1; rx: 8; ry: 8; }
      .title { fill: #1E90FF; font-weight: 600; font-size: 18px; }
      .label { fill: white; font-weight: 600; font-size: 14px; }
      .value { fill: white; font-weight: 700; font-size: 14px; }
      .icon { fill: #1EBC6B; }
    </style>
  </defs>

  <rect width="400" height="140" x="10" y="10" class="bg" rx="10" ry="10" />

  <text x="30" y="40" class="title">My GitHub Statistics</text>

  <g transform="translate(30, 60)">
    <circle class="icon" cx="10" cy="6" r="6" />
    <path d="M7 5 L10 10 L13 5 Z" fill="#1EBC6B" />
    <text class="label" x="30" y="10">Total Commits:</text>
    <text class="value" x="180" y="10" text-anchor="end">${totalCommits}</text>
  </g>

  <g transform="translate(30, 90)">
    <circle class="icon" cx="10" cy="6" r="6" />
    <path d="M10 2 A4 4 0 1 1 9.99 2 Z M9 6 L11 6 L10 11 Z" fill="#1EBC6B"/>
    <text class="label" x="30" y="10">Total Issues:</text>
    <text class="value" x="180" y="10" text-anchor="end">${totalIssues}</text>
  </g>

  <g transform="translate(30, 120)">
    <circle class="icon" cx="10" cy="6" r="6" />
    <path d="M8 5 L12 5 L10 9 Z" fill="#1EBC6B"/>
    <text class="label" x="30" y="10">Total PRs:</text>
    <text class="value" x="180" y="10" text-anchor="end">${totalPRs}</text>
  </g>

  <!-- Moved circle to x=345 for margin -->
  <g transform="translate(280, 40)">
    <circle cx="50" cy="50" r="40" stroke="#0F2F5A" stroke-width="6" fill="none"/>
    <circle
      cx="50"
      cy="50"
      r="40"
      stroke="#1E90FF"
      stroke-width="6"
      stroke-linecap="round"
      stroke-dasharray="251.2"
      stroke-dashoffset="100"
      fill="none"
      transform="rotate(-90 50 50)"
    />
    <text x="50" y="58" fill="white" font-weight="700" font-size="28" text-anchor="middle" font-family="'Inter', sans-serif">A+</text>
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
