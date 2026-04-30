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
      'TreeGuardians is a community tree mapping and monitoring application. You can explore local trees, add observations, and help improve shared tree health data.',
  },
  {
    question: 'Do I need an account to use the application?',
    answer:
      'You can browse map content without an account, but creating an account unlocks features including tree submissions, survey notes, and tracking your contributions.',
  },
  {
    question: 'How do I add a tree record?',
    answer:
      'Open the Map page, choose Plot, and complete the dashboard details. You can place a tree manually or use your device location, this can then be saved.',
  },
  {
    question: 'How do I report pests or disease signs?',
    answer:
      'Use the Resources page and open the Pest & Disease guide for official guidance and reporting pathways. When uploading a tree, include clear photographs and details about tree disease.',
  },
  {
    question: 'What makes a good survey submission?',
    answer:
      'A high-quality submission includes accurate location, clear species clues, useful measurements, and focused photographs that document condition or visible issues.',
  },
  {
    question: 'Can I edit or remove a record later?',
    answer:
      'Your profile and future moderation features are designed to support data quality improvements over time. For now, ensure submissions are accurate and include the best available detail.',
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
