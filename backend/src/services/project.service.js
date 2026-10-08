const db = require('../config/database');
const { isUUID, isValidDate, PROJECT_STATUSES } = require('../utils/validation');
const {
  parsePagination,
  buildPaginationMeta,
  parseSorting,
  PROJECT_SORT_MAP,
} = require('../utils/pagination');
const auditService = require('./audit.service');

/**
 * Lists all projects accessible to the authenticated user with pagination, sorting, search, and status filters.
 */
const getProjects = async (userId, queryParams = {}) => {
  const { search, status, sortBy, order } = queryParams;
  const { page, limit, offset } = parsePagination(queryParams);
  const { sortColumn, sortOrder } = parseSorting(sortBy, order, PROJECT_SORT_MAP, 'p.created_at');

  const conditions = ['(p.owner_id = $1 OR pm.user_id = $1)'];
  const params = [userId];
  let paramIndex = 2;

  if (status) {
    const upperStatus = status.toUpperCase();
    if (!PROJECT_STATUSES.includes(upperStatus)) {
      const error = new Error(
        `Invalid project status filter: '${status}'. Allowed values are: ${PROJECT_STATUSES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    conditions.push(`p.status = $${paramIndex}::project_status`);
    params.push(upperStatus);
    paramIndex++;
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  // Parameterized pagination values
  const limitParamIndex = paramIndex;
  const offsetParamIndex = paramIndex + 1;
  params.push(limit, offset);

  const query = `
    SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.owner_id,
        u.full_name AS owner_name,
        COALESCE(pm.role, CASE WHEN p.owner_id = $1 THEN 'OWNER'::project_role ELSE NULL END) AS user_role,
        p.start_date,
        p.due_date,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT pm_all.user_id) AS total_members,
        COUNT(DISTINCT t.id) AS total_tasks,
        COUNT(*) OVER() AS total_count
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
    LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
    LEFT JOIN tasks t ON p.id = t.project_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id, u.full_name, pm.role
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
  `;

  const result = await db.query(query, params);
  const rows = result.rows;

  let total = 0;
  if (rows.length > 0) {
    total = parseInt(rows[0].total_count, 10);
  }

  // Remove window helper field from payload
  const cleanRows = rows.map((r) => {
    const { total_count, ...rest } = r;
    return rest;
  });

  return {
    data: cleanRows,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Retrieves a single project by ID with authorization check.
 */
const getProjectById = async (projectId, userId) => {
  if (!isUUID(projectId)) {
    const error = new Error('Invalid project ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  const query = `
    SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.owner_id,
        u.full_name AS owner_name,
        u.email AS owner_email,
        COALESCE(pm.role, CASE WHEN p.owner_id = $2 THEN 'OWNER'::project_role ELSE NULL END) AS user_role,
        p.start_date,
        p.due_date,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT pm_all.user_id) AS total_members,
        COUNT(DISTINCT t.id) AS total_tasks
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
    LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
    LEFT JOIN tasks t ON p.id = t.project_id
    WHERE p.id = $1
    GROUP BY p.id, u.full_name, u.email, pm.role;
  `;

  const result = await db.query(query, [projectId, userId]);

  if (result.rows.length === 0) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  const project = result.rows[0];

  // User must be owner OR enrolled member
  if (project.owner_id !== userId && !project.user_role) {
    const error = new Error('Access denied. You do not have permission to view this project.');
    error.statusCode = 403;
    throw error;
  }

  return project;
};

/**
 * Creates a new project workspace.
 */
const createProject = async (userId, { name, description, status, start_date, due_date, end_date }) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const error = new Error('Project name is required and cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  if (name.trim().length > 150) {
    const error = new Error('Project name cannot exceed 150 characters.');
    error.statusCode = 400;
    throw error;
  }

  const resolvedStatus = status ? status.toUpperCase() : 'NOT_STARTED';
  if (!PROJECT_STATUSES.includes(resolvedStatus)) {
    const error = new Error(
      `Invalid project status: '${status}'. Allowed values are: ${PROJECT_STATUSES.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  const resolvedDueDate = due_date || end_date || null;

  if (start_date && !isValidDate(start_date)) {
    const error = new Error('Invalid start_date format. Must be a valid date.');
    error.statusCode = 400;
    throw error;
  }

  if (resolvedDueDate && !isValidDate(resolvedDueDate)) {
    const error = new Error('Invalid due_date format. Must be a valid date.');
    error.statusCode = 400;
    throw error;
  }

  if (start_date && resolvedDueDate && new Date(resolvedDueDate) < new Date(start_date)) {
    const error = new Error('due_date cannot be earlier than start_date.');
    error.statusCode = 400;
    throw error;
  }

  // Insert project
  const insertProjectQuery = `
    INSERT INTO projects (name, description, status, owner_id, start_date, due_date)
    VALUES ($1, $2, $3::project_status, $4, $5, $6)
    RETURNING id, name, description, status, owner_id, start_date, due_date, created_at, updated_at;
  `;

  const projectResult = await db.query(insertProjectQuery, [
    name.trim(),
    description ? description.trim() : null,
    resolvedStatus,
    userId,
    start_date || null,
    resolvedDueDate || null,
  ]);

  const newProject = projectResult.rows[0];

  // Also record owner in project_members
  await db.query(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, 'OWNER')
     ON CONFLICT (project_id, user_id) DO NOTHING;`,
    [newProject.id, userId]
  );

  // Record Audit Log
  await auditService.logAction({
    userId,
    action: 'PROJECT_CREATED',
    entityType: 'PROJECT',
    entityId: newProject.id,
    metadata: {
      projectName: newProject.name,
      status: newProject.status,
    },
  });

  return newProject;
};

/**
 * Updates an existing project.
 */
const updateProject = async (projectId, userId, updateData) => {
  if (!isUUID(projectId)) {
    const error = new Error('Invalid project ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify existence
  const existingResult = await db.query(
    'SELECT id, name, description, status, owner_id, start_date, due_date FROM projects WHERE id = $1',
    [projectId]
  );

  if (existingResult.rows.length === 0) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  const existing = existingResult.rows[0];

  // 2. Verify authorization: Owner OR Project Admin/Owner role
  let isAuthorized = existing.owner_id === userId;
  if (!isAuthorized) {
    const memberResult = await db.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (memberResult.rows.length > 0 && ['OWNER', 'ADMIN'].includes(memberResult.rows[0].role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const error = new Error('Access denied. You do not have permission to modify this project.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Validate fields
  const { name, description, status, start_date, due_date, end_date } = updateData;

  let newName = existing.name;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      const error = new Error('Project name cannot be empty.');
      error.statusCode = 400;
      throw error;
    }
    newName = name.trim();
  }

  let newStatus = existing.status;
  if (status !== undefined) {
    const upperStatus = status.toUpperCase();
    if (!PROJECT_STATUSES.includes(upperStatus)) {
      const error = new Error(
        `Invalid project status: '${status}'. Allowed values are: ${PROJECT_STATUSES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    newStatus = upperStatus;
  }

  const newDescription = description !== undefined ? (description ? description.trim() : null) : existing.description;
  
  let newStartDate = existing.start_date;
  if (start_date !== undefined) {
    if (start_date === null || start_date === '') {
      newStartDate = null;
    } else {
      if (!isValidDate(start_date)) {
        const error = new Error('Invalid start_date format.');
        error.statusCode = 400;
        throw error;
      }
      newStartDate = start_date;
    }
  }

  let newDueDate = existing.due_date;
  const rawDueDate = due_date !== undefined ? due_date : end_date;
  if (rawDueDate !== undefined) {
    if (rawDueDate === null || rawDueDate === '') {
      newDueDate = null;
    } else {
      if (!isValidDate(rawDueDate)) {
        const error = new Error('Invalid due_date format.');
        error.statusCode = 400;
        throw error;
      }
      newDueDate = rawDueDate;
    }
  }

  if (newStartDate && newDueDate && new Date(newDueDate) < new Date(newStartDate)) {
    const error = new Error('due_date cannot be earlier than start_date.');
    error.statusCode = 400;
    throw error;
  }

  const updateQuery = `
    UPDATE projects
    SET 
        name = $2,
        description = $3,
        status = $4::project_status,
        start_date = $5,
        due_date = $6
    WHERE id = $1
    RETURNING id, name, description, status, owner_id, start_date, due_date, created_at, updated_at;
  `;

  const updatedResult = await db.query(updateQuery, [
    projectId,
    newName,
    newDescription,
    newStatus,
    newStartDate,
    newDueDate,
  ]);

  const updatedProject = updatedResult.rows[0];

  // Record Audit Log
  await auditService.logAction({
    userId,
    action: 'PROJECT_UPDATED',
    entityType: 'PROJECT',
    entityId: projectId,
    metadata: {
      projectName: updatedProject.name,
      oldStatus: existing.status,
      newStatus: updatedProject.status,
    },
  });

  return updatedProject;
};

/**
 * Deletes a project.
 */
const deleteProject = async (projectId, userId) => {
  if (!isUUID(projectId)) {
    const error = new Error('Invalid project ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  const existingResult = await db.query(
    'SELECT id, name, owner_id FROM projects WHERE id = $1',
    [projectId]
  );

  if (existingResult.rows.length === 0) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  // Only the owner can delete the project
  if (existingResult.rows[0].owner_id !== userId) {
    const error = new Error('Access denied. Only the project owner can delete this project.');
    error.statusCode = 403;
    throw error;
  }

  await db.query('DELETE FROM projects WHERE id = $1', [projectId]);

  // Record Audit Log
  await auditService.logAction({
    userId,
    action: 'PROJECT_DELETED',
    entityType: 'PROJECT',
    entityId: projectId,
    metadata: {
      projectName: existingResult.rows[0].name,
    },
  });

  return true;
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
