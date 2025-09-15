import { Request, Response } from 'express';
import { reportService } from '../services/reportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponses } from '../utils/apiResponse.js';
import { prisma } from '../lib/prisma.js';
import { parse } from 'json2csv';
import PDFDocument from 'pdfkit';
import logger from '../utils/logger.js';

export const reportController = {
  // Get current user's work report
  getMyWorkReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    // Parse query parameters
    const { startDate, endDate, categoryId, priority } = req.query;

    // Parse dates and adjust endDate to include the entire day
    let parsedEndDate: Date | undefined;
    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      // Set to end of day (23:59:59.999)
      parsedEndDate.setHours(23, 59, 59, 999);
    }

    let parsedStartDate: Date | undefined;
    if (startDate) {
      parsedStartDate = new Date(startDate as string);
      // Set to start of day (00:00:00.000)
      parsedStartDate.setHours(0, 0, 0, 0);
    }

    const filters = {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      categoryId: categoryId as string | undefined,
      priority: priority as string | undefined
    };

    // Generate report
    const report = await reportService.getUserWorkReport(user.id, filters);

    return successResponse(res, report, 'Report generated successfully');
  }),

  // Save report for future reference
  saveReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    const { reportData } = req.body;

    if (!reportData) {
      return errorResponses.badRequest(res, 'Report data is required');
    }

    const reportId = await reportService.saveReport(user.id, reportData);

    return successResponse(res, { reportId }, 'Report saved successfully');
  }),

  // Get list of saved reports
  getSavedReports: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    const reports = await reportService.getUserReports(user.id);

    return successResponse(res, reports, 'Reports retrieved successfully');
  }),

  // Get specific saved report
  getSavedReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    const { reportId } = req.params;
    const report = await reportService.getSavedReport(reportId, user.id);

    if (!report) {
      return errorResponses.notFound(res, 'Report not found');
    }

    return successResponse(res, report, 'Report retrieved successfully');
  }),

  // Export report as CSV
  exportReportAsCSV: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    // Parse query parameters
    const { startDate, endDate, categoryId, priority, reportId } = req.query;

    let report;
    
    if (reportId) {
      // Get saved report
      report = await reportService.getSavedReport(reportId as string, user.id);
      if (!report) {
        return errorResponses.notFound(res, 'Report not found');
      }
      await reportService.markReportAsExported(reportId as string);
    } else {
      // Generate new report
      // Parse dates and adjust endDate to include the entire day
      let parsedEndDate: Date | undefined;
      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      let parsedStartDate: Date | undefined;
      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        parsedStartDate.setHours(0, 0, 0, 0);
      }

      const filters = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        categoryId: categoryId as string | undefined,
        priority: priority as string | undefined
      };
      report = await reportService.getUserWorkReport(user.id, filters);
    }

    // Prepare data for CSV
    const csvData = report.tickets.map(ticket => ({
      'Tiketti ID': ticket.id,
      'Otsikko': ticket.title,
      'Kuvaus': ticket.description,
      'Kategoria': ticket.category,
      'Prioriteetti': ticket.priority,
      'Tila': ticket.status,
      'Luotu': ticket.createdAt.toISOString(),
      'Ratkaistu': ticket.resolvedAt ? ticket.resolvedAt.toISOString() : '',
      'Käsittelyaika (min)': ticket.processingTime || '',
      'Kommentteja': ticket.commentsCount,
      'Vastausmuoto': ticket.responseFormat
    }));

    // Convert to CSV
    const csv = parse(csvData, {
      fields: Object.keys(csvData[0] || {}),
      delimiter: ';'
    });

    // Set headers for file download
    const filename = `tyoraportti_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send('\ufeff' + csv); // Add BOM for Excel UTF-8 compatibility
  }),

  // Export report as JSON
  exportReportAsJSON: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    // Parse query parameters
    const { startDate, endDate, categoryId, priority, reportId } = req.query;

    let report;
    
    if (reportId) {
      // Get saved report
      report = await reportService.getSavedReport(reportId as string, user.id);
      if (!report) {
        return errorResponses.notFound(res, 'Report not found');
      }
      await reportService.markReportAsExported(reportId as string);
    } else {
      // Generate new report
      // Parse dates and adjust endDate to include the entire day
      let parsedEndDate: Date | undefined;
      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      let parsedStartDate: Date | undefined;
      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        parsedStartDate.setHours(0, 0, 0, 0);
      }

      const filters = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        categoryId: categoryId as string | undefined,
        priority: priority as string | undefined
      };
      report = await reportService.getUserWorkReport(user.id, filters);
    }

    // Set headers for file download
    const filename = `tyoraportti_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.json(report);
  }),

  // Export report as PDF
  exportReportAsPDF: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return errorResponses.unauthorized(res, 'User email not found');
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return errorResponses.unauthorized(res, 'User not found');
    }

    // Parse query parameters
    const { startDate, endDate, categoryId, priority, reportId } = req.query;

    let report;
    
    if (reportId) {
      // Get saved report
      report = await reportService.getSavedReport(reportId as string, user.id);
      if (!report) {
        return errorResponses.notFound(res, 'Report not found');
      }
      await reportService.markReportAsExported(reportId as string);
    } else {
      // Generate new report
      // Parse dates and adjust endDate to include the entire day
      let parsedEndDate: Date | undefined;
      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      let parsedStartDate: Date | undefined;
      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        parsedStartDate.setHours(0, 0, 0, 0);
      }

      const filters = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        categoryId: categoryId as string | undefined,
        priority: priority as string | undefined
      };
      report = await reportService.getUserWorkReport(user.id, filters);
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    const filename = `tyoraportti_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('ESEDU Tukipalvelu - Työraportti', { align: 'center' });
    doc.moveDown();

    // User information
    doc.fontSize(14).text('Tukihenkilö:', { continued: true });
    doc.fontSize(12).text(` ${report.user.name}`, { continued: false });
    doc.text(`Sähköposti: ${report.user.email}`);
    if (report.user.jobTitle) {
      doc.text(`Tehtävänimike: ${report.user.jobTitle}`);
    }
    doc.moveDown();

    // Period information
    doc.fontSize(14).text('Raportointijakso:', { continued: true });
    doc.fontSize(12).text(` ${new Date(report.period.startDate).toLocaleDateString('fi-FI')} - ${new Date(report.period.endDate).toLocaleDateString('fi-FI')}`);
    doc.moveDown();

    // Statistics
    doc.fontSize(16).text('Yhteenveto', { underline: true });
    doc.fontSize(12);
    doc.text(`Ratkaistut tiketit: ${report.statistics.totalResolved}`);
    doc.text(`Suljetut tiketit: ${report.statistics.totalClosed}`);
    doc.text(`Käsittelyssä: ${report.statistics.totalInProgress}`);
    doc.text(`Keskimääräinen ratkaisuaika: ${report.statistics.averageResolutionTime} minuuttia`);
    doc.moveDown();

    // Category breakdown
    if (report.statistics.categoriesHandled.length > 0) {
      doc.fontSize(14).text('Kategoriat:');
      doc.fontSize(11);
      report.statistics.categoriesHandled.forEach(cat => {
        doc.text(`  • ${cat.name}: ${cat.count} tiketti(ä)`);
      });
      doc.moveDown();
    }

    // Priority breakdown
    if (report.statistics.priorityBreakdown.length > 0) {
      doc.fontSize(14).text('Prioriteetit:');
      doc.fontSize(11);
      report.statistics.priorityBreakdown.forEach(priority => {
        const priorityText = {
          'CRITICAL': 'Kriittinen',
          'HIGH': 'Korkea',
          'MEDIUM': 'Keskitaso',
          'LOW': 'Matala'
        }[priority.priority] || priority.priority;
        doc.text(`  • ${priorityText}: ${priority.count} tiketti(ä)`);
      });
      doc.moveDown();
    }

    // Ticket list
    doc.addPage();
    doc.fontSize(16).text('Käsitellyt tiketit', { underline: true });
    doc.moveDown();

    report.tickets.forEach((ticket, index) => {
      if (index > 0 && index % 3 === 0) {
        doc.addPage();
      }

      doc.fontSize(12).fillColor('#000080').text(`${index + 1}. ${ticket.title}`, { underline: false });
      doc.fontSize(10).fillColor('black');
      doc.text(`ID: ${ticket.id}`);
      doc.text(`Kategoria: ${ticket.category} | Prioriteetti: ${ticket.priority} | Tila: ${ticket.status}`);
      doc.text(`Luotu: ${new Date(ticket.createdAt).toLocaleString('fi-FI')}`);
      if (ticket.resolvedAt) {
        doc.text(`Ratkaistu: ${new Date(ticket.resolvedAt).toLocaleString('fi-FI')}`);
      }
      if (ticket.processingTime) {
        doc.text(`Käsittelyaika: ${ticket.processingTime} minuuttia`);
      }
      doc.text(`Kommentteja: ${ticket.commentsCount}`);
      doc.moveDown(0.5);
    });

    // Footer with timestamp
    doc.fontSize(10).text(`Raportti luotu: ${new Date().toLocaleString('fi-FI')}`, 50, doc.page.height - 50, {
      align: 'center'
    });

    // Finalize the PDF
    doc.end();
  })
};