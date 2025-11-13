import { v2 as cloudinary } from 'cloudinary';
import KnowledgeBase from '../models/KnowledgeBase.js';
import pdfTextExtract from 'pdf-text-extract';
import { promisify } from 'util';

const extractPdf = promisify(pdfTextExtract);

/**
 * Cloudinary Media Storage Service
 * Upload and manage documents, images, videos for AI agent training
 */
class CloudinaryService {
  constructor() {
    // Configure Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      console.log('✅ Cloudinary configured');
    } else {
      console.warn('⚠️  Cloudinary not configured - media uploads will be disabled');
    }
  }

  /**
   * Upload file to Cloudinary
   * Supports: images, videos, PDFs, documents
   */
  async uploadFile(filePath, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'voiceflow-crm',
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        tags: options.tags || [],
        context: options.context || {},
        overwrite: options.overwrite !== undefined ? options.overwrite : false
      };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload from base64 string
   */
  async uploadFromBase64(base64String, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'voiceflow-crm',
        resource_type: options.resourceType || 'auto',
        tags: options.tags || [],
        context: options.context || {}
      };

      const result = await cloudinary.uploader.upload(
        `data:${options.mimeType || 'application/octet-stream'};base64,${base64String}`,
        uploadOptions
      );

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary base64 upload error:', error);
      throw new Error(`Failed to upload from base64: ${error.message}`);
    }
  }

  /**
   * Upload document and create knowledge base entry
   */
  async uploadDocument(userId, filePath, metadata = {}) {
    try {
      // Upload to Cloudinary
      const upload = await this.uploadFile(filePath, {
        folder: `voiceflow-crm/${userId}/documents`,
        resourceType: 'raw',
        tags: ['document', metadata.category || 'general'],
        context: {
          userId: userId.toString(),
          name: metadata.name || 'Untitled',
          uploadedAt: new Date().toISOString()
        }
      });

      // Extract text content based on file type
      let textContent = '';
      const format = upload.format.toLowerCase();

      if (format === 'pdf') {
        textContent = await this.extractPdfText(filePath);
      } else if (['txt', 'md', 'csv'].includes(format)) {
        const fs = await import('fs');
        textContent = fs.readFileSync(filePath, 'utf-8');
      } else if (['doc', 'docx'].includes(format)) {
        // For DOCX, we'll need a library like mammoth
        textContent = await this.extractDocxText(filePath);
      }

      // Create knowledge base entry
      const kb = await KnowledgeBase.create({
        userId,
        name: metadata.name || `Document - ${upload.publicId}`,
        description: metadata.description || 'Uploaded document',
        type: 'document',
        source: {
          fileUrl: upload.url,
          fileName: metadata.fileName || 'document',
          fileSize: upload.bytes,
          mimeType: `application/${format}`
        },
        content: {
          rawText: textContent,
          summary: metadata.summary || ''
        },
        category: metadata.category || 'other',
        tags: metadata.tags || ['uploaded', format],
        status: textContent ? 'ready' : 'pending'
      });

      return {
        knowledgeBase: kb,
        upload
      };
    } catch (error) {
      console.error('Upload document error:', error);
      throw error;
    }
  }

  /**
   * Upload image for agent avatar or media library
   */
  async uploadImage(userId, filePath, options = {}) {
    try {
      const upload = await this.uploadFile(filePath, {
        folder: `voiceflow-crm/${userId}/images`,
        resourceType: 'image',
        tags: options.tags || ['image'],
        transformation: options.transformation || [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });

      return upload;
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  }

  /**
   * Upload video for training or demos
   */
  async uploadVideo(userId, filePath, options = {}) {
    try {
      const upload = await this.uploadFile(filePath, {
        folder: `voiceflow-crm/${userId}/videos`,
        resourceType: 'video',
        tags: options.tags || ['video'],
        eager: [
          { width: 640, height: 480, crop: 'pad', audio_codec: 'aac' },
          { width: 1280, height: 720, crop: 'pad', audio_codec: 'aac' }
        ]
      });

      return upload;
    } catch (error) {
      console.error('Upload video error:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  async extractPdfText(filePath) {
    try {
      const pages = await extractPdf(filePath);
      return pages.join('\n\n');
    } catch (error) {
      console.error('PDF text extraction error:', error);
      return '';
    }
  }

  /**
   * Extract text from DOCX
   */
  async extractDocxText(filePath) {
    try {
      // Using mammoth library for DOCX extraction
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('DOCX text extraction error:', error);
      // Fallback: return empty string
      return '';
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId, resourceType = 'auto') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file URL with transformations
   */
  getFileUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      resource_type: options.resourceType || 'auto',
      transformation: options.transformation || [],
      secure: true
    });
  }

  /**
   * List files in a folder
   */
  async listFiles(folder, options = {}) {
    try {
      const result = await cloudinary.search
        .expression(`folder:${folder}`)
        .sort_by('created_at', 'desc')
        .max_results(options.maxResults || 100)
        .execute();

      return result.resources.map(resource => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        format: resource.format,
        resourceType: resource.resource_type,
        bytes: resource.bytes,
        width: resource.width,
        height: resource.height,
        createdAt: resource.created_at
      }));
    } catch (error) {
      console.error('Cloudinary list files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(userId) {
    try {
      const folder = `voiceflow-crm/${userId}`;
      const files = await this.listFiles(folder, { maxResults: 500 });

      const totalBytes = files.reduce((sum, file) => sum + (file.bytes || 0), 0);
      const totalFiles = files.length;

      const byType = files.reduce((acc, file) => {
        const type = file.resourceType || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalBytes,
        totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
        totalFiles,
        byType,
        folder
      };
    } catch (error) {
      console.error('Storage stats error:', error);
      return {
        totalBytes: 0,
        totalMB: 0,
        totalFiles: 0,
        byType: {}
      };
    }
  }
}

export default new CloudinaryService();
