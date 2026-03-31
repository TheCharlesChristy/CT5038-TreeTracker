import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';

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
    <AppContainer scrollable>
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
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Theme.Spacing.medium,
    paddingBottom: Theme.Spacing.extraLarge,
  },
  title: {
    color: Theme.Colours.textPrimary,
  },
  intro: {
    color: Theme.Colours.textMuted,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: Theme.Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(165, 214, 167, 0.38)',
    padding: Theme.Spacing.medium,
    gap: Theme.Spacing.small,
  },
  cardTitle: {
    color: Theme.Colours.textPrimary,
  },
  body: {
    color: Theme.Colours.textMuted,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: Theme.Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(165, 214, 167, 0.38)',
    padding: Theme.Spacing.medium,
    gap: Theme.Spacing.small,
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

