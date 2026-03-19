import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { getSessionUser } from '@/lib/session';

export default function MyProfilePage() {
	const user = getSessionUser();

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
				<AppText style={styles.body}>Name: {user.name}</AppText>
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
	actions: {
		marginTop: Theme.Spacing.large,
	},
});
