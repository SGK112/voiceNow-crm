import express from 'express';
import { protect } from '../middleware/auth.js';
import { createUploadMiddleware } from '../utils/cloudinary.js';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addPhoto,
  deletePhoto,
  addPermit,
  addInspection,
  addTeamMember,
  addMilestone,
  updateMilestone,
  addTask,
  updateTask,
  addNote,
  addChangeOrder,
  approveChangeOrder,
  getProjectStats
} from '../controllers/projectController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Project CRUD
router.get('/', getProjects);
router.get('/stats', getProjectStats);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Materials
router.post('/:id/materials', addMaterial);
router.put('/:id/materials/:materialId', updateMaterial);
router.delete('/:id/materials/:materialId', deleteMaterial);

// Photos - with Cloudinary upload middleware
const uploadPhotos = createUploadMiddleware('projects/photos', {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
});
router.post('/:id/photos', uploadPhotos.array('photos', 10), addPhoto);
router.delete('/:id/photos/:photoId', deletePhoto);

// Permits
router.post('/:id/permits', addPermit);

// Inspections
router.post('/:id/inspections', addInspection);

// Team Members
router.post('/:id/team', addTeamMember);

// Milestones
router.post('/:id/milestones', addMilestone);
router.put('/:id/milestones/:milestoneId', updateMilestone);

// Tasks
router.post('/:id/tasks', addTask);
router.put('/:id/tasks/:taskId', updateTask);

// Notes
router.post('/:id/notes', addNote);

// Change Orders
router.post('/:id/change-orders', addChangeOrder);
router.put('/:id/change-orders/:changeOrderId/approve', approveChangeOrder);

export default router;
