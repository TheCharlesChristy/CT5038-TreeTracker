import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';
import { TREE_SPECIES, findTreeSpeciesOption } from '@/lib/treeSpecies';

type TreeSpeciesSelectProps = {
    value?: string;
    onChange: (value: string) => void;
    compact?: boolean;
};

const DEFAULT_UK_SPECIES = [
  'Ash',
  'English Oak',
  'Hawthorn',
  'Silver Birch',
  'Sitka Spruce',
  'Other / Unknown',
];

export function TreeSpeciesSelect({
    value,
    onChange,
    compact = false,
}: TreeSpeciesSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(() => {
        return findTreeSpeciesOption(value);
    }, [value]);

    const defaultOptions = useMemo(() => {
      const preferredByLabel = new Map(
        DEFAULT_UK_SPECIES.map((label) => [label.toLowerCase(), label])
      );

      const collected = new Map<string, (typeof TREE_SPECIES)[number]>();

      TREE_SPECIES.forEach((option) => {
        const normalized = option.label.toLowerCase();
        if (preferredByLabel.has(normalized)) {
          collected.set(normalized, option);
        }
      });

      return DEFAULT_UK_SPECIES.map((label) => collected.get(label.toLowerCase())).filter(
        (option): option is (typeof TREE_SPECIES)[number] => Boolean(option)
      );
    }, []);

    const filteredOptions = useMemo(() => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return defaultOptions;
      }
      return TREE_SPECIES.filter((option) => option.searchText.includes(normalizedQuery));
    }, [defaultOptions, query]);

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
                {selected ? selected.label : 'Select Tree Species'}
            </AppText>
        </View>

        <MaterialCommunityIcons 
            name={isOpen? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color="#2F5A35"
        />
        </TouchableOpacity>

        {isOpen ? (
            <View style={styles.menu}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search common or scientific name"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!query.trim() ? (
                <AppText style={styles.helperText}>
                  Showing common UK species. Start typing to search all species.
                </AppText>
              ) : null}
              <ScrollView style={styles.optionList} nestedScrollEnabled>
                {filteredOptions.map((option) => {
                    const isSelected =
                        value?.trim().toLowerCase() === option.label.toLowerCase();

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
                                <View style={styles.optionTextGroup}>
                                  <AppText style={styles.optionText}>{option.label}</AppText>
                                  {option.scientificName ? (
                                    <AppText style={styles.optionSecondaryText}>{option.scientificName}</AppText>
                                  ) : null}
                                </View>
                            </View>

                            {isSelected ? (
                                <MaterialCommunityIcons name="check" size={18} color="#2F5A35" />
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
                {filteredOptions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <AppText style={styles.emptyStateText}>No species match your search.</AppText>
                  </View>
                ) : null}
              </ScrollView>
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
    maxHeight: 320,
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    color: '#2F5A35',
    fontSize: 14,
  },
  optionList: {
    marginTop: 6,
  },
  helperText: {
    ...Theme.Typography.caption,
    color: '#56705A',
    marginTop: 4,
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
  optionTextGroup: {
    flex: 1,
  },
  optionText: {
    ...Theme.Typography.body,
    color: '#2F5A35',
  },
  optionSecondaryText: {
    ...Theme.Typography.caption,
    color: '#56705A',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#D7E4D4',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  emptyStateText: {
    ...Theme.Typography.caption,
    color: '#56705A',
  },
});