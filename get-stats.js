import { Octokit } from "octokit";
import { writeFile } from "fs/promises";

const octokit = new Octokit({ auth: process.env.GH_TOKEN });

async function getStats() {
  let totalCommits = 0;
  let totalPRs = 0;
  let totalIssues = 0;

  const repos = await octokit.paginate("GET /user/repos", {
    visibility: "all",
    affiliation: "owner",
    per_page: 100,
  });

  for (const repo of repos) {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 1,
    });
    if (commits.length > 0) totalCommits++;

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
  }

  const output = `
# GitHub Stats

- Total Commits: ${totalCommits}
- Total Pull Requests: ${totalPRs}
- Total Issues: ${totalIssues}
  `;

  await writeFile("stats.md", output.trim());
  console.log("✅ Stats generated");
}

getStats().catch(err => {
  console.error("❌ Error getting stats:", err.message);
  process.exit(1);
});
