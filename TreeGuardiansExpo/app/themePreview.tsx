import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BackButton } from '../components/base/BackButton';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { AppInput } from '../components/base/AppInput';
import { Theme } from '../styles/theme';

export default function ThemePreview() {
  return (
    <AppContainer style={styles.container} scrollable>
      {/* Top Left Back */}
      <BackButton onPress={() => router.back()} />
      
      {/* TITLE */}
      <AppText variant="title">TreeGuardians Design System</AppText>

      {/* COLORS */}
      <Section title="Colours">
        {Object.entries(Theme.Colours).map(([key, value]) => (
          <View key={key} style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: value }]} />
            <AppText>{key}</AppText>
          </View>
        ))}
      </Section>

      {/* TYPOGRAPHY */}
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

      {/* SPACING */}
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

      {/* BUTTONS */}
      <Section title="Buttons">
        <AppButton title="Accent Button" variant="accent" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Primary Button" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Secondary Button" variant="secondary" onPress={() => {}} />
        <View style={{ height: 10 }} />
        <AppButton title="Outline Button" variant="outline" onPress={() => {}} />
      </Section>

      {/* INPUT */}
      <Section title="Inputs">
        <AppInput placeholder="Example Input" />
      </Section>
      </AppContainer>
  );
}

/* ---------------- Section Component ---------------- */

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <AppText style={{
            ...Theme.Typography.subtitle,
        }}> {title} </AppText>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

/* ---------------- Styles ---------------- */

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
    borderRadius: Theme.BorderRadius.small,
  },
});
