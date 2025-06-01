import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getRepoStats(owner, repo) {
  try {
    // Obtener número de commits (conteo aproximado)
    const commits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });
    const commitsCount = commits.headers['link'] 
      ? parseInt(commits.headers['link'].match(/&page=(\d+)>; rel="last"/)[1])
      : commits.data.length;

    // Obtener número de issues abiertos (sin contar PRs)
    const issues = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 1,
    });
    const issuesCount = issues.headers['link']
      ? parseInt(issues.headers['link'].match(/&page=(\d+)>; rel="last"/)[1])
      : issues.data.length;

    // Obtener número de PRs abiertos
    const prs = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 1,
    });
    const prsCount = prs.headers['link']
      ? parseInt(prs.headers['link'].match(/&page=(\d+)>; rel="last"/)[1])
      : prs.data.length;

    // Obtener info general del repo
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      language: repoData.language,
      updated_at: repoData.updated_at,
      commits: commitsCount,
      issues: issuesCount,
      prs: prsCount,
      url: repoData.html_url,
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
  const owner = "aircunza";  // Cambia por tu usuario o equipo
  const repos = ["github-readme-stats"];  // Lista tus repos aquí

  const statsList = [];

  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo);
    if (stats) {
      console.log(`Stats for ${repo}:`, stats);  // <-- Aquí ves en logs qué datos trae
      statsList.push(stats);
    }
  }

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
  li { margin-bottom: 1rem; }
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
        ⭐ Stars: ${stat.stars} | 🍴 Forks: ${stat.forks} | 👀 Watchers: ${stat.watchers} | 
        📝 Language: ${stat.language || "N/A"}<br />
        📅 Last updated: ${new Date(stat.updated_at).toLocaleDateString()}<br />
        🔨 Commits: ${stat.commits} | 🐛 Open Issues: ${stat.issues} | 📬 Open PRs: ${stat.prs}
      </span>
    </li>\n`;
  }

  html += `</ul>
</body>
</html>`;

  fs.writeFileSync("stats.html", html);
  console.log("Archivo stats.html generado con éxito.");
}

main();
