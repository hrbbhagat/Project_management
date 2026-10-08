const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All task routes require authentication
router.use(authenticate);

router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
