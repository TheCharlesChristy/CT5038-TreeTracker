import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { useSessionUser } from '@/lib/session';

export default function MyProfilePage() {
	const { user, isLoading } = useSessionUser();

	if (isLoading) {
		return (
			<AppContainer>
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.body}>Loading profile...</AppText>
				</View>
			</AppContainer>
		);
	}

	if (!user) {
		return (
			<AppContainer>
				<View style={styles.topBar}>
					<NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
				</View>
				<AppText variant="title" style={styles.title}>Sign In Required</AppText>
				<AppText style={styles.subtitle}>
					Sign in to view your profile details.
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

			<AppText variant="title" style={styles.title}>My Profile</AppText>
			<AppText style={styles.subtitle}>
				Profile management is now routed correctly and ready for account data wiring.
			</AppText>

			<View style={styles.card}>
				<AppText variant="subtitle" style={styles.sectionTitle}>Account</AppText>
				<AppText style={styles.body}>Username: {user.username}</AppText>
				<AppText style={styles.body}>Email: {user.email ?? 'Not provided'}</AppText>
				<AppText style={styles.body}>Role: {user.role}</AppText>
				<AppText style={styles.body}>User ID: {user.id}</AppText>
			</View>

			<View style={styles.actions}>
				<AppButton
					title="Edit Profile"
					variant="primary"
					onPress={() => {
						// UI-only placeholder until account editing API is connected.
					}}
				/>

				<AppButton
					title="Return to Map"
					variant="secondary"
					onPress={() => router.push('/mainPage')}
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
	card: {
		borderRadius: Theme.Radius.medium,
		borderWidth: 1,
		borderColor: '#D7E4D7',
		backgroundColor: '#F9FCF9',
		padding: Theme.Spacing.medium,
	},
	sectionTitle: {
		marginBottom: Theme.Spacing.small,
		color: Theme.Colours.textPrimary,
	},
	body: {
		color: Theme.Colours.textMuted,
		marginBottom: Theme.Spacing.extraSmall,
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
