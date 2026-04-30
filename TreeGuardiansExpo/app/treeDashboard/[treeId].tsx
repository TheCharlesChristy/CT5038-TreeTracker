import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import TreeDashboard from '@/components/base/TreeDashboard';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles/theme';
import { Tree } from '@/objects/TreeDetails';
import { fetchTrees } from '@/lib/treeApi';
import { useSessionUser } from '@/lib/session';

export default function TreeDashboardPage() {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const { user, isLoading: isLoadingUser } = useSessionUser();

  const [tree, setTree] = useState<Tree | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const numericTreeId = useMemo(() => {
    const parsed = Number(treeId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [treeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTree() {
      if (!numericTreeId) {
        setLoadError('Invalid tree ID.');
        setIsLoadingTree(false);
        return;
      }

      try {
        setIsLoadingTree(true);
        setLoadError(null);

        const trees = await fetchTrees();
        const matchedTree = trees.find((item) => Number(item.id) === numericTreeId);

        if (!cancelled) {
          if (matchedTree) {
            setTree(matchedTree);
          } else {
            setLoadError('Tree not found.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Failed to load tree.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTree(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, [numericTreeId]);

  if (isLoadingUser || isLoadingTree) {
    return (
      <AppContainer>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={Theme.Colours.primary} />
          <AppText>Loading tree dashboard...</AppText>
        </View>
      </AppContainer>
    );
  }

  if (loadError || !tree) {
    return (
      <AppContainer>
        <AppText variant="title" style={{ color: Theme.Colours.primary, marginBottom: 8 }}>
          Tree Dashboard
        </AppText>
        <AppText style={{ color: Theme.Colours.error, marginBottom: 16 }}>
          {loadError ?? 'Unable to load tree.'}
        </AppText>
      </AppContainer>
    );
  }

  const pageTitle = tree.species
    ? `${tree.species} | TreeHuggers`
    : `Tree #${tree.id ?? treeId} | TreeHuggers`;

  return (
    <>
      <Stack.Screen options={{ title: pageTitle }} />
      <AppContainer>
        <TreeDashboard
          tree={tree}
          onClose={() => router.back()}
          currentUserId={typeof user?.id === 'number' ? user.id : null}
          isAdmin={user?.role === 'admin'}
          isGuardian={user?.role === 'guardian'}
        />
      </AppContainer>
    </>
  );
}