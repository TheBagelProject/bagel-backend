import { Octokit } from "octokit";

export type RepoTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: RepoTreeNode[];
};

export const getOctokitForPAT = (pat: string) => {
  return new Octokit({ auth: pat });
};

export const fetchUserRepos = async (pat: string) => {
  const octokit = getOctokitForPAT(pat);
  const res = await octokit.rest.repos.listForAuthenticatedUser();
  return res.data;
};

export const fetchRepoContents = async (
  pat: string,
  owner: string,
  repo: string,
  path: string
) => {
  const octokit = getOctokitForPAT(pat);
  const res = await octokit.rest.repos.getContent({ owner, repo, path });
  return res.data;
};

// 🔹 Helper: convert flat list into nested tree
function buildTree(nodes: RepoTreeNode[]): RepoTreeNode[] {
  const root: Record<string, RepoTreeNode> = {};
  const lookup: Record<string, RepoTreeNode> = {};

  nodes.forEach((node) => {
    lookup[node.path] = {
      ...node,
      children: node.type === "folder" ? [] : undefined,
    };

    if (!node.path.includes("/")) {
      // top-level item
      root[node.path] = lookup[node.path];
    } else {
      const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));
      if (lookup[parentPath]?.children) {
        lookup[parentPath].children!.push(lookup[node.path]);
      }
    }
  });

  return Object.values(root);
}

export const fetchRepoTree = async (
  pat: string,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<RepoTreeNode[]> => {
  const octokit = getOctokitForPAT(pat);

  const branchRes = await octokit.rest.repos.getBranch({ owner, repo, branch });
  const sha = branchRes.data.commit.sha;

  const treeRes = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "1",
  });

  const flatNodes: RepoTreeNode[] = treeRes.data.tree.map(
    (node: { path?: string; type?: string }, index: number) => ({
      id: index.toString(),
      name: node.path?.split("/").pop() || "",
      path: node.path || "",
      type: node.type === "tree" ? "folder" : "file",
    })
  );

  return buildTree(flatNodes);
};

export const getBranches = async (
    owner: string,
    repo: string,
    accessToken: string
  ) => {
    try {
      const octokit = new Octokit({ auth: accessToken });

      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
      });

      return data;
    } catch (err: any) {
      console.error("Error fetching branches:", err.message);
      throw new Error("Failed to fetch branches from GitHub");
    }
  };
