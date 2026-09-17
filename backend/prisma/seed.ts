import { PrismaClient, UserRole, TicketStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Kiinteät tunnisteet demodatalle.
 *
 * Tiketeillä ja kommenteilla ei ole luonnollista uniikkia kenttää, joten
 * idempotenssi hoidetaan kiinteillä id-arvoilla ja upsert-kutsuilla.
 * Aiemmin käytössä oli create, jolloin jokainen seedin ajo loi uudet
 * demotiketit - tuotannossa niitä kertyi jokaisella kontin käynnistyksellä.
 */
const DEMO_IDS = {
  ticket1: 'seed-demo-ticket-1',
  ticket2: 'seed-demo-ticket-2',
  comment1: 'seed-demo-comment-1',
  comment2: 'seed-demo-comment-2',
} as const;

/**
 * Demotiketit luodaan vain kehitysympäristössä.
 *
 * Käyttäjät ja kategoriat luodaan aina: AI-tikettien generaattori tarvitsee
 * admin@example.com -käyttäjän tikettien luojaksi, ja kategoriat ovat
 * sovelluksen perustoiminnan edellytys.
 *
 * Pakota demotiketit tarvittaessa ympäristömuuttujalla SEED_DEMO_TICKETS=true.
 */
const shouldSeedDemoTickets =
  process.env.SEED_DEMO_TICKETS === 'true' || process.env.NODE_ENV !== 'production';

async function main() {
  try {
    // Luodaan testikäyttäjät
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        name: 'EseduTiketti AI',
        role: UserRole.ADMIN,
        profilePicture: '/uploads/default-avatar.png'
      },
      create: {
        email: 'admin@example.com',
        name: 'EseduTiketti AI',
        role: UserRole.ADMIN,
        profilePicture: '/uploads/default-avatar.png'
      },
    });

    const normalUser = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {
        name: 'Test User',
        role: UserRole.USER,
      },
      create: {
        email: 'user@example.com',
        name: 'Test User',
        role: UserRole.USER,
      },
    });

    const supportUser = await prisma.user.upsert({
      where: { email: 'support@example.com' },
      update: {
        name: 'Support User',
        role: UserRole.SUPPORT,
      },
      create: {
        email: 'support@example.com',
        name: 'Support User',
        role: UserRole.SUPPORT,
      },
    });

    // Luodaan testikategoriat
    const generalCategory = await prisma.category.upsert({
      where: { name: 'Yleinen' },
      update: {
        description: 'Yleiset tiketit',
      },
      create: {
        name: 'Yleinen',
        description: 'Yleiset tiketit',
      },
    });

    const technicalCategory = await prisma.category.upsert({
      where: { name: 'Tekninen' },
      update: {
        description: 'Tekniset ongelmat',
      },
      create: {
        name: 'Tekninen',
        description: 'Tekniset ongelmat',
      },
    });

    // Demotiketit ja -kommentit (vain kehitysympäristössä)
    if (shouldSeedDemoTickets) {
      const ticket1 = await prisma.ticket.upsert({
        where: { id: DEMO_IDS.ticket1 },
        update: {
          title: 'Esimerkki tiketti 1',
          description: 'Tämä on ensimmäinen testaus tiketti.',
          status: TicketStatus.OPEN,
          priority: Priority.MEDIUM,
        },
        create: {
          id: DEMO_IDS.ticket1,
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

      const ticket2 = await prisma.ticket.upsert({
        where: { id: DEMO_IDS.ticket2 },
        update: {
          title: 'Esimerkki tiketti 2',
          description: 'Toinen testaus tiketti testausta varten.',
          status: TicketStatus.IN_PROGRESS,
          priority: Priority.HIGH,
        },
        create: {
          id: DEMO_IDS.ticket2,
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

      await prisma.comment.upsert({
        where: { id: DEMO_IDS.comment1 },
        update: {
          content: 'Tämä on testauskommentti tikettiin 1',
        },
        create: {
          id: DEMO_IDS.comment1,
          content: 'Tämä on testauskommentti tikettiin 1',
          ticket: {
            connect: { id: ticket1.id }
          },
          author: {
            connect: { id: adminUser.id }
          }
        },
      });

      await prisma.comment.upsert({
        where: { id: DEMO_IDS.comment2 },
        update: {
          content: 'Laitetaan kommentti tikettiin 2',
        },
        create: {
          id: DEMO_IDS.comment2,
          content: 'Laitetaan kommentti tikettiin 2',
          ticket: {
            connect: { id: ticket2.id }
          },
          author: {
            connect: { id: adminUser.id }
          }
        },
      });
    } else {
      console.log('Skipping demo tickets (NODE_ENV=production). Set SEED_DEMO_TICKETS=true to force.');
    }

    // Create notification settings for all users
    const users = [adminUser, normalUser, supportUser];
    for (const user of users) {
      await prisma.notificationSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          webNotifications: true,
          notifyOnAssigned: true,
          notifyOnStatusChange: true,
          notifyOnComment: true,
          notifyOnPriority: true,
          notifyOnMention: true
        }
      });
    }

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