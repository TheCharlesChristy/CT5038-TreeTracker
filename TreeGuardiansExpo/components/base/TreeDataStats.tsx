import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tree } from '@/objects/TreeDetails';
import { Theme } from '@/styles';
import { AppText } from './AppText';
import { getTreeHealthOption } from './TreeHealthSelect';

type StatTone = 'measurement' | 'environment' | 'health';

type StatItem = {
  key: string;
  label: string;
  value: number | string | undefined;
  unit?: string;
  tone: StatTone;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  featured?: boolean;
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

type OtmBenefits = Record<string, number> | null | undefined;

function resolveEcoValue(otmKey: string, treeValue: number | undefined, otmBenefits: OtmBenefits): number | undefined {
  if (otmBenefits && typeof otmBenefits[otmKey] === 'number') {
    return otmBenefits[otmKey];
  }
  return treeValue;
}

export function TreeDataStats({ tree, otmBenefits }: { tree: Tree; otmBenefits?: OtmBenefits }) {
  const treeHealthMeta = getTreeHealthOption(tree.health);
  const hasOtmData = Boolean(otmBenefits && Object.keys(otmBenefits).length > 0);

  const items = useMemo<StatItem[]>(() => ([
    {
      key: 'species',
      label: 'Tree Species',
      value: tree.species,
      tone: 'measurement',
      icon: 'pine-tree',
      featured: true,
    },
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
      value: resolveEcoValue('avoided_runoff', tree.avoidedRunoff, otmBenefits),
      unit: 'm3',
      tone: 'environment',
      icon: 'waves-arrow-up',
    },
    {
      key: 'carbonDioxideStored',
      label: 'CO2 Stored',
      value: resolveEcoValue('co2_storage', tree.carbonDioxideStored, otmBenefits),
      unit: 'kg',
      tone: 'environment',
      icon: 'molecule-co2',
    },
    {
      key: 'carbonDioxideRemoved',
      label: 'CO2 Removed',
      value: resolveEcoValue('co2_sequestered', tree.carbonDioxideRemoved, otmBenefits),
      unit: 'kg',
      tone: 'environment',
      icon: 'leaf-circle-outline',
    },
    {
      key: 'waterIntercepted',
      label: 'Water Intercepted',
      value: resolveEcoValue('stormwater', tree.waterIntercepted, otmBenefits),
      unit: 'm3',
      tone: 'environment',
      icon: 'water-outline',
    },
    {
      key: 'airQualityImprovement',
      label: 'Air Quality Gain',
      value: resolveEcoValue('aq_ozone_dep', tree.airQualityImprovement, otmBenefits),
      unit: 'g/year',
      tone: 'environment',
      icon: 'weather-windy',
    },
    {
      key: 'leafArea',
      label: 'Leaf Area',
      value: resolveEcoValue('leaf_area', tree.leafArea, otmBenefits),
      unit: 'm2',
      tone: 'environment',
      icon: 'leaf',
    },
    {
      key: 'evapotranspiration',
      label: 'Evapotranspiration',
      value: resolveEcoValue('electricity', tree.evapotranspiration, otmBenefits),
      unit: 'm3',
      tone: 'environment',
      icon: 'water-plus',
    },
    {
      key: 'health',
      label: 'Tree Health',
      value: treeHealthMeta.label,
      tone: 'health',
      icon: treeHealthMeta.icon,
      featured: true,
    },
  ]), [tree, treeHealthMeta.icon, treeHealthMeta.label]);

  const featuredItems = items.filter((item) => item.featured);
  const gridItems = items.filter((item) => !item.featured);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>Tree Data</AppText>
      </View>
      {hasOtmData ? (
        <AppText style={styles.otmAttribution}>
          Calculated using iTree / OpenTreeMap data
        </AppText>
      ) : tree.otmPlotId ? null : (
        <AppText style={styles.otmAttribution}>
          Environmental estimates are approximations — link tree to OpenTreeMap for accurate iTree figures.
        </AppText>
      )}

      <View style={styles.featuredStack}>
        {featuredItems.map((item) => {
          const tone = getToneStyles(item.tone);
          const healthStyles = item.tone === 'health'
            ? {
                card: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                  borderColor: treeHealthMeta.borderColor,
                },
                iconWrap: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                },
                badge: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                  borderColor: treeHealthMeta.borderColor,
                },
                text: {
                  color: treeHealthMeta.textColor,
                },
              }
            : null;

          return (
            <View key={item.key} style={[styles.featuredCard, tone.card, healthStyles?.card]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, tone.iconWrap, healthStyles?.iconWrap]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={healthStyles ? treeHealthMeta.textColor : tone.iconColor}
                  />
                </View>
                <View style={[styles.badge, tone.badge, healthStyles?.badge]}>
                  <AppText style={[styles.badgeText, tone.badgeText, healthStyles?.text]}>{tone.badgeLabel}</AppText>
                </View>
              </View>

              <AppText style={styles.label}>{item.label}</AppText>
              <AppText style={[styles.value, tone.value, healthStyles?.text]}>{formatStatValue(item.value, item.unit)}</AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.grid}>
        {gridItems.map((item) => {
          const tone = getToneStyles(item.tone);
          const healthStyles = item.tone === 'health'
            ? {
                card: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                  borderColor: treeHealthMeta.borderColor,
                },
                iconWrap: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                },
                badge: {
                  backgroundColor: treeHealthMeta.backgroundColor,
                  borderColor: treeHealthMeta.borderColor,
                },
                text: {
                  color: treeHealthMeta.textColor,
                },
              }
            : null;

          return (
            <View key={item.key} style={[styles.card, tone.card, healthStyles?.card]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, tone.iconWrap, healthStyles?.iconWrap]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={healthStyles ? treeHealthMeta.textColor : tone.iconColor}
                  />
                </View>
                <View style={[styles.badge, tone.badge, healthStyles?.badge]}>
                  <AppText style={[styles.badgeText, tone.badgeText, healthStyles?.text]}>{tone.badgeLabel}</AppText>
                </View>
              </View>

              <AppText style={styles.label}>{item.label}</AppText>
              <AppText style={[styles.value, tone.value, healthStyles?.text]}>{formatStatValue(item.value, item.unit)}</AppText>
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

  featuredStack: {
    gap: 12,
  },

  featuredCard: {
    width: '100%',
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
    borderWidth: 1,
    borderColor: 'transparent',
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

  otmAttribution: {
    ...Theme.Typography.caption,
    fontSize: 11,
    color: '#b45309',
    fontStyle: 'italic',
    marginTop: -4,
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
