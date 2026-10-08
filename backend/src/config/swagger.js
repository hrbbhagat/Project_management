const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Management System API',
      version: '1.0.0',
      description:
        'RESTful API service for Project Management System. Provides secure multi-tenant project and task management, authentication, user-scoped metrics, pagination, sorting, search, filtering, and audit trails.',
      contact: {
        name: 'Backend Engineering Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' },
          },
        },
        StandardErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid request or access denied' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 42 },
            totalPages: { type: 'integer', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111101' },
            full_name: { type: 'string', example: 'Alice Johnson' },
            email: { type: 'string', format: 'email', example: 'alice.johnson@example.com' },
            role: { type: 'string', enum: ['ADMIN', 'MEMBER'], example: 'MEMBER' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222201' },
            name: { type: 'string', example: 'Cloud Infrastructure Modernization' },
            description: { type: 'string', example: 'Migrate core microservices to Kubernetes' },
            status: {
              type: 'string',
              enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'ARCHIVED'],
              example: 'IN_PROGRESS',
            },
            owner_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111101' },
            owner_name: { type: 'string', example: 'Alice Johnson' },
            user_role: { type: 'string', example: 'OWNER' },
            start_date: { type: 'string', format: 'date', example: '2026-09-01' },
            due_date: { type: 'string', format: 'date', example: '2026-12-31' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            total_members: { type: 'string', example: '3' },
            total_tasks: { type: 'string', example: '4' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '33333333-3333-3333-3333-333333333301' },
            project_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222201' },
            project_name: { type: 'string', example: 'Cloud Infrastructure Modernization' },
            title: { type: 'string', example: 'Configure Redis cluster' },
            description: { type: 'string', example: 'Deploy Redis cache nodes' },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'TODO', 'IN_REVIEW', 'DONE', 'BLOCKED'],
              example: 'PENDING',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              example: 'HIGH',
            },
            assigned_to: { type: 'string', format: 'uuid', nullable: true },
            assignee_name: { type: 'string', nullable: true },
            created_by: { type: 'string', format: 'uuid' },
            creator_name: { type: 'string' },
            due_date: { type: 'string', format: 'date-time', nullable: true },
            estimated_hours: { type: 'number', example: 8 },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalProjects: { type: 'integer', example: 3 },
            totalTasks: { type: 'integer', example: 11 },
            completedTasks: { type: 'integer', example: 4 },
            pendingTasks: { type: 'integer', example: 7 },
            projectsInProgress: { type: 'integer', example: 2 },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          summary: 'API Service Health Check',
          tags: ['Health'],
          responses: {
            200: {
              description: 'Service is healthy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardSuccessResponse' } } },
            },
          },
        },
      },
      '/api/health/db': {
        get: {
          summary: 'PostgreSQL Database Health Probe',
          tags: ['Health'],
          responses: {
            200: { description: 'Database is connected and responding' },
            503: { description: 'Database is disconnected or unresponsive' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          summary: 'Register a new user account',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['full_name', 'email', 'password'],
                  properties: {
                    full_name: { type: 'string', example: 'Bob Developer' },
                    email: { type: 'string', format: 'email', example: 'bob@example.com' },
                    password: { type: 'string', format: 'password', minLength: 8, example: 'Password123!' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered successfully' },
            400: { description: 'Validation error' },
            409: { description: 'Email already registered' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Authenticate credentials and obtain JWT',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'alice.johnson@example.com' },
                    password: { type: 'string', format: 'password', example: 'Password123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful with JWT token and profile' },
            401: { description: 'Invalid email or password' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          summary: 'Client logout instruction (stateless JWT)',
          tags: ['Authentication'],
          responses: {
            200: { description: 'Logout confirmation' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Retrieve authenticated user profile',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user profile' },
            401: { description: 'Unauthenticated or invalid token' },
          },
        },
      },
      '/api/projects': {
        get: {
          summary: 'List user-accessible projects with pagination, sorting, search, and status filtering',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 }, description: 'Items per page (max 100)' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search term for name and description' },
            { in: 'query', name: 'status', schema: { type: 'string' }, description: 'Project status filter' },
            { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'created_at' }, description: 'Field to sort by (name, status, start_date, due_date, created_at)' },
            { in: 'query', name: 'order', schema: { type: 'string', enum: ['ASC', 'DESC', 'asc', 'desc'], default: 'DESC' }, description: 'Sort direction' },
          ],
          responses: {
            200: { description: 'List of accessible projects with pagination metadata' },
            401: { description: 'Unauthenticated' },
          },
        },
        post: {
          summary: 'Create a new project (sets owner_id = req.user.id)',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'New Strategic Initiative' },
                    description: { type: 'string', example: 'Description of the initiative' },
                    status: { type: 'string', example: 'NOT_STARTED' },
                    start_date: { type: 'string', format: 'date', example: '2026-10-01' },
                    due_date: { type: 'string', format: 'date', example: '2026-12-31' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Project created successfully' },
            400: { description: 'Validation error' },
            401: { description: 'Unauthenticated' },
          },
        },
      },
      '/api/projects/{id}': {
        get: {
          summary: 'Get project details by UUID',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Project details' },
            403: { description: 'Access denied / unauthorized' },
            404: { description: 'Project not found' },
          },
        },
        put: {
          summary: 'Update project details',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string' },
                    start_date: { type: 'string', format: 'date' },
                    due_date: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Project updated successfully' },
            403: { description: 'Access denied' },
            404: { description: 'Project not found' },
          },
        },
        delete: {
          summary: 'Delete project workspace (Owner only)',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Project deleted successfully' },
            403: { description: 'Access denied (only owner can delete)' },
            404: { description: 'Project not found' },
          },
        },
      },
      '/api/tasks': {
        get: {
          summary: 'List user-accessible tasks with pagination, sorting, search, status, and priority filters',
          tags: ['Tasks'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'priority', schema: { type: 'string' } },
            { in: 'query', name: 'project_id', schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'assigned_to', schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'created_at' } },
            { in: 'query', name: 'order', schema: { type: 'string', enum: ['ASC', 'DESC', 'asc', 'desc'], default: 'DESC' } },
          ],
          responses: {
            200: { description: 'List of tasks with pagination metadata' },
            401: { description: 'Unauthenticated' },
          },
        },
        post: {
          summary: 'Create a new task under a project (sets created_by = req.user.id)',
          tags: ['Tasks'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project_id', 'title'],
                  properties: {
                    project_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string', example: 'Setup CI/CD pipeline' },
                    description: { type: 'string', example: 'Configure GitHub Actions' },
                    status: { type: 'string', example: 'PENDING' },
                    priority: { type: 'string', example: 'HIGH' },
                    assigned_to: { type: 'string', format: 'uuid', nullable: true },
                    due_date: { type: 'string', format: 'date-time', nullable: true },
                    estimated_hours: { type: 'number', example: 6 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Task created successfully' },
            400: { description: 'Validation error' },
            403: { description: 'Access denied to target project' },
          },
        },
      },
      '/api/tasks/{id}': {
        get: {
          summary: 'Get task details by UUID',
          tags: ['Tasks'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Task details' },
            403: { description: 'Access denied to task project' },
            404: { description: 'Task not found' },
          },
        },
        put: {
          summary: 'Update task details, status, priority, or assignee',
          tags: ['Tasks'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'string' },
                    assigned_to: { type: 'string', format: 'uuid', nullable: true },
                    due_date: { type: 'string', format: 'date-time', nullable: true },
                    estimated_hours: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Task updated successfully' },
            403: { description: 'Access denied' },
            404: { description: 'Task not found' },
          },
        },
        delete: {
          summary: 'Delete task (Owner, Creator, or Admin)',
          tags: ['Tasks'],
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Task deleted successfully' },
            403: { description: 'Access denied' },
            404: { description: 'Task not found' },
          },
        },
      },
      '/api/dashboard': {
        get: {
          summary: 'Retrieve user-scoped project and task statistics',
          tags: ['Dashboard'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard metrics',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } },
            },
            401: { description: 'Unauthenticated' },
          },
        },
      },
    },
  },
  apis: [], // All specs centralized directly in definition for maximum reliability
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
