const db = require('../config/database');

/**
 * Service for managing security and action audit logs.
 */
const logAction = async ({ userId = null, action, entityType, entityId = null, metadata = {} }) => {
  try {
    if (!action || !entityType) {
      console.warn('[Audit Log Warning] Action and entityType are required for audit logging.');
      return null;
    }

    // Sanitize metadata to guarantee no secrets/passwords are ever logged
    const sanitizedMeta = { ...metadata };
    delete sanitizedMeta.password;
    delete sanitizedMeta.password_hash;
    delete sanitizedMeta.token;
    delete sanitizedMeta.jwt;
    delete sanitizedMeta.secret;

    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, action, entity_type, entity_id, metadata, created_at;
    `;

    const result = await db.query(query, [
      userId || null,
      action,
      entityType,
      entityId || null,
      JSON.stringify(sanitizedMeta),
    ]);

    return result.rows[0];
  } catch (error) {
    // Non-blocking log error so business logic is not interrupted
    console.error('[Audit Log Error]', error.message);
    return null;
  }
};

/**
 * Retrieves audit logs for a specific user or entity (for administrative verification).
 */
const getAuditLogs = async (filters = {}) => {
  const { userId, entityType, entityId, limit = 50 } = filters;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`user_id = $${paramIndex}`);
    params.push(userId);
    paramIndex++;
  }

  if (entityType) {
    conditions.push(`entity_type = $${paramIndex}`);
    params.push(entityType);
    paramIndex++;
  }

  if (entityId) {
    conditions.push(`entity_id = $${paramIndex}`);
    params.push(entityId);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT id, user_id, action, entity_type, entity_id, metadata, created_at
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex};
  `;
  params.push(limit);

  const result = await db.query(query, params);
  return result.rows;
};

module.exports = {
  logAction,
  getAuditLogs,
};
