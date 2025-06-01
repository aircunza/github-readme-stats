import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

const username = "TU_USUARIO"; // Cambialo por tu usuario real

async function getStats() {
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    visibility: "all",
    affiliation: "owner",
    per_page: 100,
  });

  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;

  for (const repo of repos) {
    try {
      const contribs = await octokit.rest.repos.getContributorsStats({
        owner: repo.owner.login,
        repo: repo.name,
      });

      const userContrib = contribs.data.find(c => c.author?.login === username);
      if (userContrib) {
        totalCommits += userContrib.total;
      }
    } catch (e) {
      // Ignorar errores, stats no disponibles en repos sin actividad
    }

    const prs = await octokit.paginate(octokit.rest.pulls.list, {
      owner: repo.owner.login,
      repo: repo.name,
      state: "all",
      per_page: 100,
    });
    totalPRs += prs.filter(pr => pr.user.login === username).length;

    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner: repo.owner.login,
      repo: repo.name,
      state: "all",
      per_page: 100,
    });
    totalIssues += issues.filter(issue => issue.user.login === username).length;
  }

  return { totalCommits, totalPRs, totalIssues };
}

async function main() {
  const stats = await getStats();

  const data = `
# GitHub Stats for ${username}

- Total commits: ${stats.totalCommits}
- Total PRs: ${stats.totalPRs}
- Total issues: ${stats.totalIssues}
`;

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/stats.md", data);
  console.log("Stats generated:", stats);
}

main();
