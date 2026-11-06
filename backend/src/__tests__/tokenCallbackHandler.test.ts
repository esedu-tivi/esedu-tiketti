import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

/**
 * Token-seurannan testit oikealla ChatOpenAI-mallilla.
 *
 * TAUSTA: tokenCallbackHandler etsii token-määrät LangChainin vastauksesta
 * neljästä eri kohdasta. Jos LangChain-päivitys siirtää ne muualle, AI-kutsut
 * toimivat edelleen, mutta token- ja kustannusseuranta tallentaa hiljaa
 * nollaa. Nämä testit ajavat oikeaa ChatOpenAI-luokkaa mockattua OpenAI-
 * vastausta vastaan ja varmistavat, että token-määrät päätyvät seurantaan.
 *
 * Verkkoa tai API-avainta ei tarvita: fetch korvataan mockilla.
 */

const trackTokenUsage = jest.fn<(data: Record<string, unknown>) => Promise<void>>();

jest.unstable_mockModule('../services/tokenTrackingService.js', () => ({
  tokenTrackingService: { trackTokenUsage },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let ChatOpenAI: typeof import('@langchain/openai').ChatOpenAI;
let createTokenCallback: typeof import('../utils/tokenCallbackHandler.js').createTokenCallback;

beforeAll(async () => {
  ({ ChatOpenAI } = await import('@langchain/openai'));
  ({ createTokenCallback } = await import('../utils/tokenCallbackHandler.js'));
});

beforeEach(() => {
  trackTokenUsage.mockReset();
  trackTokenUsage.mockResolvedValue(undefined);
});

const callbackOptions = {
  agentType: 'support' as const,
  modelUsed: 'gpt-4o-mini',
  ticketId: 'ticket-1',
  userId: 'user-1',
  requestType: 'test',
};

/** OpenAI Chat Completions -vastaus (ei streamia) */
const completionFetch = async () =>
  new Response(
    JSON.stringify({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1,
      model: 'gpt-4o-mini',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hei!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

/** OpenAI:n SSE-stream, jonka viimeinen chunk sisältää usage-tiedot */
const streamFetch = async () => {
  const base = { id: 'chatcmpl-2', object: 'chat.completion.chunk', created: 1, model: 'gpt-4o-mini' };
  const chunk = (o: object) => `data: ${JSON.stringify(o)}\n\n`;
  const body =
    chunk({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content: 'Hei' }, finish_reason: null }] }) +
    chunk({ ...base, choices: [{ index: 0, delta: { content: '!' }, finish_reason: 'stop' }] }) +
    chunk({ ...base, choices: [], usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 } }) +
    'data: [DONE]\n\n';
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
};

const model = (fetch: typeof globalThis.fetch) =>
  new ChatOpenAI({ apiKey: 'sk-test', model: 'gpt-4o-mini', maxRetries: 0, configuration: { fetch } });

describe('TokenTrackingCallbackHandler', () => {
  it('tallentaa token-määrät invoke-kutsusta', async () => {
    await model(completionFetch).invoke('hei', { callbacks: [createTokenCallback(callbackOptions)] });

    expect(trackTokenUsage).toHaveBeenCalledTimes(1);
    expect(trackTokenUsage.mock.calls[0][0]).toMatchObject({
      agentType: 'support',
      modelUsed: 'gpt-4o-mini',
      ticketId: 'ticket-1',
      userId: 'user-1',
      promptTokens: 11,
      completionTokens: 7,
      totalTokens: 18,
      success: true,
    });
  });

  it('tallentaa token-määrät streamatusta vastauksesta', async () => {
    let text = '';
    const stream = await model(streamFetch).stream('hei', { callbacks: [createTokenCallback(callbackOptions)] });
    for await (const chunk of stream) text += chunk.content;

    expect(text).toBe('Hei!');
    expect(trackTokenUsage).toHaveBeenCalledTimes(1);
    expect(trackTokenUsage.mock.calls[0][0]).toMatchObject({
      promptTokens: 20,
      completionTokens: 5,
      totalTokens: 25,
      success: true,
    });
  });

  it('tallentaa epäonnistuneen kutsun virheenä', async () => {
    const failingFetch = async () =>
      new Response(JSON.stringify({ error: { message: 'boom', type: 'server_error' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });

    await expect(
      model(failingFetch).invoke('hei', { callbacks: [createTokenCallback(callbackOptions)] }),
    ).rejects.toThrow();

    expect(trackTokenUsage).toHaveBeenCalledTimes(1);
    expect(trackTokenUsage.mock.calls[0][0]).toMatchObject({ success: false, totalTokens: 0 });
  });
});
