import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import { FaviconHead } from '@/components/base/FaviconHead';
import {
	fetchAnalytics,
	fetchActivityTrend,
	fetchUserAnalytics,
	AnalyticsResponse,
	ActivityTrendResponse,
	UserAnalyticsResponse,
} from '@/lib/adminApi';

// ─── Shared activity line chart ─────────────────────────────────────────────

type ActivityChartPoint = { day: string; label: string; value: number };
type TimeSeries = { label: string; colour: string; data: ActivityChartPoint[] };

function TimeSeriesLineChart({
	title,
	series,
}: {
	title: string;
	series: TimeSeries[];
}) {
	const [chartSize, setChartSize] = useState({ width: 320, height: 260 });
	const labels = series.find((item) => item.data.length > 0)?.data ?? [];

	if (labels.length === 0) {
		return <AppText style={styles.chartEmpty}>No data for this period.</AppText>;
	}

	const width = Math.max(1, chartSize.width);
	const height = Math.max(1, chartSize.height);
	const padding = { top: 18, right: 14, bottom: 32, left: 34 };
	const plotWidth = width - padding.left - padding.right;
	const plotHeight = height - padding.top - padding.bottom;
	const maxValue = Math.max(1, ...series.flatMap((item) => item.data.map((d) => d.value)));
	const yTicks = Array.from(new Set([maxValue, Math.floor(maxValue / 2), 0]));
	const labelIndexes = Array.from(new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1]));
	const pointX = (index: number, total: number) =>
		padding.left + (total <= 1 ? plotWidth / 2 : (index / (total - 1)) * plotWidth);
	const pointY = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
	const buildPath = (data: ActivityChartPoint[]) =>
		data
			.map((point, index) => `${index === 0 ? 'M' : 'L'} ${pointX(index, data.length).toFixed(2)} ${pointY(point.value).toFixed(2)}`)
			.join(' ');
	const accessibilitySummary = labels
		.map((label, index) => {
			const values = series.map((item) => `${item.data[index]?.value ?? 0} ${item.label}`).join(', ');
			return `${label.label}: ${values}`;
		})
		.join('. ');

	return (
		<View
			style={styles.chartFrame}
			onLayout={(event) => {
				const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
				if (nextWidth > 0 && nextHeight > 0 && (nextWidth !== chartSize.width || nextHeight !== chartSize.height)) {
					setChartSize({ width: nextWidth, height: nextHeight });
				}
			}}
			accessible
			accessibilityRole="image"
			accessibilityLabel={`Daily activity line chart. ${accessibilitySummary}`}
		>
			<Svg style={StyleSheet.absoluteFillObject} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<G>
					{yTicks.map((tick) => {
						const y = pointY(tick);
						return (
							<G key={tick}>
								<Line
									x1={padding.left}
									y1={y}
									x2={width - padding.right}
									y2={y}
									stroke="#E2E8E2"
									strokeWidth={1}
								/>
								<SvgText
									x={padding.left - 8}
									y={y + 4}
									fill={Theme.Colours.textMuted}
									fontSize={10}
									textAnchor="end"
								>
									{tick}
								</SvgText>
							</G>
						);
					})}

					<Line
						x1={padding.left}
						y1={padding.top}
						x2={padding.left}
						y2={padding.top + plotHeight}
						stroke="#CBD8CB"
						strokeWidth={1}
					/>
					<Line
						x1={padding.left}
						y1={padding.top + plotHeight}
						x2={width - padding.right}
						y2={padding.top + plotHeight}
						stroke="#CBD8CB"
						strokeWidth={1}
					/>

					{labelIndexes.map((index) => (
						<SvgText
							key={labels[index].day}
							x={pointX(index, labels.length)}
							y={height - 14}
							fill={Theme.Colours.textMuted}
							fontSize={10}
							textAnchor="middle"
						>
							{labels[index].label}
						</SvgText>
					))}

					{series.filter((item) => item.data.length > 0).map((item) => (
						<G key={item.label}>
							<Path
								d={buildPath(item.data)}
								fill="none"
								stroke={item.colour}
								strokeWidth={3}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							{item.data.map((point, index) => (
								<Circle
									key={`${item.label}-${point.day}`}
									cx={pointX(index, item.data.length)}
									cy={pointY(point.value)}
									r={3.25}
									fill="#FFFFFF"
									stroke={item.colour}
									strokeWidth={2}
								/>
							))}
						</G>
					))}
				</G>
			</Svg>

			<View style={styles.chartOverlay} pointerEvents="none">
				<AppText style={styles.chartTitle}>{title}</AppText>
				<View style={styles.chartLegend}>
					{series.map((item) => (
						<View key={item.label} style={styles.chartLegendItem}>
							<View style={[styles.chartLegendDot, { backgroundColor: item.colour }]} />
							<AppText style={styles.chartLegendText}>{item.label}</AppText>
						</View>
					))}
				</View>
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

function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function normalizeDayKey(day: string): string {
	const trimmed = String(day || '').trim();
	const isoDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
	if (isoDate) return isoDate[1];

	const parsed = new Date(trimmed);
	if (!Number.isNaN(parsed.getTime())) {
		return formatDateKey(parsed);
	}

	return trimmed.slice(0, 10);
}

function lastNDaysLabels(data: { day: string; count: number }[], n: number): ActivityChartPoint[] {
	const today = new Date();
	const result: ActivityChartPoint[] = [];
	const byDay = new Map(data.map((d) => [normalizeDayKey(d.day), Number(d.count) || 0]));

	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const key = formatDateKey(d);
		const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		result.push({ day: key, label, value: byDay.get(key) ?? 0 });
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
	const registeredUserTrend = activityTrend ? lastNDaysLabels(activityTrend.registeredUsersPerDay, 14) : [];
	const loginTrend = activityTrend ? lastNDaysLabels(activityTrend.loginsPerDay, 14) : [];

	return (
		<>
			<Stack.Screen options={{ title: 'Analytics | TreeGuardians' }} />
			<FaviconHead title="Analytics | TreeGuardians" />
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

							<View style={[styles.glassCard, styles.chartCard]}>
								<TimeSeriesLineChart
									title="Trees Added & Comments Posted"
									series={[
										{ label: 'Trees Added', colour: Theme.Colours.primary, data: treeTrend },
										{ label: 'Comments Posted', colour: '#2563EB', data: commentTrend },
									]}
								/>
							</View>

							<View style={[styles.glassCard, styles.chartCard]}>
								<TimeSeriesLineChart
									title="Users Registered & Logged In"
									series={[
										{ label: 'Users Registered', colour: '#7C3AED', data: registeredUserTrend },
										{ label: 'People Logged In', colour: '#EA580C', data: loginTrend },
									]}
								/>
							</View>
						</View>

						{/* ── User Analytics ────────────────────────────────────── */}
						{userAnalytics ? (
							<View style={styles.section}>
								<AppText style={styles.sectionTitle}>User Analytics</AppText>

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
		</>
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
		flexWrap: 'wrap',
		gap: Theme.Spacing.small,
	},
	statCard: {
		flex: 1,
		minWidth: 130,
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

	// Activity line chart
	chartCard: {
		height: 260,
		padding: 0,
		overflow: 'hidden',
	},
	chartFrame: {
		flex: 1,
		width: '100%',
		height: '100%',
		position: 'relative',
		backgroundColor: 'rgba(248, 252, 248, 0.74)',
	},
	chartOverlay: {
		position: 'absolute',
		top: 12,
		left: 12,
		right: 12,
		zIndex: 2,
	},
	chartTitle: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		fontSize: 14,
		marginBottom: 6,
	},
	chartLegend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chartLegendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(255, 255, 255, 0.78)',
		borderWidth: 1,
		borderColor: 'rgba(215, 228, 215, 0.9)',
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	chartLegendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	chartLegendText: {
		color: Theme.Colours.textPrimary,
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
	},
	chartEmpty: {
		color: Theme.Colours.textMuted,
		fontStyle: 'italic',
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
		minWidth: 0,
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
		minWidth: 130,
		flexGrow: 1,
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
