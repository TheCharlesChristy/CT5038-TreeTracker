import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { FaviconHead } from '@/components/base/FaviconHead';
import { NavigationButton } from '@/components/base/NavigationButton';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { Theme } from '@/styles/theme';

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function ThemePreview() {
  return (
    <>
      <Stack.Screen options={{ title: 'Theme Preview | TreeGuardians' }} />
      <FaviconHead title="Theme Preview | TreeGuardians" />
      <AppContainer style={styles.container} scrollable>
      <NavigationButton onPress={() => router.back()} />
      
      <AppText variant="title">TreeGuardians Design System</AppText>

      <Section title="Colours">
        {Object.entries(Theme.Colours).map(([key, value]) => (
          <View key={key} style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: value }]} />
            <AppText>{key}</AppText>
          </View>
        ))}
      </Section>

      <Section title="Typography">
        <AppText style={{
            ...Theme.Typography.title,
        }}>Title Text
        </AppText>

        <AppText style={{
            ...Theme.Typography.subtitle,
        }}>Subtitle Text
        </AppText>

        <AppText style={{
            ...Theme.Typography.body,
        }}>Body Text
        </AppText>

        <AppText style={{
            ...Theme.Typography.caption,
        }}>Caption Text
        </AppText>
      </Section>

      <Section title="Spacing">
        {Object.entries(Theme.Spacing).map(([key, value]) => (
          <View key={key} style={{ marginBottom: 10 }}>
            <View
              style={{
                width: value,
                height: value,
                backgroundColor: Theme.Colours.primary,
              }}
            />
            <AppText>{key} ({value}px)</AppText>
          </View>
        ))}
      </Section>

      <Section title="Buttons">
        <AppButton title="Accent Button" variant="accent" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Primary Button" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Secondary Button" variant="secondary" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Outline Button" variant="outline" onPress={() => {}} />
      </Section>

      <Section title="Inputs">
        <AppInput placeholder="Example Input" />
      </Section>
      </AppContainer>
    </>
  );
}

const Section = ({ title, children }: SectionProps) => (
  <View style={styles.section}>
    <AppText style={{
            ...Theme.Typography.subtitle,
        }}> {title} </AppText>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  section: {
    marginTop: Theme.Spacing.large,
  },
  sectionTitle: {
    marginBottom: Theme.Spacing.small,
  },
  sectionContent: {
    gap: Theme.Spacing.small,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.Spacing.medium,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.Border.small,
  },
});
