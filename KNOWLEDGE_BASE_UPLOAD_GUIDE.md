# Knowledge Base File Upload Guide

## Overview

The Agent Studio now includes the ability to upload documents directly to ElevenLabs' Knowledge Base API. This allows your AI agents to access custom knowledge from uploaded files during conversations.

## Features

✅ **File Upload Support**: Upload PDF, TXT, DOC, and DOCX files
✅ **Direct ElevenLabs Integration**: Files are automatically uploaded to ElevenLabs' Knowledge Base
✅ **Dual Storage**: Files are stored both in Cloudinary and ElevenLabs for redundancy
✅ **Document Management**: View and remove uploaded documents
✅ **Size Validation**: Automatic validation for file size (max 10MB)
✅ **Type Validation**: Only supported file types are allowed

## How to Use

### 1. Access Agent Studio

Navigate to the Agent Studio from your CRM dashboard:
- Click on **Agents** in the sidebar
- Select an agent or create a new one
- Click **Open Agent Studio**

### 2. Add Knowledge Base Node

In the Agent Studio:
1. Drag the **Knowledge Base** node from the left palette
2. Drop it onto the canvas
3. Click the node to open the configuration panel

### 3. Upload Documents

In the Knowledge Base configuration panel:
1. Enter your knowledge content in the text area (optional)
2. Click **Upload Document** button
3. Select a file (PDF, TXT, DOC, or DOCX)
4. Wait for the upload to complete

### 4. Manage Uploaded Documents

- View all uploaded documents in the "Uploaded Documents" section
- Click the ❌ icon to remove a document
- Documents are automatically associated with the knowledge base node

### 5. Enable RAG (Retrieval)

Check the **Enable RAG (Retrieval)** option to allow your agent to retrieve information from uploaded documents during conversations.

## API Reference

### Upload Endpoint

```http
POST /api/knowledge-base/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body:**
- `file`: The file to upload
- `name`: Document name (optional)
- `description`: Document description (optional)
- `category`: Document category (optional)
- `tags`: Document tags as JSON array (optional)

**Response:**
```json
{
  "id": "kb_document_id",
  "name": "document.pdf",
  "knowledgeBase": { ... },
  "uploadedFile": {
    "url": "https://...",
    "size": 1234567,
    "format": "pdf"
  },
  "elevenLabsDocumentId": "elevenlabs_kb_id"
}
```

## ElevenLabs Knowledge Base API

The system uses the ElevenLabs Knowledge Base API to store documents:

**Endpoint:** `POST https://api.elevenlabs.io/v1/convai/knowledge-base/file`

**Features:**
- Automatic text extraction from documents
- Semantic search capabilities
- Integration with conversational AI agents
- Support for multiple file formats

## File Requirements

| Requirement | Value |
|-------------|-------|
| **Max File Size** | 10 MB |
| **Supported Formats** | PDF, TXT, DOC, DOCX |
| **Naming** | Any valid filename |
| **Authentication** | Required (JWT token) |

## Backend Implementation

### ElevenLabs Service Method

```javascript
await elevenLabsService.createKnowledgeBaseFromFile(
  filePath,
  fileName,
  documentName
);
```

**Parameters:**
- `filePath`: Path to the uploaded file
- `fileName`: Original filename
- `documentName`: Display name for the document

**Returns:**
```javascript
{
  id: "knowledge_base_document_id",
  name: "Document Name"
}
```

## Error Handling

The system includes comprehensive error handling:

- **File Type Validation**: Alerts if unsupported file type is selected
- **File Size Validation**: Alerts if file exceeds 10MB limit
- **Upload Errors**: User-friendly error messages
- **Graceful Degradation**: Continues if ElevenLabs upload fails, stores in Cloudinary only

## Best Practices

1. **Organize Documents**: Use clear, descriptive names for uploaded documents
2. **File Size**: Keep files under 10MB for optimal performance
3. **File Format**: Use PDF for formatted documents, TXT for plain text
4. **Content Structure**: Structure your knowledge base content with clear headings and sections
5. **RAG Usage**: Enable RAG only when you need dynamic retrieval from documents

## Troubleshooting

### Upload Fails

**Problem**: File upload returns an error

**Solutions:**
- Check file size (must be under 10MB)
- Verify file type (PDF, TXT, DOC, DOCX only)
- Ensure you're logged in (valid JWT token)
- Check network connection

### Document Not Appearing

**Problem**: Uploaded document doesn't appear in the list

**Solutions:**
- Refresh the page
- Check browser console for errors
- Verify the upload completed successfully

### ElevenLabs Integration Issues

**Problem**: Document uploads to Cloudinary but not ElevenLabs

**Solutions:**
- Check `ELEVENLABS_API_KEY` environment variable
- Verify ElevenLabs API key is valid
- Check backend logs for detailed error messages
- System will continue working with Cloudinary storage only

## Future Enhancements

Planned features for future releases:

- [ ] Bulk document upload
- [ ] Document versioning
- [ ] Advanced search within documents
- [ ] Document preview before upload
- [ ] Support for additional file formats (Images, Audio)
- [ ] Document sharing between agents
- [ ] Knowledge base templates
- [ ] Automatic document categorization

## Related Documentation

- [Agent Studio Guide](./AGENT_STUDIO_GUIDE.md)
- [ElevenLabs Integration](./ELEVENLABS_VOICE_LIBRARY_GUIDE.md)
- [Agent Configuration](./AGENT_CONFIGURATION_GUIDE.md)

## Support

For issues or questions:
- Check the backend logs for detailed error messages
- Review the browser console for frontend errors
- Consult the ElevenLabs API documentation
- Contact support with error details

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
