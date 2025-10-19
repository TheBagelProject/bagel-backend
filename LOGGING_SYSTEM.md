# Enhanced Logging System Documentation

## Overview

The enhanced logging system provides comprehensive tracking and structured storage of Terraform operations (init, plan, apply, destroy) with detailed output formatting for frontend consumption.

## Features

### 1. **Structured Log Storage**
- **Project-based organization**: Logs are organized by `projectId` and `spaceId`
- **Step tracking**: Each log entry tracks which Terraform step it belongs to (`init`, `plan`, `apply`, `destroy`)
- **Status monitoring**: Track step status (`running`, `completed`, `failed`)
- **Output capture**: Store both `stdout` and `stderr` with proper formatting
- **Exit code tracking**: Record process exit codes for debugging

### 2. **Database Schema**

```typescript
interface ILog {
  deploymentId: string;              // Unique identifier
  projectId: string;          // Project identifier
  spaceId: string;            // Space/environment identifier
  message: string;            // Human-readable message
  step?: "init" | "plan" | "apply" | "destroy";
  stepStatus?: "running" | "completed" | "failed";
  stdout?: string;            // Standard output (formatted)
  stderr?: string;            // Error output (formatted)
  exitCode?: number;          // Process exit code
  timestamp: Date;            // When the log was created
}
```

### 3. **API Endpoints**

#### Get All Logs
```
GET /api/projects/:projectId/spaces/:spaceId/logs
Query Parameters:
- step (optional): Filter by step (init, plan, apply, destroy)
- limit (optional): Number of logs to return (default: 100)
```

#### Get Formatted Logs (Frontend Ready)
```
GET /api/projects/:projectId/spaces/:spaceId/logs/formatted
Query Parameters:
- step (optional): Filter by step
- limit (optional): Number of logs to return (default: 50)

Response Format:
{
  "success": true,
  "logs": [
    {
  "deploymentId": "uuid",
      "message": "Terraform apply completed successfully",
      "step": "apply",
      "stepStatus": "completed",
      "timestamp": "2025-09-28T10:30:00.000Z",
      "formattedOutput": {
        "stdout": ["line1", "line2", "line3"],
        "stderr": ["error1", "error2"]
      },
      "exitCode": 0
    }
  ],
  "count": 1
}
```

#### Get Execution Summary
```
GET /api/projects/:projectId/spaces/:spaceId/logs/summary

Response Format:
{
  "success": true,
  "summary": {
    "stepSummary": {
      "init": { "status": "completed", "timestamp": "...", "exitCode": 0 },
      "plan": { "status": "completed", "timestamp": "...", "exitCode": 0 },
      "apply": { "status": "running", "timestamp": "...", "exitCode": null },
      "destroy": null
    },
    "totalLogs": 15,
    "lastActivity": "2025-09-28T10:30:00.000Z"
  }
}
```

#### Get Latest Step Logs
```
GET /api/projects/:projectId/spaces/:spaceId/logs/latest-steps

Returns the most recent log entry for each Terraform step.
```

#### Get Logs by Status
```
GET /api/projects/:projectId/spaces/:spaceId/logs/status/:stepStatus
Parameters:
- stepStatus: "running" | "completed" | "failed"
```

### 4. **Terraform Integration**

The terraform injector automatically creates log entries during execution:

1. **Start of Operation**: Creates a log with `stepStatus: "running"`
2. **Real-time Streaming**: Outputs are streamed via SSE
3. **Completion**: Creates a final log with:
   - `stepStatus: "completed"` or `"failed"`
   - `level: "success"` or `"error"`
   - Formatted `stdout` and `stderr`
   - `exitCode`

### 5. **Frontend Integration**

#### Display Structured Logs
```typescript
// Fetch formatted logs for display
const response = await fetch('/api/projects/proj123/spaces/dev/logs/formatted');
const { logs } = await response.json();

logs.forEach(log => {
  console.log(`[${log.step}] ${log.message}`);
  
  // Display stdout as separate lines
  if (log.formattedOutput?.stdout) {
    log.formattedOutput.stdout.forEach(line => {
      console.log(line);
    });
  }
  
  // Display errors
  if (log.formattedOutput?.stderr) {
    log.formattedOutput.stderr.forEach(errorLine => {
      console.error(errorLine);
    });
  }
});
```

#### Show Execution Status
```typescript
// Get summary of all terraform steps
const response = await fetch('/api/projects/proj123/spaces/dev/logs/summary');
const { summary } = await response.json();

// Display step status
Object.entries(summary.stepSummary).forEach(([step, status]) => {
  if (status) {
    console.log(`${step}: ${status.status} (${status.timestamp})`);
  } else {
    console.log(`${step}: Not executed`);
  }
});
```

### 6. **Database Indexes**

Optimized queries with compound indexes:
- `{ projectId: 1, spaceId: 1, timestamp: -1 }` - General log retrieval
- `{ projectId: 1, spaceId: 1, step: 1, timestamp: -1 }` - Step-specific queries

### 7. **Log Cleanup**

```
POST /api/logs/cleanup
Body: { "daysOld": 30 }

Removes logs older than specified days (default: 30 days)
```

## Usage Examples

### Creating a Log Entry
```typescript
import LogRepository from '../repositories/log.repository';

await LogRepository.createLog({
  projectId: 'proj_123',
  spaceId: 'production',
  message: 'Terraform init completed',
  step: 'init',
  stepStatus: 'completed',
  exitCode: 0
});
```

### Querying Logs
```typescript
// Get all logs for a project/space
const logs = await LogRepository.getLogsByProjectAndSpace('proj_123', 'production');

// Get latest status for each step
const latestLogs = await LogRepository.getLatestStepLogs('proj_123', 'production');

// Get execution summary
const summary = await LogRepository.getExecutionSummary('proj_123', 'production');
```

## Benefits

1. **Structured Data**: Logs are stored in a queryable format with proper indexing
2. **Frontend Ready**: Output is pre-formatted for easy display
3. **Real-time Updates**: SSE streaming provides live feedback
4. **Step Tracking**: Easy to see the status of each Terraform operation
5. **Error Handling**: Comprehensive error capture and storage
6. **Performance**: Optimized database queries with proper indexing
7. **Cleanup**: Automatic log cleanup prevents database bloat

This system provides a complete audit trail of all Terraform operations with structured data that's easy to query, display, and analyze.