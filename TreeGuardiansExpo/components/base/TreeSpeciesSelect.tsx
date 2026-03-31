import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';
import { TREE_SPECIES } from '@/lib/treeSpecies';

type TreeSpeciesSelectProps = {
    value?: string;
    onChange: (value: string) => void;
    compact?: boolean;
};

export function TreeSpeciesSelect({
    value,
    onChange,
    compact = false,
}: TreeSpeciesSelectProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selected = useMemo(() => {
        if (!value) {
            return null;
        }

        return (
            TREE_SPECIES.find(
                (option) => option.label.toLowerCase() === value.trim().toLowerCase()
            ) ?? null
        );
    }, [value]);

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
                {TREE_SPECIES.map((option) => {
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
                                <AppText style={styles.optionText}>{option.label}</AppText>
                            </View>

                            {isSelected ? (
                                <MaterialCommunityIcons name="check" size={18} color="#2F5A35" />
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
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
  },
  optionText: {
    ...Theme.Typography.body,
    color: '#2F5A35',
  },
});