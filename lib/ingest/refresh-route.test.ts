import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/admin/refresh/route';
const mocks = vi.hoisted(() => ({ select: vi.fn(), sql: vi.fn() }));
vi.mock('@/scripts/scrape/adapters', () => ({ selectAdapters: mocks.select }));
vi.mock('@/lib/db', () => ({ getSql: mocks.sql }));
vi.mock('@/lib/ingest/pipeline', () => ({ runPipelineFor: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (body: string, token = 'test-secret') => new Request('http://localhost/api/admin/refresh', { method: 'POST', headers: { authorization: 'Bearer ' + token }, body });
describe('refresh endpoint', () => {
  it('requires authentication before loading scrapers or the database', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    expect((await POST(request('{}', 'wrong'))).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled(); expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('rejects writes to production snapshots', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DATABASE_URL', '');
    expect((await POST(request('{}'))).status).toBe(503);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it.each(['{', 'null', '{"adapters":12}', '{"limit":-1}', '{"fresh":"yes"}'])('rejects malformed options: %s', async body => {
    vi.stubEnv('CRON_SECRET', 'test-secret'); vi.stubEnv('NODE_ENV', 'development');
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled(); expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('rejects unknown adapters without starting a refresh', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret'); vi.stubEnv('NODE_ENV', 'development');
    mocks.select.mockImplementation(() => { throw new Error('unknown'); });
    expect((await POST(request('{"adapters":["missing"]}'))).status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
