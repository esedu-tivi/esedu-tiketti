import { Request, Response } from 'express';
import { ticketGenerator } from '../ai/agents/ticketGeneratorAgent.js';
import { PrismaClient, TicketStatus } from '@prisma/client';
import { ticketService } from '../services/ticketService.js';
import { CreateTicketDTO } from '../types/index.js';

const prisma = new PrismaClient();

export const aiController = {
  /**
   * Generate a training ticket for IT support students
   */
  generateTrainingTicket: async (req: Request, res: Response) => {
    try {
      const { complexity, category, userProfile, assignToId, responseFormat } = req.body;
      
      console.log('Received request to generate training ticket:', req.body);
      
      // Validate the required parameters
      if (!complexity || !category || !userProfile) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'complexity, category, and userProfile are required'
        });
      }
      
      // Generate a ticket using the AI agent - with type guarantees
      console.log('Calling ticket generator with parameters:', { complexity, category, userProfile, assignToId, responseFormat });
      const ticketData = await ticketGenerator.generateTicket({
        complexity,
        category,
        userProfile,
        assignToId,
        responseFormat
      });
      
      console.log('Successfully generated ticket data');
      
      // Create the ticket with standard fields
      const createTicketData: CreateTicketDTO = {
        title: ticketData.title,
        description: ticketData.description,
        device: ticketData.device,
        additionalInfo: ticketData.additionalInfo,
        priority: ticketData.priority,
        categoryId: ticketData.categoryId,
        responseFormat: ticketData.responseFormat,
        attachments: [],
        // Add a flag to indicate this is an AI-generated training ticket
        isAiGenerated: true,
        // Store the user profile for later reference in conversations
      };
      
      // Create the ticket first
      const ticket = await ticketService.createTicket(createTicketData, ticketData.createdById);
      
      // Generate and store a solution for this ticket
      const solution = await ticketGenerator.generateSolution(ticket.id!);
      
      // Store the solution in a knowledge base entry linked to this ticket
      await prisma.knowledgeArticle.create({
        data: {
          title: `Solution: ${ticket.title}`,
          content: solution,
          categoryId: ticketData.categoryId,
          relatedTicketIds: [ticket.id!],
          // Add metadata for tracking
          complexity: complexity,
          isAiGenerated: true
        }
      });
      
      // If assignToId is specified, update the ticket to assign it
      if (ticketData.assignedToId) {
        await ticketService.updateTicket(ticket.id!, {
          assignedToId: ticketData.assignedToId,
          status: 'IN_PROGRESS' as TicketStatus
        });
        
        // Fetch the updated ticket
        const updatedTicket = await ticketService.getTicketById(ticket.id!);
        if (updatedTicket) {
          return res.status(201).json({ 
            ticket: updatedTicket,
            isAiGenerated: true
          });
        }
      }
      
      res.status(201).json({ 
        ticket, 
        isAiGenerated: true
      });
    } catch (error: any) {
      console.error('Error generating training ticket:', error);
      res.status(500).json({ 
        error: 'Failed to generate training ticket',
        details: error.message || 'Unknown error'
      });
    }
  },
  
  /**
   * Generate a simulated user response to a support comment
   * This makes AI-generated tickets interactive for training purposes
   */
  generateUserResponse: async (req: Request, res: Response) => {
    try {
      // Get ticketId from route parameters or body
      const ticketId = req.params.id || req.body.ticketId;
      const { commentText, supportUserId } = req.body;
      
      console.log(`Received request to generate user response for ticket ${ticketId}`);
      
      // Validate parameters
      if (!ticketId || !commentText || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId, commentText and supportUserId are required'
        });
      }
      
      // Get the ticket with its context
      const ticket = await prisma.ticket.findUnique({
        where: { 
          id: ticketId,
          isAiGenerated: true // Only allow responses for AI-generated tickets
        },
        include: {
          comments: { 
            orderBy: { createdAt: 'asc' }
          },
          category: true,
          createdBy: true
        }
      });
      
      if (!ticket || !ticket.isAiGenerated) {
        return res.status(404).json({ 
          error: 'Ticket not found',
          details: 'The specified ticket was not found or is not AI-generated.'
        });
      }
      
      // Look up the solution for this ticket
      const solution = await prisma.knowledgeArticle.findFirst({
        where: { 
          relatedTicketIds: { has: ticketId } 
        }
      });
      
      // Generate AI response as the ticket creator
      const aiResponse = await ticketGenerator.generateUserResponse({
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          device: ticket.device || '',
          priority: ticket.priority,
          categoryId: ticket.categoryId,

          createdById: ticket.createdById
        },
        comments: ticket.comments,
        newSupportComment: commentText,
        supportUserId,
        solution: solution?.content || null
      });
      
      // Create the comment from the AI user
      const comment = await prisma.comment.create({
        data: {
          content: aiResponse,
          ticketId: ticket.id,
          authorId: ticket.createdById, // Comment as the original ticket creator
          isAiGenerated: true // Flag for analytics but not shown to user
        }
      });
      
      // Return the created comment
      return res.status(201).json({ 
        comment,
        isAiGenerated: true  
      });
      
    } catch (error: any) {
      console.error('Error generating user response:', error);
      res.status(500).json({
        error: 'Failed to generate user response',
        details: error.message || 'Unknown error'
      });
    }
  },
  
  /**
   * Get AI agent configuration
   */
  getAgentConfig: async (req: Request, res: Response) => {
    try {
      // Get all categories for the dropdown
      const categories = await prisma.category.findMany();
      
      // Return configuration options for the frontend
      res.json({
        complexityOptions: ['simple', 'moderate', 'complex'],
        categoryOptions: categories.map(c => ({ id: c.id, name: c.name })),
        userProfileOptions: ['student', 'teacher', 'staff', 'administrator'],
      });
    } catch (error: any) {
      console.error('Error fetching AI agent configuration:', error);
      res.status(500).json({ error: 'Failed to fetch AI agent configuration' });
    }
  },
  
  /**
   * Get all AI-generated solutions for a ticket
   * This is used to reveal solutions after a support person has attempted to solve the ticket
   */
  getTicketSolution: async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      
      // Check if the ticket exists and is AI-generated
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { isAiGenerated: true }
      });
      
      if (!ticket || !ticket.isAiGenerated) {
        return res.status(404).json({
          error: 'Ticket not found',
          details: 'The specified ticket was not found or is not AI-generated'
        });
      }
      
      // Get the solution from knowledge base
      const solution = await prisma.knowledgeArticle.findFirst({
        where: { 
          relatedTicketIds: { has: ticketId } 
        }
      });
      
      if (!solution) {
        // If no solution exists, generate one now
        const generatedSolution = await ticketGenerator.generateSolution(ticketId);
        
        // Get the ticket details to create the knowledge article
        const ticketDetails = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { title: true, categoryId: true }
        });
        
        if (!ticketDetails) {
          return res.status(404).json({
            error: 'Ticket details not found',
            details: 'Could not find the ticket details to generate a solution'
          });
        }
        
        // Store it for future use
        const newSolution = await prisma.knowledgeArticle.create({
          data: {
            title: `Solution: ${ticketDetails.title}`,
            content: generatedSolution,
            categoryId: ticketDetails.categoryId,
            relatedTicketIds: [ticketId],
            isAiGenerated: true
          }
        });
        
        return res.json({ solution: newSolution });
      }
      
      return res.json({ solution });
      
    } catch (error: any) {
      console.error('Error retrieving ticket solution:', error);
      res.status(500).json({
        error: 'Failed to retrieve ticket solution',
        details: error.message || 'Unknown error'
      });
    }
  }
}; 