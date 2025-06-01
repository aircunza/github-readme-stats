import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getAllRepos(owner) {
  const repos = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.rest.repos.listForUser({
      username: owner,
      per_page: 100,
      page,
    });
    if (data.length === 0) break;
    repos.push(...data);
    page++;
  }
  return repos;
}

async function getRepoStats(owner, repo) {
  // Aquí puedes agregar las llamadas para commits, issues, PRs si quieres (simplificado)
  // Por ejemplo, contar commits por repo:
  const commits = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: 1,
  });
  const totalCommits = commits.headers['link'] ? 
    parseInt(commits.headers['link'].match(/&page=(\d+)>; rel="last"/)[1]) * 100 : commits.data.length;

  // Solo datos básicos para ejemplo
  return {
    name: repo,
    commits: totalCommits || 0,
    url: `https://github.com/${owner}/${repo}`,
  };
}

async function main() {
  const owner = "aircunza";
  const repos = await getAllRepos(owner);

  let svgContent = `<svg width="500" height="${repos.length * 40 + 40}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="500" height="${repos.length * 40 + 40}" fill="#0d1117" rx="10" />
    <text x="20" y="30" fill="#c9d1d9" font-size="20">GitHub Stats for ${owner}</text>`;

  let y = 60;
  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo.name);
    svgContent += `
      <a href="${stats.url}" target="_blank">
        <text x="20" y="${y}" fill="#58a6ff" font-size="14" style="cursor:pointer;">
          ${stats.name} - Commits: ${stats.commits}
        </text>
      </a>
    `;
    y += 40;
  }

  svgContent += `</svg>`;

  fs.writeFileSync("stats.svg", svgContent);
  console.log("SVG stats file generated successfully!");
}

main().catch(console.error);
