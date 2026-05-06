import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles';

export type TreeHealth = 'excellent' | 'good' | 'ok' | 'bad' | 'terrible';
export type TreeHealthFilterOption = 'all' | 'healthy' | 'attention';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  borderColor: string;
  backgroundColor: string;
  textColor: string;
};

/** Good / OK / Bad only - use when adding a tree (see `AddTreeDashboard`). */
export const TREE_HEALTH_FORM_OPTIONS: SelectOption<TreeHealth>[] = [
  {
    value: 'good',
    label: 'Good',
    description: 'Healthy appearance with minor cosmetic issues, no significant threats.',
    icon: 'leaf',
    borderColor: '#A2CF5F',
    backgroundColor: '#F5FAE8',
    textColor: '#446119',
  },
  {
    value: 'ok',
    label: 'OK',
    description: 'Some stress signs visible, sparse foliage or minor deadwood. Worth monitoring.',
    icon: 'checkbox-marked-circle-outline',
    borderColor: '#E1C14C',
    backgroundColor: '#FFF8E1',
    textColor: '#7B5A00',
  },
  {
    value: 'bad',
    label: 'Bad',
    description: 'Noticeable decline, significant deadwood, crown dieback, or pest and disease activity.',
    icon: 'alert-outline',
    borderColor: '#F1A25E',
    backgroundColor: '#FFF0E4',
    textColor: '#8A4712',
  },
];

/** Full tree health range - use when displaying or editing existing tree details. */
export const TREE_HEALTH_OPTIONS: SelectOption<TreeHealth>[] = [
  {
    value: 'excellent',
    label: 'Excellent',
    description: 'Full canopy, vibrant leaves, no visible damage or disease.',
    icon: 'leaf-circle',
    borderColor: '#78C57D',
    backgroundColor: '#EDF9EE',
    textColor: '#206127',
  },
  ...TREE_HEALTH_FORM_OPTIONS,
  {
    value: 'terrible',
    label: 'Terrible',
    description: 'Severe structural risk or advanced disease. Requires urgent professional assessment.',
    icon: 'alert-octagon-outline',
    borderColor: '#E07A74',
    backgroundColor: '#FFF0F0',
    textColor: '#8F2520',
  },
];

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
    description: '',
    icon: 'forest',
    borderColor: '#B7CEC0',
    backgroundColor: '#F3F8F4',
    textColor: '#2F4B36',
  },
  {
    value: 'healthy',
    label: 'Healthy',
    description: '',
    icon: 'heart-pulse',
    borderColor: '#9FCC7E',
    backgroundColor: '#F3FAEB',
    textColor: '#3E6222',
  },
  {
    value: 'attention',
    label: 'Needs Attention',
    description: '',
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

      {!compact && selectedMeta.description ? (
        <AppText style={[styles.description, { color: selectedMeta.textColor }]}>
          {selectedMeta.description}
        </AppText>
      ) : null}

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
                  <View style={styles.optionLabelStack}>
                    <AppText style={[styles.optionText, compact && styles.optionTextCompact, { color: optionMeta.textColor }]}>
                      {optionMeta.label}
                    </AppText>
                    {!compact && optionMeta.description ? (
                      <AppText style={[styles.optionDescription, { color: optionMeta.textColor }]}>
                        {optionMeta.description}
                      </AppText>
                    ) : null}
                  </View>
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
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCompact: {
    minHeight: 42,
    paddingHorizontal: 12,
  },
  optionCopy: {
    flex: 1,
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
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 4,
    opacity: 0.82,
  },
  optionLabelStack: {
    flex: 1,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    opacity: 0.75,
  },
});
