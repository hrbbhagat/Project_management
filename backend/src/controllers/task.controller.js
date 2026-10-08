const taskService = require('../services/task.service');

/**
 * GET /api/tasks
 */
const getAllTasks = async (req, res, next) => {
  try {
    const result = await taskService.getTasks(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const updated = await taskService.updateTask(req.params.id, req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
