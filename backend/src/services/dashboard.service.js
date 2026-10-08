const db = require('../config/database');

/**
 * Computes dashboard statistics scoped to the authenticated user.
 */
const getDashboardMetrics = async (userId) => {
  const query = `
    WITH user_accessible_projects AS (
        SELECT DISTINCT p.id, p.status
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.owner_id = $1 OR pm.user_id = $1
    ),
    user_accessible_tasks AS (
        SELECT t.id, t.status
        FROM tasks t
        JOIN user_accessible_projects uap ON t.project_id = uap.id
    )
    SELECT 
        (SELECT COUNT(*)::INT FROM user_accessible_projects) AS total_projects,
        (SELECT COUNT(*)::INT FROM user_accessible_projects WHERE status = 'IN_PROGRESS') AS projects_in_progress,
        (SELECT COUNT(*)::INT FROM user_accessible_tasks) AS total_tasks,
        (SELECT COUNT(*)::INT FROM user_accessible_tasks WHERE status IN ('COMPLETED', 'DONE')) AS completed_tasks,
        (SELECT COUNT(*)::INT FROM user_accessible_tasks WHERE status NOT IN ('COMPLETED', 'DONE')) AS pending_tasks;
  `;

  const result = await db.query(query, [userId]);
  const row = result.rows[0];

  return {
    totalProjects: row.total_projects,
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    pendingTasks: row.pending_tasks,
    projectsInProgress: row.projects_in_progress,
  };
};

module.exports = {
  getDashboardMetrics,
};
