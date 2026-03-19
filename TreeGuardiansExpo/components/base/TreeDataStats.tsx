import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tree } from '@/objects/TreeDetails';
import { Theme } from '@/styles';
import { AppText } from './AppText';

type StatTone = 'measurement' | 'environment' | 'health';

type StatItem = {
  key: string;
  label: string;
  value: number | string | undefined;
  unit?: string;
  tone: StatTone;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

function formatStatValue(value: number | string | undefined, unit?: string) {
  if (value === undefined || value === null || value === '') {
    return 'Not logged';
  }

  if (typeof value === 'string') {
    return unit ? `${value} ${unit}` : value;
  }

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

function getToneStyles(tone: StatTone) {
  if (tone === 'environment') {
    return {
      card: styles.environmentCard,
      iconWrap: styles.environmentIconWrap,
      iconColor: '#0A6B45',
      value: styles.environmentValue,
      badge: styles.environmentBadge,
      badgeText: styles.environmentBadgeText,
      badgeLabel: 'Eco Impact',
    };
  }

  if (tone === 'health') {
    return {
      card: styles.healthCard,
      iconWrap: styles.healthIconWrap,
      iconColor: '#8C2D04',
      value: styles.healthValue,
      badge: styles.healthBadge,
      badgeText: styles.healthBadgeText,
      badgeLabel: 'Health',
    };
  }

  return {
    card: styles.measurementCard,
    iconWrap: styles.measurementIconWrap,
    iconColor: '#1B5E20',
    value: styles.measurementValue,
    badge: styles.measurementBadge,
    badgeText: styles.measurementBadgeText,
    badgeLabel: 'Measurement',
  };
}

export function TreeDataStats({ tree }: { tree: Tree }) {
  const items = useMemo<StatItem[]>(() => ([
    {
      key: 'height',
      label: 'Tree Height',
      value: tree.height,
      unit: 'm',
      tone: 'measurement',
      icon: 'arrow-expand-vertical',
    },
    {
      key: 'diameter',
      label: 'Trunk Diameter',
      value: tree.diameter,
      unit: 'cm',
      tone: 'measurement',
      icon: 'diameter-variant',
    },
    {
      key: 'circumference',
      label: 'Trunk Circumference',
      value: tree.circumference,
      unit: 'cm',
      tone: 'measurement',
      icon: 'ruler-square',
    },
    {
      key: 'avoidedRunoff',
      label: 'Avoided Runoff',
      value: tree.avoidedRunoff,
      unit: 'm3',
      tone: 'environment',
      icon: 'waves-arrow-up',
    },
    {
      key: 'carbonDioxideStored',
      label: 'CO2 Stored',
      value: tree.carbonDioxideStored,
      unit: 'kg',
      tone: 'environment',
      icon: 'molecule-co2',
    },
    {
      key: 'carbonDioxideRemoved',
      label: 'CO2 Removed',
      value: tree.carbonDioxideRemoved,
      unit: 'kg',
      tone: 'environment',
      icon: 'leaf-circle-outline',
    },
    {
      key: 'waterIntercepted',
      label: 'Water Intercepted',
      value: tree.waterIntercepted,
      unit: 'm3',
      tone: 'environment',
      icon: 'water-outline',
    },
    {
      key: 'airQualityImprovement',
      label: 'Air Quality Gain',
      value: tree.airQualityImprovement,
      unit: 'g/year',
      tone: 'environment',
      icon: 'weather-windy',
    },
    {
      key: 'leafArea',
      label: 'Leaf Area',
      value: tree.leafArea,
      unit: 'm2',
      tone: 'environment',
      icon: 'leaf',
    },
    {
      key: 'evapotranspiration',
      label: 'Evapotranspiration',
      value: tree.evapotranspiration,
      unit: 'm3',
      tone: 'environment',
      icon: 'water-plus',
    },
    {
      key: 'health',
      label: 'Tree Health',
      value: tree.health ? tree.health.replace(/^./, (letter) => letter.toUpperCase()) : undefined,
      tone: 'health',
      icon: 'heart-pulse',
    },
  ]), [tree]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>Tree Data</AppText>
        <AppText style={styles.sectionMeta}>Schema-backed stats</AppText>
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const tone = getToneStyles(item.tone);

          return (
            <View key={item.key} style={[styles.card, tone.card]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, tone.iconWrap]}>
                  <MaterialCommunityIcons name={item.icon} size={16} color={tone.iconColor} />
                </View>
                <View style={[styles.badge, tone.badge]}>
                  <AppText style={[styles.badgeText, tone.badgeText]}>{tone.badgeLabel}</AppText>
                </View>
              </View>

              <AppText style={styles.label}>{item.label}</AppText>
              <AppText style={[styles.value, tone.value]}>{formatStatValue(item.value, item.unit)}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  sectionTitle: {
    ...Theme.Typography.subtitle,
    color: '#18371D',
    fontSize: 17,
    lineHeight: 23,
  },

  sectionMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    fontFamily: 'Poppins_600SemiBold',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  card: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  measurementCard: {
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E0EAE0',
    borderRadius: 18,
    padding: 14,
  },

  environmentCard: {
    backgroundColor: '#F3FBF7',
    borderWidth: 1,
    borderColor: '#D7EEE3',
    borderRadius: 18,
    padding: 14,
  },

  healthCard: {
    backgroundColor: '#FFF8F1',
    borderWidth: 1,
    borderColor: '#F3DFC8',
    borderRadius: 18,
    padding: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  measurementIconWrap: {
    backgroundColor: '#EAF8EC',
  },

  environmentIconWrap: {
    backgroundColor: '#E8F7F1',
  },

  healthIconWrap: {
    backgroundColor: '#FFF2E8',
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  measurementBadge: {
    backgroundColor: '#EFF7EE',
  },

  environmentBadge: {
    backgroundColor: '#E9F7F3',
  },

  healthBadge: {
    backgroundColor: '#FFF4E8',
  },

  badgeText: {
    ...Theme.Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },

  measurementBadgeText: {
    color: '#1B5E20',
  },

  environmentBadgeText: {
    color: '#0A6B45',
  },

  healthBadgeText: {
    color: '#8C2D04',
  },

  label: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 4,
  },

  value: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 22,
  },

  measurementValue: {
    color: '#18371D',
  },

  environmentValue: {
    color: '#0A6B45',
  },

  healthValue: {
    color: '#8C2D04',
  },
});
