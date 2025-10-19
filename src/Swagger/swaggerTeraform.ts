/**
 * OpenAPI definitions for Terraform endpoints
 */

export const terraformPaths = {
	"/api/terraform/{projectId}/init": {
		post: {
			summary: "Run terraform init",
			tags: ["Terraform"],
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
							required: ["spaceName"],
							properties: {
								spaceName: { type: "string", example: "myspace" },
								deploymentId: { type: "string", example: "dep-123" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "Terraform init result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									command: { type: "string" },
									deploymentId: { type: "string" },
									deploymentName: { type: "string" },
									exitCode: { type: "number" },
									stdout: { type: "string" },
									stderr: { type: "string" },
									summary: { type: "object" },
								},
							},
						},
					},
				},
				400: { description: "spaceName is required" },
				404: { description: "Project or deployment not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/terraform/{projectId}/plan": {
		post: {
			summary: "Run terraform plan",
			tags: ["Terraform"],
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
							required: ["spaceName", "deploymentId"],
							properties: {
								spaceName: { type: "string", example: "myspace" },
								deploymentId: { type: "string", example: "dep-123" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "Terraform plan result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									stepName: { type: "string" },
									rawFormat: { type: "string" },
									data: { type: "object" },
									exitCode: { type: "number" },
									stderr: { type: "string" },
								},
							},
						},
					},
				},
				400: { description: "spaceName and deploymentId are required" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/terraform/{projectId}/apply": {
		post: {
			summary: "Run terraform apply",
			tags: ["Terraform"],
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
							required: ["spaceName", "deploymentId"],
							properties: {
								spaceName: { type: "string", example: "myspace" },
								deploymentId: { type: "string", example: "dep-123" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "Terraform apply result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									command: { type: "string" },
									deploymentId: { type: "string" },
									exitCode: { type: "number" },
									stdout: { type: "string" },
									stderr: { type: "string" },
									summary: { type: "object" },
								},
							},
						},
					},
				},
				400: { description: "spaceName and deploymentId are required" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
	"/api/terraform/{projectId}/destroy": {
		post: {
			summary: "Run terraform destroy",
			tags: ["Terraform"],
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
							required: ["spaceName", "deploymentId"],
							properties: {
								spaceName: { type: "string", example: "myspace" },
								deploymentId: { type: "string", example: "dep-123" },
							},
						},
					},
				},
			},
			responses: {
				200: {
					description: "Terraform destroy result",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									command: { type: "string" },
									deploymentId: { type: "string" },
									exitCode: { type: "number" },
									stdout: { type: "string" },
									stderr: { type: "string" },
									summary: { type: "object" },
								},
							},
						},
					},
				},
				400: { description: "spaceName and deploymentId are required" },
				404: { description: "Project not found" },
				500: { description: "Internal server error" },
			},
		},
	},
};