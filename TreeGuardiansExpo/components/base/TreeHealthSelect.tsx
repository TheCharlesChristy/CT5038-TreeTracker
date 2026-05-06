import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';

export type TreeHealth = 'good' | 'ok' | 'bad';
export type TreeHealthFilterOption = 'all' | 'healthy' | 'attention';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  borderColor: string;
  backgroundColor: string;
  textColor: string;
};

/** Good / OK / Bad only — use when adding a tree (see `AddTreeDashboard`). */
export const TREE_HEALTH_FORM_OPTIONS: SelectOption<TreeHealth>[] = [
  {
    value: 'good',
    label: 'Good',
    icon: 'leaf',
    borderColor: '#A2CF5F',
    backgroundColor: '#F5FAE8',
    textColor: '#446119',
  },
  {
    value: 'ok',
    label: 'OK',
    icon: 'checkbox-marked-circle-outline',
    borderColor: '#E1C14C',
    backgroundColor: '#FFF8E1',
    textColor: '#7B5A00',
  },
  {
    value: 'bad',
    label: 'Bad',
    icon: 'alert-outline',
    borderColor: '#F1A25E',
    backgroundColor: '#FFF0E4',
    textColor: '#8A4712',
  },
];
];

export const TREE_HEALTH_OPTIONS: SelectOption<TreeHealth>[] = TREE_HEALTH_FORM_OPTIONS;

export function getTreeHealthOption(value?: TreeHealth) {
  return (
    TREE_HEALTH_OPTIONS.find((option) => option.value === value) ??
    TREE_HEALTH_OPTIONS.find((option) => option.value === 'ok') ??
    TREE_HEALTH_OPTIONS[0]
  );
}

const TREE_HEALTH_FILTER_OPTIONS: SelectOption<TreeHealthFilterOption>[] = [
  {
    value: 'all',
    label: 'All Trees',
    icon: 'forest',
    borderColor: '#B7CEC0',
    backgroundColor: '#F3F8F4',
    textColor: '#2F4B36',
  },
  {
    value: 'healthy',
    label: 'Healthy',
    icon: 'heart-pulse',
    borderColor: '#9FCC7E',
    backgroundColor: '#F3FAEB',
    textColor: '#3E6222',
  },
  {
    value: 'attention',
    label: 'Needs Attention',
    icon: 'alert-outline',
    borderColor: '#E6B07B',
    backgroundColor: '#FFF2E5',
    textColor: '#8A4D14',
  },
];

type BaseProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  prefixLabel?: string;
  compact?: boolean;
  /** When current `value` is not in `options`, use this for trigger styling (e.g. legacy API health). */
  getFallbackMeta?: (value: T) => SelectOption<T> | undefined;
};

type TreeHealthSelectProps = {
  value?: TreeHealth;
  onChange: (value: TreeHealth) => void;
  compact?: boolean;
  /** Defaults to full list; use `TREE_HEALTH_FORM_OPTIONS` when adding a tree (Good / OK / Bad only). */
  options?: SelectOption<TreeHealth>[];
};

export function TreeHealthSelect({
  value = 'ok',
  onChange,
  compact = false,
  options = TREE_HEALTH_OPTIONS,
}: TreeHealthSelectProps) {
  return (
    <HealthSelectBase
      value={value}
      onChange={onChange}
      options={options}
      prefixLabel="Health"
      compact={compact}
      getFallbackMeta={(v) => getTreeHealthOption(v as TreeHealth) as SelectOption<TreeHealth>}
    />
  );
}

export function TreeHealthFilterSelect({
  value = 'all',
  onChange,
  compact = false,
}: {
  value?: TreeHealthFilterOption;
  onChange: (value: TreeHealthFilterOption) => void;
  compact?: boolean;
}) {
  return (
    <HealthSelectBase
      value={value}
      onChange={onChange}
      options={TREE_HEALTH_FILTER_OPTIONS}
      compact={compact}
    />
  );
}

function HealthSelectBase<T extends string>({
  value,
  onChange,
  options,
  prefixLabel,
  compact = false,
  getFallbackMeta,
}: BaseProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedMeta = useMemo(
    () =>
      options.find((option) => option.value === value) ??
      getFallbackMeta?.(value) ??
      options[0],
    [getFallbackMeta, options, value]
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          {
            borderColor: selectedMeta.borderColor,
            backgroundColor: selectedMeta.backgroundColor,
          },
        ]}
        onPress={() => setIsOpen((current) => !current)}
        activeOpacity={0.85}
      >
        <View style={styles.triggerCopy}>
          <MaterialCommunityIcons
            name={selectedMeta.icon}
            size={compact ? 16 : 18}
            color={selectedMeta.textColor}
          />
          <AppText style={[styles.triggerText, compact && styles.triggerTextCompact, { color: selectedMeta.textColor }]}>
            {prefixLabel ? `${prefixLabel}: ${selectedMeta.label}` : selectedMeta.label}
          </AppText>
        </View>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={compact ? 16 : 18}
          color={selectedMeta.textColor}
        />
      </TouchableOpacity>

      {isOpen ? (
        <View style={styles.menu}>
          {options.map((optionMeta) => {
            const selected = optionMeta.value === value;

            return (
              <TouchableOpacity
                key={optionMeta.value}
                style={[
                  styles.option,
                  compact && styles.optionCompact,
                  {
                    borderColor: optionMeta.borderColor,
                    backgroundColor: optionMeta.backgroundColor,
                  },
                ]}
                onPress={() => {
                  onChange(optionMeta.value);
                  setIsOpen(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.optionCopy}>
                  <MaterialCommunityIcons
                    name={optionMeta.icon}
                    size={compact ? 15 : 17}
                    color={optionMeta.textColor}
                  />
                  <AppText style={[styles.optionText, compact && styles.optionTextCompact, { color: optionMeta.textColor }]}>
                    {optionMeta.label}
                  </AppText>
                </View>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={compact ? 16 : 18} color={optionMeta.textColor} />
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
    paddingHorizontal: Theme.Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerCompact: {
    minHeight: 46,
    paddingHorizontal: 12,
  },
  triggerCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  triggerText: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
  },
  triggerTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  menu: {
    marginTop: 8,
    gap: 8,
  },
  option: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Theme.Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCompact: {
    minHeight: 42,
    paddingHorizontal: 12,
  },
  optionCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    ...Theme.Typography.body,
  },
  optionTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
});
