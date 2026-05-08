import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type ManualPlacementPanelProps = {
  isWideLayout: boolean;
  coordinateText: string;
  onCancel: () => void;
};

export function ManualPlacementPanel({
  isWideLayout,
  coordinateText,
  onCancel,
}: ManualPlacementPanelProps) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={[
        styles.manualPlacementPanel,
        { borderRadius: layout.cardRadius, padding: layout.panelPadding },
        isWideLayout
          ? [styles.manualPlacementPanelWide, { right: layout.edgeInset }]
          : [styles.manualPlacementPanelBottom, { left: layout.edgeInset, right: layout.edgeInset }],
      ]}
    >
      <AppText style={styles.manualPlacementTitle}>Plot Tree On Map</AppText>
      <AppText style={styles.manualPlacementBody}>
        Move the cursor and click to pin the tree location.
      </AppText>

      <View style={styles.manualPlacementCoords}>
        <AppText style={styles.manualPlacementCoordsLabel}>Live Coordinates</AppText>
        <AppText style={styles.manualPlacementCoordsText}>{coordinateText}</AppText>
      </View>

      <AppButton
        title="Cancel Placement"
        variant="secondary"
        onPress={onCancel}
        style={styles.manualPlacementCancelButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  manualPlacementPanel: {
    position: 'absolute',
    zIndex: 210,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 255, 253, 0.95)',
    borderWidth: 1,
    borderColor: '#D6E5D7',
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  manualPlacementPanelWide: {
    top: 84,
    width: '90%',
    maxWidth: 320,
  },
  manualPlacementPanelBottom: {
    bottom: 104,
  },
  manualPlacementTitle: {
    ...Theme.Typography.subtitle,
    fontSize: 18,
    lineHeight: 24,
    color: Theme.Colours.textPrimary,
  },
  manualPlacementBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },
  manualPlacementCoords: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D5E4D5',
    backgroundColor: Theme.Colours.white,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  manualPlacementCoordsLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },
  manualPlacementCoordsText: {
    ...Theme.Typography.body,
    marginTop: 2,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
  manualPlacementCancelButton: {
    marginTop: 8,
    marginBottom: 0,
  },
});
