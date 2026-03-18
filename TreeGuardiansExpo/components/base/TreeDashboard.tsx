import React, { useMemo, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Tree } from '@/objects/TreeDetails';

type DetailKey = 'notes' | 'wildlife' | 'disease' | 'diameter' | 'height' | 'circumference';

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
}

export default function TreeDetailsDashboard({ tree, onClose }: TreeDetailsDashboardProps) {
  const [expanded, setExpanded] = useState(false);

  const detailRows = useMemo(() => {
    return [
      { key: 'notes' as DetailKey, label: 'Notes', value: tree.notes },
      { key: 'wildlife' as DetailKey, label: 'Wildlife', value: tree.wildlife },
      { key: 'disease' as DetailKey, label: 'Disease', value: tree.disease },
      {
        key: 'diameter' as DetailKey,
        label: 'Diameter',
        value: tree.diameter !== undefined ? `${tree.diameter} cm` : undefined,
      },
      {
        key: 'height' as DetailKey,
        label: 'Height',
        value: tree.height !== undefined ? `${tree.height} m` : undefined,
      },
      {
        key: 'circumference' as DetailKey,
        label: 'Circumference',
        value: tree.circumference !== undefined ? `${tree.circumference} cm` : undefined,
      },
    ];
  }, [tree]);

  const availableRows = detailRows.filter((row) => {
    if (row.value === undefined || row.value === null) {
      return false;
    }

    if (typeof row.value === 'string') {
      return row.value.trim().length > 0;
    }

    return true;
  });

  const previewRows = expanded ? availableRows : availableRows.slice(0, 3);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <AppText style={styles.badge}>Tree Marker</AppText>
            <AppText style={styles.title}>Observed Tree</AppText>
          </View>

          <AppButton
            title="Close"
            variant="tertiary"
            onPress={onClose}
            style={styles.closeButtonWrap}
            buttonStyle={styles.closeButton}
          />
        </View>

        {tree.photos && tree.photos.length > 0 ? (
          <Image source={{ uri: tree.photos[0] }} style={styles.heroPhoto} />
        ) : (
          <View style={styles.noPhoto}>
            <AppText style={styles.noPhotoIcon}>🌳</AppText>
            <AppText style={styles.noPhotoLabel}>No photo uploaded</AppText>
          </View>
        )}

        <ScrollView style={styles.detailArea} showsVerticalScrollIndicator={false}>
          {previewRows.length === 0 ? (
            <View style={styles.detailRow}>
              <AppText style={styles.valueOnly}>No extra details available for this tree.</AppText>
            </View>
          ) : (
            previewRows.map((row) => (
              <View key={row.key} style={styles.detailRow}>
                <AppText style={styles.label}>{row.label}</AppText>
                <AppText style={styles.value}>{String(row.value)}</AppText>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          {availableRows.length > 3 ? (
            <TouchableOpacity
              onPress={() => setExpanded((value) => !value)}
              style={styles.expandButton}
              activeOpacity={0.8}
            >
              <AppText style={styles.expandButtonText}>
                {expanded ? 'Show less' : 'View details'}
              </AppText>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <AppButton
            title="Done"
            variant="primary"
            onPress={onClose}
            style={styles.doneButtonWrap}
            buttonStyle={styles.doneButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    zIndex: 240,
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4E1D4',
    backgroundColor: '#FCFEFB',
    shadowColor: '#0F1711',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 16,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },

  badge: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  title: {
    ...Theme.Typography.subtitle,
    fontSize: 18,
    lineHeight: 24,
  },

  closeButtonWrap: {
    marginBottom: 0,
  },

  closeButton: {
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  heroPhoto: {
    width: '100%',
    height: 148,
  },

  noPhoto: {
    width: '100%',
    height: 148,
    backgroundColor: '#EEF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDE8DD',
  },

  noPhotoIcon: {
    fontSize: 34,
  },

  noPhotoLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },

  detailArea: {
    maxHeight: 160,
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  detailRow: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECE5',
  },

  label: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 2,
  },

  value: {
    ...Theme.Typography.body,
    color: Theme.Colours.textPrimary,
  },

  valueOnly: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
  },

  footer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  expandButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  expandButtonText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.primary,
    fontFamily: 'Poppins_600SemiBold',
  },

  doneButtonWrap: {
    marginBottom: 0,
  },

  doneButton: {
    minWidth: 92,
    marginBottom: 0,
  },
});