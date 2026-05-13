import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles/theme';

type Strength = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  level: Strength;
  label: string;
  score: number;
  color: string;
}

export function getPasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'weak', label: '', score: 0, color: '#B3261E' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak',   label: 'Weak',   score: 1, color: '#B3261E' };
  if (score === 2) return { level: 'fair',   label: 'Fair',   score: 2, color: '#F9A825' };
  if (score === 3) return { level: 'good',   label: 'Good',   score: 3, color: '#66BB6A' };
  return               { level: 'strong', label: 'Strong', score: 4, color: '#2E7D32' };
}

interface Props {
  password: string;
}

export function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null;

  const { label, score, color } = getPasswordStrength(password);
  const totalBars = 4;

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < score ? color : '#D9DDD9' },
            ]}
          />
        ))}
      </View>
      <AppText variant="caption" style={[styles.label, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Theme.Spacing.extraSmall,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
