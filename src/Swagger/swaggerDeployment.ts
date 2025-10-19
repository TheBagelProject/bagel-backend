/**
 * OpenAPI definitions for Deployment endpoints
 */

export const deploymentPaths = {
	"/api/terraform/{deploymentId}/summary": {
		get: {
			summary: "Get deployment summary",
			tags: ["Deployments"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "deploymentId",
					schema: { type: "string" },
					required: true,
					description: "Deployment ID",
				},
			],
			responses: {
				200: {
					description: "Deployment summary",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									deploymentId: { type: "string" },
									deploymentName: { type: "string" },
									startedAt: { type: "string", format: "date-time" },
									finishedAt: { type: "string", format: "date-time" },
									summary: {
										type: "object",
										properties: {
											resourcesProvisioned: {
												type: "array",
												items: {
													type: "object",
													properties: {
														type: { type: "string" },
														name: { type: "string" },
														address: { type: "string" },
													},
												},
											},
											resourcesChanged: {
												type: "array",
												items: {
													type: "object",
													properties: {
														type: { type: "string" },
														name: { type: "string" },
														address: { type: "string" },
													},
												},
											},
											resourcesDestroyed: {
												type: "array",
												items: {
													type: "object",
													properties: {
														type: { type: "string" },
														name: { type: "string" },
														address: { type: "string" },
													},
												},
											},
										},
									},
									steps: {
										type: "array",
										items: {
											type: "object",
											properties: {
												step: { type: "string" },
												stepStatus: { type: "string", enum: ["pending", "running", "successful", "failed"] },
												message: { type: "string" },
												timestamp: { type: "string", format: "date-time" },
												structuredData: { type: "object" },
											},
										},
									},
								},
							},
						},
					},
				},
				404: { description: "Deployment not found" },
				500: { description: "Internal server error" },
			},
		},
	},
};

export const deploymentSchemas = {
	Deployment: {
		type: "object",
		properties: {
			deploymentId: { type: "string" },
			projectId: { type: "string" },
			spaceId: { type: "string" },
			deploymentName: { type: "string" },
			deploymentSummary: { type: "string" },
			steps: {
				type: "array",
				items: {
					type: "object",
					properties: {
						step: { type: "string", enum: ["init", "plan", "apply", "destroy"] },
						stepStatus: { type: "string", enum: ["pending", "running", "successful", "failed"] },
						message: { type: "string" },
						timestamp: { type: "string", format: "date-time" },
						structuredData: { type: "object" },
					},
				},
			},
			startedAt: { type: "string", format: "date-time" },
			finishedAt: { type: "string", format: "date-time" },
			createdAt: { type: "string", format: "date-time" },
			updatedAt: { type: "string", format: "date-time" },
		},
	},
};