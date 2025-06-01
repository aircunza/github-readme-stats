import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getTotalCounts(owner) {
  // Obtener todos los repos del usuario (públicos y privados)
  const reposResponse = await octokit.rest.repos.listForUser({
    username: owner,
    per_page: 100,
  });

  const repos = reposResponse.data;

  let totalCommits = 0;
  let totalIssues = 0;
  let totalPRs = 0;

  for (const repo of repos) {
    // commits: número aproximado basado en paginación
    try {
      const commitsRes = await octokit.rest.repos.listCommits({
        owner,
        repo: repo.name,
        per_page: 1,
      });
      const commitsCount = commitsRes.headers.link
        ? parseInt(commitsRes.headers.link.match(/&page=(\d+)>; rel="last"/)[1])
        : commitsRes.data.length;
      totalCommits += commitsCount;
    } catch (e) {
      // repos vacíos o sin commits
      console.log(`No commits for repo ${repo.name}`);
    }

    // issues count (todos, abiertos y cerrados, solo issues no PR)
    try {
      const issuesRes = await octokit.rest.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo.name} is:issue`,
        per_page: 1,
      });
      totalIssues += issuesRes.data.total_count;
    } catch (e) {
      console.log(`Error getting issues for repo ${repo.name}`);
    }

    // PRs count (todos, abiertos y cerrados)
    try {
      const prsRes = await octokit.rest.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo.name} is:pr`,
        per_page: 1,
      });
      totalPRs += prsRes.data.total_count;
    } catch (e) {
      console.log(`Error getting PRs for repo ${repo.name}`);
    }
  }

  return { totalCommits, totalIssues, totalPRs };
}

async function main() {
  const owner = "aircunza"; // Cambia a tu usuario

  const stats = await getTotalCounts(owner);

  // Crear SVG básico
  const svg = `
<svg width="450" height="130" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
  <rect width="450" height="130" fill="#0d1117" rx="10"/>
  <text x="20" y="35" fill="#c9d1d9" font-size="20">GitHub Stats for ${owner}</text>

  <text x="20" y="65" fill="#58a6ff" font-size="16" cursor="default">🔥 Total commits: ${stats.totalCommits}</text>
  <text x="20" y="90" fill="#58a6ff" font-size="16" cursor="default">🐞 Total issues: ${stats.totalIssues}</text>
  <text x="20" y="115" fill="#58a6ff" font-size="16" cursor="default">🔀 Total pull requests: ${stats.totalPRs}</text>
</svg>
  `;

  // Guardar en archivo
  fs.writeFileSync("docs/stats.svg", svg.trim());
  console.log("SVG stats file generated successfully!");
}

main();
