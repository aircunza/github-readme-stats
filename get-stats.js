import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function main() {
  try {
    // Obtener todos los repositorios (públicos y privados) donde eres owner
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      visibility: "all",
      affiliation: "owner",
      per_page: 100,
    });

    let totalCommits = 0;
    let totalPRs = 0;
    let totalIssues = 0;

    for (const repo of repos) {
      const { owner, name, default_branch } = repo;

      // Saltar si no hay branch default (repos sin commits)
      if (!default_branch) {
        console.log(`Repo ${name} sin branch por defecto, saltando commits`);
        continue;
      }

      // Obtener commits de la rama por defecto
      try {
        const commitsData = await octokit.rest.repos.listCommits({
          owner: owner.login,
          repo: name,
          sha: default_branch,
          per_page: 1,
        });

        // Usamos la propiedad 'Link' para obtener la cantidad total si hay paginación
        // Pero si solo hay una página, contamos esa página con length
        let commitsCount;

        const link = commitsData.headers.link;
        if (link) {
          // Ejemplo: <https://api.github.com/repositories/123456/commits?per_page=1&page=5>; rel="last"
          const match = link.match(/&page=(\d+)>; rel="last"/);
          commitsCount = match ? parseInt(match[1], 10) : commitsData.data.length;
        } else {
          commitsCount = commitsData.data.length;
        }

        totalCommits += commitsCount;
      } catch (e) {
        console.log(`No se pudieron obtener commits de ${name}: ${e.message}`);
      }

      // Contar issues y PRs (se cuentan separados, pero issues incluyen PRs también)
      // Para no duplicar contamos issues sin PRs

      // Obtener total de issues (abiertos y cerrados)
      try {
        const issuesData = await octokit.rest.issues.listForRepo({
          owner: owner.login,
          repo: name,
          state: "all",
          per_page: 1,
        });

        let issuesCount;
        const linkIssues = issuesData.headers.link;
        if (linkIssues) {
          const match = linkIssues.match(/&page=(\d+)>; rel="last"/);
          issuesCount = match ? parseInt(match[1], 10) : issuesData.data.length;
        } else {
          issuesCount = issuesData.data.length;
        }

        totalIssues += issuesCount;
      } catch (e) {
        console.log(`No se pudieron obtener issues de ${name}: ${e.message}`);
      }

      // Obtener total de pull requests (abiertos y cerrados)
      try {
        const prsData = await octokit.rest.pulls.list({
          owner: owner.login,
          repo: name,
          state: "all",
          per_page: 1,
        });

        let prsCount;
        const linkPRs = prsData.headers.link;
        if (linkPRs) {
          const match = linkPRs.match(/&page=(\d+)>; rel="last"/);
          prsCount = match ? parseInt(match[1], 10) : prsData.data.length;
        } else {
          prsCount = prsData.data.length;
        }

        totalPRs += prsCount;
      } catch (e) {
        console.log(`No se pudieron obtener pull requests de ${name}: ${e.message}`);
      }
    }

    // Generar HTML simple
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>GitHub Stats</title>
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; text-align: center; padding: 2rem;}
  h1 { color: #0366d6; }
  .stat { font-size: 2rem; margin: 1rem 0; }
  .footer { margin-top: 3rem; font-size: 0.9rem; color: #666; }
</style>
</head>
<body>
  <h1>GitHub Stats para ${repos[0]?.owner.login || "tu usuario"}</h1>
  <div class="stat">Total Commits: <strong>${totalCommits}</strong></div>
  <div class="stat">Total Pull Requests: <strong>${totalPRs}</strong></div>
  <div class="stat">Total Issues: <strong>${totalIssues}</strong></div>
  <div class="footer">Datos actualizados automáticamente con GitHub Actions</div>
</body>
</html>
`;

    fs.writeFileSync("stats.html", html);
    console.log("Archivo stats.html generado con éxito.");

  } catch (error) {
    console.error("❌ Error getting stats:", error.message);
    process.exit(1);
  }
}

main();
