import { Octokit } from "octokit";
import fs from "fs";

const octokitRead = new Octokit({
  auth: process.env.GH_PAT_READ,
});

// Si quieres hacer operaciones con escritura, usarías:
// const octokitWrite = new Octokit({
//   auth: process.env.GH_PAT_WRITE,
// });

async function getRepoStats(owner, repo) {
  try {
    // Verificar commits
    const commits = await octokitRead.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });

    if (commits.data.length === 0) {
      console.log(`No commits found for ${repo}`);
      return null;
    }

    // Obtener estadísticas básicas
    const { data: repoData } = await octokitRead.rest.repos.get({
      owner,
      repo,
    });

    return {
      name: repoData.name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      url: repoData.html_url,
      language: repoData.language,
      updated_at: repoData.updated_at,
    };
  } catch (error) {
    if (error.status === 409) {
      // Repositorio vacío (error 409)
      console.log(`Repository ${repo} is empty.`);
      return null;
    }
    console.error(`Error fetching data for ${repo}:`, error.message);
    return null;
  }
}

async function main() {
  const owner = "aircunza";
  const repos = ["github-readme-stats"];  // Lista tus repos aquí

  const statsList = [];

  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo);
    if (stats) {
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
      <span class="stats">⭐ Stars: ${stat.stars} | 🍴 Forks: ${stat.forks} | 👀 Watchers: ${stat.watchers} | 📝 Language: ${stat.language || "N/A"}</span><br />
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
