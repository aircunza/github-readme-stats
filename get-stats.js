import { Octokit } from "octokit";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

async function getRepoStats(owner, repo) {
  try {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    return {
      name: repoData.name,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      language: repoData.language || "N/A",
      url: repoData.html_url,
    };
  } catch (error) {
    console.error(`Error fetching data for ${repo}:`, error.message);
    return null;
  }
}

async function main() {
  const owner = "aircunza";
  const repos = ["github-readme-stats"];

  let svgContent = `<svg width="450" height="120" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="450" height="120" fill="#0d1117" rx="10" />
    <text x="20" y="35" fill="#c9d1d9" font-size="20">GitHub Stats for ${owner}</text>
  `;

  let y = 60;
  for (const repo of repos) {
    const stats = await getRepoStats(owner, repo);
    if (!stats) continue;

    svgContent += `
      <a href="${stats.url}" target="_blank">
        <text x="20" y="${y}" fill="#58a6ff" font-size="16" style="cursor:pointer;">
          ${stats.name}
        </text>
      </a>
      <text x="20" y="${y + 20}" fill="#8b949e" font-size="14">
        ⭐ Stars: ${stats.stars} | 🍴 Forks: ${stats.forks} | 👀 Watchers: ${stats.watchers}
      </text>
      <text x="20" y="${y + 40}" fill="#8b949e" font-size="14">
        📝 Language: ${stats.language}
      </text>
    `;

    y += 60;
  }

  svgContent += `</svg>`;

  fs.writeFileSync("docs/stats.svg", svgContent);
  console.log("SVG stats file generated successfully!");
}

main();
