const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROJECT_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'ARCHIVED',
];

const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'TODO',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
];

const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Validates whether a string is a standard UUID.
 */
const isUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
};

/**
 * Validates whether a string can be parsed as a valid ISO date.
 */
const isValidDate = (str) => {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};

module.exports = {
  isUUID,
  isValidDate,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
};
