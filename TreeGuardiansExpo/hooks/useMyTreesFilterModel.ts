import { useMemo, useState } from 'react';
import { Tree } from '@/objects/TreeDetails';

export type TreeWithOwnership = Tree & {
  created_by?: number | null;
  user_id?: number | null;
  guardian_id?: number | null;
  admin_id?: number | null;
  assigned_guardian_id?: number | null;
  assigned_admin_id?: number | null;
};

export type MyTreesSortKey = 'date_desc' | 'date_asc' | 'species_az' | 'health';
export type MyTreesRoleFilter = 'all' | 'created' | 'guardian';
/** Health filter buckets used by the My Trees overlay. */
export type MyTreesHealthFilter = 'all' | 'good' | 'ok' | 'bad';

export const MY_TREES_SORT_OPTIONS: { key: MyTreesSortKey; label: string }[] = [
  { key: 'date_desc', label: 'Newest first' },
  { key: 'date_asc', label: 'Oldest first' },
  { key: 'species_az', label: 'Species A–Z' },
  { key: 'health', label: 'Health status' },
];

export const MY_TREES_HEALTH_OPTIONS: { key: MyTreesHealthFilter; label: string }[] = [
  { key: 'all', label: 'All health' },
  { key: 'good', label: 'Good' },
  { key: 'ok', label: 'Ok' },
  { key: 'bad', label: 'Bad' },
];

/** Maps API health and disease fields into Good, Ok, or Bad list groups. */
export function myTreesHealthListGroup(tree: TreeWithOwnership): 'good' | 'ok' | 'bad' {
  const key = myTreesHealthKey(tree);
  if (key === 'excellent' || key === 'good') return 'good';
  if (key === 'ok' || key === 'unknown') return 'ok';
  return 'bad';
}

const RAW_HEALTH_ORDER: Record<string, number> = {
  excellent: 0,
  good: 1,
  ok: 2,
  unknown: 3,
  bad: 4,
  terrible: 5,
};

const LIST_GROUP_ORDER: Record<'good' | 'ok' | 'bad', number> = {
  good: 0,
  ok: 1,
  bad: 2,
};

export const MY_TREES_HEALTH_COLOUR: Record<string, string> = {
  excellent: '#1B6B2A',
  good: '#2E7D32',
  ok: '#F9A825',
  bad: '#E65100',
  terrible: '#C62828',
  unknown: '#7A7A7A',
};

export function myTreesHealthKey(tree: TreeWithOwnership): string {
  if (tree.health) return tree.health;
  if (tree.disease && tree.disease.trim().length > 0) return 'bad';
  return 'unknown';
}

export function myTreesHealthLabel(tree: TreeWithOwnership): string {
  if (tree.health) return tree.health.charAt(0).toUpperCase() + tree.health.slice(1);
  if (tree.disease && tree.disease.trim().length > 0) return 'Bad';
  return 'Unknown';
}

export function filterTreesToMyTrees(trees: Tree[], userId: number): TreeWithOwnership[] {
  return trees.filter((tree) => {
    const isCreator = Number(tree.creator_user_id) === Number(userId);
    const isAllocatedGuardian =
      Array.isArray(tree.guardian_user_ids) &&
      tree.guardian_user_ids.some((id) => Number(id) === Number(userId));
    return isCreator || isAllocatedGuardian;
  }) as TreeWithOwnership[];
}

export function useMyTreesFilterModel(allTrees: Tree[], userId: number | null) {
  const [sortKey, setSortKey] = useState<MyTreesSortKey>('date_desc');
  const [healthFilter, setHealthFilter] = useState<MyTreesHealthFilter>('all');
  const [roleFilter, setRoleFilter] = useState<MyTreesRoleFilter>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');

  const myTrees = useMemo(() => {
    if (userId == null || userId <= 0) {
      return [] as TreeWithOwnership[];
    }
    return filterTreesToMyTrees(allTrees, userId);
  }, [allTrees, userId]);

  const availableSpecies = useMemo(() => {
    const seen = new Set<string>();
    myTrees.forEach((t) => {
      if (t.species?.trim()) seen.add(t.species.trim());
    });
    return Array.from(seen).sort();
  }, [myTrees]);

  const treeSummary = useMemo(() => {
    const needsAttention = myTrees.filter(
      (tree) =>
        tree.health === 'bad' ||
        tree.health === 'terrible' ||
        Boolean(tree.disease && tree.disease.trim().length > 0),
    ).length;

    return {
      total: myTrees.length,
      healthy: myTrees.length - needsAttention,
      attention: needsAttention,
    };
  }, [myTrees]);

  const displayedTrees = useMemo(() => {
    let result = [...myTrees];

    if (roleFilter === 'created') {
      result = result.filter((t) => Number(t.creator_user_id) === Number(userId));
    } else if (roleFilter === 'guardian') {
      result = result.filter(
        (t) =>
          Array.isArray(t.guardian_user_ids) &&
          t.guardian_user_ids.some((id) => Number(id) === Number(userId)),
      );
    }

    if (healthFilter !== 'all') {
      result = result.filter((t) => myTreesHealthListGroup(t) === healthFilter);
    }

    if (speciesFilter !== 'all') {
      result = result.filter((t) => (t.species?.trim() ?? '') === speciesFilter);
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'date_desc':
          return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        case 'date_asc':
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        case 'species_az':
          return (a.species ?? '').localeCompare(b.species ?? '');
        case 'health': {
          const ga = myTreesHealthListGroup(a);
          const gb = myTreesHealthListGroup(b);
          if (ga !== gb) {
            return LIST_GROUP_ORDER[ga] - LIST_GROUP_ORDER[gb];
          }
          return (
            (RAW_HEALTH_ORDER[myTreesHealthKey(a)] ?? 5) -
            (RAW_HEALTH_ORDER[myTreesHealthKey(b)] ?? 5)
          );
        }
        default:
          return 0;
      }
    });

    return result;
  }, [myTrees, roleFilter, healthFilter, speciesFilter, sortKey, userId]);

  return {
    myTrees,
    displayedTrees,
    treeSummary,
    availableSpecies,
    sortKey,
    setSortKey,
    healthFilter,
    setHealthFilter,
    roleFilter,
    setRoleFilter,
    speciesFilter,
    setSpeciesFilter,
  };
}

export type MyTreesFilterModel = ReturnType<typeof useMyTreesFilterModel>;
