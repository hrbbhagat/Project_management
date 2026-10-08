const db = require('../config/database');
const {
  isUUID,
  isValidDate,
  TASK_STATUSES,
  TASK_PRIORITIES,
} = require('../utils/validation');
const {
  parsePagination,
  buildPaginationMeta,
  parseSorting,
  TASK_SORT_MAP,
} = require('../utils/pagination');
const auditService = require('./audit.service');

/**
 * Retrieves all tasks accessible to the authenticated user with pagination, sorting, search, and filtering.
 */
const getTasks = async (userId, queryParams = {}) => {
  const { search, project_id, status, priority, assigned_to, sortBy, order } = queryParams;
  const { page, limit, offset } = parsePagination(queryParams);
  const { sortColumn, sortOrder } = parseSorting(sortBy, order, TASK_SORT_MAP, 't.created_at');

  const conditions = [
    `(p.owner_id = $1 OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = $1
     ))`
  ];
  const params = [userId];
  let paramIndex = 2;

  if (project_id) {
    if (!isUUID(project_id)) {
      const error = new Error('Invalid project_id filter format. Must be a valid UUID.');
      error.statusCode = 400;
      throw error;
    }
    conditions.push(`t.project_id = $${paramIndex}`);
    params.push(project_id);
    paramIndex++;
  }

  if (status) {
    const upperStatus = status.toUpperCase();
    if (!TASK_STATUSES.includes(upperStatus)) {
      const error = new Error(
        `Invalid status filter: '${status}'. Allowed values: ${TASK_STATUSES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    conditions.push(`t.status = $${paramIndex}::task_status`);
    params.push(upperStatus);
    paramIndex++;
  }

  if (priority) {
    const upperPriority = priority.toUpperCase();
    if (!TASK_PRIORITIES.includes(upperPriority)) {
      const error = new Error(
        `Invalid priority filter: '${priority}'. Allowed values: ${TASK_PRIORITIES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    conditions.push(`t.priority = $${paramIndex}::task_priority`);
    params.push(upperPriority);
    paramIndex++;
  }

  if (assigned_to) {
    if (!isUUID(assigned_to)) {
      const error = new Error('Invalid assigned_to filter format. Must be a valid UUID.');
      error.statusCode = 400;
      throw error;
    }
    conditions.push(`t.assigned_to = $${paramIndex}`);
    params.push(assigned_to);
    paramIndex++;
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const limitParamIndex = paramIndex;
  const offsetParamIndex = paramIndex + 1;
  params.push(limit, offset);

  const query = `
    SELECT 
        t.id,
        t.project_id,
        p.name AS project_name,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        u_assigned.full_name AS assignee_name,
        u_assigned.email AS assignee_email,
        t.created_by,
        u_creator.full_name AS creator_name,
        t.due_date,
        t.estimated_hours,
        t.completed_at,
        t.created_at,
        t.updated_at,
        COUNT(*) OVER() AS total_count
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
  `;

  const result = await db.query(query, params);
  const rows = result.rows;

  let total = 0;
  if (rows.length > 0) {
    total = parseInt(rows[0].total_count, 10);
  }

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
 * Retrieves a single task by ID with authorization check.
 */
const getTaskById = async (taskId, userId) => {
  if (!isUUID(taskId)) {
    const error = new Error('Invalid task ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  const query = `
    SELECT 
        t.id,
        t.project_id,
        p.name AS project_name,
        p.owner_id AS project_owner_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        u_assigned.full_name AS assignee_name,
        u_assigned.email AS assignee_email,
        t.created_by,
        u_creator.full_name AS creator_name,
        t.due_date,
        t.estimated_hours,
        t.completed_at,
        t.created_at,
        t.updated_at
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
    WHERE t.id = $1;
  `;

  const result = await db.query(query, [taskId]);

  if (result.rows.length === 0) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const task = result.rows[0];

  // Verify user has access to task's parent project
  if (task.project_owner_id !== userId) {
    const memberCheck = await db.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      const error = new Error('Access denied. You do not have permission to view this task.');
      error.statusCode = 403;
      throw error;
    }
  }

  return task;
};

/**
 * Creates a new task within a project.
 */
const createTask = async (userId, taskData) => {
  const {
    project_id,
    title,
    name,
    description,
    status,
    priority,
    assigned_to,
    due_date,
    estimated_hours,
  } = taskData;

  // 1. Validation
  if (!project_id || !isUUID(project_id)) {
    const error = new Error('Valid project_id (UUID) is required.');
    error.statusCode = 400;
    throw error;
  }

  const resolvedTitle = title || name;
  if (!resolvedTitle || typeof resolvedTitle !== 'string' || resolvedTitle.trim().length === 0) {
    const error = new Error('Task title is required and cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  if (resolvedTitle.trim().length > 255) {
    const error = new Error('Task title cannot exceed 255 characters.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Verify project exists and user has authorization
  const projectResult = await db.query(
    'SELECT id, owner_id FROM projects WHERE id = $1',
    [project_id]
  );

  if (projectResult.rows.length === 0) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  const project = projectResult.rows[0];
  let isAuthorized = project.owner_id === userId;

  if (!isAuthorized) {
    const memberCheck = await db.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, userId]
    );
    if (memberCheck.rows.length > 0 && ['OWNER', 'ADMIN', 'MEMBER'].includes(memberCheck.rows[0].role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const error = new Error('Access denied. You do not have permission to create tasks in this project.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Validate status and priority
  const resolvedStatus = status ? status.toUpperCase() : 'PENDING';
  if (!TASK_STATUSES.includes(resolvedStatus)) {
    const error = new Error(
      `Invalid task status: '${status}'. Allowed values: ${TASK_STATUSES.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  const resolvedPriority = priority ? priority.toUpperCase() : 'MEDIUM';
  if (!TASK_PRIORITIES.includes(resolvedPriority)) {
    const error = new Error(
      `Invalid task priority: '${priority}'. Allowed values: ${TASK_PRIORITIES.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate assigned_to if provided
  if (assigned_to) {
    if (!isUUID(assigned_to)) {
      const error = new Error('Invalid assigned_to format. Must be a valid UUID.');
      error.statusCode = 400;
      throw error;
    }
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [assigned_to]);
    if (userCheck.rows.length === 0) {
      const error = new Error('Assignee user does not exist or is inactive.');
      error.statusCode = 400;
      throw error;
    }
    const memberCheck = await db.query(
      `SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
       UNION
       SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [project_id, assigned_to]
    );
    if (memberCheck.rows.length === 0) {
      const error = new Error('Assigned user must be the project owner or a registered project member.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 5. Validate due_date and estimated_hours
  if (due_date && !isValidDate(due_date)) {
    const error = new Error('Invalid due_date format.');
    error.statusCode = 400;
    throw error;
  }

  let resolvedHours = null;
  if (estimated_hours !== undefined && estimated_hours !== null) {
    resolvedHours = parseFloat(estimated_hours);
    if (isNaN(resolvedHours) || resolvedHours < 0) {
      const error = new Error('estimated_hours must be a non-negative number.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 6. Insert Task (created_by automatically set to authenticated user)
  const insertQuery = `
    INSERT INTO tasks (
        project_id,
        title,
        description,
        status,
        priority,
        assigned_to,
        created_by,
        due_date,
        estimated_hours
    )
    VALUES ($1, $2, $3, $4::task_status, $5::task_priority, $6, $7, $8, $9)
    RETURNING id, project_id, title, description, status, priority, 
              assigned_to, created_by, due_date, estimated_hours, 
              completed_at, created_at, updated_at;
  `;

  const result = await db.query(insertQuery, [
    project_id,
    resolvedTitle.trim(),
    description ? description.trim() : null,
    resolvedStatus,
    resolvedPriority,
    assigned_to || null,
    userId,
    due_date || null,
    resolvedHours,
  ]);

  const newTask = result.rows[0];

  // Record Audit Log
  await auditService.logAction({
    userId,
    action: 'TASK_CREATED',
    entityType: 'TASK',
    entityId: newTask.id,
    metadata: {
      title: newTask.title,
      projectId: newTask.project_id,
      status: newTask.status,
      priority: newTask.priority,
    },
  });

  return newTask;
};

/**
 * Updates an existing task.
 */
const updateTask = async (taskId, userId, updateData) => {
  if (!isUUID(taskId)) {
    const error = new Error('Invalid task ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch task and parent project
  const taskResult = await db.query(
    `SELECT t.*, p.owner_id AS project_owner_id
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingTask = taskResult.rows[0];

  // 2. Authorization check
  let isAuthorized = existingTask.project_owner_id === userId || existingTask.created_by === userId || existingTask.assigned_to === userId;
  if (!isAuthorized) {
    const memberCheck = await db.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [existingTask.project_id, userId]
    );
    if (memberCheck.rows.length > 0 && ['OWNER', 'ADMIN', 'MEMBER'].includes(memberCheck.rows[0].role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const error = new Error('Access denied. You do not have permission to modify this task.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Validate and resolve fields
  const {
    title,
    name,
    description,
    status,
    priority,
    assigned_to,
    due_date,
    estimated_hours,
  } = updateData;

  let newTitle = existingTask.title;
  const resolvedTitle = title || name;
  if (resolvedTitle !== undefined) {
    if (typeof resolvedTitle !== 'string' || resolvedTitle.trim().length === 0) {
      const error = new Error('Task title cannot be empty.');
      error.statusCode = 400;
      throw error;
    }
    newTitle = resolvedTitle.trim();
  }

  let newStatus = existingTask.status;
  if (status !== undefined) {
    const upperStatus = status.toUpperCase();
    if (!TASK_STATUSES.includes(upperStatus)) {
      const error = new Error(
        `Invalid task status: '${status}'. Allowed values: ${TASK_STATUSES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    newStatus = upperStatus;
  }

  let newPriority = existingTask.priority;
  if (priority !== undefined) {
    const upperPriority = priority.toUpperCase();
    if (!TASK_PRIORITIES.includes(upperPriority)) {
      const error = new Error(
        `Invalid task priority: '${priority}'. Allowed values: ${TASK_PRIORITIES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    newPriority = upperPriority;
  }

  let newAssignedTo = existingTask.assigned_to;
  if (assigned_to !== undefined) {
    if (assigned_to === null || assigned_to === '') {
      newAssignedTo = null;
    } else {
      if (!isUUID(assigned_to)) {
        const error = new Error('Invalid assigned_to format.');
        error.statusCode = 400;
        throw error;
      }
      const userCheck = await db.query('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [assigned_to]);
      if (userCheck.rows.length === 0) {
        const error = new Error('Assignee user does not exist.');
        error.statusCode = 400;
        throw error;
      }
      const memberCheck = await db.query(
        `SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
         UNION
         SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [existingTask.project_id, assigned_to]
      );
      if (memberCheck.rows.length === 0) {
        const error = new Error('Assigned user must be the project owner or a registered project member.');
        error.statusCode = 400;
        throw error;
      }
      newAssignedTo = assigned_to;
    }
  }

  const newDescription = description !== undefined ? (description ? description.trim() : null) : existingTask.description;
  
  let newDueDate = existingTask.due_date;
  if (due_date !== undefined) {
    if (due_date === null || due_date === '') {
      newDueDate = null;
    } else {
      if (!isValidDate(due_date)) {
        const error = new Error('Invalid due_date format.');
        error.statusCode = 400;
        throw error;
      }
      newDueDate = due_date;
    }
  }

  let newEstimatedHours = existingTask.estimated_hours;
  if (estimated_hours !== undefined) {
    if (estimated_hours === null || estimated_hours === '') {
      newEstimatedHours = null;
    } else {
      const parsed = parseFloat(estimated_hours);
      if (isNaN(parsed) || parsed < 0) {
        const error = new Error('estimated_hours must be a non-negative number.');
        error.statusCode = 400;
        throw error;
      }
      newEstimatedHours = parsed;
    }
  }

  const updateQuery = `
    UPDATE tasks
    SET 
        title = $2,
        description = $3,
        status = $4::task_status,
        priority = $5::task_priority,
        assigned_to = $6,
        due_date = $7,
        estimated_hours = $8
    WHERE id = $1
    RETURNING id, project_id, title, description, status, priority, 
              assigned_to, created_by, due_date, estimated_hours, 
              completed_at, created_at, updated_at;
  `;

  const updatedResult = await db.query(updateQuery, [
    taskId,
    newTitle,
    newDescription,
    newStatus,
    newPriority,
    newAssignedTo,
    newDueDate,
    newEstimatedHours,
  ]);

  const updatedTask = updatedResult.rows[0];

  // Determine audit action: completed vs status changed vs generic update
  let action = 'TASK_UPDATED';
  if (existingTask.status !== newStatus) {
    action = (newStatus === 'DONE' || newStatus === 'COMPLETED') ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED';
  } else if (existingTask.priority !== newPriority) {
    action = 'TASK_PRIORITY_CHANGED';
  }

  await auditService.logAction({
    userId,
    action,
    entityType: 'TASK',
    entityId: taskId,
    metadata: {
      title: updatedTask.title,
      oldStatus: existingTask.status,
      newStatus: updatedTask.status,
      oldPriority: existingTask.priority,
      newPriority: updatedTask.priority,
    },
  });

  return updatedTask;
};

/**
 * Deletes a task.
 */
const deleteTask = async (taskId, userId) => {
  if (!isUUID(taskId)) {
    const error = new Error('Invalid task ID format. Must be a valid UUID.');
    error.statusCode = 400;
    throw error;
  }

  const taskResult = await db.query(
    `SELECT t.id, t.title, t.project_id, t.created_by, p.owner_id AS project_owner_id
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const task = taskResult.rows[0];

  let isAuthorized = task.project_owner_id === userId || task.created_by === userId;
  if (!isAuthorized) {
    const memberCheck = await db.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, userId]
    );
    if (memberCheck.rows.length > 0 && ['OWNER', 'ADMIN'].includes(memberCheck.rows[0].role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const error = new Error('Access denied. You do not have permission to delete this task.');
    error.statusCode = 403;
    throw error;
  }

  await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

  // Record Audit Log
  await auditService.logAction({
    userId,
    action: 'TASK_DELETED',
    entityType: 'TASK',
    entityId: taskId,
    metadata: {
      title: task.title,
      projectId: task.project_id,
    },
  });

  return true;
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
