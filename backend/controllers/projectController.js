import Project from '../models/Project.js';
import Lead from '../models/Lead.js';
import Deal from '../models/Deal.js';
import { deleteFile, extractPublicId } from '../utils/cloudinary.js';

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const { status, projectType, startDate, endDate } = req.query;

    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const projects = await Project.find(query)
      .populate('leadId', 'name email phone')
      .populate('dealId', 'title value')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single project
export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('leadId')
      .populate('dealId');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create project
export const createProject = async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      userId: req.user._id
    };

    // Validate lead exists
    const lead = await Lead.findOne({
      _id: projectData.leadId,
      userId: req.user._id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // If dealId provided, validate it
    if (projectData.dealId) {
      const deal = await Deal.findOne({
        _id: projectData.dealId,
        userId: req.user._id
      });

      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
    }

    const project = await Project.create(projectData);

    await project.populate('leadId', 'name email phone');
    if (project.dealId) {
      await project.populate('dealId', 'title value');
    }

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update project
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('leadId', 'name email phone')
      .populate('dealId', 'title value');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add material to project
export const addMaterial = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const material = {
      ...req.body,
      totalCost: req.body.quantity * req.body.costPerUnit
    };

    project.materials.push(material);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update material
export const updateMaterial = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const material = project.materials.id(req.params.materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    Object.assign(material, req.body);
    material.totalCost = material.quantity * material.costPerUnit;

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete material
export const deleteMaterial = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.materials.id(req.params.materialId).remove();
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add photo
export const addPhoto = async (req, res) => {
  try {
    // SECURITY: Verify user owns this project
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Add photos from Cloudinary upload
    // Files are automatically organized in: voiceflow-crm/{userId}/projects/photos/
    const photos = req.files.map(file => ({
      type: req.body.type || 'during',
      url: file.path, // Cloudinary URL
      publicId: file.filename, // Cloudinary public_id
      caption: req.body.caption || '',
      uploadedBy: req.user.email,
      takenAt: new Date()
    }));

    project.photos.push(...photos);
    await project.save();

    res.json({
      message: `Successfully uploaded ${photos.length} photo(s)`,
      photos: photos,
      project: project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete photo
export const deletePhoto = async (req, res) => {
  try {
    // SECURITY: Verify user owns this project
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const photo = project.photos.id(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Delete from Cloudinary
    // SECURITY: deleteFile function verifies the publicId belongs to the user
    try {
      const publicId = extractPublicId(photo.url) || photo.publicId;
      if (publicId) {
        await deleteFile(publicId, req.user._id.toString(), 'image');
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Remove from database
    photo.remove();
    await project.save();

    res.json({
      message: 'Photo deleted successfully',
      project: project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add permit
export const addPermit = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.permits.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add inspection
export const addInspection = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.inspections.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add team member
export const addTeamMember = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.teamMembers.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add milestone
export const addMilestone = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.milestones.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update milestone
export const updateMilestone = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    Object.assign(milestone, req.body);

    if (req.body.completed && !milestone.completedDate) {
      milestone.completedDate = new Date();
    }

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add task
export const addTask = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.tasks.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = project.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    Object.assign(task, req.body);

    if (req.body.completed && !task.completedDate) {
      task.completedDate = new Date();
    }

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add note
export const addNote = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.notes.push({
      ...req.body,
      createdBy: req.user.email
    });
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add change order
export const addChangeOrder = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.changeOrders.push(req.body);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve change order
export const approveChangeOrder = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const changeOrder = project.changeOrders.id(req.params.changeOrderId);
    if (!changeOrder) {
      return res.status(404).json({ message: 'Change order not found' });
    }

    changeOrder.status = 'approved';
    changeOrder.approvedDate = new Date();
    changeOrder.approvedBy = req.user.email;

    // Update project estimate if approved
    if (changeOrder.costImpact) {
      project.estimate.other = (project.estimate.other || 0) + changeOrder.costImpact;
    }

    // Adjust timeline if needed
    if (changeOrder.timeImpact && project.estimatedEndDate) {
      project.estimatedEndDate = new Date(
        project.estimatedEndDate.getTime() + changeOrder.timeImpact * 24 * 60 * 60 * 1000
      );
    }

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get project statistics
export const getProjectStats = async (req, res) => {
  try {
    const stats = await Project.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEstimate: { $sum: '$estimate.total' },
          totalActual: { $sum: '$actualCost.total' }
        }
      }
    ]);

    const projectsByType = await Project.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$projectType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byStatus: stats,
      byType: projectsByType
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
