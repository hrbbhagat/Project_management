/**
 * Pagination and Sorting Helper Utilities
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = parseInt(process.env.PAGINATION_DEFAULT_LIMIT, 10) || 10;
const MAX_LIMIT = parseInt(process.env.PAGINATION_MAX_LIMIT, 10) || 100;

/**
 * Parses and validates pagination query parameters.
 * @param {object} query - Express req.query object
 * @returns {{ page: number, limit: number, offset: number }}
 */
const parsePagination = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Builds metadata for paginated response.
 * @param {number} total - Total count of matching items
 * @param {number} page - Current page number
 * @param {number} limit - Page size limit
 * @returns {object}
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

/**
 * Allowed sort fields for Projects mapping public API names to SQL columns.
 */
const PROJECT_SORT_MAP = {
  name: 'p.name',
  status: 'p.status',
  start_date: 'p.start_date',
  startdate: 'p.start_date',
  due_date: 'p.due_date',
  duedate: 'p.due_date',
  end_date: 'p.due_date',
  enddate: 'p.due_date',
  created_at: 'p.created_at',
  createdat: 'p.created_at',
  updated_at: 'p.updated_at',
  updatedat: 'p.updated_at',
};

/**
 * Allowed sort fields for Tasks mapping public API names to SQL columns.
 */
const TASK_SORT_MAP = {
  title: 't.title',
  name: 't.title',
  status: 't.status',
  priority: 't.priority',
  due_date: 't.due_date',
  duedate: 't.due_date',
  estimated_hours: 't.estimated_hours',
  estimatedhours: 't.estimated_hours',
  completed_at: 't.completed_at',
  completedat: 't.completed_at',
  created_at: 't.created_at',
  createdat: 't.created_at',
  updated_at: 't.updated_at',
  updatedat: 't.updated_at',
};

/**
 * Validates and resolves sorting clauses.
 * @param {string} sortBy - Sort key from query
 * @param {string} order - Direction ('asc' or 'desc')
 * @param {object} allowedMap - Map of allowed field keys to SQL columns
 * @param {string} defaultField - Fallback SQL column
 * @returns {{ sortColumn: string, sortOrder: string }}
 */
const parseSorting = (sortBy, order, allowedMap, defaultField) => {
  let sortColumn = defaultField;
  if (sortBy && typeof sortBy === 'string') {
    const key = sortBy.trim().toLowerCase();
    if (allowedMap[key]) {
      sortColumn = allowedMap[key];
    } else {
      const allowedKeys = Object.keys(allowedMap);
      const error = new Error(
        `Invalid sortBy field: '${sortBy}'. Allowed fields: ${[...new Set(Object.keys(allowedMap))].join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  let sortOrder = 'DESC';
  if (order && typeof order === 'string') {
    const upperOrder = order.trim().toUpperCase();
    if (['ASC', 'DESC'].includes(upperOrder)) {
      sortOrder = upperOrder;
    } else {
      const error = new Error(`Invalid order direction: '${order}'. Allowed values are 'ASC' or 'DESC'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return { sortColumn, sortOrder };
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
  parseSorting,
  PROJECT_SORT_MAP,
  TASK_SORT_MAP,
};
