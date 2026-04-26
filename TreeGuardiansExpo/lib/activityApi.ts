import { fetchRecentTrees } from '@/lib/treeApi';

export type LocalTreeActivityItem = {
  id: string;
  title: string;
  subtitle: string;
};

type TreeWithCreation = {
  id: number | string;
  species?: string | null;
  tree_species?: string | null;
  latitude?: number;
  longitude?: number;
  created_at?: string | null;
  creator_username?: string | null;
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

export async function fetchRecentTreeActivity(): Promise<LocalTreeActivityItem[]> {
  const trees = await fetchRecentTrees(8);

  return trees
    .filter((tree) => Boolean(tree.created_at))
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6)
    .map((tree) => ({
      id: String(tree.id),
      title: `${tree.tree_species || 'New tree'} added`,
      subtitle: `Placed ${formatDate(tree.created_at)}${
        tree.creator_username ? ` by ${tree.creator_username}` : ''
      }`,
    }));
}