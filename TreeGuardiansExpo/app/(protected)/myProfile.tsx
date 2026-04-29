import { useState, useEffect } from 'react';
import {
	View,
	StyleSheet,
	ActivityIndicator,
	TextInput,
	ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { useSessionUser } from '@/lib/session';
import { updateUsername, updateEmail, updatePassword, type UserRole } from '@/utilities/authHelper';

const ROLE_LABEL: Record<UserRole, string> = {
	registered_user: 'Member',
	guardian: 'Guardian',
	admin: 'Admin',
};

const ROLE_BADGE_STYLE: Record<UserRole, object> = {
	registered_user: { backgroundColor: '#EEF4FF', borderColor: '#C3D5F5' },
	guardian: { backgroundColor: '#EEFAF0', borderColor: '#B8D8BC' },
	admin: { backgroundColor: '#FFF4E5', borderColor: '#F5C97A' },
};

const ROLE_TEXT_STYLE: Record<UserRole, object> = {
	registered_user: { color: '#2C5CB3' },
	guardian: { color: '#194C22' },
	admin: { color: '#7A4A00' },
};

type PasswordForm = {
	currentPassword: string;
	newPassword: string;
	confirmNewPassword: string;
};

export default function MyProfilePage() {
	const { user, isLoading } = useSessionUser();
	useEffect(() => {
	if (!isLoading && !user) {
		router.replace('/login');
	}
	}, [isLoading, user]);

	const [isEditingUsername, setIsEditingUsername] = useState(false);
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const [username, setUsername] = useState(user?.username ?? '');
	const [email, setEmail] = useState(user?.email ?? '');

	const [passwordForm, setPasswordForm] = useState<PasswordForm>({
		currentPassword: '',
		newPassword: '',
		confirmNewPassword: '',
	});

	const [usernameError, setUsernameError] = useState<string | null>(null);
	const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
	const [isSavingUsername, setIsSavingUsername] = useState(false);

	const [emailError, setEmailError] = useState<string | null>(null);
	const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
	const [isSavingEmail, setIsSavingEmail] = useState(false);

	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	if (isLoading || !user) {
		return (
			<AppContainer>
				<View style={styles.loadingRow}>
					<ActivityIndicator color={Theme.Colours.primary} />
					<AppText style={styles.body}>Loading profile...</AppText>
				</View>
			</AppContainer>
		);
	}

	function resetPasswordForm() {
		setPasswordForm({
			currentPassword: '',
			newPassword: '',
			confirmNewPassword: '',
		});
	}

	async function handleSaveUsername() {
		const trimmedUsername = username.trim();

		setUsernameError(null);
		setUsernameSuccess(null);

		if (!trimmedUsername) {
			setUsernameError('Username is required.');
			return;
		}

		if (trimmedUsername.length < 3) {
			setUsernameError('Username must be at least 3 characters long.');
			return;
		}

		try {
			setIsSavingUsername(true);

			await updateUsername({ 
				username: trimmedUsername 
			});

			await new Promise((resolve) => setTimeout(resolve, 700));

			setUsernameSuccess('Username updated successfully.');
			setIsEditingUsername(false);
		} catch (error) {
			console.error('Failed to update username:', error);
			setUsernameError('Failed to update username.');
		} finally {
			setIsSavingUsername(false);
		}
	}

	async function handleSaveEmail() {
		const trimmedEmail = email.trim();

		setEmailError(null);
		setEmailSuccess(null);

		if (!trimmedEmail) {
			setEmailError('Email is required.');
			return;
		}

		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailPattern.test(trimmedEmail)) {
			setEmailError('Please enter a valid email address.');
			return;
		}

		try {
			setIsSavingEmail(true);

			await updateEmail({ 
				email: trimmedEmail 
			});

			await new Promise((resolve) => setTimeout(resolve, 700));

			setEmailSuccess('Email updated successfully.');
			setIsEditingEmail(false);
		} catch (error) {
			console.error('Failed to update email:', error);
			setEmailError('Failed to update email.');
		} finally {
			setIsSavingEmail(false);
		}
	}

	async function handleChangePassword() {
		const currentPassword = passwordForm.currentPassword.trim();
		const newPassword = passwordForm.newPassword.trim();
		const confirmNewPassword = passwordForm.confirmNewPassword.trim();

		setPasswordError(null);
		setPasswordSuccess(null);

		if (!currentPassword) {
			setPasswordError('Current password is required.');
			return;
		}

		if (!newPassword) {
			setPasswordError('New password is required.');
			return;
		}

		if (newPassword.length < 8) {
			setPasswordError('New password must be at least 8 characters long.');
			return;
		}

		if (newPassword !== confirmNewPassword) {
			setPasswordError('New password and confirm password do not match.');
			return;
		}

		if (currentPassword === newPassword) {
			setPasswordError('New password must be different from your current password.');
			return;
		}

		try {
			setIsSavingPassword(true);

			await updatePassword({ 
				currentPassword, 
				newPassword 
			});

			await new Promise((resolve) => setTimeout(resolve, 700));

			setPasswordSuccess('Password changed successfully.');
			resetPasswordForm();
			setIsChangingPassword(false);
		} catch (error) {
			console.error('Failed to change password:', error);
			setPasswordError('Failed to change password.');
		} finally {
			setIsSavingPassword(false);
		}
	}

	return (
		<AppContainer>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={true}
			>
				<View style={styles.topBar}>
					<NavigationButton onPress={() => router.push('/mainPage')}>
						Back to Map
					</NavigationButton>
				</View>

				<AppText variant="title" style={styles.title}>
					My Profile
				</AppText>

				<AppText style={styles.subtitle}>
					Manage your username, email, and password separately.
				</AppText>

				<View style={styles.card}>
					<AppText variant="subtitle" style={styles.sectionTitle}>
						Account Overview
					</AppText>
					<View style={styles.overviewRow}>
						<AppText style={styles.overviewLabel}>Username</AppText>
						<AppText style={styles.overviewValue}>{user.username}</AppText>
					</View>
					<View style={styles.overviewRow}>
						<AppText style={styles.overviewLabel}>Email</AppText>
						<AppText style={styles.overviewValue}>{user.email ?? 'Not provided'}</AppText>
					</View>
					<View style={styles.overviewRow}>
						<AppText style={styles.overviewLabel}>Role</AppText>
						<View style={[styles.roleBadge, ROLE_BADGE_STYLE[user.role]]}>
							<AppText style={[styles.roleBadgeText, ROLE_TEXT_STYLE[user.role]]}>
								{ROLE_LABEL[user.role]}
							</AppText>
						</View>
					</View>
					<AppText style={styles.userId}>ID #{user.id}</AppText>
				</View>

				<View style={styles.card}>
					{!isEditingUsername ? (
						<>
							{usernameSuccess ? <AppText style={styles.successText}>{usernameSuccess}</AppText> : null}
							<View style={styles.actions}>
								<AppButton
									title="Change Username"
									variant="primary"
									onPress={() => {
										setUsername(user.username);
										setUsernameError(null);
										setUsernameSuccess(null);
										setIsEditingUsername(true);
									}}
								/>
							</View>
						</>
					) : (
						<>
							<View style={styles.fieldGroup}>
								<AppText style={styles.label}>New Username</AppText>
								<TextInput
									value={username}
									onChangeText={setUsername}
									placeholder="Enter new username"
									style={styles.input}
									autoCapitalize="none"
								/>
							</View>

							{usernameError ? <AppText style={styles.errorText}>{usernameError}</AppText> : null}

							<View style={styles.actions}>
								<AppButton
									title={isSavingUsername ? 'Saving...' : 'Save Username'}
									variant="primary"
									onPress={handleSaveUsername}
								/>
								<AppButton
									title="Cancel"
									variant="secondary"
									onPress={() => {
										setUsername(user.username);
										setUsernameError(null);
										setUsernameSuccess(null);
										setIsEditingUsername(false);
									}}
								/>
							</View>
						</>
					)}
				</View>

				<View style={styles.card}>
					{!isEditingEmail ? (
						<>
							{emailSuccess ? <AppText style={styles.successText}>{emailSuccess}</AppText> : null}
							<View style={styles.actions}>
								<AppButton
									title="Change Email"
									variant="primary"
									onPress={() => {
										setEmail(user.email ?? '');
										setEmailError(null);
										setEmailSuccess(null);
										setIsEditingEmail(true);
									}}
								/>
							</View>
						</>
					) : (
						<>
							<View style={styles.fieldGroup}>
								<AppText style={styles.label}>New Email</AppText>
								<TextInput
									value={email}
									onChangeText={setEmail}
									placeholder="Enter new email"
									style={styles.input}
									autoCapitalize="none"
									keyboardType="email-address"
								/>
							</View>

							{emailError ? <AppText style={styles.errorText}>{emailError}</AppText> : null}

							<View style={styles.actions}>
								<AppButton
									title={isSavingEmail ? 'Saving...' : 'Save Email'}
									variant="primary"
									onPress={handleSaveEmail}
								/>
								<AppButton
									title="Cancel"
									variant="secondary"
									onPress={() => {
										setEmail(user.email ?? '');
										setEmailError(null);
										setEmailSuccess(null);
										setIsEditingEmail(false);
									}}
								/>
							</View>
						</>
					)}
				</View>

				<View style={styles.card}>
					{!isChangingPassword ? (
						<>
							{passwordSuccess ? <AppText style={styles.successText}>{passwordSuccess}</AppText> : null}
							<View style={styles.actions}>
								<AppButton
									title="Change Password"
									variant="primary"
									onPress={() => {
										setPasswordError(null);
										setPasswordSuccess(null);
										setIsChangingPassword(true);
									}}
								/>
							</View>
						</>
					) : (
						<>
							<View style={styles.fieldGroup}>
								<AppText style={styles.label}>Current Password</AppText>
								<TextInput
									value={passwordForm.currentPassword}
									onChangeText={(value) =>
										setPasswordForm((current) => ({ ...current, currentPassword: value }))
									}
									placeholder="Enter current password"
									style={styles.input}
									secureTextEntry
									autoCapitalize="none"
								/>
							</View>

							<View style={styles.fieldGroup}>
								<AppText style={styles.label}>New Password</AppText>
								<TextInput
									value={passwordForm.newPassword}
									onChangeText={(value) =>
										setPasswordForm((current) => ({ ...current, newPassword: value }))
									}
									placeholder="Enter new password"
									style={styles.input}
									secureTextEntry
									autoCapitalize="none"
								/>
							</View>

							<View style={styles.fieldGroup}>
								<AppText style={styles.label}>Confirm New Password</AppText>
								<TextInput
									value={passwordForm.confirmNewPassword}
									onChangeText={(value) =>
										setPasswordForm((current) => ({ ...current, confirmNewPassword: value }))
									}
									placeholder="Confirm new password"
									style={styles.input}
									secureTextEntry
									autoCapitalize="none"
								/>
							</View>

							{passwordError ? <AppText style={styles.errorText}>{passwordError}</AppText> : null}

							<View style={styles.actions}>
								<AppButton
									title={isSavingPassword ? 'Saving...' : 'Save Password'}
									variant="primary"
									onPress={handleChangePassword}
								/>
								<AppButton
									title="Cancel"
									variant="secondary"
									onPress={() => {
										resetPasswordForm();
										setPasswordError(null);
										setPasswordSuccess(null);
										setIsChangingPassword(false);
									}}
								/>
							</View>
						</>
					)}
				</View>

				<View style={styles.footerActions}>
					<AppButton
						title="Return to Map"
						variant="secondary"
						onPress={() => router.push('/mainPage')}
					/>
				</View>
			</ScrollView>
		</AppContainer>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingBottom: Theme.Spacing.extraLarge,
	},
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
		marginBottom: Theme.Spacing.small,
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
	fieldGroup: {
		marginBottom: Theme.Spacing.medium,
	},
	label: {
		marginBottom: Theme.Spacing.extraSmall,
		color: Theme.Colours.textPrimary,
		fontWeight: '600',
	},
	input: {
		borderWidth: 1,
		borderColor: '#C9D7C9',
		borderRadius: Theme.Radius.small,
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: Theme.Spacing.small,
		backgroundColor: '#FFFFFF',
		color: Theme.Colours.textPrimary,
	},
	actions: {
		marginTop: Theme.Spacing.medium,
		gap: Theme.Spacing.small,
	},
	footerActions: {
		marginTop: Theme.Spacing.small,
	},
	errorText: {
		marginTop: Theme.Spacing.small,
		color: '#B42318',
	},
	successText: {
		marginTop: Theme.Spacing.small,
		color: '#027A48',
	},
	overviewRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#EAF0EA',
	},
	overviewLabel: {
		color: Theme.Colours.textMuted,
		fontSize: 13,
	},
	overviewValue: {
		color: Theme.Colours.textPrimary,
		fontSize: 13,
		fontFamily: 'Poppins_600SemiBold',
		flexShrink: 1,
		textAlign: 'right',
		marginLeft: 8,
	},
	roleBadge: {
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 2,
	},
	roleBadgeText: {
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
	},
	userId: {
		marginTop: 8,
		fontSize: 11,
		color: Theme.Colours.textMuted,
		opacity: 0.6,
		textAlign: 'right',
	},
});