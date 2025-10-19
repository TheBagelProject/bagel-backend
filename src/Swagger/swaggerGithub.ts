
/**
 * OpenAPI definitions for GitHub PAT endpoints
 */

export const githubPatPaths = {
	"/api/github/save-pat": {
		post: {
			summary: "Save a GitHub Personal Access Token (PAT) for a user",
			tags: ["GitHub PAT"],
			security: [{ bearerAuth: [] }],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["pat"],
							properties: {
								pat: { type: "string", example: "ghp_1234567890abcdef" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "PAT saved",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: { description: "PAT required" },
				500: { description: "Failed to save PAT" },
			},
		},
	},
	"/api/github/update-pat": {
		put: {
			summary: "Update a GitHub Personal Access Token (PAT) for a user",
			tags: ["GitHub PAT"],
			security: [{ bearerAuth: [] }],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["pat"],
							properties: {
								pat: { type: "string", example: "ghp_1234567890abcdef" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "PAT updated",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: { description: "PAT required" },
				500: { description: "Failed to update PAT" },
			},
		},
	},
	"/api/github/list-repos": {
		get: {
			summary: "Get GitHub repositories for a user",
			tags: ["GitHub PAT"],
			security: [{ bearerAuth: [] }],
			responses: {
				200: {
					description: "List of repositories with branches",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									properties: {
										name: { type: "string" },
										owner: { type: "string" },
										branches: { type: "array", items: { type: "string" } }
									}
								},
							},
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "PAT not found for user" },
				500: { description: "Failed to fetch repos" },
			},
		},
	},
	"/api/github/repos/{email}/{owner}/{repo}/contents/*": {
		get: {
			summary: "Get contents of a GitHub repository for a user",
			tags: ["GitHub PAT"],
			parameters: [
				{
					in: "path",
					name: "email",
					schema: { type: "string" },
					required: true,
					description: "User's email",
				},
				{
					in: "path",
					name: "owner",
					schema: { type: "string" },
					required: true,
					description: "Repository owner",
				},
				{
					in: "path",
					name: "repo",
					schema: { type: "string" },
					required: true,
					description: "Repository name",
				},
				{
					in: "path",
					name: "0",
					schema: { type: "string" },
					required: false,
					description: "Path inside the repository (optional)",
				},
			],
			responses: {
				200: {
					description: "Repository contents",
					content: {
						"application/json": {
							schema: {
								oneOf: [
									{
										type: "object",
										properties: {
											folders: { type: "array", items: { type: "object" } },
											files: { type: "array", items: { type: "object" } }
										}
									},
									{
										type: "object",
										properties: {
											name: { type: "string" },
											path: { type: "string" },
											sha: { type: "string" },
											size: { type: "number" },
											url: { type: "string" },
											content: { type: "string" },
											encoding: { type: "string" }
										}
									}
								]
							},
						},
					},
				},
				401: { description: "Invalid or unauthorized PAT" },
				404: { description: "Repo or path not found" },
				500: { description: "Failed to fetch repo contents" },
			},
		},
	},
	"/api/github/repos/{email}/{owner}/{repo}/file/*/{filename}": {
		get: {
			summary: "Get decoded content of a specific file in a GitHub repository",
			tags: ["GitHub PAT"],
			parameters: [
				{
					in: "path",
					name: "email",
					schema: { type: "string" },
					required: true,
					description: "User's email",
				},
				{
					in: "path",
					name: "owner",
					schema: { type: "string" },
					required: true,
					description: "Repository owner",
				},
				{
					in: "path",
					name: "repo",
					schema: { type: "string" },
					required: true,
					description: "Repository name",
				},
				{
					in: "path",
					name: "0",
					schema: { type: "string" },
					required: false,
					description: "Path to the file",
				},
				{
					in: "path",
					name: "filename",
					schema: { type: "string" },
					required: true,
					description: "Filename",
				},
			],
			responses: {
				200: {
					description: "File content",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									name: { type: "string" },
									path: { type: "string" },
									sha: { type: "string" },
									size: { type: "number" },
									url: { type: "string" },
									content: { type: "string" },
									encoding: { type: "string" }
								}
							},
						},
					},
				},
				401: { description: "Invalid or unauthorized PAT" },
				404: { description: "File not found" },
				500: { description: "Failed to fetch file content" },
			},
		},
	},
	"/api/github/repos/{owner}/{repo}/{pat}/tree": {
		get: {
			summary: "Get the tree structure of a GitHub repository",
			tags: ["GitHub PAT"],
			parameters: [
				{
					in: "path",
					name: "owner",
					schema: { type: "string" },
					required: true,
					description: "Repository owner",
				},
				{
					in: "path",
					name: "repo",
					schema: { type: "string" },
					required: true,
					description: "Repository name",
				},
				{
					in: "path",
					name: "pat",
					schema: { type: "string" },
					required: true,
					description: "GitHub PAT",
				},
				{
					in: "query",
					name: "ref",
					schema: { type: "string" },
					required: false,
					description: "Branch or ref (default: main)",
				},
			],
			responses: {
				200: {
					description: "Repository tree",
					content: {
						"application/json": {
							schema: { type: "object" },
						},
					},
				},
				500: { description: "Failed to fetch repo tree" },
			},
		},
	},
	"/api/github/repos/get-branch": {
		post: {
			summary: "Get branches of a GitHub repository",
			tags: ["GitHub PAT"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["owner", "repo", "pat"],
							properties: {
								owner: { type: "string", example: "octocat" },
								repo: { type: "string", example: "Hello-World" },
								pat: { type: "string", example: "ghp_1234567890abcdef" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "List of branches",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: { type: "object" },
							},
						},
					},
				},
				401: { description: "Missing GitHub access token" },
				500: { description: "Error fetching branches" },
			},
		},
	},
};
