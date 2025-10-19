import { Octokit } from "octokit";

export const GithubService = {
  async listRepos(token: string) {
    const octokit = new Octokit({ auth: token });
    return octokit.rest.repos.listForAuthenticatedUser({ per_page: 100 });
  },

  async getFile(owner: string, repo: string, path: string, token: string) {
    const octokit = new Octokit({ auth: token });
    return octokit.rest.repos.getContent({ owner, repo, path });
  },
};
