import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';
import {
  MY_TREES_HEALTH_OPTIONS,
  MY_TREES_SORT_OPTIONS,
  type MyTreesHealthFilter,
  type MyTreesRoleFilter,
  type MyTreesSortKey,
} from '@/hooks/useMyTreesFilterModel';

const CARD_GLASS = {
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  borderRadius: Theme.Radius.card,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.82)',
  borderTopColor: 'rgba(255, 255, 255, 0.95)',
  shadowColor: '#0D1F10',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.22,
  shadowRadius: 18,
  elevation: 11,
} as const;

const HEALTH_FILTER_META: Record<
  MyTreesHealthFilter,
  { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; accent: string }
> = {
  all: { icon: 'heart-pulse', accent: '#2E7D32' },
  good: { icon: 'leaf', accent: '#2E7D32' },
  ok: { icon: 'checkbox-marked-circle-outline', accent: '#B8860B' },
  bad: { icon: 'alert-outline', accent: '#E65100' },
};

type DropdownOption<T extends string> = {
  key: T;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent?: string;
};

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { height, width } = useWindowDimensions();
  const selected = options.find((option) => option.key === value) ?? options[0];
  const accent = selected.accent ?? Theme.Colours.primary;
  const menuMaxHeight = Math.max(180, Math.min(width >= 700 ? 340 : 260, height * 0.42));

  return (
    <View style={[styles.dropdownShell, isOpen && styles.dropdownShellOpen]}>
      <Pressable
        style={[styles.dropdownTrigger, { borderColor: `${accent}66` }]}
        onPress={() => setIsOpen((current) => !current)}
      >
        <View style={styles.dropdownCopy}>
          <MaterialCommunityIcons name={selected.icon} size={17} color={accent} />
          <View style={styles.dropdownTextStack}>
            <AppText style={styles.dropdownLabel}>{label}</AppText>
            <AppText style={styles.dropdownValue}>{selected.label}</AppText>
          </View>
        </View>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Theme.Colours.primary}
        />
      </Pressable>

      {isOpen ? (
        <ScrollView
          style={[styles.dropdownMenu, { maxHeight: menuMaxHeight }]}
          contentContainerStyle={styles.dropdownMenuContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={options.length > 6}
        >
          {options.map((option) => {
            const selectedOption = option.key === value;
            const optionAccent = option.accent ?? Theme.Colours.primary;

            return (
              <Pressable
                key={option.key}
                style={[styles.dropdownOption, selectedOption && styles.dropdownOptionActive]}
                onPress={() => {
                  onChange(option.key);
                  setIsOpen(false);
                }}
              >
                <View style={styles.dropdownCopy}>
                  <MaterialCommunityIcons name={option.icon} size={16} color={optionAccent} />
                  <AppText
                    style={[
                      styles.dropdownOptionText,
                      selectedOption && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </View>
                {selectedOption ? (
                  <MaterialCommunityIcons name="check" size={17} color={Theme.Colours.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

type MyTreesFilterToolbarProps = {
  treeSummary: { total: number; healthy: number; attention: number };
  roleFilter: MyTreesRoleFilter;
  setRoleFilter: (value: MyTreesRoleFilter) => void;
  healthFilter: MyTreesHealthFilter;
  setHealthFilter: (value: MyTreesHealthFilter) => void;
  speciesFilter: string;
  setSpeciesFilter: (value: string) => void;
  availableSpecies: string[];
  sortKey: MyTreesSortKey;
  setSortKey: (value: MyTreesSortKey) => void;
};

export function MyTreesFilterToolbar({
  treeSummary,
  roleFilter,
  setRoleFilter,
  healthFilter,
  setHealthFilter,
  speciesFilter,
  setSpeciesFilter,
  availableSpecies,
  sortKey,
  setSortKey,
}: MyTreesFilterToolbarProps) {
  const speciesOptions = useMemo<DropdownOption<string>[]>(
    () => [
      { key: 'all', label: 'All species', icon: 'forest', accent: Theme.Colours.primary },
      ...availableSpecies.map((species) => ({
        key: species,
        label: species,
        icon: 'pine-tree' as const,
        accent: '#2F6B3B',
      })),
    ],
    [availableSpecies],
  );

  const healthFilterOptions = useMemo<DropdownOption<MyTreesHealthFilter>[]>(
    () =>
      MY_TREES_HEALTH_OPTIONS.map((option) => ({
        ...option,
        icon: HEALTH_FILTER_META[option.key].icon,
        accent: HEALTH_FILTER_META[option.key].accent,
      })),
    [],
  );

  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AppText style={styles.statValue}>{treeSummary.total}</AppText>
          <AppText style={styles.statLabel}>Total</AppText>
        </View>
        <View style={styles.statCard}>
          <AppText style={[styles.statValue, { color: '#1B6B2A' }]}>{treeSummary.healthy}</AppText>
          <AppText style={styles.statLabel}>Healthy</AppText>
        </View>
        <View style={styles.statCard}>
          <AppText style={[styles.statValue, { color: Theme.Colours.warning }]}>
            {treeSummary.attention}
          </AppText>
          <AppText style={styles.statLabel}>Attention</AppText>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.chipRowWrap}>
          {(['all', 'created', 'guardian'] as MyTreesRoleFilter[]).map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, roleFilter === r && styles.chipActive]}
              onPress={() => setRoleFilter(r)}
            >
              <AppText style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
                {r === 'all' ? 'All roles' : r === 'created' ? 'Created by me' : 'Guardian'}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.dropdownRow}>
          <FilterDropdown
            label="Tree Health"
            value={healthFilter}
            options={healthFilterOptions}
            onChange={setHealthFilter}
          />
          <FilterDropdown
            label="Tree Species"
            value={speciesFilter}
            options={speciesOptions}
            onChange={setSpeciesFilter}
          />
        </View>

        <View style={styles.chipRowWrap}>
          {MY_TREES_SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.chip, sortKey === opt.key && styles.chipActive]}
              onPress={() => setSortKey(opt.key)}
            >
              <AppText style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
                {opt.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
  },
  statCard: {
    ...CARD_GLASS,
    flex: 1,
    padding: Theme.Spacing.small,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: Theme.Colours.primary,
  },
  statLabel: {
    color: Theme.Colours.textMuted,
    fontSize: 12,
  },
  toolbar: {
    ...CARD_GLASS,
    padding: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
    zIndex: 5,
    overflow: 'visible',
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: Theme.Spacing.extraSmall,
    paddingVertical: 4,
    rowGap: 8,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.18)',
  },
  chipActive: {
    backgroundColor: Theme.Colours.primary,
    borderColor: Theme.Colours.primary,
  },
  chipText: {
    fontSize: 12,
    color: Theme.Colours.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dropdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.Spacing.small,
    paddingVertical: 6,
    zIndex: 30,
  },
  dropdownShell: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 140,
    position: 'relative',
    zIndex: 1,
  },
  dropdownShellOpen: {
    zIndex: 40,
  },
  dropdownTrigger: {
    minHeight: 52,
    borderRadius: Theme.Radius.medium,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: Theme.Spacing.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0D1F10',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
  },
  dropdownTextStack: {
    flexShrink: 1,
  },
  dropdownLabel: {
    color: Theme.Colours.textMuted,
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
  },
  dropdownValue: {
    color: Theme.Colours.textPrimary,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    padding: 6,
    borderRadius: Theme.Radius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: '#0D1F10',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 50,
  },
  dropdownMenuContent: {
    gap: 4,
  },
  dropdownOption: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  dropdownOptionText: {
    color: Theme.Colours.textPrimary,
    fontSize: 13,
  },
  dropdownOptionTextActive: {
    color: Theme.Colours.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
