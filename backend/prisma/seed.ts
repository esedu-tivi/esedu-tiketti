import { PrismaClient, UserRole, TicketStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Luodaan testikäyttäjät
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
      },
    });

    const normalUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        role: UserRole.USER,
      },
    });

    // Luodaan testikategoriat
    const generalCategory = await prisma.category.create({
      data: {
        name: 'Yleinen',
        description: 'Yleiset tiketit',
      },
    });

    const technicalCategory = await prisma.category.create({
      data: {
        name: 'Tekninen',
        description: 'Tekniset ongelmat',
      },
    });

    // Luodaan mockTickets tietokantaan
    const ticket1 = await prisma.ticket.create({
      data: {
        title: 'Esimerkki tiketti 1',
        description: 'Tämä on ensimmäinen testaus tiketti.',
        status: TicketStatus.OPEN,
        priority: Priority.MEDIUM,
        createdBy: {
          connect: { id: normalUser.id }
        },
        assignedTo: {
          connect: { id: adminUser.id }
        },
        category: {
          connect: { id: generalCategory.id }
        }
      },
    });

    const ticket2 = await prisma.ticket.create({
      data: {
        title: 'Esimerkki tiketti 2',
        description: 'Toinen testaus tiketti testausta varten.',
        status: TicketStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        createdBy: {
          connect: { id: normalUser.id }
        },
        assignedTo: {
          connect: { id: adminUser.id }
        },
        category: {
          connect: { id: technicalCategory.id }
        }
      },
    });

    // Lisätään kommentteja tiketteihin
    await prisma.comment.create({
      data: {
        content: 'Tämä on testauskommentti tikettiin 1',
        ticket: {
          connect: { id: ticket1.id }
        },
        author: {
          connect: { id: adminUser.id }
        }
      },
    });

    await prisma.comment.create({
      data: {
        content: 'Laitetaan kommentti tikettiin 2',
        ticket: {
          connect: { id: ticket2.id }
        },
        author: {
          connect: { id: adminUser.id }
        }
      },
    });

    console.log('Seed data created successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 