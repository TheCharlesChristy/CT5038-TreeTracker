import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';

type UserSummary = {
	id: number;
	name: string;
	role: 'registered_user' | 'guardian' | 'admin';
};

const PLACEHOLDER_USERS: UserSummary[] = [
	{ id: 1, name: 'Alice', role: 'admin' },
	{ id: 2, name: 'Jordan', role: 'guardian' },
	{ id: 3, name: 'Casey', role: 'registered_user' },
];

export default function ManageUsersPage() {
	const { user, isLoading } = useSessionUser();
	const authorized = canAccessManageUsers(user?.role);

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
					<NavigationButton onPress={() => router.push('/mainPage')}>Back to Dashboard</NavigationButton>
				</View>
				<AppText variant="title" style={styles.title}>Access Restricted</AppText>
				<AppText style={styles.subtitle}>
					Your account role ({user?.role ?? 'guest'}) does not have permission to manage users.
				</AppText>
				<AppButton title="Return Home" variant="secondary" onPress={() => router.push('/')} />
			</AppContainer>
		);
	}

	return (
		<AppContainer>
			<View style={styles.topBar}>
				<NavigationButton onPress={() => router.push('/mainPage')}>Back to Dashboard</NavigationButton>
			</View>

			<AppText variant="title" style={styles.title}>Manage Users</AppText>
			<AppText style={styles.subtitle}>
				Admin route is active. Connect this screen to user-management APIs next.
			</AppText>

			{PLACEHOLDER_USERS.map((user) => (
				<View key={user.id} style={styles.userCard}>
					<AppText style={styles.userName}>{user.name}</AppText>
					<AppText style={styles.userMeta}>Role: {user.role}</AppText>
				</View>
			))}

			<View style={styles.actions}>
				<AppButton
					title="Invite User"
					variant="primary"
					onPress={() => {
						// Placeholder action; wired in admin workflow phase.
					}}
				/>

				<AppButton
					title="Return Home"
					variant="secondary"
					onPress={() => router.push('/')}
				/>
			</View>
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
	userCard: {
		borderRadius: Theme.Radius.small,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		backgroundColor: '#F9FCF9',
		padding: Theme.Spacing.medium,
		marginBottom: Theme.Spacing.small,
	},
	userName: {
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
	},
	userMeta: {
		color: Theme.Colours.textMuted,
		marginTop: 3,
	},
	loadingRow: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: Theme.Spacing.small,
	},
	actions: {
		marginTop: Theme.Spacing.large,
	},
});
