import { useState, useEffect } from 'react';
import {
	View,
	StyleSheet,
	ActivityIndicator,
	TextInput,
	ScrollView,
	type TextStyle,
	type ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
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

const ROLE_BADGE_STYLE: Record<UserRole, ViewStyle> = {
	registered_user: { backgroundColor: 'rgba(44, 92, 179, 0.12)', borderColor: 'rgba(44, 92, 179, 0.3)' },
	guardian: { backgroundColor: 'rgba(25, 76, 34, 0.12)', borderColor: 'rgba(25, 76, 34, 0.3)' },
	admin: { backgroundColor: 'rgba(122, 74, 0, 0.12)', borderColor: 'rgba(122, 74, 0, 0.35)' },
};

const ROLE_TEXT_STYLE: Record<UserRole, TextStyle> = {
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
	const [profileUser, setProfileUser] = useState(user);

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

	useEffect(() => {
		if (user) {
			setProfileUser(user);
			setUsername(user.username);
			setEmail(user.email ?? '');
		}
	}, [user]);

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
					<AppText style={styles.loadingText}>Loading profile...</AppText>
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

			const updatedUser = await updateUsername({
				username: trimmedUsername
			});
			setUsername(updatedUser.username);

			await new Promise((resolve) => setTimeout(resolve, 700));

			setProfileUser(updatedUser);
			setUsername(updatedUser.username);
			setEmail(updatedUser.email ?? '');
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

			const updatedUser = await updateEmail({
				email: trimmedEmail
			});

			setEmail(updatedUser.email ?? trimmedEmail);

			await new Promise((resolve) => setTimeout(resolve, 700));

			setProfileUser(updatedUser);
			setUsername(updatedUser.username);
			setEmail(updatedUser.email ?? '');
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

	const currentUser = profileUser ?? user;
	const avatarLetter = currentUser.username.charAt(0).toUpperCase();

	return (
		<>
			<Stack.Screen options={{ title: 'My Profile | TreeHuggers' }} />
			<AppContainer noPadding backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.inner}>

					{/* Hero overview card */}
					<View style={styles.heroCard}>
						<View style={styles.avatarCircle}>
							<AppText style={styles.avatarLetter}>{avatarLetter}</AppText>
						</View>
						<AppText style={styles.heroUsername}>{currentUser.username}</AppText>
						<View style={[styles.roleBadge, ROLE_BADGE_STYLE[currentUser.role]]}>
							<AppText style={[styles.roleBadgeText, ROLE_TEXT_STYLE[currentUser.role]]}>
								{ROLE_LABEL[currentUser.role]}
							</AppText>
						</View>
						<View style={styles.heroMeta}>
							<View style={styles.heroMetaRow}>
								<AppText style={styles.heroMetaLabel}>Email</AppText>
								<AppText style={styles.heroMetaValue}>{currentUser.email ?? 'Not provided'}</AppText>
							</View>
						</View>
						<AppText style={styles.userId}>ID #{currentUser.id}</AppText>
					</View>

					{/* Username card */}
					<View style={styles.card}>
						<AppText style={styles.cardTitle}>Username</AppText>
						{!isEditingUsername ? (
							<>
								{usernameSuccess ? <AppText style={styles.successText}>{usernameSuccess}</AppText> : null}
								<View style={styles.actions}>
									<AppButton
										title="Change Username"
										variant="primary"
										onPress={() => {
											setUsername(currentUser.username);
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
											setUsername(currentUser.username);
											setUsernameError(null);
											setUsernameSuccess(null);
											setIsEditingUsername(false);
										}}
									/>
								</View>
							</>
						)}
					</View>

					{/* Email card */}
					<View style={styles.card}>
						<AppText style={styles.cardTitle}>Email</AppText>
						{!isEditingEmail ? (
							<>
								{emailSuccess ? <AppText style={styles.successText}>{emailSuccess}</AppText> : null}
								<View style={styles.actions}>
									<AppButton
										title="Change Email"
										variant="primary"
										onPress={() => {
											setEmail(currentUser.email ?? '');
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
											setEmail(currentUser.email ?? '');
											setEmailError(null);
											setEmailSuccess(null);
											setIsEditingEmail(false);
										}}
									/>
								</View>
							</>
						)}
					</View>

					{/* Password card */}
					<View style={styles.card}>
						<AppText style={styles.cardTitle}>Password</AppText>
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
				</View>
			</ScrollView>
		</AppContainer>
		</>
	);
}

const GLASS_CARD = {
	backgroundColor: 'rgba(255, 255, 255, 0.88)',
	borderRadius: 18,
	borderWidth: 1,
	borderColor: 'rgba(255, 255, 255, 0.6)',
	borderTopColor: 'rgba(255, 255, 255, 0.96)',
	shadowColor: '#0D1F10',
	shadowOffset: { width: 0, height: 10 },
	shadowOpacity: 0.18,
	shadowRadius: 20,
	elevation: 14,
} as const;

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	inner: {
		paddingHorizontal: 16,
		paddingTop: 12,
		maxWidth: 560,
		alignSelf: 'center',
		width: '100%',
	},
	loadingRow: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: Theme.Spacing.small,
	},
	loadingText: {
		color: Theme.Colours.textMuted,
	},
	topBar: {
		marginBottom: 16,
	},

	/* Hero card */
	heroCard: {
		...GLASS_CARD,
		padding: 24,
		alignItems: 'center',
		marginBottom: 12,
	},
	avatarCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: Theme.Colours.primary,
		borderWidth: 2.5,
		borderColor: 'rgba(255,255,255,0.5)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
		shadowColor: '#0D1F10',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.22,
		shadowRadius: 8,
		elevation: 6,
	},
	avatarLetter: {
		fontSize: 28,
		fontFamily: 'Poppins_600SemiBold',
		color: '#FFFFFF',
		lineHeight: 34,
	},
	heroUsername: {
		fontSize: 22,
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		marginBottom: 8,
	},
	roleBadge: {
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 3,
		marginBottom: 16,
	},
	roleBadgeText: {
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
	},
	heroMeta: {
		width: '100%',
		borderTopWidth: 1,
		borderTopColor: 'rgba(183, 210, 185, 0.5)',
		paddingTop: 12,
	},
	heroMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	heroMetaLabel: {
		fontSize: 13,
		color: Theme.Colours.textMuted,
	},
	heroMetaValue: {
		fontSize: 13,
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textPrimary,
		flexShrink: 1,
		textAlign: 'right',
		marginLeft: 8,
	},
	userId: {
		marginTop: 10,
		fontSize: 11,
		color: Theme.Colours.textMuted,
		opacity: 0.55,
	},

	/* Action cards */
	card: {
		...GLASS_CARD,
		padding: 18,
		marginBottom: 10,
	},
	cardTitle: {
		fontSize: 13,
		fontFamily: 'Poppins_600SemiBold',
		color: Theme.Colours.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 12,
	},
	fieldGroup: {
		marginBottom: 14,
	},
	label: {
		marginBottom: 6,
		fontSize: 13,
		color: Theme.Colours.textPrimary,
		fontFamily: 'Poppins_600SemiBold',
	},
	input: {
		borderWidth: 1,
		borderColor: 'rgba(183, 210, 185, 0.8)',
		borderRadius: 12,
		paddingHorizontal: Theme.Spacing.medium,
		paddingVertical: 10,
		backgroundColor: 'rgba(255, 255, 255, 0.82)',
		color: Theme.Colours.textPrimary,
		fontSize: 14,
	},
	actions: {
		gap: Theme.Spacing.small,
	},
	footerActions: {
		marginTop: 4,
	},
	errorText: {
		marginTop: 6,
		fontSize: 13,
		color: '#B42318',
	},
	successText: {
		marginBottom: 8,
		fontSize: 13,
		color: '#1B6B2A',
	},
});
