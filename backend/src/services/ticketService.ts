import { PrismaClient, Ticket, Prisma, TicketStatus, ResponseFormat } from '@prisma/client';
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
        responseFormat: data.responseFormat || 'TEKSTI',
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

    if (data.responseFormat) {
      updateData.responseFormat = data.responseFormat;
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
  },

  // Hae käyttäjän tiketit
  getTicketsByUserId: async (userId: string) => {
    return await prisma.ticket.findMany({
      where: {
        createdById: userId
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  // Päivitä tiketin tila
  updateTicketStatus: async (id: string, status: TicketStatus) => {
    return await prisma.ticket.update({
      where: { id },
      data: { status },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  },

  // Aseta tiketin käsittelijä
  assignTicket: async (id: string, assignedToId: string) => {
    return await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId,
        status: TicketStatus.IN_PROGRESS
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  },

  // Lisää kommentti tikettiin
  addCommentToTicket: async (ticketId: string, content: string, userId: string) => {
    // Haetaan tiketti ja tarkistetaan sen tila
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: true,
        assignedTo: true
      }
    });

    if (!ticket) {
      throw new Error('Tikettiä ei löydy');
    }

    // Haetaan käyttäjä
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Käyttäjää ei löydy');
    }

    // Tarkistetaan kommentointioikeudet
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      throw new Error('Tiketti on ratkaistu tai suljettu - kommentointi ei ole mahdollista');
    }

    // Jos käyttäjä on tiketin luoja, saa aina kommentoida (paitsi jos tiketti on suljettu/ratkaistu)
    if (ticket.createdById === userId) {
      return await prisma.comment.create({
        data: {
          content,
          ticket: { connect: { id: ticketId } },
          author: { connect: { id: userId } }
        },
        include: {
          author: true
        }
      });
    }

    // Jos käyttäjä on tukihenkilö tai admin
    if (user.role === 'SUPPORT' || user.role === 'ADMIN') {
      // Admin voi aina kommentoida
      if (user.role === 'ADMIN') {
        return await prisma.comment.create({
          data: {
            content,
            ticket: { connect: { id: ticketId } },
            author: { connect: { id: userId } }
          },
          include: {
            author: true
          }
        });
      }

      // Tukihenkilö voi kommentoida vain jos tiketti on käsittelyssä ja hän on tiketin käsittelijä
      if (ticket.status === 'OPEN') {
        throw new Error('Ota tiketti ensin käsittelyyn kommentoidaksesi');
      }

      if (ticket.status === 'IN_PROGRESS' && ticket.assignedToId !== userId) {
        throw new Error('Vain tiketin käsittelijä voi kommentoida');
      }
    }

    // Jos kaikki tarkistukset menivät läpi, luodaan kommentti
    return await prisma.comment.create({
      data: {
        content,
        ticket: { connect: { id: ticketId } },
        author: { connect: { id: userId } }
      },
      include: {
        author: true
      }
    });
  }
};