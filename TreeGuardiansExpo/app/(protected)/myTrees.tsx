import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { Tree } from '@/objects/TreeDetails';
import { canAccessMyTrees, useSessionUser } from '@/lib/session';
import { fetchTrees } from '@/lib/treeApi';

export default function MyTreesPage() {
	const { user, isLoading: isLoadingUser } = useSessionUser();
	const authorized = canAccessMyTrees(user?.role);
	const [trees, setTrees] = useState<Tree[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (isLoadingUser || !authorized) {
			return;
		}

		const loadTrees = async () => {
			setIsLoading(true);
			setLoadError(null);

			try {
				const treesFromApi = await fetchTrees();
				setTrees(treesFromApi);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unexpected error loading trees.';
				setLoadError(message);
			} finally {
				setIsLoading(false);
			}
		};

		loadTrees();
	}, [authorized, isLoadingUser]);

	const treeSummary = useMemo(() => {
		const needsAttention = trees.filter((tree) => Boolean(tree.disease && tree.disease.trim().length > 0)).length;
		return {
			total: trees.length,
			healthy: trees.length - needsAttention,
			attention: needsAttention,
		};
	}, [trees]);

	if (isLoadingUser) {
		return (
			<AppContainer>
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.loadingText}>Loading session...</AppText>
				</View>
			</AppContainer>
		);
	}

	if (!authorized) {
		return (
			<AppContainer>
				<View style={styles.topBar}>
					<NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
				</View>
				<AppText variant="title" style={styles.title}>Access Restricted</AppText>
				<AppText style={styles.subtitle}>
					Your account role ({user?.role ?? 'guest'}) does not currently include the My Trees dashboard.
				</AppText>
				<AppButton title="Return to Map" variant="secondary" onPress={() => router.push('/mainPage')} />
			</AppContainer>
		);
	}

	return (
		<AppContainer>
			<View style={styles.topBar}>
				<NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
			</View>

			<AppText variant="title" style={styles.title}>My Trees</AppText>
			<AppText style={styles.subtitle}>
				API-backed view of trees currently available for your role.
			</AppText>

			<View style={styles.statsRow}>
				<View style={styles.statCard}>
					<AppText style={styles.statValue}>{treeSummary.total}</AppText>
					<AppText style={styles.statLabel}>Total Trees</AppText>
				</View>
				<View style={styles.statCard}>
					<AppText style={styles.statValue}>{treeSummary.healthy}</AppText>
					<AppText style={styles.statLabel}>Healthy</AppText>
				</View>
				<View style={styles.statCard}>
					<AppText style={styles.statValue}>{treeSummary.attention}</AppText>
					<AppText style={styles.statLabel}>Need Attention</AppText>
				</View>
			</View>

			{isLoading ? (
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.loadingText}>Loading trees...</AppText>
				</View>
			) : null}

			{loadError ? <AppText style={styles.errorText}>{loadError}</AppText> : null}

			<View style={styles.list}>
				{trees.map((tree) => (
					<View key={tree.id} style={styles.row}>
						<AppText style={styles.rowTitle}>Tree #{tree.id ?? 'Unknown'}</AppText>
						<AppText style={styles.rowMeta}>
							{tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
						</AppText>
						<AppText style={!tree.disease ? styles.healthy : styles.attention}>
							{!tree.disease ? 'Healthy' : 'Needs Attention'}
						</AppText>
					</View>
				))}
				{!isLoading && trees.length === 0 ? (
					<AppText style={styles.emptyText}>No trees returned by the API yet.</AppText>
				) : null}
			</View>

			<AppButton
				title="Return to Map"
				variant="secondary"
				onPress={() => router.push('/mainPage')}
			/>
		</AppContainer>
	);
}

const styles = StyleSheet.create({
	topBar: {
		marginBottom: Theme.Spacing.medium,
	},
	title: {
		color: Theme.Colours.primary,
		marginBottom: Theme.Spacing.small,
	},
	subtitle: {
		color: Theme.Colours.textMuted,
		marginBottom: Theme.Spacing.large,
	},
	list: {
		marginBottom: Theme.Spacing.large,
	},
	statsRow: {
		flexDirection: 'row',
		gap: Theme.Spacing.small,
		marginBottom: Theme.Spacing.medium,
	},
	statCard: {
		flex: 1,
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D8E4D8',
		backgroundColor: '#F9FCF9',
		padding: Theme.Spacing.small,
		alignItems: 'center',
	},
	statValue: {
		color: Theme.Colours.primary,
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 20,
	},
	statLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: Theme.Spacing.small,
	},
	loadingText: {
		marginLeft: Theme.Spacing.small,
		color: Theme.Colours.textMuted,
	},
	errorText: {
		color: Theme.Colours.error,
		marginBottom: Theme.Spacing.small,
	},
	emptyText: {
		color: Theme.Colours.textMuted,
	},
	row: {
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D8E4D8',
		backgroundColor: '#F9FCF9',
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.small,
	},
	rowTitle: {
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
	},
	rowMeta: {
		color: Theme.Colours.textMuted,
		marginTop: 2,
		marginBottom: 4,
	},
	healthy: {
		color: Theme.Colours.success,
	},
	attention: {
		color: Theme.Colours.warning,
	},
});
