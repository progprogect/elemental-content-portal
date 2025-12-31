import ExcelJS from 'exceljs';
import { prisma } from '../utils/prisma';

export interface ImportRow {
  taskTitle: string;
  taskContentType: string;
  scheduledDate: string;
  taskStatus?: string;
  taskExecutionType?: string;
  platform: string;
  publicationContentType?: string;
  publicationStatus?: string;
  publicationNote?: string;
  publicationContent?: string;
  publicationExecutionType?: string;
  resultUrl?: string;
  resultDownloadUrl?: string;
  dynamicFields: Record<string, any>;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Generate Excel template with current TableColumns
 */
export async function generateTemplate(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  
  // Create instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [{ width: 100 }];
  
  // Get platforms for instructions
  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  });
  const platformCodes = platforms.map(p => p.code).join(', ');
  
  const instructions = [
    'CONTENT PLAN TEMPLATE - IMPORT RULES',
    '',
    'REQUIRED FIELDS:',
    '  • Task Title - Required, max 500 characters',
    '  • Task Content Type - Required (examples: video, image, talking_head, text)',
    '  • Scheduled Date - Required, format: YYYY-MM-DD (e.g., 2025-01-15)',
    '  • Platform - Required, must exist in system',
    '',
    'FIELD VALIDATION RULES:',
    '',
    '1. PLATFORM:',
    `   Valid values: ${platformCodes || 'tiktok, youtube, instagram, facebook, linkedin'}`,
    '   • Must match exactly (case-sensitive)',
    '   • Platform must be active in the system',
    '',
    '2. TASK STATUS:',
    '   Valid values: draft, in_progress, completed, failed',
    '   • Default: draft (if not specified)',
    '',
    '3. TASK EXECUTION TYPE:',
    '   Valid values: manual, generated',
    '   • Default: manual (if not specified)',
    '',
    '4. PUBLICATION STATUS:',
    '   Valid values: draft, in_progress, completed, failed',
    '   • Default: draft (if not specified)',
    '',
    '5. PUBLICATION EXECUTION TYPE:',
    '   Valid values: manual, generated',
    '   • Default: manual (if not specified)',
    '',
    '6. CONTENT TYPE:',
    '   Examples: video, image, talking_head, text, audio',
    '   • Free text field, but should match content type configs',
    '',
    '7. SCHEDULED DATE:',
    '   Format: YYYY-MM-DD (e.g., 2025-01-15)',
    '   • Must be valid date',
    '',
    'IMPORTANT NOTES:',
    '  • One row = one publication',
    '  • Tasks with same Title + Scheduled Date will be grouped',
    '  • Multiple publications can share the same task',
    '  • Empty rows will be skipped',
    '  • Dynamic fields (custom columns) are optional',
    '',
    'ERROR HANDLING:',
    '  • Invalid values will cause row import to fail',
    '  • Error messages will show row number and issue',
    '  • Partial imports are allowed (successful rows will be imported)',
  ];
  
  instructions.forEach((instruction, index) => {
    const row = instructionsSheet.getRow(index + 1);
    row.getCell(1).value = instruction;
    if (index === 0) {
      row.font = { bold: true, size: 14 };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    } else if (instruction.startsWith('  •') || instruction.startsWith('   •')) {
      row.getCell(1).font = { italic: true };
    } else if (instruction.endsWith(':') && !instruction.startsWith(' ')) {
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' },
      };
    }
  });
  
  // Create main data sheet
  const worksheet = workbook.addWorksheet('Content Plan');

  // Get table columns for dynamic fields
  const tableColumns = await prisma.tableColumn.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  // Define fixed columns with comments/notes
  const fixedColumns = [
    { header: 'Task Title', key: 'taskTitle', width: 30 },
    { header: 'Task Content Type', key: 'taskContentType', width: 20 },
    { header: 'Scheduled Date', key: 'scheduledDate', width: 15 },
    { header: 'Task Status', key: 'taskStatus', width: 15 },
    { header: 'Task Execution Type', key: 'taskExecutionType', width: 20 },
    { header: 'Platform', key: 'platform', width: 15 },
    { header: 'Publication Content Type', key: 'publicationContentType', width: 25 },
    { header: 'Publication Status', key: 'publicationStatus', width: 20 },
    { header: 'Publication Note', key: 'publicationNote', width: 30 },
    { header: 'Publication Content', key: 'publicationContent', width: 40 },
    { header: 'Publication Execution Type', key: 'publicationExecutionType', width: 25 },
    { header: 'Result URL', key: 'resultUrl', width: 40 },
    { header: 'Result Download URL', key: 'resultDownloadUrl', width: 40 },
  ];

  // Add dynamic field columns
  const dynamicColumns = tableColumns.map((col) => ({
    header: col.fieldName,
    key: `field_${col.fieldName}`,
    width: 20,
  }));

  worksheet.columns = [...fixedColumns, ...dynamicColumns];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  
  // Add comments to header cells with validation rules
  const headerComments: Record<string, string> = {
    'Task Title': 'Required. Max 500 characters.',
    'Task Content Type': 'Required. Examples: video, image, talking_head, text',
    'Scheduled Date': 'Required. Format: YYYY-MM-DD (e.g., 2025-01-15)',
    'Task Status': 'Optional. Values: draft, in_progress, completed, failed. Default: draft',
    'Task Execution Type': 'Optional. Values: manual, generated. Default: manual',
    'Platform': `Required. Must exist in system. Valid: ${platformCodes || 'tiktok, youtube, instagram, facebook, linkedin'}`,
    'Publication Content Type': 'Optional. Examples: video, image, text. Defaults to Task Content Type',
    'Publication Status': 'Optional. Values: draft, in_progress, completed, failed. Default: draft',
    'Publication Note': 'Optional. Description or notes for this publication',
    'Publication Content': 'Optional. Actual content text/script',
    'Publication Execution Type': 'Optional. Values: manual, generated. Default: manual',
    'Result URL': 'Optional. URL to published result',
    'Result Download URL': 'Optional. URL to download result file',
  };
  
  fixedColumns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    if (headerComments[col.header]) {
      cell.note = headerComments[col.header];
    }
  });

  // Add example rows
  const exampleRows = [
    {
      taskTitle: 'Q1 Marketing Video',
      taskContentType: 'video',
      scheduledDate: '2025-01-15',
      taskStatus: 'draft',
      taskExecutionType: 'manual',
      platform: 'linkedin',
      publicationContentType: 'video',
      publicationStatus: 'draft',
      publicationNote: 'Focus on B2B audience',
      publicationContent: '',
      publicationExecutionType: 'manual',
      resultUrl: '',
      resultDownloadUrl: '',
    },
    {
      taskTitle: 'Q1 Marketing Video',
      taskContentType: 'video',
      scheduledDate: '2025-01-15',
      taskStatus: 'draft',
      taskExecutionType: 'manual',
      platform: 'instagram',
      publicationContentType: 'image',
      publicationStatus: 'draft',
      publicationNote: 'Square format for Instagram',
      publicationContent: '',
      publicationExecutionType: 'manual',
      resultUrl: '',
      resultDownloadUrl: '',
    },
  ];

  exampleRows.forEach((row) => {
    const excelRow: any = { ...row };
    // Add empty dynamic fields
    tableColumns.forEach((col) => {
      excelRow[`field_${col.fieldName}`] = '';
    });
    worksheet.addRow(excelRow);
  });

  return workbook;
}

/**
 * Export tasks to Excel format (one row per publication)
 */
export async function exportTasks(listId?: string | null): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Content Plan');

  // Build where clause
  const where: any = {};
  if (listId) {
    if (listId === 'null' || listId === 'unassigned') {
      where.listId = null;
    } else {
      where.listId = listId;
    }
  }

  // Fetch all tasks with publications and results
  const tasks = await prisma.task.findMany({
    where,
    include: {
      fields: {
        orderBy: { orderIndex: 'asc' },
      },
      publications: {
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        include: {
          results: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      results: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { scheduledDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Get table columns for dynamic fields
  const tableColumns = await prisma.tableColumn.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  // Define columns
  const fixedColumns = [
    { header: 'Task Title', key: 'taskTitle', width: 30 },
    { header: 'Task Content Type', key: 'taskContentType', width: 20 },
    { header: 'Scheduled Date', key: 'scheduledDate', width: 15 },
    { header: 'Task Status', key: 'taskStatus', width: 15 },
    { header: 'Task Execution Type', key: 'taskExecutionType', width: 20 },
    { header: 'Platform', key: 'platform', width: 15 },
    { header: 'Publication Content Type', key: 'publicationContentType', width: 25 },
    { header: 'Publication Status', key: 'publicationStatus', width: 20 },
    { header: 'Publication Note', key: 'publicationNote', width: 30 },
    { header: 'Publication Content', key: 'publicationContent', width: 40 },
    { header: 'Publication Execution Type', key: 'publicationExecutionType', width: 25 },
    { header: 'Result URL', key: 'resultUrl', width: 40 },
    { header: 'Result Download URL', key: 'resultDownloadUrl', width: 40 },
  ];

  const dynamicColumns = tableColumns.map((col) => ({
    header: col.fieldName,
    key: `field_${col.fieldName}`,
    width: 20,
  }));

  worksheet.columns = [...fixedColumns, ...dynamicColumns];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Create rows (one per publication)
  for (const task of tasks) {
    // Get dynamic field values
    const fieldValues: Record<string, any> = {};
    tableColumns.forEach((col) => {
      const field = task.fields.find((f) => f.fieldName === col.fieldName);
      if (field && field.fieldValue) {
        const fieldValue = field.fieldValue as any;
        if (col.fieldType === 'checkbox') {
          fieldValues[`field_${col.fieldName}`] = fieldValue?.checked ? 'true' : 'false';
        } else if (col.fieldType === 'url') {
          fieldValues[`field_${col.fieldName}`] = fieldValue?.value || '';
        } else if (col.fieldType === 'file') {
          fieldValues[`field_${col.fieldName}`] = fieldValue?.url || '';
        } else {
          fieldValues[`field_${col.fieldName}`] = fieldValue?.value || '';
        }
      } else {
        fieldValues[`field_${col.fieldName}`] = '';
      }
    });

    // Format scheduled date
    const scheduledDate = task.scheduledDate.toISOString().split('T')[0];

    if (task.publications && task.publications.length > 0) {
      // One row per publication
      for (const publication of task.publications) {
        // Get the latest result for this publication
        // First try publication-specific results, then fallback to task-level results
        let result = null;
        if (publication.results && publication.results.length > 0) {
          result = publication.results[0];
        } else if (task.results && task.results.length > 0) {
          // Fallback to task-level results if no publication-specific results
          result = task.results[0];
        }
        
        const row: any = {
          taskTitle: task.title,
          taskContentType: task.contentType,
          scheduledDate,
          taskStatus: task.status,
          taskExecutionType: task.executionType,
          platform: publication.platform,
          publicationContentType: publication.contentType,
          publicationStatus: publication.status,
          publicationNote: publication.note || '',
          publicationContent: publication.content || '',
          publicationExecutionType: publication.executionType,
          resultUrl: result?.resultUrl || result?.assetUrl || '',
          resultDownloadUrl: result?.downloadUrl || result?.assetPath || '',
          ...fieldValues,
        };
        worksheet.addRow(row);
      }
    } else {
      // Task without publications - still create a row
      const result = task.results && task.results.length > 0 
        ? task.results[0] 
        : null;
      const row: any = {
        taskTitle: task.title,
        taskContentType: task.contentType,
        scheduledDate,
        taskStatus: task.status,
        taskExecutionType: task.executionType,
        platform: '',
        publicationContentType: '',
        publicationStatus: '',
        publicationNote: '',
        publicationContent: '',
        publicationExecutionType: '',
        resultUrl: result?.resultUrl || '',
        resultDownloadUrl: result?.downloadUrl || '',
        ...fieldValues,
      };
      worksheet.addRow(row);
    }
  }

  return workbook;
}

/**
 * Parse CSV file and return structured data for import
 */
async function parseCSVFile(buffer: Buffer): Promise<ImportRow[]> {
  const content = buffer.toString('utf8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const headerMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });
  
  // Get table columns for dynamic fields
  const tableColumns = await prisma.tableColumn.findMany({
    orderBy: { orderIndex: 'asc' },
  });
  
  const rows: ImportRow[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted values)
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Add last value
    
    // Map values to headers
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index]?.replace(/^["']|["']$/g, '') || '';
    });
    
    // Skip completely empty rows
    const taskTitle = String(rowData['Task Title'] || '').trim();
    const taskContentType = String(rowData['Task Content Type'] || '').trim();
    const scheduledDate = String(rowData['Scheduled Date'] || '').trim();
    
    if (!taskTitle && !taskContentType && !scheduledDate) {
      continue; // Skip empty row
    }
    
    // Extract fixed fields
    const importRow: ImportRow = {
      taskTitle,
      taskContentType,
      scheduledDate,
      taskStatus: rowData['Task Status'] ? String(rowData['Task Status']).trim() : undefined,
      taskExecutionType: rowData['Task Execution Type'] ? String(rowData['Task Execution Type']).trim() : undefined,
      platform: String(rowData['Platform'] || '').trim(),
      publicationContentType: rowData['Publication Content Type'] ? String(rowData['Publication Content Type']).trim() : undefined,
      publicationStatus: rowData['Publication Status'] ? String(rowData['Publication Status']).trim() : undefined,
      publicationNote: rowData['Publication Note'] ? String(rowData['Publication Note']).trim() : undefined,
      publicationContent: rowData['Publication Content'] ? String(rowData['Publication Content']).trim() : undefined,
      publicationExecutionType: rowData['Publication Execution Type'] ? String(rowData['Publication Execution Type']).trim() : undefined,
      resultUrl: rowData['Result URL'] ? String(rowData['Result URL']).trim() : undefined,
      resultDownloadUrl: rowData['Result Download URL'] ? String(rowData['Result Download URL']).trim() : undefined,
      dynamicFields: {},
    };
    
    // Extract dynamic fields
    tableColumns.forEach((col) => {
      const value = rowData[col.fieldName];
      if (value !== undefined && value !== null && value !== '') {
        if (col.fieldType === 'checkbox') {
          const strValue = String(value).toLowerCase().trim();
          importRow.dynamicFields[col.fieldName] = {
            checked: strValue === 'true' || strValue === 'yes' || strValue === '1',
          };
        } else if (col.fieldType === 'url') {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        } else if (col.fieldType === 'file') {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        } else {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        }
      }
    });
    
    rows.push(importRow);
  }
  
  return rows;
}

/**
 * Parse Excel or CSV file and return structured data for import
 */
export async function parseImportFile(buffer: Buffer | ArrayBuffer, filename?: string): Promise<ImportRow[]> {
  // Convert to Buffer if needed
  const bufferData: Buffer = Buffer.isBuffer(buffer) 
    ? buffer 
    : Buffer.from(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);
  
  // Check if file is empty
  if (!bufferData || bufferData.length === 0) {
    throw new Error('File is empty or corrupted');
  }
  
  // Detect file type by extension or content
  const isCSV = filename?.toLowerCase().endsWith('.csv') || 
                bufferData.toString('utf8', 0, Math.min(100, bufferData.length)).includes(',');
  
  if (isCSV) {
    return parseCSVFile(bufferData);
  }
  
  // Try to parse as Excel file
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bufferData as any);
  } catch (error) {
    // If Excel parsing fails, check if it might be CSV
    const contentStart = bufferData.toString('utf8', 0, Math.min(500, bufferData.length));
    if (contentStart.includes(',') && !contentStart.includes('PK')) {
      // Likely CSV file misidentified
      return parseCSVFile(bufferData);
    }
    throw new Error(`Failed to parse file as Excel. ${error instanceof Error ? error.message : 'Invalid file format. Please ensure the file is a valid .xlsx or .xls file.'}`);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel file must contain at least one worksheet');
  }

  const rows: ImportRow[] = [];
  const headerRow = worksheet.getRow(1);
  const headers: Record<number, string> = {};

  // Map header columns
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[colNumber] = String(cell.value).trim();
    }
  });

  // Get table columns for dynamic fields
  const tableColumns = await prisma.tableColumn.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  // Process data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const headerName = headers[colNumber];
      if (headerName) {
        // Handle Excel date objects - convert to ISO string if Date
        if (cell.value instanceof Date) {
          rowData[headerName] = cell.value.toISOString().split('T')[0];
        } else {
          rowData[headerName] = cell.value;
        }
      }
    });

    // Skip completely empty rows
    const taskTitle = String(rowData['Task Title'] || '').trim();
    const taskContentType = String(rowData['Task Content Type'] || '').trim();
    const scheduledDate = String(rowData['Scheduled Date'] || '').trim();
    
    if (!taskTitle && !taskContentType && !scheduledDate) {
      return; // Skip empty row
    }

    // Extract fixed fields
    const importRow: ImportRow = {
      taskTitle,
      taskContentType,
      scheduledDate,
      taskStatus: rowData['Task Status'] ? String(rowData['Task Status']).trim() : undefined,
      taskExecutionType: rowData['Task Execution Type'] ? String(rowData['Task Execution Type']).trim() : undefined,
      platform: String(rowData['Platform'] || '').trim(),
      publicationContentType: rowData['Publication Content Type'] ? String(rowData['Publication Content Type']).trim() : undefined,
      publicationStatus: rowData['Publication Status'] ? String(rowData['Publication Status']).trim() : undefined,
      publicationNote: rowData['Publication Note'] ? String(rowData['Publication Note']).trim() : undefined,
      publicationContent: rowData['Publication Content'] ? String(rowData['Publication Content']).trim() : undefined,
      publicationExecutionType: rowData['Publication Execution Type'] ? String(rowData['Publication Execution Type']).trim() : undefined,
      resultUrl: rowData['Result URL'] ? String(rowData['Result URL']).trim() : undefined,
      resultDownloadUrl: rowData['Result Download URL'] ? String(rowData['Result Download URL']).trim() : undefined,
      dynamicFields: {},
    };

    // Extract dynamic fields
    tableColumns.forEach((col) => {
      const value = rowData[col.fieldName];
      if (value !== undefined && value !== null && value !== '') {
        if (col.fieldType === 'checkbox') {
          const strValue = String(value).toLowerCase().trim();
          importRow.dynamicFields[col.fieldName] = {
            checked: strValue === 'true' || strValue === 'yes' || strValue === '1',
          };
        } else if (col.fieldType === 'url') {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        } else if (col.fieldType === 'file') {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        } else {
          importRow.dynamicFields[col.fieldName] = { value: String(value).trim() };
        }
      }
    });

    rows.push(importRow);
  });

  return rows;
}

