/**
 * ToDo Routes
 * 
 * API endpoints for task management, routine learning, and calendar sync.
 */

import { Router } from 'express';
import * as todoController from '../controllers/todoController';

const router = Router();

// Task CRUD operations
router.post('/tasks', todoController.createTask);
router.get('/tasks', todoController.getTasks);
router.put('/tasks/:id', todoController.updateTask);
router.delete('/tasks/:id', todoController.deleteTask);
router.post('/tasks/:id/complete', todoController.completeTask);
router.post('/tasks/:id/uncomplete', todoController.uncompleteTask);

// Daily agenda
router.get('/agenda', todoController.getDailyAgenda);

// Calendar sync
router.post('/calendar/sync', todoController.syncCalendar);

// Routine patterns
router.get('/routines', todoController.getSuggestedRoutines);
router.post('/routines/:id/approve', todoController.approveRoutine);
router.post('/routines/:id/dismiss', todoController.dismissRoutine);
router.post('/patterns/learn', todoController.learnPatterns);

export default router;

