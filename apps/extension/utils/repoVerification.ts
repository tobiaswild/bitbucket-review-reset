export type RepoIdentity =
  | { status: 'found'; workspaceUuid: string; repoUuid: string }
  | { status: 'missing' }
  | { status: 'unknown' };

const UUID = /^\{[0-9a-f-]{36}\}$/i;

function uuidAt(value: unknown, ...path: string[]): string | null {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return null;
    }
    current = Object.fromEntries(Object.entries(current))[key];
  }
  return typeof current === 'string' && UUID.test(current)
    ? current.toLowerCase()
    : null;
}

/**
 * Looks up which repository currently lives at `workspace/repo`, with the page's session.
 * Only a 404 counts as "missing"; any other failure is "unknown" so a flaky request or an
 * expired session never throws away a valid redirect.
 */
export async function fetchRepoIdentity(
  workspace: string,
  repo: string,
): Promise<RepoIdentity> {
  const slug = /^[\w-][\w.-]*$/;
  if (!slug.test(workspace) || !slug.test(repo)) return { status: 'unknown' };
  try {
    const response = await fetch(
      `/!api/2.0/repositories/${workspace}/${repo}?fields=uuid,workspace.uuid`,
      { credentials: 'same-origin' },
    );
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'unknown' };
    const body: unknown = await response.json();
    const repoUuid = uuidAt(body, 'uuid');
    const workspaceUuid = uuidAt(body, 'workspace', 'uuid');
    return repoUuid && workspaceUuid
      ? { status: 'found', workspaceUuid, repoUuid }
      : { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}

/**
 * Whether a cache entry still points at the right repository. UUID segments of the key must
 * match; slug segments can't be checked and are accepted.
 */
export function isStale(key: string, identity: RepoIdentity): boolean {
  if (identity.status === 'unknown') return false;
  if (identity.status === 'missing') return true;
  const [workspace = '', repo = ''] = key.split('/');
  return (
    (UUID.test(workspace) && workspace !== identity.workspaceUuid) ||
    (UUID.test(repo) && repo !== identity.repoUuid)
  );
}

export interface InvalidateMessage {
  type: 'invalidate-repo-name';
  key: string;
}

export function isInvalidateMessage(
  value: unknown,
): value is InvalidateMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'invalidate-repo-name' &&
    'key' in value &&
    typeof value.key === 'string'
  );
}
