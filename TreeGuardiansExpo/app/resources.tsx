import React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Stack, router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles/theme';
import { FaviconHead } from '@/components/base/FaviconHead';
 
const TREE_ID_GUIDE_ASSET = Asset.fromModule(
  require('@/assets/docs/Tree ID Guide.pdf'),
).uri;
const TREE_SURVEY_GUIDE_ASSET = Asset.fromModule(
  require('@/assets/docs/Tree Survey Guide.pdf'),
).uri;

const RESOURCE_SECTIONS = [
  {
    title: 'Tree ID Guide',
    description:
      'Use key visual clues to identify tree species, including leaf shape, bark texture, branching structure, flowers, fruit, and seasonal changes.',
    ctaLabel: 'Open Tree ID Guide',
    url: TREE_ID_GUIDE_ASSET,
    inAppPdf: true,
  },
  {
    title: 'Tree Survey Guide',
    description:
      'Follow a consistent survey method to capture location, species indicators, measurements, notes, and photos so records are accurate and comparable.',
    ctaLabel: 'Open Tree Survey Guide',
    url: TREE_SURVEY_GUIDE_ASSET,
    inAppPdf: true,
  },
  {
    title: 'Pest and Disease Identification Process',
    description:
      'Learn a step-by-step process for spotting symptoms, recording evidence, and escalating findings where disease or pest activity is suspected.',
    ctaLabel: 'Open Pest & Disease Guide',
    url: 'https://www.observatree.org.uk/resource-library/',
    inAppPdf: false,
  },
  {
    title: 'Learn More About Tree Health and Citizen Science',
    description:
      'Explore how community observations improve local tree monitoring, biodiversity understanding, and long-term urban and rural tree health decisions.',
    ctaLabel: 'Learn More',
    url: 'https://www.forestresearch.gov.uk/tools-and-resources/fthr/uk-tree-health-citizen-science-network/tree-health-learning-pathway-for-citizens/',
    inAppPdf: false,
  },
] as const;

export default function ResourcesPage() {
  const openLink = async (url: string, title: string, inAppPdf: boolean) => {
    if (inAppPdf && Platform.OS !== 'web') {
      router.push({
        pathname: '/pdf-viewer' as any,
        params: { uri: url, title },
      });
      return;
    }

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Resources | TreeGuardians' }} />
      <FaviconHead title="Resources | TreeGuardians" />
      <AppContainer scrollable backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.title}>
          Resources
        </AppText>

        <AppText style={styles.intro}>
          Practical guidance for identifying trees, surveying observations, and
          supporting healthier local tree ecosystems through citizen science.
        </AppText>

        {RESOURCE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <AppText variant="subtitle" style={styles.cardTitle}>
              {section.title}
            </AppText>

            <AppText style={styles.body}>{section.description}</AppText>

            <AppButton
              title={section.ctaLabel}
              variant="primary"
              onPress={() => openLink(section.url, section.title, section.inAppPdf)}
              style={styles.button}
            />
          </View>
        ))}
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
  button: {
    marginTop: Theme.Spacing.small,
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
});

