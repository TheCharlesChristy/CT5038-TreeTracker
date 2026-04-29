import { buildApiUrl } from '@/config/api';
import { fetchRecentTrees } from '@/lib/treeApi';

export type LocalActivityItem = {
  id: string;
  type: 'tree_added' | 'comment';
  title: string;
  subtitle: string;
  treeId?: number;
  sortKey: number;
};

/** @deprecated Use LocalActivityItem */
export type LocalTreeActivityItem = LocalActivityItem;

type RecentComment = {
  comment_id: number;
  tree_id: number;
  content: string;
  created_at: string | null;
  user_id: number | null;
  username: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return 'Unknown date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchRecentComments(limit = 8): Promise<RecentComment[]> {
  try {
    const url = buildApiUrl(`comments/recent?limit=${limit}`);
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchRecentTreeActivity(): Promise<LocalActivityItem[]> {
  const [trees, comments] = await Promise.all([
    fetchRecentTrees(8).catch(() => []),
    fetchRecentComments(8),
  ]);

  const treeItems: LocalActivityItem[] = trees
    .filter((tree) => Boolean(tree.created_at))
    .map((tree) => ({
      id: `tree-${tree.id}`,
      type: 'tree_added' as const,
      title: `${tree.tree_species || 'New tree'} added`,
      subtitle: `Placed ${formatDate(tree.created_at)}${
        tree.creator_username ? ` by ${tree.creator_username}` : ''
      }`,
      treeId: typeof tree.id === 'number' ? tree.id : Number(tree.id),
      sortKey: tree.created_at ? new Date(tree.created_at).getTime() : 0,
    }));

  const commentItems: LocalActivityItem[] = comments
    .filter((c) => Boolean(c.created_at))
    .map((c) => {
      const preview =
        c.content && c.content.length > 80
          ? `${c.content.slice(0, 80)}…`
          : c.content || '';

      const who = c.username?.trim() || 'Someone';

      return {
        id: `comment-${c.comment_id}`,
        type: 'comment' as const,
        title: `${who} commented on Tree #${c.tree_id}`,
        subtitle: `"${preview}" · ${formatDate(c.created_at)}`,
        treeId: c.tree_id,
        sortKey: c.created_at ? new Date(c.created_at).getTime() : 0,
      };
    });

  return [...treeItems, ...commentItems]
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 10);
}
