import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
	TextInput,
	TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { StatusMessageBox, StatusMessage } from '@/components/base/StatusMessageBox';
import { Theme } from '@/styles/theme';
import { showConfirm } from '@/utilities/showConfirm';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import {
	assignGuardianToTree,
	deleteManagedUser,
	fetchManagedUsers,
	fetchTreeOptions,
	fetchUserActivity,
	ManagedUser,
	removeGuardianFromTree,
	updateUserRole,
	UserActivityItem,
} from '@/lib/adminApi';
import { FaviconHead } from '@/components/base/FaviconHead';

type TreeSummary = {
	id: number;
	species?: string | null;
};

type ExpandState = {
	activityLoading: boolean;
	activityLoaded: boolean;
	activity: UserActivityItem[] | null;
	activityError: string | null;
	rolePickerOpen: boolean;
	treePickerOpen: boolean;
	treeSearch: string;
};

const ROLE_OPTIONS: Array<{ value: ManagedUser['role']; label: string }> = [
	{ value: 'registered_user', label: 'User' },
	{ value: 'guardian', label: 'Guardian' },
	{ value: 'admin', label: 'Admin' },
];

function roleLabel(role: ManagedUser['role']): string {
	switch (role) {
		case 'admin': return 'Admin';
		case 'guardian': return 'Guardian';
		default: return 'User';
	}
}

function formatActivityDate(dateStr: string | null): string {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function makeDefaultExpandState(): ExpandState {
	return {
		activityLoading: false,
		activityLoaded: false,
		activity: null,
		activityError: null,
		rolePickerOpen: false,
		treePickerOpen: false,
		treeSearch: '',
	};
}

export default function ManageUsersPage() {
	const { user: sessionUser, isLoading } = useSessionUser();
	const authorized = canAccessManageUsers(sessionUser?.role);

	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [trees, setTrees] = useState<TreeSummary[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
	const [expandData, setExpandData] = useState<Record<number, ExpandState>>({});

	const showStatusMessage = (title: string, message: string, variant: 'success' | 'error') => {
		setStatusMessage({ title, message, variant, createdAt: Date.now() });
	};

	const loadData = useCallback(async () => {
		try {
			setLoadingData(true);
			setError(null);
			const [nextUsers, nextTrees] = await Promise.all([
				fetchManagedUsers(),
				fetchTreeOptions(),
			]);
			setUsers(nextUsers);
			setTrees(nextTrees);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load admin data.');
		} finally {
			setLoadingData(false);
		}
	}, []);

	useEffect(() => {
		if (authorized) {
			void loadData();
		}
	}, [authorized, loadData]);

	const filteredUsers = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return users;
		return users.filter((u) =>
			u.username.toLowerCase().includes(query) ||
			(u.email ?? '').toLowerCase().includes(query) ||
			u.role.toLowerCase().includes(query) ||
			String(u.id).includes(query)
		);
	}, [users, searchQuery]);

	const treeNameMap = useMemo(
		() => new Map(trees.map((t) => [t.id, t.species ? `${t.species} (#${t.id})` : `Tree #${t.id}`])),
		[trees]
	);

	const getExpand = (userId: number): ExpandState =>
		expandData[userId] ?? makeDefaultExpandState();

	const setExpand = (userId: number, patch: Partial<ExpandState>) => {
		setExpandData((prev) => ({
			...prev,
			[userId]: { ...(prev[userId] ?? makeDefaultExpandState()), ...patch },
		}));
	};

	const loadActivity = useCallback(async (userId: number) => {
		setExpand(userId, { activityLoading: true, activityError: null });
		try {
			const activity = await fetchUserActivity(userId);
			setExpand(userId, { activity, activityLoaded: true });
		} catch (err) {
			setExpand(userId, {
				activityError: err instanceof Error ? err.message : 'Failed to load activity.',
				activityLoaded: true,
			});
		} finally {
			setExpand(userId, { activityLoading: false });
		}
	}, []);

	const toggleExpand = (userId: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) {
				next.delete(userId);
			} else {
				next.add(userId);
				const state = expandData[userId] ?? makeDefaultExpandState();
				if (!state.activityLoaded && !state.activityLoading) {
					void loadActivity(userId);
				}
			}
			return next;
		});
	};

	const handleRoleChange = async (targetUser: ManagedUser, role: ManagedUser['role']) => {
		try {
			setBusyKey(`role-${targetUser.id}`);
			setExpand(targetUser.id, { rolePickerOpen: false });
			await updateUserRole(targetUser.id, role);
			await loadData();
			showStatusMessage('Role updated', `${targetUser.username} is now ${roleLabel(role)}.`, 'success');
		} catch (err) {
			showStatusMessage('Role update failed', err instanceof Error ? err.message : 'Unknown error.', 'error');
		} finally {
			setBusyKey(null);
		}
	};

	const handleAssignTree = async (targetUser: ManagedUser, treeId: number) => {
		try {
			setBusyKey(`assign-${targetUser.id}-${treeId}`);
			setExpand(targetUser.id, { treePickerOpen: false, treeSearch: '' });
			await assignGuardianToTree(targetUser.id, treeId);
			await loadData();
			showStatusMessage('Tree assigned', `${treeNameMap.get(treeId) ?? `Tree #${treeId}`} assigned to ${targetUser.username}.`, 'success');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error.';
			showStatusMessage(
				'Assignment failed',
				message.includes('verified')
					? 'This user must verify their email before being assigned as a guardian.'
					: message,
				'error'
			);
		} finally {
			setBusyKey(null);
		}
	};

	const handleRemoveTree = async (targetUser: ManagedUser, treeId: number) => {
		try {
			setBusyKey(`remove-tree-${targetUser.id}-${treeId}`);
			await removeGuardianFromTree(targetUser.id, treeId);
			await loadData();
		} catch (err) {
			showStatusMessage('Removal failed', err instanceof Error ? err.message : 'Unknown error.', 'error');
		} finally {
			setBusyKey(null);
		}
	};

	const handleDeleteUser = (targetUser: ManagedUser) => {
		if (sessionUser?.id === targetUser.id) {
			showStatusMessage('Action blocked', 'You cannot delete your own admin account.', 'error');
			return;
		}
		showConfirm(
			'Delete User',
			`Are you sure you want to permanently delete ${targetUser.username}? This cannot be undone.`,
			async () => {
				try {
					setBusyKey(`delete-${targetUser.id}`);
					await deleteManagedUser(targetUser.id);
					setExpandedIds((prev) => { const next = new Set(prev); next.delete(targetUser.id); return next; });
					await loadData();
					showStatusMessage('User deleted', `${targetUser.username} has been removed.`, 'success');
				} catch (err) {
					showStatusMessage('Delete failed', err instanceof Error ? err.message : 'Unknown error.', 'error');
				} finally {
					setBusyKey(null);
				}
			}
		);
	};

	if (isLoading) {
		return (
			<AppContainer>
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.subtitle}>Loading admin access...</AppText>
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
					Your account role ({sessionUser?.role ?? 'guest'}) does not have permission to manage users.
				</AppText>
				<AppButton title="Return to Map" variant="secondary" onPress={() => router.push('/mainPage')} />
			</AppContainer>
		);
	}

	return (
		<>
			<Stack.Screen options={{ title: 'Manage Users | TreeGuardians' }} />
			<FaviconHead title="Manage Users | TreeGuardians" />
			<AppContainer>
				<StatusMessageBox status={statusMessage} onClose={() => setStatusMessage(null)} />

			<View style={styles.topBar}>
				<NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
			</View>

			<AppText variant="title" style={styles.title}>Manage Users</AppText>
			<AppText style={styles.subtitle}>
				Promote admins, assign guardians to trees, and remove accounts.
			</AppText>

			<TextInput
				value={searchQuery}
				onChangeText={setSearchQuery}
				placeholder="Search by username, email, role or ID"
				style={styles.searchInput}
				placeholderTextColor={Theme.Colours.textMuted}
			/>

			<AppText style={styles.resultsText}>
				Showing {filteredUsers.length} of {users.length} users
			</AppText>

			{loadingData ? (
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.subtitle}>Loading users...</AppText>
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.listContent}>
					{error ? (
						<View style={styles.errorBox}>
							<AppText style={styles.errorText}>{error}</AppText>
							<AppButton title="Retry" variant="secondary" onPress={() => void loadData()} />
						</View>
					) : null}

					{filteredUsers.length === 0 && !error ? (
						<View style={styles.emptyState}>
							<AppText style={styles.userMeta}>No users matched your search.</AppText>
						</View>
					) : null}

						{filteredUsers.map((managedUser) => {
							const isExpanded = expandedIds.has(managedUser.id);
							const expand = getExpand(managedUser.id);
							const isBusy = busyKey !== null;
							const badgeStyle = roleBadgeColors(managedUser.role);

							return (
								<View key={managedUser.id} style={styles.userCard}>
								<TouchableOpacity
									onPress={() => toggleExpand(managedUser.id)}
									style={styles.cardHeader}
									activeOpacity={0.75}
								>
									<View style={styles.cardHeaderLeft}>
										<AppText style={styles.userName}>{managedUser.username}</AppText>
										<AppText style={styles.userMeta}>ID #{managedUser.id}</AppText>
									</View>
									<View style={styles.cardHeaderRight}>
										<View style={[styles.roleBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
											<AppText style={[styles.roleBadgeText, { color: badgeStyle.text }]}>
												{roleLabel(managedUser.role)}
											</AppText>
										</View>
										<AppText style={styles.chevron}>{isExpanded ? '▲' : '▼'}</AppText>
									</View>
								</TouchableOpacity>

									{managedUser.email ? (
										<AppText style={styles.userMetaEmail}>{managedUser.email}</AppText>
									) : null}

									{!managedUser.verified ? (
										<AppText style={styles.unverifiedBadge}>Email not verified</AppText>
									) : null}

									{isExpanded ? (
										<View style={styles.expandedContent}>
										<View style={styles.divider} />

										{/* Role */}
										<AppText style={styles.sectionLabel}>Role</AppText>
										<TouchableOpacity
											onPress={() => setExpand(managedUser.id, { rolePickerOpen: !expand.rolePickerOpen, treePickerOpen: false })}
											style={styles.pickerTrigger}
											disabled={isBusy}
										>
											<AppText style={styles.pickerTriggerText}>{roleLabel(managedUser.role)}</AppText>
											<AppText style={styles.pickerChevron}>{expand.rolePickerOpen ? '▲' : '▼'}</AppText>
										</TouchableOpacity>

										{expand.rolePickerOpen ? (
											<View style={styles.pickerDropdown}>
												{ROLE_OPTIONS.map((option) => (
													<TouchableOpacity
														key={option.value}
														onPress={() => void handleRoleChange(managedUser, option.value)}
														style={[
															styles.pickerOption,
															managedUser.role === option.value && styles.pickerOptionSelected,
														]}
														disabled={isBusy}
													>
														<AppText style={[
															styles.pickerOptionText,
															managedUser.role === option.value && styles.pickerOptionTextSelected,
														]}>
															{option.label}
														</AppText>
														{managedUser.role === option.value ? (
															<AppText style={styles.pickerOptionCheck}>✓</AppText>
														) : null}
													</TouchableOpacity>
												))}
											</View>
										) : null}

										<View style={styles.divider} />

										{/* Guardian Trees */}
										<AppText style={styles.sectionLabel}>
											Guardian Trees ({managedUser.guardianTreeIds.length})
										</AppText>

										{managedUser.guardianTreeIds.length === 0 ? (
											<AppText style={styles.userMeta}>No trees assigned.</AppText>
										) : (
											<View style={styles.tagWrap}>
												{managedUser.guardianTreeIds.map((treeId) => (
													<View key={`${managedUser.id}-${treeId}`} style={styles.treeTag}>
														<AppText style={styles.treeTagText}>
															{treeNameMap.get(treeId) ?? `Tree #${treeId}`}
														</AppText>
														<TouchableOpacity
															onPress={() => void handleRemoveTree(managedUser, treeId)}
															style={styles.removeTreeButton}
															disabled={isBusy}
														>
															<AppText style={styles.removeTreeText}>Remove</AppText>
														</TouchableOpacity>
													</View>
												))}
											</View>
										)}

										{/* Assign Tree */}
										<AppText style={styles.assignLabel}>Assign a tree</AppText>
										<TouchableOpacity
											onPress={() => setExpand(managedUser.id, { treePickerOpen: !expand.treePickerOpen, rolePickerOpen: false })}
											style={styles.pickerTrigger}
											disabled={isBusy || !managedUser.verified}
										>
											<AppText style={styles.pickerTriggerPlaceholder}>Select a tree...</AppText>
											<AppText style={styles.pickerChevron}>{expand.treePickerOpen ? '▲' : '▼'}</AppText>
										</TouchableOpacity>

										{!managedUser.verified ? (
											<AppText style={styles.userMeta}>
												This user must verify their email before being assigned as a guardian.
											</AppText>
										) : null}

										{expand.treePickerOpen ? (
											<View style={styles.treePickerPanel}>
												<TextInput
													value={expand.treeSearch}
													onChangeText={(value) => setExpand(managedUser.id, { treeSearch: value })}
													placeholder="Search trees..."
													style={styles.treeSearchInput}
													placeholderTextColor={Theme.Colours.textMuted}
												/>
												<ScrollView style={styles.treePickerScroll} nestedScrollEnabled>
													{trees
														.filter((t) => {
															const q = expand.treeSearch.trim().toLowerCase();
															if (!q) return true;
															return (
																String(t.id).includes(q) ||
																(t.species ?? '').toLowerCase().includes(q)
															);
														})
														.filter((t) => !managedUser.guardianTreeIds.includes(t.id))
														.slice(0, 30)
														.map((t) => (
																<TouchableOpacity
																	key={t.id}
																	onPress={() => void handleAssignTree(managedUser, t.id)}
																	style={styles.treePickerOption}
																	disabled={isBusy || !managedUser.verified}
																>
																	<AppText style={styles.treePickerOptionText}>
																		{treeNameMap.get(t.id) ?? `Tree #${t.id}`}
																</AppText>
															</TouchableOpacity>
														))}
												</ScrollView>
											</View>
										) : null}

										<View style={styles.divider} />

										{/* Activity */}
										<AppText style={styles.sectionLabel}>Recent Activity</AppText>

										{expand.activityLoading ? (
											<View style={styles.activityLoading}>
												<ActivityIndicator size="small" color={Theme.Colours.primary} />
												<AppText style={styles.userMeta}>Loading activity...</AppText>
											</View>
										) : expand.activityError ? (
											<AppText style={styles.activityError}>{expand.activityError}</AppText>
										) : expand.activity && expand.activity.length > 0 ? (
											<View style={styles.activityList}>
												{expand.activity.map((item, idx) => (
													<View key={idx} style={styles.activityItem}>
														<View style={styles.activityDot} />
														<View style={styles.activityBody}>
															<AppText style={styles.activityLabel}>{item.label}</AppText>
															{item.detail ? (
																<AppText style={styles.activityDetail}>{item.detail}</AppText>
															) : null}
															{item.createdAt ? (
																<AppText style={styles.activityDate}>
																	{formatActivityDate(item.createdAt)}
																</AppText>
															) : null}
														</View>
													</View>
												))}
											</View>
										) : (
											<AppText style={styles.userMeta}>No recent activity.</AppText>
										)}

										<View style={styles.divider} />

										{/* Delete */}
										<TouchableOpacity
											onPress={() => handleDeleteUser(managedUser)}
											style={[
												styles.deleteButton,
												(isBusy || sessionUser?.id === managedUser.id) && styles.deleteButtonDisabled,
											]}
											disabled={isBusy || sessionUser?.id === managedUser.id}
										>
												<AppText style={styles.deleteButtonText}>Delete Account</AppText>
											</TouchableOpacity>
										</View>
									) : null}
								</View>
							);
					})}

					<View style={styles.actions}>
						<AppButton title="Refresh" variant="secondary" onPress={() => void loadData()} />
						<AppButton title="Return to Map" variant="secondary" onPress={() => router.push('/mainPage')} />
					</View>
				</ScrollView>
			)}
		</AppContainer>
		</>
	);
}

function roleBadgeColors(role: ManagedUser['role']): { bg: string; text: string; border: string } {
	switch (role) {
		case 'admin': return { bg: '#EDF0FF', text: '#3730A3', border: '#C7D2FE' };
		case 'guardian': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
		default: return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
	}
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
	searchInput: {
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		color: Theme.Colours.textPrimary,
		marginBottom: Theme.Spacing.small,
	},
	resultsText: {
		color: Theme.Colours.textMuted,
		marginBottom: Theme.Spacing.medium,
	},
	listContent: {
		paddingBottom: Theme.Spacing.large,
	},
	userCard: {
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		backgroundColor: '#F9FCF9',
		marginBottom: Theme.Spacing.medium,
		overflow: 'hidden',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: Theme.Spacing.medium,
	},
	cardHeaderLeft: {
		flex: 1,
		gap: 2,
	},
	cardHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.small,
	},
	userName: {
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
	},
	userMeta: {
		color: Theme.Colours.textMuted,
	},
	userMetaEmail: {
		color: Theme.Colours.textMuted,
		paddingHorizontal: Theme.Spacing.medium,
		paddingBottom: Theme.Spacing.small,
	},
	roleBadge: {
		borderWidth: 1,
		borderRadius: Theme.Radius.small,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	roleBadgeText: {
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
	},
	chevron: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},
	expandedContent: {
		paddingHorizontal: Theme.Spacing.medium,
		paddingBottom: Theme.Spacing.medium,
		gap: Theme.Spacing.small,
	},
	divider: {
		height: 1,
		backgroundColor: '#D7E4D7',
		marginVertical: Theme.Spacing.small,
	},
	sectionLabel: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		marginBottom: 2,
	},
	assignLabel: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		marginTop: Theme.Spacing.small,
		marginBottom: 2,
	},
	pickerTrigger: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
	},
	pickerTriggerText: {
		color: Theme.Colours.textPrimary,
	},
	pickerTriggerPlaceholder: {
		color: Theme.Colours.textMuted,
	},
	pickerChevron: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},
	pickerDropdown: {
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
		marginTop: 4,
	},
	pickerOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F5F0',
	},
	pickerOptionSelected: {
		backgroundColor: '#EDF9EE',
	},
	pickerOptionText: {
		color: Theme.Colours.textPrimary,
	},
	pickerOptionTextSelected: {
		color: Theme.Colours.primary,
		fontFamily: 'Poppins_600SemiBold',
	},
	pickerOptionCheck: {
		color: Theme.Colours.primary,
		fontFamily: 'Poppins_600SemiBold',
	},
	tagWrap: {
		gap: Theme.Spacing.small,
	},
	treeTag: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: 6,
	},
	treeTagText: {
		color: Theme.Colours.textPrimary,
		flex: 1,
	},
	removeTreeButton: {
		paddingHorizontal: Theme.Spacing.small,
		paddingVertical: 4,
	},
	removeTreeText: {
		color: '#B91C1C',
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 13,
	},
	treePickerPanel: {
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		marginTop: 4,
		overflow: 'hidden',
	},
	treeSearchInput: {
		borderBottomWidth: 1,
		borderBottomColor: '#D7E4D7',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		color: Theme.Colours.textPrimary,
	},
	treePickerScroll: {
		maxHeight: 200,
	},
	treePickerOption: {
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F5F0',
	},
	treePickerOptionText: {
		color: Theme.Colours.textPrimary,
	},
	activityLoading: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Theme.Spacing.small,
	},
	activityError: {
		color: '#B91C1C',
	},
	activityList: {
		gap: Theme.Spacing.small,
	},
	activityItem: {
		flexDirection: 'row',
		gap: Theme.Spacing.small,
		alignItems: 'flex-start',
	},
	activityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Theme.Colours.primary,
		marginTop: 5,
		flexShrink: 0,
	},
	activityBody: {
		flex: 1,
		gap: 2,
	},
	activityLabel: {
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
		fontSize: 13,
	},
	activityDetail: {
		color: Theme.Colours.textMuted,
		fontSize: 12,
	},
	activityDate: {
		color: Theme.Colours.textMuted,
		fontSize: 11,
	},
	deleteButton: {
		borderWidth: 1,
		borderColor: '#FECACA',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FEF2F2',
		paddingVertical: Theme.Spacing.small,
		alignItems: 'center',
		marginTop: Theme.Spacing.small,
	},
	deleteButtonDisabled: {
		opacity: 0.5,
	},
	deleteButtonText: {
		color: '#B91C1C',
		fontFamily: 'Poppins_600SemiBold',
	},
	loadingRow: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: Theme.Spacing.small,
	},
	actions: {
		marginTop: Theme.Spacing.large,
		gap: Theme.Spacing.small,
	},
	errorBox: {
		borderWidth: 1,
		borderColor: '#E4B4B4',
		backgroundColor: '#FFF7F7',
		borderRadius: Theme.Radius.small,
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.medium,
		gap: Theme.Spacing.small,
	},
	errorText: {
		color: '#8A1F1F',
	},
	emptyState: {
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		backgroundColor: '#F9FCF9',
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.medium,
	},
	unverifiedBadge: {
		color: Theme.Colours.error,
		fontWeight: '600',
		fontSize: 13,
		marginBottom: Theme.Spacing.extraSmall,
		},
});
