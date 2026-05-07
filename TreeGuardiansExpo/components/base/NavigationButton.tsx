import { TouchableOpacity, StyleSheet, View, GestureResponderEvent } from 'react-native';
import { ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';

interface NavigationButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  children?: ReactNode;
  color?: string;
  accessibilityLabel?: string;
}

export const NavigationButton = ({
  onPress,
  children,
  color,
  accessibilityLabel,
}: NavigationButtonProps) => {
  const textColor = color ?? Theme.Colours.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      activeOpacity={0.80}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : 'Back to map')}
    >
      <View style={styles.inner}>
        <MaterialCommunityIcons name="map-marker" size={16} color={textColor} />
        <AppText style={[styles.label, { color: textColor }]}>
          {children ?? 'Back'}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 72, 32, 0.82)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    borderTopColor: 'rgba(255, 255, 255, 0.50)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
