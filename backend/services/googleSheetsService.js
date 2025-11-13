import { google } from 'googleapis';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Lead from '../models/Lead.js';

/**
 * Google Sheets Integration Service
 * Import leads, data, and training content from Google Sheets
 */
class GoogleSheetsService {
  constructor() {
    this.oauth2Client = null;
  }

  /**
   * Initialize OAuth2 client with user credentials
   */
  initializeClient(accessToken, refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.CLIENT_URL + '/integrations/google/callback'
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    this.oauth2Client = oauth2Client;
    return oauth2Client;
  }

  /**
   * Extract spreadsheet ID from various URL formats
   */
  extractSpreadsheetId(urlOrId) {
    // Direct ID
    if (!urlOrId.includes('/')) {
      return urlOrId;
    }

    // URL format: https://docs.google.com/spreadsheets/d/{ID}/edit
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Read data from Google Sheets
   */
  async readSheet(spreadsheetId, range = 'Sheet1!A:Z', oauth2Client = null) {
    try {
      const client = oauth2Client || this.oauth2Client;
      if (!client) {
        throw new Error('OAuth2 client not initialized');
      }

      const sheets = google.sheets({ version: 'v4', auth: client });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        return { headers: [], rows: [], metadata: response.data };
      }

      // First row is headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      return {
        headers,
        rows: dataRows,
        rowCount: dataRows.length,
        columnCount: headers.length,
        metadata: response.data
      };
    } catch (error) {
      console.error('Google Sheets read error:', error);
      throw new Error(`Failed to read Google Sheet: ${error.message}`);
    }
  }

  /**
   * Get spreadsheet metadata (title, sheets, etc.)
   */
  async getSpreadsheetMetadata(spreadsheetId, oauth2Client = null) {
    try {
      const client = oauth2Client || this.oauth2Client;
      const sheets = google.sheets({ version: 'v4', auth: client });

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties,sheets(properties)'
      });

      return {
        title: response.data.properties.title,
        locale: response.data.properties.locale,
        sheets: response.data.sheets.map(sheet => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          index: sheet.properties.index,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      console.error('Google Sheets metadata error:', error);
      throw new Error(`Failed to get spreadsheet metadata: ${error.message}`);
    }
  }

  /**
   * Import leads from Google Sheets
   * Expected columns: name, email, phone, company, status, source, notes
   */
  async importLeadsFromSheet(userId, spreadsheetId, sheetName = 'Sheet1', oauth2Client = null) {
    try {
      const data = await this.readSheet(spreadsheetId, `${sheetName}!A:Z`, oauth2Client);

      if (data.rows.length === 0) {
        return { imported: 0, skipped: 0, errors: [] };
      }

      const headers = data.headers.map(h => h.toLowerCase().trim());

      // Map column names to Lead model fields
      const columnMap = {
        name: ['name', 'full name', 'lead name', 'customer name', 'contact name'],
        email: ['email', 'email address', 'e-mail'],
        phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone'],
        company: ['company', 'company name', 'organization', 'business'],
        status: ['status', 'lead status', 'stage'],
        source: ['source', 'lead source', 'origin', 'channel'],
        notes: ['notes', 'comments', 'description', 'details'],
        value: ['value', 'deal value', 'amount', 'revenue', 'budget'],
        tags: ['tags', 'labels', 'categories']
      };

      // Find column indexes
      const getColumnIndex = (field) => {
        const possibleNames = columnMap[field] || [field];
        for (const name of possibleNames) {
          const index = headers.indexOf(name);
          if (index !== -1) return index;
        }
        return -1;
      };

      const nameIndex = getColumnIndex('name');
      const emailIndex = getColumnIndex('email');
      const phoneIndex = getColumnIndex('phone');
      const companyIndex = getColumnIndex('company');
      const statusIndex = getColumnIndex('status');
      const sourceIndex = getColumnIndex('source');
      const notesIndex = getColumnIndex('notes');
      const valueIndex = getColumnIndex('value');
      const tagsIndex = getColumnIndex('tags');

      if (nameIndex === -1 && emailIndex === -1 && phoneIndex === -1) {
        throw new Error('Sheet must have at least one of: name, email, or phone columns');
      }

      const results = {
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: []
      };

      // Import each row
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];

        try {
          const leadData = {
            userId,
            name: nameIndex !== -1 ? row[nameIndex] : '',
            email: emailIndex !== -1 ? row[emailIndex] : '',
            phone: phoneIndex !== -1 ? row[phoneIndex] : '',
            company: companyIndex !== -1 ? row[companyIndex] : '',
            status: statusIndex !== -1 ? row[statusIndex] : 'new',
            source: sourceIndex !== -1 ? row[sourceIndex] : 'google_sheets',
            notes: notesIndex !== -1 ? row[notesIndex] : '',
            value: valueIndex !== -1 ? parseFloat(row[valueIndex]) || 0 : 0,
            tags: tagsIndex !== -1 ? row[tagsIndex]?.split(',').map(t => t.trim()) : []
          };

          // Skip empty rows
          if (!leadData.name && !leadData.email && !leadData.phone) {
            results.skipped++;
            continue;
          }

          // Check if lead already exists (by email or phone)
          const existingLead = await Lead.findOne({
            userId,
            $or: [
              { email: leadData.email },
              { phone: leadData.phone }
            ]
          });

          if (existingLead) {
            // Update existing lead
            Object.assign(existingLead, leadData);
            await existingLead.save();
            results.updated++;
          } else {
            // Create new lead
            await Lead.create(leadData);
            results.imported++;
          }
        } catch (error) {
          results.errors.push({
            row: i + 2, // +2 because row 1 is headers and array is 0-indexed
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Import leads error:', error);
      throw error;
    }
  }

  /**
   * Import sheet as knowledge base for AI training
   */
  async importAsKnowledgeBase(userId, spreadsheetId, sheetName, options = {}, oauth2Client = null) {
    try {
      const metadata = await this.getSpreadsheetMetadata(spreadsheetId, oauth2Client);
      const data = await this.readSheet(spreadsheetId, `${sheetName}!A:Z`, oauth2Client);

      // Convert sheet data to text for embedding
      const textContent = this.convertSheetToText(data.headers, data.rows);

      // Create knowledge base entry
      const kb = await KnowledgeBase.create({
        userId,
        name: options.name || `${metadata.title} - ${sheetName}`,
        description: options.description || `Imported from Google Sheets`,
        type: 'spreadsheet',
        source: {
          googleSheetsId: spreadsheetId,
          googleSheetsUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
          sheetName
        },
        content: {
          rawText: textContent,
          summary: options.summary || `Data from ${metadata.title}`
        },
        structuredData: {
          headers: data.headers,
          rows: data.rows,
          rowCount: data.rowCount,
          columnCount: data.columnCount
        },
        integration: {
          autoSync: options.autoSync || false,
          syncFrequency: options.syncFrequency || 'manual'
        },
        category: options.category || 'customer_data',
        tags: options.tags || ['google-sheets', 'imported'],
        status: 'ready'
      });

      return kb;
    } catch (error) {
      console.error('Import knowledge base error:', error);
      throw error;
    }
  }

  /**
   * Convert sheet data to readable text for embeddings
   */
  convertSheetToText(headers, rows) {
    let text = `Headers: ${headers.join(', ')}\n\n`;

    rows.forEach((row, index) => {
      text += `Row ${index + 1}:\n`;
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        if (value) {
          text += `  ${header}: ${value}\n`;
        }
      });
      text += '\n';
    });

    return text;
  }

  /**
   * Sync sheet data (for auto-sync feature)
   */
  async syncKnowledgeBase(knowledgeBase, oauth2Client) {
    try {
      const { googleSheetsId, sheetName } = knowledgeBase.source;
      const data = await this.readSheet(googleSheetsId, `${sheetName}!A:Z`, oauth2Client);

      // Update content
      const textContent = this.convertSheetToText(data.headers, data.rows);
      knowledgeBase.content.rawText = textContent;
      knowledgeBase.structuredData = {
        headers: data.headers,
        rows: data.rows,
        rowCount: data.rowCount,
        columnCount: data.columnCount
      };
      knowledgeBase.integration.lastSyncedAt = new Date();
      knowledgeBase.status = 'ready';

      await knowledgeBase.save();

      return knowledgeBase;
    } catch (error) {
      knowledgeBase.status = 'error';
      knowledgeBase.processingError = error.message;
      await knowledgeBase.save();
      throw error;
    }
  }
}

export default new GoogleSheetsService();
