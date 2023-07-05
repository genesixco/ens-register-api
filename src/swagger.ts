import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    failOnErrors: true,
    openapi: '3.0.0',
    info: {
      title: 'ENS API Documentation',
      version: '1.0.0',
      description: 'Documentation for ENS API Register',
    },
    components: {
      securitySchemes: {
        BasicAuth: {
          type: 'http',
          scheme: 'basic',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export default specs;