import ExcelJS from 'exceljs';
import AIService from './aiService.js';

const ai = new AIService();

/**
 * AI-Powered Excel Parser
 * Intelligently parses unstructured Excel files and maps them to CRM lead structure
 */

class AIExcelParser {
  constructor() {
    this.leadFields = {
      required: ['name', 'email', 'phone'],
      optional: ['company', 'address', 'city', 'state', 'zip', 'notes', 'source', 'value', 'stage']
    };
  }

  /**
   * Parse Excel file buffer
   */
  async parseExcelFile(fileBuffer) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return {
          success: false,
          error: 'No worksheet found in Excel file'
        };
      }

      // Get headers from first row
      const headers = [];
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber - 1] = cell.value ? String(cell.value) : `Column${colNumber}`;
      });

      // Convert rows to JSON objects
      const rawData = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const rowData = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1] || `Column${colNumber}`;
          // Handle different cell value types
          let value = cell.value;
          if (value && typeof value === 'object') {
            if (value.text) value = value.text; // Rich text
            else if (value.result !== undefined) value = value.result; // Formula
            else if (value instanceof Date) value = value.toISOString();
            else value = String(value);
          }
          rowData[header] = value !== null && value !== undefined ? value : '';
        });
        rawData.push(rowData);
      });

      return {
        success: true,
        data: rawData,
        headers: headers.filter(Boolean),
        rowCount: rawData.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Use AI to intelligently map Excel columns to CRM fields
   */
  async mapFieldsWithAI(headers, sampleRows) {
    const prompt = `You are a data mapping expert. I have an Excel file with the following columns:

Columns: ${headers.join(', ')}

Sample data (first 3 rows):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

I need to map these columns to a CRM lead system with these fields:
- name (required): Full name or business name
- email (required): Email address
- phone (required): Phone number
- company (optional): Company/business name
- address (optional): Street address
- city (optional): City
- state (optional): State/province
- zip (optional): ZIP/postal code
- notes (optional): Any additional notes or description
- source (optional): Where the lead came from
- value (optional): Estimated deal value (number)
- stage (optional): Lead stage (e.g., "new", "contacted", "qualified", "proposal", "won", "lost")

Please analyze the column names and sample data, then provide a JSON mapping object.
For each Excel column, suggest which CRM field it should map to.
Also suggest any data transformations needed (e.g., combining first/last name, formatting phone numbers).

Return ONLY a valid JSON object with this structure:
{
  "mapping": {
    "Excel Column Name": {
      "crmField": "fieldName",
      "confidence": 0.95,
      "transformation": "description of any needed transformation"
    }
  },
  "suggestions": {
    "missingFields": ["list of required fields not found"],
    "dataQualityIssues": ["list of potential issues found"],
    "recommendations": ["list of recommendations for the user"]
  }
}`;

    try {
      const response = await ai.generateText(prompt);

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const aiMapping = JSON.parse(jsonStr);
      return {
        success: true,
        mapping: aiMapping
      };
    } catch (error) {
      console.error('AI mapping error:', error);
      // Fallback to simple mapping
      return {
        success: true,
        mapping: this.createFallbackMapping(headers)
      };
    }
  }

  /**
   * Fallback mapping when AI fails
   */
  createFallbackMapping(headers) {
    const mapping = {};
    const suggestions = {
      missingFields: [],
      dataQualityIssues: [],
      recommendations: ['AI mapping unavailable. Using simple pattern matching. Please review mappings carefully.']
    };

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      let crmField = null;
      let confidence = 0.5;

      // Simple pattern matching
      if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
        crmField = 'name';
        confidence = 0.8;
      } else if (lowerHeader.includes('email') || lowerHeader.includes('e-mail')) {
        crmField = 'email';
        confidence = 0.9;
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel') || lowerHeader.includes('mobile')) {
        crmField = 'phone';
        confidence = 0.9;
      } else if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
        crmField = 'company';
        confidence = 0.8;
      } else if (lowerHeader.includes('address') && !lowerHeader.includes('email')) {
        crmField = 'address';
        confidence = 0.8;
      } else if (lowerHeader.includes('city')) {
        crmField = 'city';
        confidence = 0.9;
      } else if (lowerHeader.includes('state') || lowerHeader.includes('province')) {
        crmField = 'state';
        confidence = 0.9;
      } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal')) {
        crmField = 'zip';
        confidence = 0.9;
      } else if (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('description')) {
        crmField = 'notes';
        confidence = 0.7;
      } else if (lowerHeader.includes('source') || lowerHeader.includes('origin')) {
        crmField = 'source';
        confidence = 0.8;
      } else if (lowerHeader.includes('value') || lowerHeader.includes('amount') || lowerHeader.includes('price')) {
        crmField = 'value';
        confidence = 0.7;
      } else if (lowerHeader.includes('stage') || lowerHeader.includes('status')) {
        crmField = 'stage';
        confidence = 0.8;
      }

      if (crmField) {
        mapping[header] = {
          crmField,
          confidence,
          transformation: null
        };
      }
    });

    // Check for missing required fields
    ['name', 'email', 'phone'].forEach(required => {
      const found = Object.values(mapping).some(m => m.crmField === required);
      if (!found) {
        suggestions.missingFields.push(required);
      }
    });

    return { mapping, suggestions };
  }

  /**
   * Clean and transform a single row of data
   */
  async cleanRowData(row, columnMapping) {
    const cleanedData = {};

    for (const [excelColumn, mapInfo] of Object.entries(columnMapping)) {
      if (!mapInfo || !mapInfo.crmField) continue;

      const rawValue = row[excelColumn];
      const crmField = mapInfo.crmField;

      // Skip empty values
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        continue;
      }

      let cleanedValue = String(rawValue).trim();

      // Field-specific cleaning
      switch (crmField) {
        case 'email':
          cleanedValue = this.cleanEmail(cleanedValue);
          break;
        case 'phone':
          cleanedValue = this.cleanPhone(cleanedValue);
          break;
        case 'value':
          cleanedValue = this.cleanNumber(cleanedValue);
          break;
        case 'stage':
          cleanedValue = this.normalizeStage(cleanedValue);
          break;
        default:
          // General string cleaning
          cleanedValue = cleanedValue.replace(/\s+/g, ' ').trim();
      }

      if (cleanedValue) {
        cleanedData[crmField] = cleanedValue;
      }
    }

    return cleanedData;
  }

  /**
   * Clean email address
   */
  cleanEmail(email) {
    const cleaned = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Clean phone number
   */
  cleanPhone(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for 10-digit US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    return digits || null;
  }

  /**
   * Clean number value
   */
  cleanNumber(value) {
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Normalize lead stage
   */
  normalizeStage(stage) {
    const normalized = stage.toLowerCase().trim();
    const stageMap = {
      'new': 'new',
      'contact': 'contacted',
      'contacted': 'contacted',
      'qual': 'qualified',
      'qualified': 'qualified',
      'proposal': 'proposal',
      'quote': 'proposal',
      'won': 'won',
      'closed': 'won',
      'lost': 'lost',
      'rejected': 'lost'
    };

    for (const [key, value] of Object.entries(stageMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return 'new'; // Default stage
  }

  /**
   * Process entire Excel file with AI
   */
  async processExcelWithAI(fileBuffer) {
    // Step 1: Parse Excel file
    const parseResult = await this.parseExcelFile(fileBuffer);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    const { data, headers, rowCount } = parseResult;

    if (rowCount === 0) {
      return {
        success: false,
        error: 'Excel file is empty'
      };
    }

    // Step 2: Use AI to map fields
    const mappingResult = await this.mapFieldsWithAI(headers, data);

    // Step 3: Clean and transform all rows
    const cleanedLeads = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const cleanedLead = await this.cleanRowData(data[i], mappingResult.mapping.mapping);

        // Validate required fields
        const hasRequiredFields = ['name', 'email', 'phone'].every(field => cleanedLead[field]);

        if (hasRequiredFields) {
          cleanedLeads.push({
            ...cleanedLead,
            rowNumber: i + 2, // Excel row number (1-indexed + header)
            stage: cleanedLead.stage || 'new'
          });
        } else {
          errors.push({
            row: i + 2,
            data: data[i],
            reason: 'Missing required fields (name, email, or phone)'
          });
        }
      } catch (error) {
        errors.push({
          row: i + 2,
          data: data[i],
          reason: error.message
        });
      }
    }

    return {
      success: true,
      leads: cleanedLeads,
      mapping: mappingResult.mapping,
      stats: {
        totalRows: rowCount,
        successfulRows: cleanedLeads.length,
        failedRows: errors.length,
        errors: errors
      }
    };
  }
}

export default new AIExcelParser();
