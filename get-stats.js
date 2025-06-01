const { Octokit } = require("octokit");

async function main() {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error("GH_TOKEN no está definido");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  // Obtener repos de usuario (públicos y privados)
  const reposResponse = await octokit.request("GET /user/repos", {
    visibility: "all",
    affiliation: "owner",
    per_page: 100,
  });

  const repos = reposResponse.data;

  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;

  for (const repo of repos) {
    const { owner, name } = repo;

    // Obtener commits (solo en la rama principal, por simplicidad)
    try {
      const commitsResp = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner: owner.login,
          repo: name,
          per_page: 100,
        }
      );
      totalCommits += commitsResp.data.length;
    } catch {}

    // Obtener PRs
    try {
      const prsResp = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls",
        {
          owner: owner.login,
          repo: name,
          state: "all",
          per_page: 100,
        }
      );
      totalPRs += prsResp.data.length;
    } catch {}

    // Obtener Issues
    try {
      const issuesResp = await octokit.request(
        "GET /repos/{owner}/{repo}/issues",
        {
          owner: owner.login,
          repo: name,
          state: "all",
          per_page: 100,
        }
      );
      // Filtramos para excluir PRs (las issues que no son PRs)
      const onlyIssues = issuesResp.data.filter((i) => !i.pull_request);
      totalIssues += onlyIssues.length;
    } catch {}
  }

  // Aquí puedes imprimir o guardar los datos donde quieras
  console.log(`Commits: ${totalCommits}`);
  console.log(`Pull Requests: ${totalPRs}`);
  console.log(`Issues: ${totalIssues}`);

  // Por ejemplo, guardar en un archivo JSON para luego usar en el README
  const fs = require("fs");
  fs.writeFileSync(
    "./stats.json",
    JSON.stringify({ totalCommits, totalPRs, totalIssues }, null, 2)
  );
}

main();
