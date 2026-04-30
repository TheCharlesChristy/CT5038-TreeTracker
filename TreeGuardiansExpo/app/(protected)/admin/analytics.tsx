import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import {
	fetchAnalytics,
	fetchActivityTrend,
	fetchUserAnalytics,
	AnalyticsResponse,
	ActivityTrendResponse,
	UserAnalyticsResponse,
} from '@/lib/adminApi';

// ─── Inline bar chart ───────────────────────────────────────────────────────

type BarChartItem = { label: string; value: number };

function MiniBarChart({
	data,
	colour,
	unit = '',
}: {
	data: BarChartItem[];
	colour: string;
	unit?: string;
}) {
	if (data.length === 0) {
		return <AppText style={styles.chartEmpty}>No data for this period.</AppText>;
	}

	const maxValue = Math.max(...data.map((d) => d.value), 1);

	return (
		<View>
			{/* Accessible data table (screen readers + non-visual) */}
			<View style={styles.chartAccessTable} accessible accessibilityRole="table">
				{data.map((item, idx) => (
					<View key={idx} style={styles.chartAccessRow}>
						<AppText style={styles.chartBarLabel}>{item.label}</AppText>
						<View style={styles.chartBarTrack}>
							<View
								style={[
									styles.chartBarFill,
									{
										width: `${Math.round((item.value / maxValue) * 100)}%` as `${number}%`,
										backgroundColor: colour,
									},
								]}
							/>
						</View>
						<AppText style={styles.chartBarValue}>
							{item.value}
							{unit}
						</AppText>
					</View>
				))}
			</View>
		</View>
	);
}

// ─── Role breakdown bar ──────────────────────────────────────────────────────

function RoleBreakdownBar({ breakdown }: { breakdown: UserAnalyticsResponse['roleBreakdown'] }) {
	const total = breakdown.admin + breakdown.guardian + breakdown.registered_user || 1;
	const segments = [
		{ label: 'Admin', count: breakdown.admin, colour: '#3730A3', bg: '#C7D2FE' },
		{ label: 'Guardian', count: breakdown.guardian, colour: '#065F46', bg: '#A7F3D0' },
		{ label: 'User', count: breakdown.registered_user, colour: '#374151', bg: '#D1D5DB' },
	];

	return (
		<View style={styles.roleBreakdown}>
			<View style={styles.roleBar} accessible accessibilityRole="progressbar">
				{segments
					.filter((s) => s.count > 0)
					.map((s) => (
						<View
							key={s.label}
							style={[
								styles.roleBarSegment,
								{
									flex: s.count,
									backgroundColor: s.bg,
									borderColor: s.colour + '60',
								},
							]}
						/>
					))}
			</View>

			<View style={styles.roleLegend}>
				{segments.map((s) => (
					<View key={s.label} style={styles.roleLegendItem}>
						<View style={[styles.roleLegendDot, { backgroundColor: s.bg, borderColor: s.colour }]} />
						<AppText style={styles.roleLegendText}>
							{s.label}: {s.count} ({Math.round((s.count / total) * 100)}%)
						</AppText>
					</View>
				))}
			</View>
		</View>
	);
}

// ─── Contributor list ────────────────────────────────────────────────────────

function ContributorList({
	items,
	label,
}: {
	items: { id: number; username: string; count: number }[];
	label: string;
}) {
	if (items.length === 0) {
		return <AppText style={styles.chartEmpty}>No data yet.</AppText>;
	}

	const max = Math.max(...items.map((i) => i.count), 1);

	return (
		<View>
			{items.map((item, idx) => (
				<View key={item.id} style={styles.contributorRow}>
					<AppText style={styles.contributorRank}>#{idx + 1}</AppText>
					<AppText style={styles.contributorName} numberOfLines={1}>
						{item.username}
					</AppText>
					<View style={styles.contributorBarTrack}>
						<View
							style={[
								styles.contributorBarFill,
								{ width: `${Math.round((item.count / max) * 100)}%` as `${number}%` },
							]}
						/>
					</View>
					<AppText style={styles.contributorCount}>
						{item.count} {label}
					</AppText>
				</View>
			))}
		</View>
	);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatImpactValue(value: number, unit: string): string {
	if (value === 0) return `0 ${unit}`;
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
	return `${value.toFixed(1)} ${unit}`;
}

function lastNDaysLabels(data: { day: string; count: number }[], n: number): { label: string; value: number }[] {
	const today = new Date();
	const result: { label: string; value: number }[] = [];
	const byDay = new Map(data.map((d) => [d.day.slice(0, 10), d.count]));

	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		result.push({ label, value: byDay.get(key) ?? 0 });
	}

	return result;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
	const { user, isLoading } = useSessionUser();
	const authorized = canAccessManageUsers(user?.role);

	const [overview, setOverview] = useState<AnalyticsResponse | null>(null);
	const [activityTrend, setActivityTrend] = useState<ActivityTrendResponse | null>(null);
	const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsResponse | null>(null);
	const [isFetching, setIsFetching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!authorized) return;

		const load = async () => {
			try {
				setIsFetching(true);
				setError(null);
				const [ov, at, ua] = await Promise.all([
					fetchAnalytics(),
					fetchActivityTrend(14),
					fetchUserAnalytics(),
				]);
				setOverview(ov);
				setActivityTrend(at);
				setUserAnalytics(ua);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unable to load analytics.');
			} finally {
				setIsFetching(false);
			}
		};

		void load();
	}, [authorized]);

	if (isLoading) {
		return (
			<AppContainer>
				<View style={styles.centered}>
					<AppText style={styles.muted}>Loading analytics access...</AppText>
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
				<AppText variant="title" style={styles.pageTitle}>Access Restricted</AppText>
				<AppText style={styles.muted}>
					Your account role ({user?.role ?? 'guest'}) does not have permission to view analytics.
				</AppText>
				<AppButton title="Return to Map" variant="secondary" onPress={() => router.push('/mainPage')} />
			</AppContainer>
		);
	}

	const treeTrend = activityTrend ? lastNDaysLabels(activityTrend.treesPerDay, 14) : [];
	const commentTrend = activityTrend ? lastNDaysLabels(activityTrend.commentsPerDay, 14) : [];

	return (
		<AppContainer>
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
				{/* Header island */}
				<View style={styles.headerIsland}>
					<View style={styles.topBar}>
						<NavigationButton onPress={() => router.push('/mainPage')} color="#FFFFFF">
							Back to Map
						</NavigationButton>
					</View>
					<AppText style={styles.headerTitle}>Analytics</AppText>
					<AppText style={styles.headerSubtitle}>
						TreeGuardians impact overview
					</AppText>
				</View>

				{isFetching ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={Theme.Colours.primary} />
						<AppText style={styles.muted}>Loading analytics...</AppText>
					</View>
				) : error ? (
					<View style={styles.errorCard}>
						<AppText style={styles.errorText}>{error}</AppText>
					</View>
				) : (
					<>
						{/* ── Key Stats ─────────────────────────────────────────── */}
						{overview ? (
							<View style={styles.section}>
								<AppText style={styles.sectionTitle}>Key Statistics</AppText>
								<View style={styles.statRow}>
									<View style={styles.statCard}>
										<AppText style={styles.statValue}>{overview.totalTrees}</AppText>
										<AppText style={styles.statLabel}>Trees</AppText>
									</View>
									<View style={styles.statCard}>
										<AppText style={styles.statValue}>{overview.totalUsers}</AppText>
										<AppText style={styles.statLabel}>Users</AppText>
									</View>
								</View>
							</View>
						) : null}

						{/* ── Activity Trend ────────────────────────────────────── */}
						<View style={styles.section}>
							<AppText style={styles.sectionTitle}>Activity — last 14 days</AppText>

							<View style={styles.glassCard}>
								<AppText style={styles.cardHeading}>Trees Added</AppText>
								<MiniBarChart
									data={treeTrend}
									colour={Theme.Colours.primary}
								/>
							</View>

							<View style={styles.glassCard}>
								<AppText style={styles.cardHeading}>Comments Posted</AppText>
								<MiniBarChart
									data={commentTrend}
									colour={Theme.Colours.secondary}
								/>
							</View>
						</View>

						{/* ── User Analytics ────────────────────────────────────── */}
						{userAnalytics ? (
							<View style={styles.section}>
								<AppText style={styles.sectionTitle}>User Analytics</AppText>

								<View style={styles.glassCard}>
									<AppText style={styles.cardHeading}>Role Breakdown</AppText>
									<AppText style={styles.cardSubheading}>
										{userAnalytics.totalUsers} total registered users
									</AppText>
									<RoleBreakdownBar breakdown={userAnalytics.roleBreakdown} />
								</View>

								<View style={styles.glassCard}>
									<AppText style={styles.cardHeading}>Top Tree Submitters</AppText>
									<ContributorList
										items={userAnalytics.topTreeSubmitters}
										label="trees"
									/>
								</View>

								<View style={styles.glassCard}>
									<AppText style={styles.cardHeading}>Top Commenters</AppText>
									<ContributorList
										items={userAnalytics.topCommenters}
										label="comments"
									/>
								</View>
							</View>
						) : null}

						{/* ── Environmental Impact ──────────────────────────────── */}
						{overview ? (
							<View style={styles.section}>
								<AppText style={styles.sectionTitle}>Environmental Impact</AppText>
								<View style={styles.impactGrid}>
									<ImpactCard label="Avoided Runoff" value={formatImpactValue(overview.impactTotals.avoidedRunoff, 'm³')} icon="💧" />
									<ImpactCard label="CO₂ Stored" value={formatImpactValue(overview.impactTotals.carbonDioxideStored, 'kg')} icon="🌿" />
									<ImpactCard label="CO₂ Removed" value={formatImpactValue(overview.impactTotals.carbonDioxideRemoved, 'kg')} icon="🌱" />
									<ImpactCard label="Water Intercepted" value={formatImpactValue(overview.impactTotals.waterIntercepted, 'm³')} icon="🌧️" />
									<ImpactCard label="Air Quality" value={formatImpactValue(overview.impactTotals.airQualityImprovement, 'g/yr')} icon="💨" />
									<ImpactCard label="Leaf Area" value={formatImpactValue(overview.impactTotals.leafArea, 'm²')} icon="🍃" />
									<ImpactCard label="Evapotranspiration" value={formatImpactValue(overview.impactTotals.evapotranspiration, 'm³')} icon="☁️" />
									<ImpactCard label="Avg Height" value={formatImpactValue(overview.impactTotals.treeHeight, 'm')} icon="🌳" />
								</View>
							</View>
						) : null}
					</>
				)}

				<AppButton
					title="Return to Map"
					variant="secondary"
					onPress={() => router.push('/mainPage')}
				/>
			</ScrollView>
		</AppContainer>
	);
}

function ImpactCard({ label, value, icon }: { label: string; value: string; icon: string }) {
	return (
		<View style={styles.impactCard}>
			<AppText style={styles.impactIcon}>{icon}</AppText>
			<AppText style={styles.impactValue}>{value}</AppText>
			<AppText style={styles.impactLabel}>{label}</AppText>
		</View>
	);
}

const styles = StyleSheet.create({
	scroll: {
		paddingBottom: Theme.Spacing.extraLarge,
		paddingHorizontal: Theme.Spacing.medium,
	},

	// Header island — floating glass
	headerIsland: {
		backgroundColor: 'rgba(18, 72, 32, 0.88)',
		borderRadius: Theme.Radius.medium,
		borderWidth: 1.5,
		borderColor: 'rgba(255, 255, 255, 0.22)',
		borderTopColor: 'rgba(255, 255, 255, 0.40)',
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.large,
		shadowColor: '#0D1610',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.20,
		shadowRadius: 16,
		elevation: 6,
	},
	headerTitle: {
		color: '#FFFFFF',
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 22,
		marginBottom: 2,
	},
	headerSubtitle: {
		color: 'rgba(255,255,255,0.75)',
		fontSize: 13,
	},

	topBar: {
		marginBottom: Theme.Spacing.small,
	},
	pageTitle: {
		color: Theme.Colours.primary,
		marginBottom: Theme.Spacing.small,
	},
	muted: {
		color: Theme.Colours.textMuted,
		marginBottom: Theme.Spacing.large,
	},
	centered: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: Theme.Spacing.extraLarge,
		gap: Theme.Spacing.small,
	},

	// Section layout
	section: {
		marginBottom: Theme.Spacing.large,
	},
	sectionTitle: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		fontSize: 15,
		marginBottom: Theme.Spacing.small,
	},

	// Stat row
	statRow: {
		flexDirection: 'row',
		gap: Theme.Spacing.small,
	},
	statCard: {
		flex: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.90)',
		borderRadius: Theme.Radius.medium,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderTopColor: 'rgba(255,255,255,0.9)',
		padding: Theme.Spacing.medium,
		alignItems: 'center',
		shadowColor: '#2E7D32',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 2,
	},
	statValue: {
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 28,
		color: Theme.Colours.primary,
	},
	statLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 13,
	},

	// Glass card
	glassCard: {
		backgroundColor: 'rgba(255, 255, 255, 0.88)',
		borderRadius: Theme.Radius.medium,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderTopColor: 'rgba(255,255,255,0.95)',
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.small,
		shadowColor: '#2E7D32',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.07,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeading: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		marginBottom: 4,
	},
	cardSubheading: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
		marginBottom: Theme.Spacing.small,
	},

	// Bar chart
	chartAccessTable: {
		gap: 6,
	},
	chartAccessRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.small,
	},
	chartBarLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 11,
		width: 50,
		flexShrink: 0,
	},
	chartBarTrack: {
		flex: 1,
		height: 16,
		backgroundColor: '#F0F5F0',
		borderRadius: 4,
		overflow: 'hidden',
	},
	chartBarFill: {
		height: '100%',
		borderRadius: 4,
		minWidth: 2,
	},
	chartBarValue: {
		color: Theme.Colours.textPrimary,
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
		width: 28,
		textAlign: 'right',
		flexShrink: 0,
	},
	chartEmpty: {
		color: Theme.Colours.textMuted,
		fontStyle: 'italic',
	},

	// Role breakdown
	roleBreakdown: {
		gap: Theme.Spacing.small,
	},
	roleBar: {
		height: 20,
		borderRadius: 10,
		flexDirection: 'row',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#D7E4D7',
	},
	roleBarSegment: {
		height: '100%',
		borderRightWidth: 1,
	},
	roleLegend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Theme.Spacing.small,
	},
	roleLegendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	roleLegendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		borderWidth: 1,
	},
	roleLegendText: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},

	// Contributors
	contributorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.small,
		marginBottom: 6,
	},
	contributorRank: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
		width: 20,
		flexShrink: 0,
	},
	contributorName: {
		color: Theme.Colours.textPrimary,
		fontSize: 13,
		fontFamily: 'Poppins_600SemiBold',
		width: 90,
		flexShrink: 0,
	},
	contributorBarTrack: {
		flex: 1,
		height: 10,
		backgroundColor: '#F0F5F0',
		borderRadius: 5,
		overflow: 'hidden',
	},
	contributorBarFill: {
		height: '100%',
		borderRadius: 5,
		backgroundColor: Theme.Colours.secondary,
		minWidth: 2,
	},
	contributorCount: {
		color: Theme.Colours.textMuted,
		fontSize: 11,
		width: 70,
		textAlign: 'right',
		flexShrink: 0,
	},

	// Impact grid
	impactGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Theme.Spacing.small,
	},
	impactCard: {
		width: '47%',
		backgroundColor: 'rgba(255, 255, 255, 0.88)',
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		padding: Theme.Spacing.small,
		alignItems: 'center',
		gap: 2,
		shadowColor: '#2E7D32',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 1,
	},
	impactIcon: {
		fontSize: 20,
	},
	impactValue: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.primary,
		fontSize: 14,
	},
	impactLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 11,
		textAlign: 'center',
	},

	// Error
	errorCard: {
		borderWidth: 1,
		borderColor: '#FECACA',
		backgroundColor: '#FEF2F2',
		borderRadius: Theme.Radius.small,
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.medium,
	},
	errorText: {
		color: '#B91C1C',
	},
});
