import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';
import { TREE_SPECIES } from '@/lib/treeSpecies';
import { fetchOtmSpecies, OtmSpecies } from '@/lib/otmApi';

type TreeSpeciesSelectProps = {
    value?: string;
    onChange: (value: string) => void;
    compact?: boolean;
};

type SpeciesOption = {
  key: string;
  label: string;
  subtitle?: string;
  source: 'internal' | 'otm';
};

function buildMergedOptions(otmSpecies: OtmSpecies[]): SpeciesOption[] {
  const internalOptions: SpeciesOption[] = TREE_SPECIES.map((s) => ({
    key: `internal-${s.key}`,
    label: s.label,
    source: 'internal',
  }));

  const internalLabels = new Set(TREE_SPECIES.map((s) => s.label.toLowerCase()));

  const otmOptions: SpeciesOption[] = otmSpecies
    .filter((s) => s.commonName && !internalLabels.has(s.commonName.toLowerCase()))
    .map((s) => ({
      key: `otm-${s.otmId}`,
      label: s.commonName,
      subtitle: s.scientificName || undefined,
      source: 'otm',
    }));

  return [...internalOptions, ...otmOptions];
}

export function TreeSpeciesSelect({
    value,
    onChange,
    compact = false,
}: TreeSpeciesSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [otmSpecies, setOtmSpecies] = useState<OtmSpecies[]>([]);
    const searchRef = useRef<TextInput>(null);

    useEffect(() => {
      fetchOtmSpecies()
        .then(setOtmSpecies)
        .catch(() => { /* OTM unavailable — internal list is used as fallback */ });
    }, []);

    useEffect(() => {
      if (isOpen) {
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    }, [isOpen]);

    const allOptions = useMemo(() => buildMergedOptions(otmSpecies), [otmSpecies]);

    const filteredOptions = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return allOptions;
      return allOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.subtitle?.toLowerCase().includes(q) ?? false)
      );
    }, [allOptions, search]);

    const selectedLabel = useMemo(() => {
      if (!value) return null;
      const v = value.trim().toLowerCase();
      return allOptions.find((o) => o.label.toLowerCase() === v)?.label ?? value;
    }, [value, allOptions]);

    return (
        <View style={styles.container}>
        <TouchableOpacity
          style={[styles.trigger, compact && styles.triggerCompact]}
          activeOpacity={0.85}
          onPress={() => setIsOpen((current) => !current)}
        >
          <View style={styles.triggerCopy}>
            <MaterialCommunityIcons name="pine-tree" size={18} color="#2F5A35" />
            <AppText style={styles.triggerText}>
              {selectedLabel ?? 'Select Tree Species'}
            </AppText>
          </View>

          <MaterialCommunityIcons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#2F5A35"
          />
        </TouchableOpacity>

        {isOpen ? (
          <View style={styles.menu}>
            <View style={styles.searchRow}>
              <MaterialCommunityIcons name="magnify" size={16} color="#2F5A35" style={styles.searchIcon} />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search species..."
                placeholderTextColor="#8BA888"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#8BA888" />
                </TouchableOpacity>
              ) : null}
            </View>

            {filteredOptions.length === 0 ? (
              <View style={styles.emptyRow}>
                <AppText style={styles.emptyText}>No species found</AppText>
              </View>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value?.trim().toLowerCase() === option.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={styles.option}
                    activeOpacity={0.85}
                    onPress={() => {
                      onChange(option.label);
                      setIsOpen(false);
                    }}
                  >
                    <View style={styles.optionCopy}>
                      <MaterialCommunityIcons name="leaf" size={16} color="#2F5A35" />
                      <View>
                        <AppText style={styles.optionText}>{option.label}</AppText>
                        {option.subtitle ? (
                          <AppText style={styles.optionSubtitle}>{option.subtitle}</AppText>
                        ) : null}
                      </View>
                    </View>

                    {isSelected ? (
                      <MaterialCommunityIcons name="check" size={18} color="#2F5A35" />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  trigger: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#F4FBF3',
    paddingHorizontal: Theme.Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerCompact: {
    minHeight: 46,
  },
  triggerCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  triggerText: {
    ...Theme.Typography.body,
    color: '#2F5A35',
  },
  menu: {
    marginTop: 8,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    ...Theme.Typography.body,
    color: '#2F5A35',
    paddingVertical: 0,
  },
  emptyRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },
  option: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionText: {
    ...Theme.Typography.body,
    color: '#2F5A35',
  },
  optionSubtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    fontSize: 11,
  },
});
