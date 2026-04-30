import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';
import { FaviconHead } from '@/components/base/FaviconHead';

const ABOUT_SECTIONS = [
  {
    title: 'What Is TreeGuardians',
    body:
      'TreeGuardians is a citizen science platform for mapping, measuring, and monitoring trees. It helps communities build a clearer picture of local tree populations and their condition over time.',
  },
  {
    title: 'Why It Matters',
    body:
      'Shared tree data supports better stewardship decisions, improves awareness of local biodiversity, and encourages faster response to health concerns such as pests and disease.',
  },
  {
    title: 'How People Contribute',
    body:
      'Anyone can explore map data. Registered users can add records, include measurements and photos, and document observations that strengthen data quality for everyone.',
  },
  {
    title: 'Built for Local Action',
    body:
      'TreeGuardians is designed to make participation simple: learn, observe, record, and share. Small contributions from many people create meaningful long-term environmental insight.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <Stack.Screen options={{ title: 'About | TreeGuardians' }} />
      <FaviconHead title="About | TreeGuardians" />
      <AppContainer scrollable backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.title}>
          About TreeGuardians
        </AppText>

        <AppText style={styles.intro}>
          Inspired by leading citizen science tree mapping initiatives, TreeGuardians
          adapts those ideas into this application 
          aiming to encourage members of the public to collaborate in mapping, measuring and monitoring trees.
        </AppText>

        {ABOUT_SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <AppText variant="subtitle" style={styles.cardTitle}>
              {section.title}
            </AppText>
            <AppText style={styles.body}>{section.body}</AppText>
          </View>
        ))}

        <View style={styles.panel}>
          <AppText variant="subtitle" style={styles.panelTitle}>
            Start contributing
          </AppText>
          <AppText style={styles.panelText}>
            Explore the map, review guidance in Resources, and begin adding accurate
            local records to support better tree health understanding.
          </AppText>
          <View style={styles.panelButtons}>
            <AppButton
              title="Open Map"
              variant="primary"
              onPress={() => router.push('/mainPage')}
              style={styles.panelButton}
            />
            <AppButton
              title="Open Resources"
              variant="secondary"
              onPress={() => router.push('/resources')}
              style={styles.panelButton}
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
  cardTitle: {
    color: Theme.Colours.textPrimary,
  },
  body: {
    color: Theme.Colours.textMuted,
  },
  panel: {
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
  panelTitle: {
    color: Theme.Colours.textPrimary,
  },
  panelText: {
    color: Theme.Colours.textMuted,
  },
  panelButtons: {
    marginTop: Theme.Spacing.small,
  },
  panelButton: {
    marginBottom: Theme.Spacing.small,
  },
});

