import { Octokit } from "octokit";
import fs from "fs/promises";

// Autenticación con el token
const octokit = new Octokit({ auth: process.env.GH_TOKEN });

try {
  const userResponse = await octokit.rest.users.getAuthenticated();
  const username = userResponse.data.login;

  let page = 1;
  let repos = [];
  let totalPRs = 0;
  let totalIssues = 0;
  let totalCommits = 0;

  while (true) {
    const { data: pageRepos } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: "all",
      affiliation: "owner",
      per_page: 100,
      page,
    });

    if (pageRepos.length === 0) break;

    repos = repos.concat(pageRepos);
    page++;
  }

  for (const repo of repos) {
    if (repo.size === 0) continue; 

    const { data: pulls } = await octokit.rest.pulls.list({
      owner: repo.owner.login,
      repo: repo.name,
      state: "all",
    });
    totalPRs += pulls.length;

    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: repo.owner.login,
      repo: repo.name,
      state: "all",
    });
    totalIssues += issues.filter(issue => !issue.pull_request).length;

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 1,
    });
    if (commits.length > 0) totalCommits++;
  }

  const stats = {
    public_repos: repos.filter(r => !r.private).length,
    private_repos: repos.filter(r => r.private).length,
    total_pull_requests: totalPRs,
    total_issues: totalIssues,
    total_commits: totalCommits,
  };

  await fs.writeFile("stats.json", JSON.stringify(stats, null, 2));
  console.log("✅ Stats generated:", stats);
} catch (err) {
  console.error("❌ Error getting stats:", err.message || err);
  process.exit(1);
}
