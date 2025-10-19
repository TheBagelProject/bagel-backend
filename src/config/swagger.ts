
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { githubPatPaths } from '../Swagger/swaggerGithub';
import { authPaths } from '../Swagger/swaggerAuth';
import { projectPaths, projectSchemas } from '../Swagger/swaggerProjects';
import { terraformPaths } from '../Swagger/swaggerTeraform';
import { deploymentPaths, deploymentSchemas } from '../Swagger/swaggerDeployment';


const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bagel-backend API',
      version: '1.0.0',
      description: 'API documentation for bagel-backend',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    paths: {
      ...githubPatPaths,
      ...authPaths,
      ...projectPaths,
      ...terraformPaths,
      ...deploymentPaths,
    },
    components: {
      schemas: {
        ...projectSchemas,
        ...deploymentSchemas,
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [], // No controller JSDoc scanning needed
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
