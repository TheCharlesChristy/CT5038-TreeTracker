import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { Theme } from '@/styles/theme';
import { Tree } from '@/objects/TreeDetails';
import { useSessionUser } from '@/lib/session';
import { fetchTrees } from '@/lib/treeApi';
import { FaviconHead } from '@/components/base/FaviconHead';

type TreeWithOwnership = Tree & {
	created_by?: number | null;
	user_id?: number | null;
	guardian_id?: number | null;
	admin_id?: number | null;
	assigned_guardian_id?: number | null;
	assigned_admin_id?: number | null;
};

type SortKey = 'date_desc' | 'date_asc' | 'species_az' | 'health';
type RoleFilter = 'all' | 'created' | 'guardian';
type HealthFilter = 'all' | 'excellent' | 'good' | 'ok' | 'bad' | 'terrible' | 'unknown';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
	{ key: 'date_desc', label: 'Newest first' },
	{ key: 'date_asc', label: 'Oldest first' },
	{ key: 'species_az', label: 'Species A–Z' },
	{ key: 'health', label: 'Health status' },
];

const HEALTH_OPTIONS: { key: HealthFilter; label: string }[] = [
	{ key: 'all', label: 'All health' },
	{ key: 'excellent', label: 'Excellent' },
	{ key: 'good', label: 'Good' },
	{ key: 'ok', label: 'Ok' },
	{ key: 'bad', label: 'Bad' },
	{ key: 'terrible', label: 'Terrible' },
	{ key: 'unknown', label: 'Unknown' },
];

const HEALTH_FILTER_META: Record<
	HealthFilter,
	{ icon: ComponentProps<typeof MaterialCommunityIcons>['name']; accent: string }
> = {
	all: { icon: 'heart-pulse', accent: '#2E7D32' },
	excellent: { icon: 'leaf-circle', accent: '#1B6B2A' },
	good: { icon: 'leaf', accent: '#2E7D32' },
	ok: { icon: 'checkbox-marked-circle-outline', accent: '#B8860B' },
	bad: { icon: 'alert-outline', accent: '#E65100' },
	terrible: { icon: 'alert-octagon-outline', accent: '#C62828' },
	unknown: { icon: 'help-circle-outline', accent: '#6E776F' },
};

const HEALTH_ORDER: Record<string, number> = {
	excellent: 0,
	good: 1,
	ok: 2,
	bad: 3,
	terrible: 4,
	unknown: 5,
};

const HEALTH_COLOUR: Record<string, string> = {
	excellent: '#1B6B2A',
	good: '#2E7D32',
	ok: '#F9A825',
	bad: '#E65100',
	terrible: '#C62828',
	unknown: '#7A7A7A',
};

function healthLabel(tree: TreeWithOwnership): string {
	if (tree.health) return tree.health.charAt(0).toUpperCase() + tree.health.slice(1);
	if (tree.disease && tree.disease.trim().length > 0) return 'Bad';
	return 'Unknown';
}

function healthKey(tree: TreeWithOwnership): string {
	if (tree.health) return tree.health;
	if (tree.disease && tree.disease.trim().length > 0) return 'bad';
	return 'unknown';
}

type DropdownOption<T extends string> = {
	key: T;
	label: string;
	icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
	accent?: string;
};

function FilterDropdown<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: DropdownOption<T>[];
	onChange: (value: T) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const { height, width } = useWindowDimensions();
	const selected = options.find((option) => option.key === value) ?? options[0];
	const accent = selected.accent ?? Theme.Colours.primary;
	const menuMaxHeight = Math.max(180, Math.min(width >= 700 ? 340 : 260, height * 0.42));

	return (
		<View style={[styles.dropdownShell, isOpen && styles.dropdownShellOpen]}>
			<Pressable
				style={[styles.dropdownTrigger, { borderColor: `${accent}66` }]}
				onPress={() => setIsOpen((current) => !current)}
			>
				<View style={styles.dropdownCopy}>
					<MaterialCommunityIcons name={selected.icon} size={17} color={accent} />
					<View style={styles.dropdownTextStack}>
						<AppText style={styles.dropdownLabel}>{label}</AppText>
						<AppText style={styles.dropdownValue}>{selected.label}</AppText>
					</View>
				</View>
				<MaterialCommunityIcons
					name={isOpen ? 'chevron-up' : 'chevron-down'}
					size={20}
					color={Theme.Colours.primary}
				/>
			</Pressable>

			{isOpen ? (
				<ScrollView
					style={[styles.dropdownMenu, { maxHeight: menuMaxHeight }]}
					contentContainerStyle={styles.dropdownMenuContent}
					nestedScrollEnabled
					showsVerticalScrollIndicator={options.length > 6}
				>
					{options.map((option) => {
						const selectedOption = option.key === value;
						const optionAccent = option.accent ?? Theme.Colours.primary;

						return (
							<Pressable
								key={option.key}
								style={[styles.dropdownOption, selectedOption && styles.dropdownOptionActive]}
								onPress={() => {
									onChange(option.key);
									setIsOpen(false);
								}}
							>
								<View style={styles.dropdownCopy}>
									<MaterialCommunityIcons name={option.icon} size={16} color={optionAccent} />
									<AppText
										style={[
											styles.dropdownOptionText,
											selectedOption && styles.dropdownOptionTextActive,
										]}
									>
										{option.label}
									</AppText>
								</View>
								{selectedOption ? (
									<MaterialCommunityIcons name="check" size={17} color={Theme.Colours.primary} />
								) : null}
							</Pressable>
						);
					})}
				</ScrollView>
			) : null}
		</View>
	);
}

export default function MyTreesPage() {
	const { user, isLoading: isLoadingUser } = useSessionUser();
	const { width } = useWindowDimensions();
	const [trees, setTrees] = useState<TreeWithOwnership[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [sortKey, setSortKey] = useState<SortKey>('date_desc');
	const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
	const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
	const [speciesFilter, setSpeciesFilter] = useState<string>('all');

	useEffect(() => {
		if (isLoadingUser || !user?.id) return;

		const loadTrees = async () => {
			setIsLoading(true);
			setLoadError(null);

			try {
				const treesFromApi = await fetchTrees();

				const myTrees = treesFromApi.filter((tree) => {
					const isCreator = Number(tree.creator_user_id) === Number(user?.id);
					const isAllocatedGuardian =
						Array.isArray(tree.guardian_user_ids) &&
						tree.guardian_user_ids.some((id) => Number(id) === Number(user?.id));

					return isCreator || isAllocatedGuardian;
				});

				setTrees(myTrees);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unexpected error loading trees.';
				setLoadError(message);
			} finally {
				setIsLoading(false);
			}
		};

		loadTrees();
	}, [isLoadingUser, user?.id]);

	const availableSpecies = useMemo(() => {
		const seen = new Set<string>();
		trees.forEach((t) => {
			if (t.species?.trim()) seen.add(t.species.trim());
		});
		return Array.from(seen).sort();
	}, [trees]);

	const speciesOptions = useMemo<DropdownOption<string>[]>(() => [
		{ key: 'all', label: 'All species', icon: 'forest', accent: Theme.Colours.primary },
		...availableSpecies.map((species) => ({
			key: species,
			label: species,
			icon: 'pine-tree' as const,
			accent: '#2F6B3B',
		})),
	], [availableSpecies]);

	const healthFilterOptions = useMemo<DropdownOption<HealthFilter>[]>(
		() =>
			HEALTH_OPTIONS.map((option) => ({
				...option,
				icon: HEALTH_FILTER_META[option.key].icon,
				accent: HEALTH_FILTER_META[option.key].accent,
			})),
		[],
	);

	const treeSummary = useMemo(() => {
		const needsAttention = trees.filter(
			(tree) => tree.health === 'bad' || tree.health === 'terrible' ||
				Boolean(tree.disease && tree.disease.trim().length > 0),
		).length;

		return {
			total: trees.length,
			healthy: trees.length - needsAttention,
			attention: needsAttention,
		};
	}, [trees]);

	const displayedTrees = useMemo(() => {
		let result = [...trees];

		if (roleFilter === 'created') {
			result = result.filter((t) => Number(t.creator_user_id) === Number(user?.id));
		} else if (roleFilter === 'guardian') {
			result = result.filter(
				(t) =>
					Array.isArray(t.guardian_user_ids) &&
					t.guardian_user_ids.some((id) => Number(id) === Number(user?.id)),
			);
		}

		if (healthFilter !== 'all') {
			result = result.filter((t) => healthKey(t) === healthFilter);
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
				case 'health':
					return (HEALTH_ORDER[healthKey(a)] ?? 5) - (HEALTH_ORDER[healthKey(b)] ?? 5);
				default:
					return 0;
			}
		});

		return result;
	}, [trees, roleFilter, healthFilter, speciesFilter, sortKey, user?.id]);

	const openTreeDashboard = (treeId?: number | null) => {
		if (!treeId) return;

		router.push({
			pathname: `../treeDashboard/${treeId}`,
			params: { treeId: String(treeId) },
		});
	};

	const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;
	const cardGap = Theme.Spacing.small;

	if (isLoadingUser) {
		return (
			<>
				<Stack.Screen options={{ title: 'My Trees | TreeGuardians' }} />
				<FaviconHead title="My Trees | TreeGuardians" />
				<AppContainer backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
					<View style={styles.loadingRow}>
						<ActivityIndicator color={Theme.Colours.white} />
						<AppText style={styles.loadingTextLight}>Loading session...</AppText>
					</View>
				</AppContainer>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ title: 'My Trees | TreeGuardians' }} />
			<FaviconHead title="My Trees | TreeGuardians" />
			<AppContainer backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
				<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator
			>
				{/* Top navigation */}
				<View style={styles.topBar}>
					<Pressable style={styles.mapNavButton} onPress={() => router.push('/mainPage')}>
						<MaterialCommunityIcons name="map-marker-radius-outline" size={17} color="#FFFFFF" />
						<AppText style={styles.mapNavButtonText}>Back to Map</AppText>
					</Pressable>
				</View>

				{/* Page header */}
				<AppText variant="title" style={styles.pageTitle}>
					My Trees
				</AppText>
				<AppText style={styles.pageSubtitle}>
					Trees created by you or allocated to your account.
				</AppText>

				{/* Stats row */}
				<View style={styles.statsRow}>
					<View style={styles.statCard}>
						<AppText style={styles.statValue}>{treeSummary.total}</AppText>
						<AppText style={styles.statLabel}>Total</AppText>
					</View>
					<View style={styles.statCard}>
						<AppText style={[styles.statValue, { color: '#1B6B2A' }]}>{treeSummary.healthy}</AppText>
						<AppText style={styles.statLabel}>Healthy</AppText>
					</View>
					<View style={styles.statCard}>
						<AppText style={[styles.statValue, { color: Theme.Colours.warning }]}>{treeSummary.attention}</AppText>
						<AppText style={styles.statLabel}>Attention</AppText>
					</View>
				</View>

				{/* Filter / sort toolbar */}
				<View style={styles.toolbar}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
						{/* Role filter */}
						{(['all', 'created', 'guardian'] as RoleFilter[]).map((r) => (
							<Pressable
								key={r}
								style={[styles.chip, roleFilter === r && styles.chipActive]}
								onPress={() => setRoleFilter(r)}
							>
								<AppText style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
									{r === 'all' ? 'All roles' : r === 'created' ? 'Created by me' : 'Guarding'}
								</AppText>
							</Pressable>
						))}
					</ScrollView>

					<View style={styles.dropdownRow}>
						<FilterDropdown
							label="Tree Health"
							value={healthFilter}
							options={healthFilterOptions}
							onChange={setHealthFilter}
						/>
						<FilterDropdown
							label="Tree Species"
							value={speciesFilter}
							options={speciesOptions}
							onChange={setSpeciesFilter}
						/>
					</View>

					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
						{/* Sort */}
						{SORT_OPTIONS.map((opt) => (
							<Pressable
								key={opt.key}
								style={[styles.chip, sortKey === opt.key && styles.chipActive]}
								onPress={() => setSortKey(opt.key)}
							>
								<AppText style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
									{opt.label}
								</AppText>
							</Pressable>
						))}
					</ScrollView>
				</View>

				{/* Loading / error states */}
				{isLoading ? (
					<View style={styles.loadingRow}>
						<ActivityIndicator color={Theme.Colours.white} />
						<AppText style={styles.loadingTextLight}>Loading trees...</AppText>
					</View>
				) : null}
				{loadError ? <AppText style={styles.errorText}>{loadError}</AppText> : null}

				{/* Tree grid */}
				{!isLoading && displayedTrees.length === 0 && !loadError ? (
					<View style={styles.emptyCard}>
						<AppText style={styles.emptyText}>
							{trees.length === 0
								? 'You do not currently have any created or allocated trees.'
								: 'No trees match the current filters.'}
						</AppText>
					</View>
				) : (
					<View style={[styles.grid, { gap: cardGap }]}>
						{displayedTrees.map((tree, index) => {
							const hKey = healthKey(tree);
							const hColour = HEALTH_COLOUR[hKey] ?? '#7A7A7A';

							return (
								<Pressable
									key={tree.id ?? `${tree.latitude}-${tree.longitude}-${index}`}
									style={[styles.card, { flexBasis: `${100 / columns}%` }]}
									onPress={() => openTreeDashboard(tree.id)}
								>
									<View style={styles.cardHeader}>
										<AppText style={styles.cardId}>Tree #{tree.id ?? '—'}</AppText>
										<View style={[styles.healthBadge, { backgroundColor: hColour + '22', borderColor: hColour + '55' }]}>
											<AppText style={[styles.healthBadgeText, { color: hColour }]}>
												{healthLabel(tree)}
											</AppText>
										</View>
									</View>
									{tree.species ? (
										<AppText style={styles.cardSpecies}>{tree.species}</AppText>
									) : (
										<AppText style={styles.cardSpeciesMuted}>Species unknown</AppText>
									)}
									<AppText style={styles.cardCoords}>
										{tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
									</AppText>
									<AppText style={styles.cardCta}>Tap to open →</AppText>
								</Pressable>
							);
						})}
					</View>
				)}

				{/* Footer navigation */}
				<View style={styles.footer}>
					<AppButton
						title="Return to Map"
						variant="secondary"
						buttonStyle={styles.returnMapButton}
						textStyle={styles.returnMapButtonText}
						onPress={() => router.push('/mainPage')}
					/>
				</View>
			</ScrollView>
		</AppContainer>
		</>
	);
}

const CARD_GLASS = {
	backgroundColor: 'rgba(255, 255, 255, 0.96)',
	borderRadius: Theme.Radius.card,
	borderWidth: 1,
	borderColor: 'rgba(255, 255, 255, 0.82)',
	borderTopColor: 'rgba(255, 255, 255, 0.95)',
	shadowColor: '#0D1F10',
	shadowOffset: { width: 0, height: 10 },
	shadowOpacity: 0.22,
	shadowRadius: 18,
	elevation: 11,
} as const;

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: Theme.Spacing.extraLarge,
	},
	topBar: {
		marginBottom: Theme.Spacing.medium,
		alignItems: 'flex-start',
	},
	mapNavButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 18,
		backgroundColor: 'rgba(46, 125, 50, 0.84)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.72)',
		shadowColor: '#09210D',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.24,
		shadowRadius: 16,
		elevation: 8,
	},
	mapNavButtonText: {
		color: '#FFFFFF',
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 13,
	},
	pageTitle: {
		color: '#FFFFFF',
		textShadowColor: 'rgba(0,0,0,0.4)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 6,
		marginBottom: Theme.Spacing.small,
	},
	pageSubtitle: {
		color: 'rgba(255,255,255,0.88)',
		textShadowColor: 'rgba(0,0,0,0.3)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
		marginBottom: Theme.Spacing.medium,
	},

	/* Stats */
	statsRow: {
		flexDirection: 'row',
		gap: Theme.Spacing.small,
		marginBottom: Theme.Spacing.medium,
	},
	statCard: {
		...CARD_GLASS,
		flex: 1,
		padding: Theme.Spacing.small,
		alignItems: 'center',
	},
	statValue: {
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 22,
		color: Theme.Colours.primary,
	},
	statLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},

	/* Toolbar */
	toolbar: {
		...CARD_GLASS,
		padding: Theme.Spacing.small,
		marginBottom: Theme.Spacing.medium,
		zIndex: 5,
	},
	toolbarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.extraSmall,
		paddingVertical: 4,
	},
	chip: {
		paddingVertical: 5,
		paddingHorizontal: 12,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.78)',
		borderWidth: 1,
		borderColor: 'rgba(46,125,50,0.18)',
	},
	chipActive: {
		backgroundColor: Theme.Colours.primary,
		borderColor: Theme.Colours.primary,
	},
	chipText: {
		fontSize: 12,
		color: Theme.Colours.primary,
		fontFamily: 'Poppins_600SemiBold',
	},
	chipTextActive: {
		color: '#FFFFFF',
	},
	chipDivider: {
		width: 1,
		height: 20,
		backgroundColor: 'rgba(255,255,255,0.3)',
		marginHorizontal: 4,
	},
	dropdownRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Theme.Spacing.small,
		paddingVertical: 6,
		zIndex: 30,
	},
	dropdownShell: {
		flexGrow: 1,
		flexBasis: 220,
		minWidth: 190,
		position: 'relative',
		zIndex: 1,
	},
	dropdownShellOpen: {
		zIndex: 40,
	},
	dropdownTrigger: {
		minHeight: 54,
		borderRadius: Theme.Radius.medium,
		borderWidth: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		paddingHorizontal: Theme.Spacing.medium,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowColor: '#0D1F10',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 4,
	},
	dropdownCopy: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 9,
		flexShrink: 1,
	},
	dropdownTextStack: {
		flexShrink: 1,
	},
	dropdownLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 10,
		fontFamily: 'Poppins_600SemiBold',
		textTransform: 'uppercase',
	},
	dropdownValue: {
		color: Theme.Colours.textPrimary,
		fontSize: 14,
		fontFamily: 'Poppins_600SemiBold',
	},
	dropdownMenu: {
		position: 'absolute',
		top: 62,
		left: 0,
		right: 0,
		padding: 6,
		borderRadius: Theme.Radius.medium,
		backgroundColor: 'rgba(255, 255, 255, 0.98)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.86)',
		shadowColor: '#0D1F10',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 16,
		elevation: 8,
		zIndex: 50,
	},
	dropdownMenuContent: {
		gap: 4,
	},
	dropdownOption: {
		minHeight: 40,
		borderRadius: 10,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dropdownOptionActive: {
		backgroundColor: 'rgba(46, 125, 50, 0.1)',
	},
	dropdownOptionText: {
		color: Theme.Colours.textPrimary,
		fontSize: 13,
	},
	dropdownOptionTextActive: {
		color: Theme.Colours.primary,
		fontFamily: 'Poppins_600SemiBold',
	},

	/* Loading / error */
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.small,
		marginBottom: Theme.Spacing.small,
	},
	loadingTextLight: {
		color: 'rgba(255,255,255,0.9)',
	},
	errorText: {
		color: '#FFCDD2',
		marginBottom: Theme.Spacing.small,
	},

	/* Empty state */
	emptyCard: {
		...CARD_GLASS,
		padding: Theme.Spacing.large,
		alignItems: 'center',
	},
	emptyText: {
		color: Theme.Colours.textMuted,
		textAlign: 'center',
	},

	/* Grid */
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: Theme.Spacing.medium,
	},
	card: {
		...CARD_GLASS,
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.small,
		flexGrow: 1,
		borderColor: 'rgba(255, 255, 255, 0.9)',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	cardId: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		fontSize: 14,
	},
	healthBadge: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	healthBadgeText: {
		fontSize: 11,
		fontFamily: 'Poppins_600SemiBold',
	},
	cardSpecies: {
		color: Theme.Colours.textPrimary,
		fontSize: 13,
		marginBottom: 2,
	},
	cardSpeciesMuted: {
		color: Theme.Colours.textMuted,
		fontSize: 13,
		fontStyle: 'italic',
		marginBottom: 2,
	},
	cardCoords: {
		color: Theme.Colours.textMuted,
		fontSize: 11,
		marginBottom: 4,
	},
	cardCta: {
		color: Theme.Colours.primary,
		fontSize: 11,
		fontFamily: 'Poppins_600SemiBold',
	},

	/* Footer */
	footer: {
		marginTop: Theme.Spacing.small,
	},
	returnMapButton: {
		backgroundColor: 'rgba(255, 255, 255, 0.94)',
		borderColor: 'rgba(255, 255, 255, 0.86)',
		borderWidth: 1,
		shadowColor: '#0D1F10',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.22,
		shadowRadius: 16,
		elevation: 9,
	},
	returnMapButtonText: {
		color: Theme.Colours.primary,
	},
});
