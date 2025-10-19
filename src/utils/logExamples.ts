// import LogRepository from "../repositories/log.repository";
// import { ILog } from "../models/log.shcmea";

// /**
//  * Utility functions to demonstrate the enhanced logging system
//  */

// /**
//  * Example: How to save a structured log entry
//  */
// export const createSampleLog = async () => {
//   const logEntry = {
//     projectId: "proj_123456",
//     spaceId: "development",
//     message: "Terraform apply completed successfully",
//     step: "apply" as const,
//     stepStatus: "completed" as const,
//     stdout: `Initializing the backend...

// Successfully configured the backend "s3"! Terraform will automatically
// use this backend unless the backend configuration changes.

// terraform apply -auto-approve -input=false -no-color

// Terraform used the selected providers to generate the following execution
// plan. Resource actions are indicated with the following symbols:
//   + create

// Terraform will perform the following actions:

//   # aws_s3_bucket.example will be created
//   + resource "aws_s3_bucket" "example" {
//       + acceleration_status         = (known after apply)
//       + acl                         = (known after apply)
//       + arn                         = (known after apply)
//       + bucket                      = "my-example-bucket-12345"
//       + bucket_domain_name          = (known after apply)
//     }

// Plan: 1 to add, 0 to change, 0 to destroy.

// aws_s3_bucket.example: Creating...
// aws_s3_bucket.example: Creation complete after 2s [id=my-example-bucket-12345]

// Apply complete! Resources: 1 added, 0 changed, 0 destroyed.`,
//     stderr: undefined,
//     exitCode: 0
//   };

//   return await LogRepository.createLog(logEntry);
// };

// /**
//  * Example: How to retrieve structured logs for frontend
//  */
// export const getFormattedLogsExample = async (projectId: string, spaceId: string) => {
//   const logs = await LogRepository.getFormattedLogs(projectId, spaceId);
  
//   console.log("Formatted logs structure:");
//   console.log(JSON.stringify(logs[0], null, 2));
  
//   return logs;
// };

// /**
//  * Example: How to get execution summary
//  */
// export const getExecutionSummaryExample = async (projectId: string, spaceId: string) => {
//   const summary = await LogRepository.getExecutionSummary(projectId, spaceId);
  
//   console.log("Execution summary:");
//   console.log(JSON.stringify(summary, null, 2));
  
//   return summary;
// };

// /**
//  * Example output structure that the frontend will receive:
//  * 
//  * Formatted Log Entry:
//  * {
//  *   "deploymentId": "uuid-here",
//  *   "message": "Terraform apply completed successfully",
//  *   "step": "apply",
//  *   "stepStatus": "completed",
//  *   "timestamp": "2025-09-28T10:30:00.000Z",
//  *   "formattedOutput": {
//  *     "stdout": [
//  *       "Initializing the backend...",
//  *       "Successfully configured the backend \"s3\"! Terraform will automatically",
//  *       "use this backend unless the backend configuration changes.",
//  *       "",
//  *       "terraform apply -auto-approve -input=false -no-color",
//  *       "",
//  *       "Terraform used the selected providers to generate the following execution",
//  *       "plan. Resource actions are indicated with the following symbols:",
//  *       "  + create",
//  *       "",
//  *       "# aws_s3_bucket.example will be created",
//  *       "+ resource \"aws_s3_bucket\" \"example\" {",
//  *       "    + acceleration_status         = (known after apply)",
//  *       "    + bucket                      = \"my-example-bucket-12345\"",
//  *       "  }",
//  *       "",
//  *       "Plan: 1 to add, 0 to change, 0 to destroy.",
//  *       "",
//  *       "aws_s3_bucket.example: Creating...",
//  *       "aws_s3_bucket.example: Creation complete after 2s [id=my-example-bucket-12345]",
//  *       "",
//  *       "Apply complete! Resources: 1 added, 0 changed, 0 destroyed."
//  *     ],
//  *     "stderr": undefined
//  *   },
//  *   "exitCode": 0
//  * }
//  * 
//  * Execution Summary:
//  * {
//  *   "stepSummary": {
//  *     "init": { "status": "completed", "timestamp": "2025-09-28T10:25:00.000Z", "exitCode": 0 },
//  *     "plan": { "status": "completed", "timestamp": "2025-09-28T10:28:00.000Z", "exitCode": 0 },
//  *     "apply": { "status": "completed", "timestamp": "2025-09-28T10:30:00.000Z", "exitCode": 0 },
//  *     "destroy": null
//  *   },
//  *   "totalLogs": 15,
//  *   "lastActivity": "2025-09-28T10:30:00.000Z"
//  * }
//  */