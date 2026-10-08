const projectService = require('../services/project.service');

/**
 * GET /api/projects
 */
const getAllProjects = async (req, res, next) => {
  try {
    const result = await projectService.getProjects(req.user.id, req.query);
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
 * GET /api/projects/:id
 */
const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects
 */
const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id
 */
const updateProject = async (req, res, next) => {
  try {
    const updated = await projectService.updateProject(req.params.id, req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
