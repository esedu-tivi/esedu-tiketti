import { PrismaClient, Ticket, Prisma } from '@prisma/client';
import { CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';

const prisma = new PrismaClient();

export const ticketService = {
  // Hae kaikki tiketit
  getAllTickets: async () => {
    return prisma.ticket.findMany({
      include: {
        createdBy: true,
        assignedTo: true,
        category: true,
        comments: {
          include: {
            author: true
          }
        }
      }
    });
  },

  // Hae yksittäinen tiketti
  getTicketById: async (id: string) => {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: true,
        assignedTo: true,
        category: true,
        comments: {
          include: {
            author: true
          }
        }
      }
    });
  },

  // Luo uusi tiketti
  createTicket: async (data: CreateTicketDTO, userId: string) => {
    return prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        ...(data.device && { device: data.device }),
        ...(data.additionalInfo && { additionalInfo: data.additionalInfo }),
        priority: data.priority,
        createdBy: {
          connect: { id: userId }
        },
        category: {
          connect: { id: data.categoryId }
        }
      },
      include: {
        createdBy: true,
        category: true
      }
    });
  },

  // Päivitä tiketti
  updateTicket: async (id: string, data: UpdateTicketDTO) => {
    const updateData: any = { ...data };
    
    if (data.assignedToId) {
      updateData.assignedTo = { connect: { id: data.assignedToId } };
      delete updateData.assignedToId;
    }
    
    if (data.categoryId) {
      updateData.category = { connect: { id: data.categoryId } };
      delete updateData.categoryId;
    }

    return prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: true,
        assignedTo: true,
        category: true,
        comments: {
          include: {
            author: true
          }
        }
      }
    });
  },

  // Poista tiketti
  deleteTicket: async (id: string) => {
    return prisma.ticket.delete({
      where: { id }
    });
  }
}; 