import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import logger from '../../utils/logger.js';

/** Montako viimeisintä tikettiä huomioidaan aiheen toiston estossa. */
export const RECENT_TOPIC_WINDOW = 15;

/**
 * Hakee viimeksi generoitujen tikettien aiheet, jotta sama aihe ei toistu
 * peräkkäin. Molemmat tikettigeneraattorit käyttävät tätä.
 *
 * Virhetilanteessa palautetaan tyhjä lista: aiheen arvonta toimii silloinkin,
 * vain toiston esto jää pois. Generointi ei saa kaatua tähän.
 */
export async function getRecentTopicIds(
  limit: number = RECENT_TOPIC_WINDOW
): Promise<string[]> {
  try {
    const recent = await prisma.ticket.findMany({
      where: {
        isAiGenerated: true,
        generatorMetadata: { not: Prisma.DbNull }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { generatorMetadata: true }
    });

    return recent
      .map((t) => (t.generatorMetadata as { topicId?: string } | null)?.topicId)
      .filter((id): id is string => typeof id === 'string');
  } catch (error) {
    logger.warn('⚠️ [TicketTopics] Recent topics lookup failed, continuing without exclusions', { error });
    return [];
  }
}
