import * as reportService from '../services/reportService.js';

/**
 * GET /api/results/reports/filters
 * Returns academic hierarchy and available examinations for the report generator.
 */
export async function getReportFilters(req, res, next) {
  try {
    const filters = await reportService.getReportFilters();
    return res.json(filters);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/results/reports/data
 * Generates matching results and performance summary for report preview and PDF export.
 */
export async function generateReportData(req, res, next) {
  try {
    const {
      branchId,
      intakeId,
      batchId,
      diploma,
      examName,
      reportType,
      resultStatus,
      selectedStudentIds,
      individualStudentId,
    } = req.body || {};

    const reportData = await reportService.generateReportData({
      branchId,
      intakeId,
      batchId,
      diploma,
      examName,
      reportType,
      resultStatus,
      selectedStudentIds,
      individualStudentId,
    });

    return res.json(reportData);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/results/reports/preview
 * Convenient query-parameter preview endpoint.
 */
export async function previewReportData(req, res, next) {
  try {
    const {
      branchId,
      intakeId,
      batchId,
      diploma,
      examName,
      reportType,
      resultStatus,
      selectedStudentIds,
      individualStudentId,
    } = req.query || {};

    let studentIdsArray = [];
    if (selectedStudentIds) {
      studentIdsArray = String(selectedStudentIds)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const reportData = await reportService.generateReportData({
      branchId,
      intakeId,
      batchId,
      diploma,
      examName,
      reportType,
      resultStatus,
      selectedStudentIds: studentIdsArray,
      individualStudentId,
    });

    return res.json(reportData);
  } catch (err) {
    next(err);
  }
}

