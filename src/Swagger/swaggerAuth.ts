
/**
 * OpenAPI definitions for Auth endpoints
 */

export const authPaths = {
	// Manual Users and Auth tag
	"/signup": {
		post: {
			summary: "Signup a new user",
			tags: ["Manual Users and Auth"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["name", "email", "password", "role"],
							properties: {
								name: { type: "string" },
								email: { type: "string" },
								password: { type: "string" },
								role: { type: "string", enum: ["admin", "user"] },
							},
						},
					},
				},
			},
			responses: {
				201: { description: "User created" },
				400: { description: "Missing fields" },
				409: { description: "Email already exists" },
			},
		},
	},
	"/login": {
		post: {
			summary: "Login with email and password",
			tags: ["Manual Users and Auth"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["email", "password"],
							properties: {
								email: { type: "string" },
								password: { type: "string" },
							},
						},
					},
				},
			},
			responses: {
				200: { description: "JWT token returned" },
				400: { description: "Missing fields" },
				401: { description: "Invalid credentials" },
			},
		},
	},
	"/users": {
		get: {
			summary: "Get all users",
			tags: ["Manual Users and Auth"],
			security: [{ bearerAuth: [] }],
			responses: {
				200: { description: "List of users" },
				401: { description: "Unauthorized" },
			},
		},
	},
	"/users/{id}": {
		get: {
			summary: "Get user by ID",
			tags: ["Manual Users and Auth"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "id",
					schema: { type: "string" },
					required: true,
					description: "User ID",
				},
			],
			responses: {
				200: { description: "User found" },
				401: { description: "Unauthorized" },
				404: { description: "User not found" },
			},
		},
		put: {
			summary: "Update user info",
			tags: ["Manual Users and Auth"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "id",
					schema: { type: "string" },
					required: true,
					description: "User ID",
				},
			],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								name: { type: "string" },
								email: { type: "string" },
								role: { type: "string", enum: ["admin", "user"] },
							},
						},
					},
				},
			},
			responses: {
				200: { description: "User updated" },
				401: { description: "Unauthorized" },
				404: { description: "User not found" },
			},
		},
	},
	"/users/{id}/soft": {
		delete: {
			summary: "Soft delete a user (set status to INACTIVE)",
			tags: ["Manual Users and Auth"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "id",
					schema: { type: "string" },
					required: true,
					description: "User ID",
				},
			],
			responses: {
				200: { description: "User soft deleted" },
				401: { description: "Unauthorized" },
				404: { description: "User not found" },
			},
		},
	},
	"/users/{id}/hard": {
		delete: {
			summary: "Hard delete a user (remove from DB)",
			tags: ["Manual Users and Auth"],
			security: [{ bearerAuth: [] }],
			parameters: [
				{
					in: "path",
					name: "id",
					schema: { type: "string" },
					required: true,
					description: "User ID",
				},
			],
			responses: {
				200: { description: "User hard deleted" },
				401: { description: "Unauthorized" },
				404: { description: "User not found" },
			},
		},
	},
	"/api/auth/signup": {
		post: {
			summary: "Register a new user",
			tags: ["Github Integrated Auth"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["email", "password"],
							properties: {
								email: { type: "string" },
								password: { type: "string" },
								full_name: { type: "string" },
							},
						},
					},
				},
			},
			responses: {
				200: { description: "User registered" },
				400: { description: "Missing fields or error" },
			},
		},
	},
	"/api/auth/signin": {
		post: {
			summary: "Sign in a user",
			tags: ["Github Integrated Auth"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["email", "password"],
							properties: {
								email: { type: "string" },
								password: { type: "string" },
							},
						},
					},
				},
			},
			responses: {
				200: { description: "User signed in" },
				401: { description: "Invalid credentials" },
			},
		},
	},
	"/api/auth/session/accept": {
		post: {
			summary: "Accept a session token and return user",
			tags: ["Github Integrated Auth"],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["access_token"],
							properties: {
								access_token: { type: "string" },
							},
						},
					},
				},
			},
			responses: {
				200: { description: "Session accepted" },
				400: { description: "access_token required" },
				401: { description: "Invalid or expired token" },
			},
		},
	},
};
