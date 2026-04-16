import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
	TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { showAlert } from '@/utilities/showAlert';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import {
	assignGuardianToTree,
	deleteManagedUser,
	fetchManagedUsers,
	fetchTreeOptions,
	ManagedUser,
	removeGuardianFromTree,
	updateUserRole,
} from '@/lib/adminApi';

type TreeSummary = {
	id: number;
	species?: string | null;
};

export default function ManageUsersPage() {
	const { user: sessionUser, isLoading } = useSessionUser();
	const authorized = canAccessManageUsers(sessionUser?.role);

	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [trees, setTrees] = useState<TreeSummary[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [treeInputByUser, setTreeInputByUser] = useState<Record<number, string>>({});
	const [searchQuery, setSearchQuery] = useState('');

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

		if (!query) {
			return users;
		}

		return users.filter((managedUser) => {
			const usernameMatch = managedUser.username.toLowerCase().includes(query);
			const emailMatch = (managedUser.email ?? '').toLowerCase().includes(query);
			const roleMatch = managedUser.role.toLowerCase().includes(query);
			const idMatch = String(managedUser.id).includes(query);

			return usernameMatch || emailMatch || roleMatch || idMatch;
		});
	}, [users, searchQuery]);

	const treeNameMap = useMemo(() => {
		return new Map(
			trees.map((tree) => [
				tree.id,
				tree.species ? `${tree.species} (#${tree.id})` : `Tree #${tree.id}`,
			])
		);
	}, [trees]);

	const setUserTreeInput = (userId: number, value: string) => {
		setTreeInputByUser((current) => ({
			...current,
			[userId]: value,
		}));
	};

	const handleRoleChange = async (
		targetUser: ManagedUser,
		role: 'registered_user' | 'guardian' | 'admin'
	) => {
		try {
			setBusyKey(`role-${targetUser.id}-${role}`);
			await updateUserRole(targetUser.id, role);
			await loadData();
		} catch (err) {
			showAlert('Role update failed', err instanceof Error ? err.message : 'Unknown error.');
		} finally {
			setBusyKey(null);
		}
	};

	const handleAssignTree = async (targetUser: ManagedUser) => {
		const rawTreeId = treeInputByUser[targetUser.id]?.trim();

		if (!rawTreeId) {
			showAlert('Missing tree id', 'Enter a tree ID first.');
			return;
		}

		const treeId = Number(rawTreeId);

		if (!Number.isInteger(treeId) || treeId <= 0) {
			showAlert('Invalid tree id', 'Tree ID must be a positive number.');
			return;
		}

		try {
			setBusyKey(`assign-${targetUser.id}-${treeId}`);
			await assignGuardianToTree(targetUser.id, treeId);
			setUserTreeInput(targetUser.id, '');
			await loadData();
		} catch (err) {
			showAlert('Assignment failed', err instanceof Error ? err.message : 'Unknown error.');
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
			showAlert('Removal failed', err instanceof Error ? err.message : 'Unknown error.');
		} finally {
			setBusyKey(null);
		}
	};

	const handleDeleteUser = async (targetUser: ManagedUser) => {
		if (sessionUser?.id === targetUser.id) {
			showAlert('Action blocked', 'You cannot delete your own admin account.');
			return;
		}

		// Web fallback
		const confirmed =
			typeof window !== 'undefined'
				? window.confirm(
						`Are you sure you want to delete ${targetUser.username}? This cannot be undone.`
				  )
				: true;

		if (!confirmed) return;

		try {
			setBusyKey(`delete-${targetUser.id}`);
			await deleteManagedUser(targetUser.id);
			await loadData();
		} catch (err) {
			showAlert('Delete failed', err instanceof Error ? err.message : 'Unknown error.');
		} finally {
			setBusyKey(null);
		}
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
					<NavigationButton onPress={() => router.push('/mainPage')}>
						Back to Map
					</NavigationButton>
				</View>

				<AppText variant="title" style={styles.title}>Access Restricted</AppText>
				<AppText style={styles.subtitle}>
					Your account role ({sessionUser?.role ?? 'guest'}) does not have permission to manage
					users.
				</AppText>

				<AppButton
					title="Return to Map"
					variant="secondary"
					onPress={() => router.push('/mainPage')}
				/>
			</AppContainer>
		);
	}

	return (
		<AppContainer>
			<View style={styles.topBar}>
				<NavigationButton onPress={() => router.push('/mainPage')}>
					Back to Map
				</NavigationButton>
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

					{filteredUsers.length === 0 ? (
						<View style={styles.emptyState}>
							<AppText style={styles.userMeta}>No users matched your search.</AppText>
						</View>
					) : null}

					{filteredUsers.map((managedUser) => (
						<View key={managedUser.id} style={styles.userCard}>
							<AppText style={styles.userName}>{managedUser.username}</AppText>
							<AppText style={styles.userMeta}>User ID: {managedUser.id}</AppText>
							<AppText style={styles.userMeta}>Role: {managedUser.role}</AppText>
							{managedUser.email ? (
								<AppText style={styles.userMeta}>Email: {managedUser.email}</AppText>
							) : null}

							<View style={styles.roleActions}>
								<AppButton
									title="Make User"
									variant="secondary"
									onPress={() => void handleRoleChange(managedUser, 'registered_user')}
									disabled={busyKey !== null || managedUser.role === 'registered_user'}
								/>
								<AppButton
									title="Make Guardian"
									variant="secondary"
									onPress={() => void handleRoleChange(managedUser, 'guardian')}
									disabled={busyKey !== null || managedUser.role === 'guardian'}
								/>
								<AppButton
									title="Make Admin"
									variant="secondary"
									onPress={() => void handleRoleChange(managedUser, 'admin')}
									disabled={busyKey !== null || managedUser.role === 'admin'}
								/>
							</View>

							<View style={styles.guardianSection}>
								<AppText style={styles.sectionLabel}>Guardian tree assignments</AppText>

								{managedUser.guardianTreeIds.length === 0 ? (
									<AppText style={styles.userMeta}>No assigned trees.</AppText>
								) : (
									<View style={styles.tagWrap}>
										{managedUser.guardianTreeIds.map((treeId) => (
											<View key={`${managedUser.id}-${treeId}`} style={styles.treeTag}>
												<AppText style={styles.treeTagText}>
													{treeNameMap.get(treeId) ?? `Tree #${treeId}`}
												</AppText>
												<AppButton
													title="Remove"
													variant="secondary"
													onPress={() => void handleRemoveTree(managedUser, treeId)}
													disabled={busyKey !== null}
												/>
											</View>
										))}
									</View>
								)}

								<TextInput
									value={treeInputByUser[managedUser.id] ?? ''}
									onChangeText={(value) => setUserTreeInput(managedUser.id, value)}
									placeholder="Enter tree ID"
									keyboardType="number-pad"
									style={styles.input}
									placeholderTextColor={Theme.Colours.textMuted}
								/>

								<AppButton
									title="Assign Tree"
									variant="primary"
									onPress={() => void handleAssignTree(managedUser)}
									disabled={busyKey !== null}
								/>
							</View>

							<View style={styles.deleteRow}>
								<AppButton
									title="Delete User"
									variant="accent"
									onPress={() => void handleDeleteUser(managedUser)}
									disabled={busyKey !== null || sessionUser?.id === managedUser.id}
								/>
							</View>
						</View>
					))}

					<View style={styles.actions}>
						<AppButton title="Refresh" variant="secondary" onPress={() => void loadData()} />
						<AppButton
							title="Return to Map"
							variant="secondary"
							onPress={() => router.push('/mainPage')}
						/>
					</View>
				</ScrollView>
			)}
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
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.medium,
		gap: Theme.Spacing.small,
	},
	userName: {
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
	},
	userMeta: {
		color: Theme.Colours.textMuted,
	},
	roleActions: {
		gap: Theme.Spacing.small,
	},
	guardianSection: {
		marginTop: Theme.Spacing.small,
		gap: Theme.Spacing.small,
	},
	sectionLabel: {
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
	},
	input: {
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		color: Theme.Colours.textPrimary,
	},
	tagWrap: {
		gap: Theme.Spacing.small,
	},
	treeTag: {
		borderWidth: 1,
		borderColor: '#D7E4D7',
		borderRadius: Theme.Radius.small,
		backgroundColor: '#FFFFFF',
		padding: Theme.Spacing.small,
		gap: Theme.Spacing.small,
	},
	treeTagText: {
		color: Theme.Colours.textPrimary,
	},
	deleteRow: {
		marginTop: Theme.Spacing.small,
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
});