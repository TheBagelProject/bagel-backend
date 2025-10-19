/**
 * OpenAPI definitions for Project endpoints
 */

export const projectPaths = {
	"/api/projects/create-project": {
		post: {
			summary: "Create a new project",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["projectName"],
							properties: {
								projectName: { type: "string", example: "My Project" },
								projectDescription: { type: "string", example: "Description of the project" },
							},
						},
					},
				},
			},
			responses: {
				201: {
					description: "Project created successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									project: { $ref: "#/components/schemas/Project" },
								},
							},
						},
					},
				},
				400: { description: "Project name is required" },
				401: { description: "Unauthorized" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/csp": {
		put: {
			summary: "Update the CSP for a project",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["csp"],
							properties: {
								csp: { type: "string", enum: ["aws", "gcp", "azure"], example: "aws" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "CSP updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									project: { $ref: "#/components/schemas/Project" },
								},
							},
						},
					},
				},
				400: { description: "CSP is required" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/repo": {
		put: {
			summary: "Update repository details for a project",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["repoUrl", "ownerName", "branch"],
							properties: {
								repoUrl: { type: "string", example: "https://github.com/user/repo" },
								ownerName: { type: "string", example: "user" },
								branch: { type: "string", example: "main" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "Repository details updated successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									project: { $ref: "#/components/schemas/Project" },
								},
							},
						},
					},
				},
				400: { description: "repoUrl, ownerName, and branch are required" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/get-all-projects": {
		get: {
			summary: "Retrieve all projects",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			responses: {
				200: {
					description: "List of all projects",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									projects: {
										type: "array",
										items: { $ref: "#/components/schemas/Project" },
									},
								},
							},
						},
					},
				},
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/get-project-by-id/{projectId}": {
		get: {
			summary: "Retrieve a project by ID",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			responses: {
				200: {
					description: "Project details",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									project: { $ref: "#/components/schemas/Project" },
								},
							},
						},
					},
				},
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/inject-to-container": {
		post: {
			summary: "Clone repository and create spaces",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			responses: {
				200: {
					description: "SSE stream of logs, ends with success and spaces",
					content: {
						"text/event-stream": {
							schema: {
								type: "string",
								example: "data: Cloning repo...\n\ndata: {\"success\":true,\"spaces\":[...]}\n\n",
							},
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/configure-aws-profile": {
		put: {
			summary: "Configure AWS profile in Docker container",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["profileName", "accessKeyId", "secretAccessKey"],
							properties: {
								profileName: { type: "string", example: "myprofile" },
								accessKeyId: { type: "string", example: "AKIA..." },
								secretAccessKey: { type: "string", example: "secret..." },
								region: { type: "string", example: "us-east-1" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "AWS profile configured successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
									profile: { type: "string" },
								},
							},
						},
					},
				},
				400: { description: "Required fields missing" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/delete-aws-profile": {
		delete: {
			summary: "Delete AWS profile from container and DB",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			responses: {
				200: {
					description: "AWS profile deleted successfully",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				400: { description: "No profile set" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/projects/{projectId}/reset-branch": {
		put: {
			summary: "Reset repository branch and sync spaces",
			tags: ["Projects"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "projectId",
					schema: { type: "string" },
					required: true,
					description: "Project ID",
				},
			],
			responses: {
				200: {
					description: "Repository reset and spaces synced",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									success: { type: "boolean" },
									message: { type: "string" },
									spaces: {
										type: "array",
										items: { $ref: "#/components/schemas/Space" },
									},
									added: { type: "array", items: { type: "string" } },
									removed: { type: "array", items: { type: "string" } },
								},
							},
						},
					},
				},
				400: { description: "repoUrl or projectName missing" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
};

export const projectSchemas = {
	Project: {
		type: "object",
		properties: {
			projectId: { type: "string" },
			projectName: { type: "string" },
			profile: { type: "string" },
			projectDescription: { type: "string" },
			ownerId: { type: "string" },
			ownerName: { type: "string" },
			repoUrl: { type: "string" },
			branch: { type: "string" },
			csp: { type: "string", enum: ["aws", "gcp", "azure"] },
			status: { type: "string", enum: ["idle", "running", "error"] },
			spaces: {
				type: "array",
				items: { $ref: "#/components/schemas/Space" },
			},
			createdAt: { type: "string", format: "date-time" },
			updatedAt: { type: "string", format: "date-time" },
		},
	},
	Space: {
		type: "object",
		properties: {
			spaceId: { type: "string" },
			spaceName: { type: "string" },
			spaceDescription: { type: "string" },
		},
	},
};