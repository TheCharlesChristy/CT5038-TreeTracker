import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { TreeDataStats } from './TreeDataStats';
import { Tree } from '@/objects/TreeDetails';

type PopupTab = 'overview' | 'photos' | 'activity';
type ActivityType = 'wildlife' | 'disease' | 'seen';

type ActivityItem = {
  key: string;
  type: ActivityType;
  title: string;
  content: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
}

const TABS: { key: PopupTab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { key: 'overview', label: 'Overview', icon: 'text-box-search-outline' },
  { key: 'photos', label: 'Photos', icon: 'image-multiple-outline' },
  { key: 'activity', label: 'Activity', icon: 'message-badge-outline' },
];

function cleanText(value: string | undefined) {
  return value?.trim() ?? '';
}

function TreeOverview({
  tree,
  photoCount,
  activityCount,
  healthLabel,
  healthIcon,
  healthTone,
  activityItems,
  onAddPhoto,
}: {
  tree: Tree;
  photoCount: number;
  activityCount: number;
  healthLabel: string;
  healthIcon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  healthTone: 'healthy' | 'attention';
  activityItems: ActivityItem[];
  onAddPhoto: () => void;
}) {
  const primaryPhoto = tree.photos?.[0];

  const latestObservation = activityItems[0];

  return (
    <View style={styles.sectionStack}>
      <View style={styles.heroCard}>
        {primaryPhoto ? (
          <Image source={{ uri: primaryPhoto }} style={styles.heroPhoto} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <MaterialCommunityIcons name="tree-outline" size={38} color="#1B5E20" />
            <AppText style={styles.heroPlaceholderTitle}>No primary photo yet</AppText>
            <AppText style={styles.heroPlaceholderText}>
              This tree can still be explored from its measurements and observations.
            </AppText>
          </View>
        )}

        <View style={styles.heroOverlay}>
          <View style={styles.heroLabel}>
            <AppText style={styles.heroLabelText}>Tree Overview</AppText>
          </View>

          <View style={[styles.healthBadge, healthTone === 'attention' ? styles.healthBadgeAttention : styles.healthBadgeHealthy]}>
            <MaterialCommunityIcons name={healthIcon} size={14} color={healthTone === 'attention' ? '#8C2D04' : '#165B2A'} />
            <AppText style={[styles.healthBadgeText, healthTone === 'attention' ? styles.healthBadgeTextAttention : styles.healthBadgeTextHealthy]}>
              {healthLabel}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.summaryChipRow}>
        <View style={styles.summaryChip}>
          <MaterialCommunityIcons name="image-outline" size={14} color="#1B5E20" />
          <AppText style={styles.summaryChipText}>{photoCount} photos</AppText>
        </View>
        <View style={styles.summaryChip}>
          <MaterialCommunityIcons name="timeline-outline" size={14} color="#1B5E20" />
          <AppText style={styles.summaryChipText}>{activityCount} updates</AppText>
        </View>
        <View style={styles.summaryChip}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color="#1B5E20" />
          <AppText style={styles.summaryChipText}>
            {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
          </AppText>
        </View>
      </View>

      <TreeDataStats tree={tree} />

      <View style={styles.infoSection}>
        <AppText style={styles.sectionTitle}>Latest Snapshot</AppText>
        {latestObservation ? (
          <>
            <ActivityTag item={latestObservation} />
            <AppText style={styles.snapshotTitle}>{latestObservation.title}</AppText>
            <AppText style={styles.snapshotBody}>{latestObservation.content}</AppText>
            <AppText style={styles.snapshotMeta}>{latestObservation.meta}</AppText>
          </>
        ) : (
          <AppText style={styles.emptySectionText}>
            No observations have been logged for this tree yet.
          </AppText>
        )}
      </View>

      <AppButton
        title="Add Photo"
        variant="secondary"
        onPress={onAddPhoto}
        style={styles.sectionActionWrap}
        buttonStyle={styles.sectionActionButton}
      />
    </View>
  );
}

function TreePhotos({ photos, onAddPhoto }: { photos: string[]; onAddPhoto: () => void }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Photo Gallery</AppText>
        <AppText style={styles.sectionMeta}>{photos.length} items</AppText>
      </View>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRail}
        >
          {photos.map((photo, index) => (
            <View key={`${photo}-${index}`} style={styles.photoCard}>
              <Image source={{ uri: photo }} style={styles.galleryPhoto} />
              <View style={styles.photoCaption}>
                <AppText style={styles.photoCaptionText}>Photo {index + 1}</AppText>
              </View>
            </View>
          ))}

          <View style={styles.addPhotoTile}>
            <MaterialCommunityIcons name="camera-plus-outline" size={26} color="#1B5E20" />
            <AppText style={styles.addPhotoTitle}>Add photo</AppText>
            <AppText style={styles.addPhotoText}>Upload support can plug into this slot later.</AppText>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="image-off-outline" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>No photos yet</AppText>
          <AppText style={styles.emptyStateBody}>
            When images are added, they will appear here in a swipeable gallery.
          </AppText>
        </View>
      )}

      <View style={styles.infoSection}>
        <AppText style={styles.sectionTitle}>Photo Notes</AppText>
        <AppText style={styles.infoText}>
          Keep this space focused on quick visual comparison, so a few strong images are more useful than a long wall of media.
        </AppText>
      </View>

      <AppButton
        title="Add Photo"
        variant="secondary"
        onPress={onAddPhoto}
        style={styles.sectionActionWrap}
        buttonStyle={styles.sectionActionButton}
      />
    </View>
  );
}

function ActivityTag({ item }: { item: ActivityItem }) {
  const toneStyle =
    item.type === 'wildlife'
      ? styles.activityTagWildlife
      : item.type === 'disease'
        ? styles.activityTagDisease
        : styles.activityTagSeen;

  const toneTextStyle =
    item.type === 'wildlife'
      ? styles.activityTagTextWildlife
      : item.type === 'disease'
        ? styles.activityTagTextDisease
        : styles.activityTagTextSeen;

  const toneColor =
    item.type === 'wildlife'
      ? '#1B5E20'
      : item.type === 'disease'
        ? '#8C2D04'
        : '#35505E';

  return (
    <View style={[styles.activityTag, toneStyle]}>
      <MaterialCommunityIcons name={item.icon} size={13} color={toneColor} />
      <AppText style={[styles.activityTagText, toneTextStyle]}>{item.title}</AppText>
    </View>
  );
}

function TreeActivity({ items, onAddComment }: { items: ActivityItem[]; onAddComment: () => void }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Activity Feed</AppText>
        <AppText style={styles.sectionMeta}>{items.length} updates</AppText>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="message-outline" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>No activity yet</AppText>
          <AppText style={styles.emptyStateBody}>
            Wildlife notes, health alerts, and sightings will collect here as the tree gains updates.
          </AppText>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.key} style={styles.feedCard}>
            <View style={[
              styles.feedAvatar,
              item.type === 'wildlife'
                ? styles.feedAvatarWildlife
                : item.type === 'disease'
                  ? styles.feedAvatarDisease
                  : styles.feedAvatarSeen,
            ]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={18}
                color={item.type === 'disease' ? '#8C2D04' : '#165B2A'}
              />
            </View>

            <View style={styles.feedBody}>
              <View style={styles.feedHeaderRow}>
                <AppText style={styles.feedAuthor}>Community Log</AppText>
                <AppText style={styles.feedTime}>Current record</AppText>
              </View>

              <ActivityTag item={item} />
              <AppText style={styles.feedText}>{item.content}</AppText>
              <AppText style={styles.feedMeta}>{item.meta}</AppText>
            </View>
          </View>
        ))
      )}

      <View style={styles.infoSection}>
        <AppText style={styles.sectionTitle}>Feed Structure</AppText>
        <AppText style={styles.infoText}>
          This panel is ready for richer comments and replies, while already separating wildlife, disease, and seen observations for faster scanning.
        </AppText>
      </View>

      <AppButton
        title="Add Comment"
        variant="secondary"
        onPress={onAddComment}
        style={styles.sectionActionWrap}
        buttonStyle={styles.sectionActionButton}
      />
    </View>
  );
}

function TreeFooter({
  activeTab,
  onChangeTab,
  onClose,
  photoCount,
  activityCount,
}: {
  activeTab: PopupTab;
  onChangeTab: (tab: PopupTab) => void;
  onClose: () => void;
  photoCount: number;
  activityCount: number;
}) {
  let shortcutTab: PopupTab = 'overview';
  let shortcutLabel = 'Overview';

  if (activeTab === 'overview') {
    if (photoCount > 0) {
      shortcutTab = 'photos';
      shortcutLabel = 'View Photos';
    } else {
      shortcutTab = 'activity';
      shortcutLabel = 'View Activity';
    }
  } else if (activeTab === 'photos') {
    shortcutTab = 'activity';
    shortcutLabel = activityCount > 0 ? 'View Activity' : 'Overview';
  } else {
    shortcutTab = 'overview';
    shortcutLabel = 'Overview';
  }

  if (activeTab === 'photos' && activityCount === 0) {
    shortcutTab = 'overview';
    shortcutLabel = 'Overview';
  }

  return (
    <View style={styles.footer}>
      <AppButton
        title={shortcutLabel}
        variant="outline"
        onPress={() => onChangeTab(shortcutTab)}
        style={styles.footerSecondaryWrap}
        buttonStyle={styles.footerSecondaryButton}
        textStyle={styles.footerSecondaryText}
      />

      <AppButton
        title="Done"
        variant="primary"
        onPress={onClose}
        style={styles.footerPrimaryWrap}
        buttonStyle={styles.footerPrimaryButton}
      />
    </View>
  );
}

export default function TreeDetailsDashboard({ tree, onClose }: TreeDetailsDashboardProps) {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<PopupTab>('overview');

  useEffect(() => {
    setActiveTab('overview');
  }, [tree.id, tree.latitude, tree.longitude]);

  const photos = tree.photos ?? [];

  const activityItems = useMemo<ActivityItem[]>(() => {
    const disease = cleanText(tree.disease);
    const wildlife = cleanText(tree.wildlife);
    const notes = cleanText(tree.notes);

    const items: ActivityItem[] = [];

    if (disease) {
      items.push({
        key: 'disease',
        type: 'disease',
        title: 'Disease',
        content: disease,
        meta: 'Health alert recorded for follow-up.',
        icon: 'biohazard',
      });
    }

    if (wildlife) {
      items.push({
        key: 'wildlife',
        type: 'wildlife',
        title: 'Wildlife',
        content: wildlife,
        meta: 'Biodiversity observation linked to this tree.',
        icon: 'paw',
      });
    }

    if (notes) {
      items.push({
        key: 'seen',
        type: 'seen',
        title: 'Seen',
        content: notes,
        meta: 'General tree note from the latest record.',
        icon: 'eye-outline',
      });
    }

    return items;
  }, [tree.disease, tree.notes, tree.wildlife]);

  const needsAttention = cleanText(tree.disease).length > 0;
  const healthLabel = tree.health
    ? tree.health.replace(/^./, (letter) => letter.toUpperCase())
    : needsAttention
      ? 'Needs attention'
      : 'Healthy';
  const healthIcon = needsAttention ? 'alert-circle-outline' : 'check-decagram-outline';
  const healthTone = needsAttention ? 'attention' : 'healthy';

  const cardWidth = Math.min(width - 28, 520);
  const cardMaxHeight = Math.min(height * 0.78, 720);
  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Photo uploads are not wired up yet.');
  };
  const handleAddComment = () => {
    Alert.alert('Add Comment', 'Comments are not wired up yet.');
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText style={styles.eyebrow}>Tree Marker</AppText>
            <AppText style={styles.title}>
              {tree.id !== undefined ? `Tree #${tree.id}` : 'Observed Tree'}
            </AppText>
            <AppText style={styles.subtitle}>
              {photos.length} photos • {activityItems.length} updates
            </AppText>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.82}>
            <MaterialCommunityIcons name="close" size={20} color="#234229" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.86}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={isActive ? Theme.Colours.white : '#31553A'}
                />
                <AppText style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' ? (
            <TreeOverview
              tree={tree}
              photoCount={photos.length}
              activityCount={activityItems.length}
              healthLabel={healthLabel}
              healthIcon={healthIcon}
              healthTone={healthTone}
              activityItems={activityItems}
              onAddPhoto={handleAddPhoto}
            />
          ) : null}

          {activeTab === 'photos' ? <TreePhotos photos={photos} onAddPhoto={handleAddPhoto} /> : null}
          {activeTab === 'activity' ? <TreeActivity items={activityItems} onAddComment={handleAddComment} /> : null}
        </ScrollView>

        <TreeFooter
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onClose={onClose}
          photoCount={photos.length}
          activityCount={activityItems.length}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(190, 212, 192, 0.92)',
    backgroundColor: 'rgba(252, 254, 251, 0.99)',
    shadowColor: '#0F1711',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 18,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBE3',
    backgroundColor: 'rgba(246, 251, 246, 0.96)',
  },

  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },

  title: {
    ...Theme.Typography.subtitle,
    color: '#15361C',
    fontSize: 22,
    lineHeight: 28,
  },

  subtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4EA',
    borderWidth: 1,
    borderColor: '#D2E2D2',
  },

  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFE8',
    backgroundColor: '#F8FBF8',
  },

  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E4D8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },

  tabButtonActive: {
    backgroundColor: '#1F6A30',
    borderColor: '#1F6A30',
  },

  tabButtonText: {
    ...Theme.Typography.caption,
    color: '#31553A',
    fontFamily: 'Poppins_600SemiBold',
  },

  tabButtonTextActive: {
    color: Theme.Colours.white,
  },

  contentScroll: {
    flexGrow: 0,
  },

  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  sectionStack: {
    gap: 16,
  },

  heroCard: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8E6D8',
    backgroundColor: '#F2F7F2',
  },

  heroPhoto: {
    width: '100%',
    height: 188,
  },

  heroPlaceholder: {
    minHeight: 188,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4EA',
  },

  heroPlaceholderTitle: {
    ...Theme.Typography.subtitle,
    color: '#15361C',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },

  heroPlaceholderText: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
    textAlign: 'center',
  },

  heroOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  heroLabel: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(10, 39, 16, 0.66)',
  },

  heroLabelText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },

  healthBadgeHealthy: {
    backgroundColor: 'rgba(232, 248, 236, 0.95)',
    borderColor: '#C7E4CD',
  },

  healthBadgeAttention: {
    backgroundColor: 'rgba(255, 244, 229, 0.97)',
    borderColor: '#F3C48B',
  },

  healthBadgeText: {
    ...Theme.Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },

  healthBadgeTextHealthy: {
    color: '#165B2A',
  },

  healthBadgeTextAttention: {
    color: '#8C2D04',
  },

  summaryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EDF6ED',
    borderWidth: 1,
    borderColor: '#D8E6D8',
  },

  summaryChipText: {
    ...Theme.Typography.caption,
    color: '#214B2A',
    fontFamily: 'Poppins_600SemiBold',
  },

  infoSection: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E0EAE0',
  },

  sectionTitle: {
    ...Theme.Typography.subtitle,
    color: '#18371D',
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  sectionMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    fontFamily: 'Poppins_600SemiBold',
  },

  emptySectionText: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
  },

  snapshotTitle: {
    ...Theme.Typography.body,
    color: '#18371D',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },

  snapshotBody: {
    ...Theme.Typography.body,
    color: Theme.Colours.textPrimary,
    marginBottom: 6,
  },

  snapshotMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },

  photoRail: {
    paddingRight: 8,
  },

  photoCard: {
    width: 156,
    marginRight: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#EEF6EE',
    borderWidth: 1,
    borderColor: '#DBE7DB',
  },

  galleryPhoto: {
    width: '100%',
    height: 132,
  },

  photoCaption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  photoCaptionText: {
    ...Theme.Typography.caption,
    color: '#214B2A',
    fontFamily: 'Poppins_600SemiBold',
  },

  addPhotoTile: {
    width: 156,
    minHeight: 178,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A8C5AC',
    backgroundColor: '#F3FAF3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  addPhotoTitle: {
    ...Theme.Typography.subtitle,
    color: '#18371D',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },

  addPhotoText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    textAlign: 'center',
  },

  emptyStateCard: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F7FBF7',
    borderWidth: 1,
    borderColor: '#E0EAE0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateTitle: {
    ...Theme.Typography.subtitle,
    color: '#18371D',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },

  emptyStateBody: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
    textAlign: 'center',
  },

  infoText: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
  },

  sectionActionWrap: {
    marginBottom: 0,
  },

  sectionActionButton: {
    minHeight: 48,
    marginBottom: 0,
    borderRadius: 14,
  },

  activityTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
  },

  activityTagWildlife: {
    backgroundColor: '#EAF8EC',
    borderColor: '#B9E1C1',
  },

  activityTagDisease: {
    backgroundColor: '#FFF4E6',
    borderColor: '#F2C893',
  },

  activityTagSeen: {
    backgroundColor: '#EEF2F4',
    borderColor: '#D0DAE0',
  },

  activityTagText: {
    ...Theme.Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },

  activityTagTextWildlife: {
    color: '#1B5E20',
  },

  activityTagTextDisease: {
    color: '#8C2D04',
  },

  activityTagTextSeen: {
    color: '#35505E',
  },

  feedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FBFDFC',
    borderWidth: 1,
    borderColor: '#E0EAE0',
  },

  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  feedAvatarWildlife: {
    backgroundColor: '#EAF8EC',
  },

  feedAvatarDisease: {
    backgroundColor: '#FFF4E6',
  },

  feedAvatarSeen: {
    backgroundColor: '#EEF2F4',
  },

  feedBody: {
    flex: 1,
  },

  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  feedAuthor: {
    ...Theme.Typography.body,
    color: '#18371D',
    fontFamily: 'Poppins_600SemiBold',
  },

  feedTime: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textLight,
  },

  feedText: {
    ...Theme.Typography.body,
    color: Theme.Colours.textPrimary,
    marginBottom: 6,
  },

  feedMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3EBE3',
    backgroundColor: '#F8FBF8',
  },

  footerSecondaryWrap: {
    flex: 1,
    marginBottom: 0,
  },

  footerSecondaryButton: {
    minHeight: 48,
    marginBottom: 0,
    borderRadius: 14,
  },

  footerSecondaryText: {
    fontSize: 14,
  },

  footerPrimaryWrap: {
    flex: 1,
    marginBottom: 0,
  },

  footerPrimaryButton: {
    minHeight: 48,
    marginBottom: 0,
    borderRadius: 14,
  },
});
