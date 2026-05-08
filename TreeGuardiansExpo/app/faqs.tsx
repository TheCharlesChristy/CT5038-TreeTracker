import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles/theme';
import { AppButton } from '@/components/base/AppButton';
import { FaviconHead } from '@/components/base/FaviconHead';

const FAQ_ITEMS = [
  {
    question: 'What is TreeGuardians?',
    answer:
      'TreeGuardians is a community tree mapping app. You can explore trees on the map, view details for each one, and add your own records to help build a shared picture of local tree health.',
  },
  {
    question: 'Do I need an account to use the application?',
    answer:
      'You can browse the map without an account. To add trees you will need a registered account with a verified email address. Registration is free.',
  },
  {
    question: 'Why do I need to verify my email?',
    answer:
      'Email verification helps keep the app and its data trustworthy. After registering, check your inbox for a verification link. If it did not arrive, you can resend it from your profile page.',
  },
  {
    question: 'How do I add a tree record?',
    answer:
      'Open the Map page and tap Add Tree. Place the tree by tapping a spot on the map or using your current location, then fill in the details and tap Confirm Add Tree to save.',
  },
  {
    question: 'Where can I see the trees I have submitted?',
    answer:
      'Open the Map page and tap the dashboard icon, then select My Trees. This filters the map to show only your submissions.',
  },
  {
    question: 'How do I report pests or disease signs?',
    answer:
      'Go to the Resources page and open the Pest and Disease guide for step-by-step guidance. When adding a tree, include clear photos and notes describing any visible signs of pest or disease activity.',
  },
  {
    question: 'What makes a good survey submission?',
    answer:
      'A useful submission includes an accurate location, clear species details, measurements where possible, and focused photos showing the tree and any visible issues.',
  },
  {
    question: 'Can I edit or remove a record after submitting?',
    answer:
      'Tree records are managed by admins to maintain data quality. If you have spotted a mistake in one of your submissions, please get in touch with an admin.',
  },
  {
    question: 'How do I reset my password?',
    answer:
      'On the login screen, tap Forgot password and enter your email address. You will receive a link to set a new password.',
  },
] as const;

export default function FaqsPage() {
  return (
    <>
      <Stack.Screen options={{ title: 'FAQs | TreeGuardians' }} />
      <FaviconHead title="FAQs | TreeGuardians" />
      <AppContainer scrollable backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
        <View style={styles.content}>
        <AppText variant="title" style={styles.title}>
          FAQs
        </AppText>

        <AppText style={styles.intro}>
          Commonly asked questions about using TreeGuardians.
        </AppText>

        {FAQ_ITEMS.map((item) => (
          <View key={item.question} style={styles.card}>
            <AppText variant="subtitle" style={styles.question}>
              {item.question}
            </AppText>
            <AppText style={styles.answer}>{item.answer}</AppText>
          </View>
        ))}

        <View style={styles.helpPanel}>
          <AppText variant="subtitle" style={styles.helpTitle}>
            Still need help?
          </AppText>
          <AppText style={styles.helpText}>
            Visit Resources for survey and tree health guidance, or return to the map to
            continue exploring and contributing.
          </AppText>
          <View style={styles.helpButtons}>
            <AppButton
              title="Open Resources"
              variant="primary"
              onPress={() => router.push('/resources')}
              style={styles.helpButton}
            />
            <AppButton
              title="Go to Map"
              variant="secondary"
              onPress={() => router.push('/mainPage')}
              style={styles.helpButton}
            />
          </View>
        </View>
      </View>
    </AppContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Theme.Spacing.medium,
    paddingBottom: Theme.Spacing.extraLarge,
  },
  title: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  intro: {
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: Theme.Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    padding: Theme.Spacing.medium,
    gap: Theme.Spacing.small,
    shadowColor: '#0D1F10',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  question: {
    color: Theme.Colours.textPrimary,
  },
  answer: {
    color: Theme.Colours.textMuted,
  },
  helpPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: Theme.Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    padding: Theme.Spacing.medium,
    gap: Theme.Spacing.small,
    shadowColor: '#0D1F10',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  helpTitle: {
    color: Theme.Colours.textPrimary,
  },
  helpText: {
    color: Theme.Colours.textMuted,
  },
  helpButtons: {
    marginTop: Theme.Spacing.small,
  },
  helpButton: {
    marginBottom: Theme.Spacing.small,
  },
});
