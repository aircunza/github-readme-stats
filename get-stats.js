import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getRepoStats(owner, repo) {
  try {
    // Obtener info del repositorio
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // Obtener total de commits
    const { data: commitsData } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });

    const commitsCount = commitsData.length > 0
      ? parseInt(commitsData[0].sha ? commitsData[0].commit.tree.sha.length : 0)
      : 0;

    // Total de PRs abiertos
    const { data: prs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 1,
    });

    const totalPRs = parseInt(prs.length);

    // Total de issues abiertas (sin incluir PRs)
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });

    const totalIssues = issues.filter((issue) => !issue.pull_request).length;

    return {
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      language: repoData.language,
      updated_at: repoData.updated_at,
      url: repoData.html_url,
      commits: commitsCount,
      prs: totalPRs,
      issues: totalIssues,
    };
  } catch (error) {
    if (error.status === 409) {
      console.log(`Repository ${repo} is empty.`);
      return null;
    }
    console.error(`Error fetching data for ${repo}:`, error.message);
    return null;
  }
}

async function main() {
  const owner = "aircunza";
  const repos = ["github-readme-stats"]; // Agrega más repos si quieres

  const statsList = [];

  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo);
    if (stats) {
      statsList.push(stats);
    }
  }

  // Generar HTML
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GitHub Stats</title>
<style>
  body { font-family: Arial, sans-serif; margin: 2rem; }
  h1 { color: #333; }
  ul { list-style: none; padding: 0; }
  li { margin-bottom: 1.5rem; }
  a { text-decoration: none; color: #0366d6; }
  a:hover { text-decoration: underline; }
  .stats { font-size: 0.9rem; color: #555; }
</style>
</head>
<body>
<h1>GitHub Stats for ${owner}</h1>
<ul>
`;

  for (const stat of statsList) {
    html += `<li>
      <a href="${stat.url}" target="_blank" rel="noopener noreferrer"><strong>${stat.name}</strong></a><br />
      <span>${stat.description || "No description"}</span><br />
      <span class="stats">
        ⭐ Stars: ${stat.stars} |
        🍴 Forks: ${stat.forks} |
        👀 Watchers: ${stat.watchers} |
        📝 Language: ${stat.language || "N/A"} |
        🧮 Commits: ${stat.commits} |
        🧵 PRs: ${stat.prs} |
        🐛 Issues: ${stat.issues}
      </span><br />
      <small>Last updated: ${new Date(stat.updated_at).toLocaleDateString()}</small>
    </li>\n`;
  }

  html += `</ul>
</body>
</html>`;

  fs.writeFileSync("stats.html", html);
  console.log("Archivo stats.html generado con éxito.");
}

main();
