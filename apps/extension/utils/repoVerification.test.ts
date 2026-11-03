import { afterEach, describe, expect, it, vi } from 'vitest';
import { cacheKey } from './repoNameCache';
import {
  fetchRepoIdentity,
  isInvalidateMessage,
  isStale,
} from './repoVerification';

const WS = '{0f4b2c9e-1a2b-4c3d-8e9f-001122334455}';
const REPO = '{a1b2c3d4-e5f6-4a7b-8c9d-aabbccddeeff}';
const OTHER = '{00000000-0000-4000-8000-000000000000}';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchRepoIdentity', () => {
  it('returns both UUIDs in lowercase', async () => {
    const fetchMock = stubFetch(200, {
      uuid: REPO.toUpperCase(),
      workspace: { uuid: WS },
    });
    expect(await fetchRepoIdentity('acme', 'web')).toEqual({
      status: 'found',
      workspaceUuid: WS,
      repoUuid: REPO,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/!api/2.0/repositories/acme/web?fields=uuid,workspace.uuid',
      { credentials: 'same-origin' },
    );
  });

  it('treats only a 404 as missing', async () => {
    stubFetch(404);
    expect(await fetchRepoIdentity('acme', 'web')).toEqual({
      status: 'missing',
    });
    stubFetch(401);
    expect(await fetchRepoIdentity('acme', 'web')).toEqual({
      status: 'unknown',
    });
    stubFetch(200, { uuid: 'nope' });
    expect(await fetchRepoIdentity('acme', 'web')).toEqual({
      status: 'unknown',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchRepoIdentity('acme', 'web')).toEqual({
      status: 'unknown',
    });
  });

  it('does not request odd-looking paths', async () => {
    const fetchMock = stubFetch(200);
    expect(await fetchRepoIdentity('..', 'web')).toEqual({ status: 'unknown' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isStale', () => {
  const found = { status: 'found', workspaceUuid: WS, repoUuid: REPO } as const;

  it('keeps entries whose UUIDs still match', () => {
    expect(isStale(cacheKey(WS, REPO), found)).toBe(false);
    expect(isStale(cacheKey(WS, 'web'), found)).toBe(false);
  });

  it('flags a different repository under the cached name', () => {
    expect(isStale(cacheKey(WS, OTHER), found)).toBe(true);
    expect(isStale(cacheKey(OTHER, 'web'), found)).toBe(true);
  });

  it('flags a missing repository, but not an unknown result', () => {
    expect(isStale(cacheKey(WS, REPO), { status: 'missing' })).toBe(true);
    expect(isStale(cacheKey(WS, REPO), { status: 'unknown' })).toBe(false);
  });
});

describe('isInvalidateMessage', () => {
  it('accepts only the expected shape', () => {
    expect(
      isInvalidateMessage({ type: 'invalidate-repo-name', key: 'a/b' }),
    ).toBe(true);
    expect(isInvalidateMessage({ type: 'invalidate-repo-name' })).toBe(false);
    expect(isInvalidateMessage('invalidate-repo-name')).toBe(false);
  });
});
