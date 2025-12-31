import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { exportTasks, generateTemplate, parseImportFile, ImportRow, ImportResult } from '../services/excel-service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for Excel files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) or CSV files are allowed.'));
    }
  },
});

/**
 * Export tasks to Excel
 */
export const exportTasksHandler = async (req: Request, res: Response) => {
  try {
    const listId = req.query.listId as string | undefined;

    const workbook = await exportTasks(listId || null);

    // Set response headers
    const filename = `content-plan-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Stream workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export tasks', message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Download Excel template
 */
export const downloadTemplateHandler = async (req: Request, res: Response) => {
  try {
    const workbook = await generateTemplate();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=content-plan-template.xlsx');

    // Stream workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: 'Failed to generate template', message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Import tasks from Excel
 */
export const importTasksHandler = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const listId = req.query.listId as string | undefined;
  // listId can be undefined for "All Tasks", but we need to handle it
  // For "All Tasks", we'll use null
  const finalListId = listId === 'null' || listId === 'unassigned' ? null : listId || null;

  try {
    // Parse Excel or CSV file
    const rows = await parseImportFile(req.file.buffer, req.file.originalname);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or contains no data rows' });
    }

    // Validate platforms exist
    const platforms = await prisma.platform.findMany({
      where: { isActive: true },
    });
    const platformCodes = new Set(platforms.map((p) => p.code));

    // Get table columns
    const tableColumns = await prisma.tableColumn.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Valid enum values
    const validTaskStatuses = ['draft', 'in_progress', 'completed', 'failed'];
    const validExecutionTypes = ['manual', 'generated'];
    const validPublicationStatuses = ['draft', 'in_progress', 'completed', 'failed'];

    // Group rows by Task Title + Scheduled Date
    const taskGroups = new Map<string, ImportRow[]>();
    rows.forEach((row, index) => {
      // Validate required fields
      if (!row.taskTitle || !row.taskContentType || !row.scheduledDate) {
        result.failed++;
        result.errors.push({
          row: index + 2, // +2 because Excel rows are 1-indexed and we skip header
          message: 'Missing required fields: Task Title, Task Content Type, or Scheduled Date',
        });
        return;
      }

      if (!row.platform) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: 'Platform is required for publication',
        });
        return;
      }

      // Validate platform exists
      if (!platformCodes.has(row.platform)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Platform "${row.platform}" does not exist`,
        });
        return;
      }

      // Validate date format and parse
      const dateRegex = /^\d{4}-\d{2}-\d{2}/;
      if (!dateRegex.test(row.scheduledDate)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid date format: "${row.scheduledDate}". Expected format: YYYY-MM-DD`,
        });
        return;
      }

      // Validate date is actually valid
      const testDate = new Date(row.scheduledDate);
      if (isNaN(testDate.getTime())) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid date: "${row.scheduledDate}"`,
        });
        return;
      }

      // Validate enum values if provided
      if (row.taskStatus && !validTaskStatuses.includes(row.taskStatus)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid task status: "${row.taskStatus}". Valid values: ${validTaskStatuses.join(', ')}`,
        });
        return;
      }

      if (row.taskExecutionType && !validExecutionTypes.includes(row.taskExecutionType)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid task execution type: "${row.taskExecutionType}". Valid values: ${validExecutionTypes.join(', ')}`,
        });
        return;
      }

      if (row.publicationStatus && !validPublicationStatuses.includes(row.publicationStatus)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid publication status: "${row.publicationStatus}". Valid values: ${validPublicationStatuses.join(', ')}`,
        });
        return;
      }

      if (row.publicationExecutionType && !validExecutionTypes.includes(row.publicationExecutionType)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          message: `Invalid publication execution type: "${row.publicationExecutionType}". Valid values: ${validExecutionTypes.join(', ')}`,
        });
        return;
      }

      const key = `${row.taskTitle}|${row.scheduledDate}`;
      if (!taskGroups.has(key)) {
        taskGroups.set(key, []);
      }
      taskGroups.get(key)!.push(row);
    });

    // Process tasks in batches
    const batchSize = 100;
    const taskKeys = Array.from(taskGroups.keys());
    
    for (let i = 0; i < taskKeys.length; i += batchSize) {
      const batch = taskKeys.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (key) => {
          const groupRows = taskGroups.get(key)!;
          if (groupRows.length === 0) return;

          const firstRow = groupRows[0];
          const rowIndex = rows.indexOf(firstRow) + 2; // +2 for header and 1-indexing

          try {
            // Create task
            const scheduledDate = new Date(firstRow.scheduledDate);
            if (isNaN(scheduledDate.getTime())) {
              throw new Error(`Invalid date: ${firstRow.scheduledDate}`);
            }

            const task = await prisma.task.create({
              data: {
                title: firstRow.taskTitle,
                contentType: firstRow.taskContentType,
                scheduledDate,
                status: (firstRow.taskStatus && validTaskStatuses.includes(firstRow.taskStatus) 
                  ? firstRow.taskStatus 
                  : 'draft') as 'draft' | 'in_progress' | 'completed' | 'failed',
                executionType: (firstRow.taskExecutionType && validExecutionTypes.includes(firstRow.taskExecutionType)
                  ? firstRow.taskExecutionType
                  : 'manual') as 'manual' | 'generated',
                listId: finalListId,
                userId: null,
              },
            });

            // Create fields for all table columns
            const fieldsToCreate = tableColumns.map((column, index) => {
              let fieldValue: any;
              const dynamicValue = firstRow.dynamicFields[column.fieldName];
              
              if (dynamicValue !== undefined) {
                fieldValue = dynamicValue;
              } else if (column.defaultValue) {
                fieldValue = column.defaultValue;
              } else if (column.fieldType === 'checkbox') {
                fieldValue = { checked: false };
              } else {
                fieldValue = { value: '' };
              }

              return {
                taskId: task.id,
                fieldName: column.fieldName,
                fieldType: column.fieldType,
                fieldValue,
                orderIndex: index,
              };
            });

            await prisma.taskField.createMany({
              data: fieldsToCreate,
            });

            // Update fields with dynamic values from import
            for (const [fieldName, fieldValue] of Object.entries(firstRow.dynamicFields)) {
              const field = await prisma.taskField.findFirst({
                where: {
                  taskId: task.id,
                  fieldName,
                },
              });
              if (field) {
                await prisma.taskField.update({
                  where: { id: field.id },
                  data: { fieldValue },
                });
              }
            }

            // Create publications
            for (const row of groupRows) {
              try {
                const publication = await prisma.taskPublication.create({
                  data: {
                    taskId: task.id,
                    platform: row.platform,
                    contentType: row.publicationContentType || firstRow.taskContentType,
                    status: (row.publicationStatus && validPublicationStatuses.includes(row.publicationStatus)
                      ? row.publicationStatus
                      : 'draft') as 'draft' | 'in_progress' | 'completed' | 'failed',
                    executionType: (row.publicationExecutionType && validExecutionTypes.includes(row.publicationExecutionType)
                      ? row.publicationExecutionType
                      : 'manual') as 'manual' | 'generated',
                    note: row.publicationNote || null,
                    content: row.publicationContent || null,
                    orderIndex: groupRows.indexOf(row),
                  },
                });

                // Create result if URLs provided
                if (row.resultUrl || row.resultDownloadUrl) {
                  await prisma.taskResult.create({
                    data: {
                      taskId: task.id,
                      publicationId: publication.id,
                      resultUrl: row.resultUrl || null,
                      downloadUrl: row.resultDownloadUrl || null,
                      source: 'manual',
                    },
                  });
                }
              } catch (pubError) {
                console.error(`Failed to create publication for row ${rowIndex}:`, pubError);
                result.errors.push({
                  row: rowIndex,
                  message: `Failed to create publication for platform "${row.platform}": ${pubError instanceof Error ? pubError.message : 'Unknown error'}`,
                });
              }
            }

            result.success++;
          } catch (error) {
            console.error(`Failed to create task for row ${rowIndex}:`, error);
            result.failed++;
            result.errors.push({
              row: rowIndex,
              message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      error: 'Failed to import tasks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const importMiddleware = upload.single('file');

