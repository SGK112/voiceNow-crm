import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Create Cloudinary storage with user-specific folder structure
 * This ensures complete data isolation between users
 *
 * @param {string} folderType - The type of upload (e.g., 'projects', 'profiles', 'documents')
 * @returns {CloudinaryStorage} - Configured storage instance
 */
export const createCloudinaryStorage = (folderType = 'uploads') => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // SECURITY: Each user gets their own folder to prevent data leakage
      // Format: voiceflow-crm/{userId}/{folderType}/
      const userId = req.user._id.toString();
      const folder = `voiceflow-crm/${userId}/${folderType}`;

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0].replace(/\s+/g, '-');

      return {
        folder: folder,
        public_id: `${originalName}-${timestamp}`,
        // SECURITY: Tag with userId for additional tracking and cleanup
        tags: [userId, folderType],
        // Set resource type based on file mimetype
        resource_type: file.mimetype.startsWith('video/') ? 'video' : 'auto',
        // Allowed formats
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mov', 'avi'],
        // Add transformation for images (optional - optimize storage)
        transformation: file.mimetype.startsWith('image/') ? [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ] : undefined
      };
    }
  });
};

/**
 * Create multer upload middleware with Cloudinary storage
 *
 * @param {string} folderType - The type of upload
 * @param {object} options - Additional multer options
 * @returns {multer} - Configured multer instance
 */
export const createUploadMiddleware = (folderType = 'uploads', options = {}) => {
  const storage = createCloudinaryStorage(folderType);

  return multer({
    storage: storage,
    limits: {
      fileSize: options.maxSize || 10 * 1024 * 1024, // Default 10MB
      files: options.maxFiles || 10
    },
    fileFilter: (req, file, cb) => {
      // SECURITY: Validate file types
      const allowedMimes = options.allowedMimes || [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedMimes.join(', ')}`), false);
      }
    }
  });
};

/**
 * Delete file from Cloudinary
 * SECURITY: Verifies the file belongs to the user before deletion
 *
 * @param {string} publicId - Cloudinary public_id of the file
 * @param {string} userId - User ID to verify ownership
 * @param {string} resourceType - Type of resource ('image', 'video', 'raw')
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFile = async (publicId, userId, resourceType = 'image') => {
  try {
    // SECURITY: Verify the publicId contains the userId to prevent unauthorized deletion
    if (!publicId.includes(userId)) {
      throw new Error('Unauthorized: Cannot delete file belonging to another user');
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 * SECURITY: Verifies all files belong to the user
 *
 * @param {Array<string>} publicIds - Array of Cloudinary public_ids
 * @param {string} userId - User ID to verify ownership
 * @param {string} resourceType - Type of resource
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFiles = async (publicIds, userId, resourceType = 'image') => {
  try {
    // SECURITY: Verify all publicIds belong to the user
    const unauthorizedFiles = publicIds.filter(id => !id.includes(userId));
    if (unauthorizedFiles.length > 0) {
      throw new Error('Unauthorized: Cannot delete files belonging to another user');
    }

    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });

    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw error;
  }
};

/**
 * Delete all files in a user's folder
 * SECURITY: Only deletes files within the user's folder
 *
 * @param {string} userId - User ID
 * @param {string} folderType - The folder type to delete
 * @returns {Promise<object>} - Deletion result
 */
export const deleteUserFolder = async (userId, folderType = null) => {
  try {
    const folder = folderType
      ? `voiceflow-crm/${userId}/${folderType}`
      : `voiceflow-crm/${userId}`;

    const result = await cloudinary.api.delete_resources_by_prefix(folder);

    // Also delete the empty folder
    await cloudinary.api.delete_folder(folder);

    return result;
  } catch (error) {
    console.error('Cloudinary folder delete error:', error);
    throw error;
  }
};

/**
 * Get user's uploaded files
 * SECURITY: Only returns files within the user's folder
 *
 * @param {string} userId - User ID
 * @param {string} folderType - Optional folder type filter
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<object>} - List of resources
 */
export const getUserFiles = async (userId, folderType = null, maxResults = 100) => {
  try {
    const prefix = folderType
      ? `voiceflow-crm/${userId}/${folderType}`
      : `voiceflow-crm/${userId}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: prefix,
      max_results: maxResults
    });

    return result;
  } catch (error) {
    console.error('Cloudinary list files error:', error);
    throw error;
  }
};

/**
 * Extract public_id from Cloudinary URL
 *
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export const extractPublicId = (url) => {
  if (!url) return null;

  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
};

export default cloudinary;
