import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Layout, Theme } from '@/styles';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AppButton } from './AppButton';
import { AppTouchableOpacity as TouchableOpacity } from './AppTouchableOpacity';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { StatusMessageBox, StatusMessage } from './StatusMessageBox';
import { TreeDataStats } from './TreeDataStats';
import { getTreeHealthOption, TreeHealth, TreeHealthSelect } from './TreeHealthSelect';
import { Tree, TreePhoto } from '@/objects/TreeDetails';
import {
  addTreeComment,
  addTreeCommentReply,
  deleteTreeComment,
  deleteTree,
  deleteTreePhoto,
  fetchTreeFeed,
  fetchTrees,
  resolveUploadedImageUrl,
  TreeFeedItem,
  TreePhotoUploadAsset,
  updateTreeData,
  uploadCommentDraftPhotos,
  uploadTreePhotos,
} from '@/lib/treeApi';
import { showConfirm } from '@/utilities/showConfirm';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { documentDirectory, cacheDirectory } from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { TreeSpeciesSelect } from './TreeSpeciesSelect';
import { estimateTreeEcoStats } from '@/lib/treeEcoEstimates';
import QRCode from 'react-native-qrcode-svg';

type PopupTab = 'overview' | 'photos' | 'activity' | 'qr';
type ActivityType = 'wildlife' | 'disease' | 'seen' | 'tree_comment' | 'reply';
type EditNumericField = 'diameter' | 'height' | 'circumference';

type ActivityItem = {
  key: string;
  commentId: number;
  userId: number | null;
  type: ActivityType;
  title: string;
  content: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  createdAt: string;
  photoUrls: string[];
  parentCommentId: number | null;
};

type CommentThread = {
  root: ActivityItem;
  replies: ActivityItem[];
};

const MAX_COMMENT_ATTACHMENTS = 12;
const MAX_COMMENT_IMAGE_BYTES = 10 * 1024 * 1024;

function parsePhotoUrlsFromFeed(raw: TreeFeedItem['photo_urls']): string[] {
  if (typeof raw !== 'string' || !raw.trim()) {
    return [];
  }

  return raw
    .split('|||')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCommentThreads(items: ActivityItem[]): CommentThread[] {
  const roots = items.filter((item) => item.type === 'tree_comment');
  const replies = items.filter((item) => item.type === 'reply');
  const repliesByParent = new Map<number, ActivityItem[]>();

  replies.forEach((reply) => {
    const parentId = reply.parentCommentId;
    if (parentId === null || Number.isNaN(parentId)) {
      return;
    }

    const bucket = repliesByParent.get(parentId) ?? [];
    bucket.push(reply);
    repliesByParent.set(parentId, bucket);
  });

  repliesByParent.forEach((list) => {
    list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

  return roots
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((root) => ({
      root,
      replies: repliesByParent.get(root.commentId) ?? [],
    }));
}

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
  currentUserId: number | null;
  isAdmin: boolean;
  isGuardian: boolean;
}

const TABS: {
  key: PopupTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { key: 'overview', label: 'Overview', icon: 'text-box-search-outline' },
  { key: 'photos', label: 'Photos', icon: 'image-multiple-outline' },
  { key: 'activity', label: 'Activity', icon: 'message-badge-outline' },
  { key: 'qr', label: 'QR Code', icon: 'qrcode' },
];

function parseEstimateNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatFeedMeta(item: TreeFeedItem): string {
  const username = item.username?.trim() || 'Unknown user';
  const createdAt = item.created_at
    ? new Date(item.created_at).toLocaleString()
    : 'Unknown Time';

  return `${username} | ${createdAt}`;
}

function parseFeedCommentId(raw: unknown): number {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) {
    return Number.NaN;
  }
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : Number.NaN;
}

function mapFeedItemToActivity(item: TreeFeedItem): ActivityItem {
  const commentId = parseFeedCommentId(item.comment_id);
  const userId = item.user_id != null ? Number(item.user_id) : null;
  const createdAt = item.created_at ?? '';
  const photoUrls = parsePhotoUrlsFromFeed(item.photo_urls);

  switch (item.item_type) {
    case 'tree_comment': {
      const text = item.content?.trim() ?? '';
      return {
        key: `tree-comment-${commentId}`,
        commentId,
        userId,
        type: 'tree_comment',
        title: 'Comment',
        content: text || (photoUrls.length > 0 ? '' : 'No comment provided.'),
        meta: formatFeedMeta(item),
        icon: 'message-text-outline',
        createdAt,
        photoUrls,
        parentCommentId: null,
      };
    }

    case 'reply': {
      const text = item.content?.trim() ?? '';
      const parentRaw = item.extra != null ? parseFeedCommentId(item.extra) : Number.NaN;
      const parentCommentId = Number.isFinite(parentRaw) ? parentRaw : null;

      return {
        key: `reply-${commentId}`,
        commentId,
        userId,
        type: 'reply',
        title: 'Reply',
        content: text || (photoUrls.length > 0 ? '' : 'No reply provided.'),
        meta: formatFeedMeta(item),
        icon: 'reply-outline',
        createdAt,
        photoUrls,
        parentCommentId,
      };
    }

    case 'wildlife':
      return {
        key: `wildlife-${commentId}`,
        commentId,
        userId,
        type: 'wildlife',
        title: 'Wildlife',
        content: item.content?.trim() || item.extra?.trim() || 'Wildlife observation.',
        meta: formatFeedMeta(item),
        icon: 'paw',
        createdAt,
        photoUrls: [],
        parentCommentId: null,
      };

    case 'disease':
      return {
        key: `disease-${commentId}`,
        commentId,
        userId,
        type: 'disease',
        title: 'Disease',
        content: item.content?.trim() || item.extra?.trim() || 'Disease observation.',
        meta: formatFeedMeta(item),
        icon: 'biohazard',
        createdAt,
        photoUrls: [],
        parentCommentId: null,
      };

    case 'seen':
    default:
      return {
        key: `seen-${commentId}`,
        commentId,
        userId,
        type: 'seen',
        title: 'Seen',
        content: item.content?.trim() || 'General observation.',
        meta: formatFeedMeta(item),
        icon: 'eye-outline',
        createdAt,
        photoUrls: [],
        parentCommentId: null,
      };
  }
}

function isCommentActivity(item: ActivityItem) {
  return item.type === 'tree_comment' || item.type === 'reply';
}

function isObservationActivity(item: ActivityItem) {
  return item.type === 'wildlife' || item.type === 'disease' || item.type === 'seen';
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

function TreeOverview({
  tree,
  photos,
  photoCount,
  activityCount,
  healthMeta,
  observationItems,
}: {
  tree: Tree;
  photos: TreePhoto[];
  photoCount: number;
  activityCount: number;
  healthMeta: ReturnType<typeof getTreeHealthOption>;
  observationItems: ActivityItem[];
}) {
  const primaryPhoto = photos[0]?.image_url;

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

          <View
            style={[
              styles.healthBadge,
              {
                borderColor: healthMeta.borderColor,
                backgroundColor: healthMeta.backgroundColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={healthMeta.icon}
              size={16}
              color={healthMeta.textColor}
            />
            <AppText style={[styles.healthBadgeText, { color: healthMeta.textColor }]}>
              {healthMeta.label}
            </AppText>
          </View>
        </View>
      </View>

      <TreeDataStats tree={tree} />

      <View style={styles.sectionStack}>
        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>Activity</AppText>
          <AppText style={styles.sectionMeta}>{observationItems.length} recorded</AppText>
        </View>

        {observationItems.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="pine-tree" size={30} color="#4A4A4A" />
            <AppText style={styles.emptyStateTitle}>No observations yet</AppText>
            <AppText style={styles.emptyStateBody}>
              Wildlife, disease, and sighting observations will appear here.
            </AppText>
          </View>
        ) : (
          observationItems.map((item) => (
            <View key={item.key} style={styles.feedCard}>
              <View
                style={[
                  styles.feedAvatar,
                  item.type === 'wildlife'
                    ? styles.feedAvatarWildlife
                    : item.type === 'disease'
                      ? styles.feedAvatarDisease
                      : styles.feedAvatarSeen,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={item.type === 'disease' ? '#8C2D04' : '#165B2A'}
                />
              </View>

              <View style={styles.feedBody}>
                <View style={styles.feedTopRow}>
                  <ActivityTag item={item} />
                </View>

                <AppText style={styles.feedText}>{item.content}</AppText>
                <AppText style={styles.feedMeta}>{item.meta}</AppText>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function TreePhotos({
  photos,
  onDeletePhoto,
  canManagePhotos,
  isUploadingPhotos,
  canAddPhoto,
  onAddPhoto,
}: {
  photos: TreePhoto[];
  onDeletePhoto: (photo: TreePhoto) => void;
  canManagePhotos: boolean;
  isUploadingPhotos: boolean;
  canAddPhoto: boolean;
  onAddPhoto: () => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Photo Gallery</AppText>
        <AppText style={styles.sectionMeta}>{photos.length} / 5 photos</AppText>
      </View>

      {isUploadingPhotos ? (
        <View style={styles.uploadingCard}>
          <ActivityIndicator size="small" color="#1B5E20" />
          <AppText style={styles.uploadingText}>Uploading photos…</AppText>
        </View>
      ) : null}

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.photoRail}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.image_url }} style={styles.galleryPhoto} />

              {canManagePhotos ? (
                <TouchableOpacity
                  onPress={() => onDeletePhoto(photo)}
                  activeOpacity={0.8}
                  style={styles.deletePhotoButton}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPhotoState}>
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="image-off-outline" size={30} color="#4A4A4A" />
            <AppText style={styles.emptyStateTitle}>No photos yet</AppText>
            <AppText style={styles.emptyStateBody}>
              Images added here will appear in a swipeable gallery.
            </AppText>
          </View>

          {canAddPhoto ? (
            <TouchableOpacity
              style={styles.addPhotoTileStandalone}
              onPress={onAddPhoto}
              activeOpacity={0.85}
              disabled={isUploadingPhotos}
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={22} color="#1B5E20" />
              <AppText style={styles.addPhotoTitle}>Add first photo</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <View style={styles.infoSection}>
        <AppText style={styles.sectionTitle}>Photo Notes</AppText>
        <AppText style={styles.infoText}>
          Scroll horizontally to browse all photos. Tap the Add photo tile to upload more.
        </AppText>
      </View>
    </View>
  );
}

function CommentInlineImages({ urls }: { urls: string[] }) {
  if (!urls.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.commentImageScroll}
      contentContainerStyle={styles.commentImageScrollContent}
    >
      {urls.map((url, index) => (
        <Image
          key={`${url}-${index}`}
          source={{ uri: resolveUploadedImageUrl(url) }}
          style={styles.commentThumb}
        />
      ))}
    </ScrollView>
  );
}

function CommentAttachmentRow({
  attachments,
  onRemove,
  disabled,
}: {
  attachments: TreePhotoUploadAsset[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.commentAttachScroll}
      contentContainerStyle={styles.commentAttachScrollContent}
    >
      {attachments.map((asset, index) => (
        <View key={`${asset.uri}-${index}`} style={styles.commentAttachChip}>
          <Image source={{ uri: asset.uri }} style={styles.commentAttachThumb} />
          <TouchableOpacity
            onPress={() => onRemove(index)}
            disabled={disabled}
            activeOpacity={0.75}
            style={styles.commentAttachRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close-circle" size={22} color="#8C2D04" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function TreeActivity({
  threads,
  onDeleteComment,
  onReply,
  isLoadingActivity,
  isAdmin,
  isLoggedIn,
}: {
  threads: CommentThread[];
  onDeleteComment: (item: ActivityItem) => void;
  onReply: (root: ActivityItem) => void;
  isLoadingActivity: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
}) {
  const totalMessages = threads.reduce((acc, thread) => acc + 1 + thread.replies.length, 0);

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Activity Feed</AppText>
        <AppText style={styles.sectionMeta}>
          {totalMessages} {totalMessages === 1 ? 'message' : 'messages'}
        </AppText>
      </View>

      {isLoadingActivity ? (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="loading" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>Loading comments</AppText>
          <AppText style={styles.emptyStateBody}>
            Fetching the latest community comments for this tree.
          </AppText>
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="message-outline" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>No comments yet</AppText>
          <AppText style={styles.emptyStateBody}>
            Start the discussion by leaving the first comment for this tree.
          </AppText>
        </View>
      ) : (
        threads.map(({ root, replies }) => (
          <View key={root.key} style={styles.threadBlock}>
            <View style={styles.feedCard}>
              <View style={[styles.feedAvatar, styles.feedAvatarSeen]}>
                <MaterialCommunityIcons name={root.icon} size={18} color="#165B2A" />
              </View>

              <View style={styles.feedBody}>
                <View style={styles.feedTopRow}>
                  <ActivityTag item={root} />

                  {isAdmin ? (
                    <TouchableOpacity
                      onPress={() => onDeleteComment(root)}
                      activeOpacity={0.8}
                      style={styles.deleteCommentButton}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={16}
                        color="#8C2D04"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {root.content.trim().length > 0 ? (
                  <AppText style={styles.feedText}>{root.content}</AppText>
                ) : null}
                <CommentInlineImages urls={root.photoUrls} />
                <AppText style={styles.feedMeta}>{root.meta}</AppText>

                {isLoggedIn && Number.isFinite(root.commentId) && root.commentId > 0 ? (
                  <TouchableOpacity
                    onPress={() => onReply(root)}
                    activeOpacity={0.82}
                    style={styles.replyAction}
                  >
                    <MaterialCommunityIcons name="reply" size={16} color="#1B5E20" />
                    <AppText style={styles.replyActionText}>Reply</AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {replies.map((reply) => (
              <View key={reply.key} style={[styles.feedCard, styles.replyCard]}>
                <View style={[styles.feedAvatar, styles.feedAvatarSeen]}>
                  <MaterialCommunityIcons name={reply.icon} size={18} color="#31553A" />
                </View>

                <View style={styles.feedBody}>
                  <View style={styles.feedTopRow}>
                    <ActivityTag item={reply} />

                    {isAdmin ? (
                      <TouchableOpacity
                        onPress={() => onDeleteComment(reply)}
                        activeOpacity={0.8}
                        style={styles.deleteCommentButton}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={16}
                          color="#8C2D04"
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {reply.content.trim().length > 0 ? (
                    <AppText style={styles.feedText}>{reply.content}</AppText>
                  ) : null}
                  <CommentInlineImages urls={reply.photoUrls} />
                  <AppText style={styles.feedMeta}>{reply.meta}</AppText>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function TreeQrCode({
  treeId,
  qrValue,
  onCopy,
  onSave,
  qrRef,
}: {
  treeId: number;
  qrValue: string;
  onCopy: () => void;
  onSave: () => void;
  qrRef: React.RefObject<QRCode | null>;
}) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Tree QR Code</AppText>
        <AppText style={styles.sectionMeta}>Tree #{treeId}</AppText>
      </View>

      <View style={styles.qrCard}>
        <View style={styles.qrCodeWrap}>
          <QRCode value={qrValue} size={210} getRef={(ref) => (qrRef.current = ref)} />
        </View>

        <AppText style={styles.qrCardTitle}>Scan to open tree overview</AppText>
        <AppText style={styles.qrCardBody}>
          This QR code opens the dashboard page for this specific tree.
        </AppText>

        <View style={styles.qrLinkBox}>
          <AppText style={styles.qrLinkText}>{qrValue}</AppText>
        </View>

        <AppButton
          title="Copy Tree Link"
          variant="secondary"
          onPress={onCopy}
          style={styles.sectionActionWrap}
          buttonStyle={styles.sectionActionButton}
        />

        <AppButton
          title="Save QR Code"
          variant="primary"
          onPress={onSave}
          style={styles.sectionActionWrap}
          buttonStyle={styles.sectionActionButton}
        />
      </View>
    </View>
  );
}

function TreeFooter({
  activeTab,
  onChangeTab,
  onAddComment,
  canAddComment,
  onClose,
  photoCount,
  activityCount,
  onAddPhoto,
  canAddPhoto,
  isPhotoLimitReached,
  isUploadingPhotos,
}: {
  activeTab: PopupTab;
  onChangeTab: (tab: PopupTab) => void;
  onAddComment: () => void;
  canAddComment: boolean;
  onClose: () => void;
  photoCount: number;
  activityCount: number;
  onAddPhoto: () => void;
  canAddPhoto: boolean;
  isPhotoLimitReached: boolean;
  isUploadingPhotos: boolean;
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
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

  const showAddComment = activeTab === 'activity' && canAddComment;
  const showAddPhoto = activeTab === 'photos' && canAddPhoto;

  return (
    <View style={[styles.footer, isCompact && styles.footerCompact]}>
      <Pressable
        style={styles.footerBackButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Back to map"
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#234229" />
        <AppText style={styles.footerBackText}>Back</AppText>
      </Pressable>

      <View style={[styles.footerRightCluster, isCompact && styles.footerRightClusterCompact]}>
        <AppButton
          title={shortcutLabel}
          variant="outline"
          onPress={() => onChangeTab(shortcutTab)}
          style={[styles.footerShortcutWrap, isCompact && styles.footerButtonFull]}
          buttonStyle={styles.footerSecondaryButton}
          textStyle={styles.footerSecondaryText}
        />

        {showAddComment ? (
          <AppButton
            title="Add Comment"
            variant="accent"
            onPress={onAddComment}
            style={[styles.footerCommentWrap, isCompact && styles.footerButtonFull]}
            buttonStyle={styles.footerCommentButton}
            textStyle={styles.footerCommentText}
          />
        ) : null}

        {showAddPhoto ? (
          <AppButton
            title={isUploadingPhotos ? 'Uploading...' : isPhotoLimitReached ? 'Photo Limit Reached' : 'Add Photo'}
            variant="accent"
            onPress={onAddPhoto}
            disabled={isPhotoLimitReached || isUploadingPhotos}
            style={[styles.footerCommentWrap, isCompact && styles.footerButtonFull]}
            buttonStyle={styles.footerCommentButton}
            textStyle={styles.footerCommentText}
          />
        ) : null}

        <AppButton
          title="Done"
          variant="primary"
          onPress={onClose}
          style={[styles.footerDoneWrap, isCompact && styles.footerButtonFull]}
          buttonStyle={styles.footerPrimaryButton}
          textStyle={styles.footerPrimaryText}
        />
      </View>
    </View>
  );
}

export default function TreeDetailsDashboard({
  tree,
  onClose,
  currentUserId,
  isAdmin,
}: TreeDetailsDashboardProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const isMobile = !layout.isDesktop;
  const showTabLabels = width >= 430;
  const statusTopOffset = insets.top + (width < 760 ? 84 : 92);
  const [activeTab, setActiveTab] = useState<PopupTab>('overview');
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<TreePhotoUploadAsset[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [replyParent, setReplyParent] = useState<ActivityItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<TreePhotoUploadAsset[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [photos, setPhotos] = useState<TreePhoto[]>(tree.photos ?? []);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [displayTree, setDisplayTree] = useState<Tree>(tree);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSavingTreeData, setIsSavingTreeData] = useState(false);
  const [editSpecies, setEditSpecies] = useState(tree.species ?? '');
  const [editNotes, setEditNotes] = useState(tree.notes ?? '');
  const [editHealth, setEditHealth] = useState<TreeHealth>(tree.health ?? 'ok');
  const [editDiameter, setEditDiameter] = useState(
    tree.diameter === undefined || tree.diameter === null ? '' : String(tree.diameter)
  );
  const [editHeight, setEditHeight] = useState(
    tree.height === undefined || tree.height === null ? '' : String(tree.height)
  );
  const [editCircumference, setEditCircumference] = useState(
    tree.circumference === undefined || tree.circumference === null ? '' : String(tree.circumference)
  );
  const [editErrors, setEditErrors] = useState<Record<EditNumericField, string>>({
    diameter: '',
    height: '',
    circumference: '',
  });
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const deleteRedirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedIn = typeof currentUserId === 'number' && currentUserId > 0;
  const canManagePhotos = isAdmin;
  const canDeleteTree = isAdmin;
  const canShowQrCode = typeof tree.id === 'number';
  const configuredWebOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim().replace(/\/+$/, '');
  const treeOverviewPath = canShowQrCode ? `/treeDashboard/${tree.id}` : null;
  const webUrl =
    treeOverviewPath && configuredWebOrigin ? `${configuredWebOrigin}${treeOverviewPath}` : null;
  const nativeDeepLink = treeOverviewPath ? Linking.createURL(treeOverviewPath) : null;
  const qrValue = webUrl ?? nativeDeepLink;
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    setDisplayTree(tree);
  }, [tree]);

  const showStatusMessage = (
    title: string,
    message: string,
    variant: 'success' | 'error'
  ) => {
    setStatusMessage({
      title,
      message,
      variant,
      createdAt: Date.now(),
    });
  };

  useEffect(() => {
    setActiveTab('overview');
  }, [tree.id, tree.latitude, tree.longitude]);

  useEffect(() => () => {
    if (deleteRedirectTimer.current) {
      clearTimeout(deleteRedirectTimer.current);
    }
  }, []);

  const maxPhotos = 5;
  const remainingPhotoSlots = Math.max(0, maxPhotos - photos.length);
  const isPhotoLimitReached = photos.length >= maxPhotos;

  useEffect(() => {
    setPhotos(tree.photos ?? []);
  }, [tree.id, tree.photos]);

  const healthMeta = getTreeHealthOption(displayTree.health);

  const commentThreads = useMemo(
    () => buildCommentThreads(activityItems.filter(isCommentActivity)),
    [activityItems]
  );
  const observationItems = activityItems.filter(isObservationActivity);

  const editEstimatedStats = useMemo(() => {
    return estimateTreeEcoStats({
      species: editSpecies,
      diameter: parseEstimateNumber(editDiameter),
      height: parseEstimateNumber(editHeight),
      circumference: parseEstimateNumber(editCircumference),
    });
  }, [editSpecies, editDiameter, editHeight, editCircumference]);

  const cardWidth = Math.max(0, Math.min(width - layout.edgeInset * 2, 520));
  const availableCardHeight = Math.max(280, height - insets.top - insets.bottom - layout.edgeInset * 2);
  const cardMaxHeight = Math.min(availableCardHeight, 720);

  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  function getFileExtension(uri: string): string {
    const cleanUri = uri.split('?')[0].split('#')[0];
    const filename = cleanUri.split('/').pop() || '';
    return filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  }

  function getMimeTypeFromUri(uri: string): string | undefined {
    const ext = getFileExtension(uri);

    if (ext === 'jpg' || ext === 'jpeg') {
      return 'image/jpeg';
    }

    if (ext === 'png') {
      return 'image/png';
    }

    if (ext === 'webp') {
      return 'image/webp';
    }

    if (ext === 'gif') {
      return 'image/gif';
    }

    if (ext === 'heic') {
      return 'image/heic';
    }

    if (ext === 'heif') {
      return 'image/heif';
    }

    return undefined;
  }

  function isSupportedImageAsset(asset: ImagePicker.ImagePickerAsset): boolean {
    const mimeType = asset.mimeType ?? getMimeTypeFromUri(asset.uri);
    const extension = getFileExtension(asset.uri);

    return (
      (mimeType ? SUPPORTED_IMAGE_TYPES.includes(mimeType) : false) ||
      SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
    );
  }

  function getSupportedImageTypesMessage(): string {
    return 'Supported image types: JPG, JPEG, PNG, WEBP, and GIF. Maximum 10MB per image.';
  }

  const handleDeletePhoto = (photo: TreePhoto) => {
    const treeId = tree.id;

    if (typeof treeId !== 'number') {
      showStatusMessage('Delete Failed', 'This tree does not have a valid ID.', 'error');
      return;
    }

    if (typeof photo.id !== 'number') {
      showStatusMessage('Delete Failed', 'This photo does not have a valid backend ID.', 'error');
      return;
    }

    const photoId = photo.id;

    showConfirm(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      async () => {
        try {
          await deleteTreePhoto(treeId, photoId);

          const refreshedTrees = await fetchTrees();
          const refreshedTree = refreshedTrees.find((item) => item.id === treeId);

          if (refreshedTree?.photos) {
            setPhotos(refreshedTree.photos);
          } else {
            setPhotos([]);
          }
        } catch (error) {
          showStatusMessage(
            'Delete Failed',
            error instanceof Error ? error.message : 'Unable to delete photo.',
            'error'
          );
        }
      }
    );
  };

  const handleAddPhoto = async () => {
    const treeId = tree.id;

    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to add photos.', 'error');
      return;
    }

    if (typeof treeId !== 'number') {
      showStatusMessage('Photo Error', 'This tree does not have a valid ID.', 'error');
      return;
    }

    if (isPhotoLimitReached) {
      showStatusMessage(
        'Limit Reached',
        'This tree already has the maximum of 5 photos.',
        'error'
      );
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showStatusMessage(
        'Permission Required',
        'Photo library permission is needed to upload tree photos.',
        'error'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingPhotoSlots,
    });

    if (result.canceled) {
      return;
    }

    const selectedAssets = result.assets.slice(0, remainingPhotoSlots);

    if (selectedAssets.length === 0) {
      return;
    }

    const unsupportedAssets = selectedAssets.filter((asset) => !isSupportedImageAsset(asset));
    const supportedAssets = selectedAssets.filter((asset) => isSupportedImageAsset(asset));

    if (unsupportedAssets.length > 0) {
      const unsupportedList = unsupportedAssets
        .map((asset) => {
          const extension = getFileExtension(asset.uri);
          const mimeType = asset.mimeType || 'unknown mime';
          const label = extension ? extension.toUpperCase() : 'NO_EXTENSION';
          return `${label} (${mimeType})`;
        })
        .join(', ');

      showStatusMessage(
        'Unsupported Image Type',
        `${getSupportedImageTypesMessage()}\n\nUnsupported selection: ${unsupportedList}`,
        'error'
      );
    }

    const selectedUploadAssets = supportedAssets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    }));

    if (selectedUploadAssets.length === 0) {
      return;
    }

    try {
      setIsUploadingPhotos(true);

      await uploadTreePhotos(treeId, selectedUploadAssets);

      const refreshedTrees = await fetchTrees();
      const refreshedTree = refreshedTrees.find((item) => item.id === treeId);

      if (refreshedTree?.photos) {
        setPhotos(refreshedTree.photos);
      } else {
        setPhotos([]);
      }

      showStatusMessage('Success', 'Photo(s) uploaded successfully.', 'success');
      setActiveTab('photos');
    } catch (error) {
      showStatusMessage(
        'Upload Failed',
        error instanceof Error ? error.message : 'Unable to upload photos.',
        'error'
      );
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const pickCommentAttachments = async (
    current: TreePhotoUploadAsset[],
    setter: React.Dispatch<React.SetStateAction<TreePhotoUploadAsset[]>>
  ) => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to attach images.', 'error');
      return;
    }

    if (typeof tree.id !== 'number') {
      showStatusMessage('Comment Error', 'This tree does not have a valid ID.', 'error');
      return;
    }

    const remaining = MAX_COMMENT_ATTACHMENTS - current.length;

    if (remaining <= 0) {
      showStatusMessage(
        'Limit Reached',
        `You can attach up to ${MAX_COMMENT_ATTACHMENTS} images per comment.`,
        'error'
      );
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showStatusMessage(
        'Permission Required',
        'Photo library permission is needed to attach images.',
        'error'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    });

    if (result.canceled) {
      return;
    }

    const selectedAssets = result.assets.slice(0, remaining);

    const oversized = selectedAssets.filter(
      (asset) => typeof asset.fileSize === 'number' && asset.fileSize > MAX_COMMENT_IMAGE_BYTES
    );

    if (oversized.length > 0) {
      showStatusMessage('File too large', 'Each image must be 10MB or smaller.', 'error');
      return;
    }

    const unsupportedAssets = selectedAssets.filter((asset) => !isSupportedImageAsset(asset));
    const supportedAssets = selectedAssets.filter((asset) => isSupportedImageAsset(asset));

    if (unsupportedAssets.length > 0) {
      const unsupportedList = unsupportedAssets
        .map((asset) => {
          const extension = getFileExtension(asset.uri);
          const mimeType = asset.mimeType || 'unknown mime';
          const label = extension ? extension.toUpperCase() : 'NO_EXTENSION';
          return `${label} (${mimeType})`;
        })
        .join(', ');

      showStatusMessage(
        'Unsupported Image Type',
        `${getSupportedImageTypesMessage()}\n\nUnsupported selection: ${unsupportedList}`,
        'error'
      );
    }

    const mapped = supportedAssets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    }));

    if (mapped.length === 0) {
      return;
    }

    setter((previous) => [...previous, ...mapped].slice(0, MAX_COMMENT_ATTACHMENTS));
  };

  const handleAddComment = () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to add a comment.', 'error');
      return;
    }

    setCommentText('');
    setCommentAttachments([]);
    setIsCommentModalVisible(true);
  };

  const handleOpenReply = (root: ActivityItem) => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to reply.', 'error');
      return;
    }

    if (root.type !== 'tree_comment') {
      return;
    }

    if (!Number.isFinite(root.commentId) || root.commentId <= 0) {
      showStatusMessage(
        'Reply unavailable',
        'This comment has no valid ID. Try refreshing the activity feed.',
        'error'
      );
      return;
    }

    setReplyParent(root);
    setReplyText('');
    setReplyAttachments([]);
    setIsReplyModalVisible(true);
  };

  const handleEditTreeData = () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to edit tree data.', 'error');
      return;
    }

    setEditSpecies(displayTree.species ?? '');
    setEditNotes(displayTree.notes ?? '');
    setEditHealth(displayTree.health ?? 'ok');
    setEditDiameter(
      displayTree.diameter === undefined || displayTree.diameter === null
        ? ''
        : String(displayTree.diameter)
    );
    setEditHeight(
      displayTree.height === undefined || displayTree.height === null
        ? ''
        : String(displayTree.height)
    );
    setEditCircumference(
      displayTree.circumference === undefined || displayTree.circumference === null
        ? ''
        : String(displayTree.circumference)
    );
    setEditErrors({ diameter: '', height: '', circumference: '' });
    setIsEditModalVisible(true);
  };

  const isEditNumeric = (value: string) => /^(\d+)?([.]\d*)?$/.test(value);

  const handleEditNumericChange = (
    value: string,
    field: EditNumericField,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);
    setEditErrors((current) => ({
      ...current,
      [field]: value.trim() === '' || isEditNumeric(value) ? '' : 'Enter a valid number',
    }));
  };

  const validateEditTreeData = () => {
    const nextErrors: Record<EditNumericField, string> = {
      diameter: editDiameter.trim() && !isEditNumeric(editDiameter) ? 'Enter a valid number' : '',
      height: editHeight.trim() && !isEditNumeric(editHeight) ? 'Enter a valid number' : '',
      circumference:
        editCircumference.trim() && !isEditNumeric(editCircumference)
          ? 'Enter a valid number'
          : '',
    };

    setEditErrors(nextErrors);
    return Object.values(nextErrors).every((value) => value === '');
  };

  const parseOptionalEditNumber = (value: string, label: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      showStatusMessage('Error', 'Must be valid number', 'error');
    }

    return parsed;
  };

  const handleSubmitTreeData = async () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to edit tree data.', 'error');
      return;
    }

    if (typeof displayTree.id !== 'number') {
      showStatusMessage('Edit Failed', 'This tree does not have a valid ID.', 'error');
      return;
    }

    if (!validateEditTreeData()) {
      return;
    }

    try {
      setIsSavingTreeData(true);
      const nextDiameter = editEstimatedStats.diameter ?? parseOptionalEditNumber(editDiameter, 'Diameter');
      const nextHeight = editEstimatedStats.height ?? parseOptionalEditNumber(editHeight, 'Height');
      const nextCircumference =
        editEstimatedStats.circumference ?? parseOptionalEditNumber(editCircumference, 'Circumference');

      await updateTreeData(displayTree.id, {
        species: editSpecies.trim() || null,
        notes: editNotes.trim() || null,
        health: editHealth,
        diameter: nextDiameter,
        height: nextHeight,
        circumference: nextCircumference,
        avoidedRunoff: editEstimatedStats.avoidedRunoff ?? null,
        carbonDioxideStored: editEstimatedStats.carbonDioxideStored ?? null,
        carbonDioxideRemoved: editEstimatedStats.carbonDioxideRemoved ?? null,
        waterIntercepted: editEstimatedStats.waterIntercepted ?? null,
        airQualityImprovement: editEstimatedStats.airQualityImprovement ?? null,
        leafArea: editEstimatedStats.leafArea ?? null,
        evapotranspiration: editEstimatedStats.evapotranspiration ?? null,
      });

      setDisplayTree((current) => ({
        ...current,
        species: editSpecies.trim() || undefined,
        notes: editNotes.trim() || undefined,
        health: editHealth,
        diameter: nextDiameter ?? undefined,
        height: nextHeight ?? undefined,
        circumference: nextCircumference ?? undefined,
        avoidedRunoff: editEstimatedStats.avoidedRunoff ?? undefined,
        carbonDioxideStored: editEstimatedStats.carbonDioxideStored ?? undefined,
        carbonDioxideRemoved: editEstimatedStats.carbonDioxideRemoved ?? undefined,
        waterIntercepted: editEstimatedStats.waterIntercepted ?? undefined,
        airQualityImprovement: editEstimatedStats.airQualityImprovement ?? undefined,
        leafArea: editEstimatedStats.leafArea ?? undefined,
        evapotranspiration: editEstimatedStats.evapotranspiration ?? undefined,
      }));
      setIsEditModalVisible(false);
      showStatusMessage('Success', 'Tree data updated successfully.', 'success');
    } catch (error) {
      showStatusMessage(
        'Edit Failed',
        error instanceof Error ? error.message : 'Unable to update tree data.',
        'error'
      );
    } finally {
      setIsSavingTreeData(false);
    }
  };

  const reloadActivity = async () => {
    if (!tree.id) {
      setActivityItems([]);
      return;
    }

    const feed = await fetchTreeFeed(tree.id);
    setActivityItems(feed.map(mapFeedItemToActivity));
  };

  const handleDeleteTree = () => {
    showConfirm(
      'Delete Tree',
      'Are you sure you want to delete this tree? This cannot be undone.',
      async () => {
        await confirmDeleteTree();
      }
    );
  };

  const confirmDeleteTree = async () => {
    if (typeof tree.id !== 'number') {
      showStatusMessage('Delete Failed', 'This tree does not have a valid ID.', 'error');
      return;
    }

    try {
      await deleteTree(tree.id);
      showStatusMessage('Success', 'Tree deleted successfully.', 'success');

      if (deleteRedirectTimer.current) {
        clearTimeout(deleteRedirectTimer.current);
        deleteRedirectTimer.current = null;
      }

      deleteRedirectTimer.current = setTimeout(() => {
        deleteRedirectTimer.current = null;
        router.replace('/mainPage');
      }, 1200);
    } catch (err) {
      showStatusMessage(
        'Delete failed',
        err instanceof Error ? err.message : 'Unknown error',
        'error'
      );
    }
  };

  const handleDeleteComment = (item: ActivityItem) => {
    showConfirm(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      async () => {
        try {
          await deleteTreeComment(item.commentId);
          await reloadActivity();
        } catch (error) {
          showStatusMessage(
            'Delete Failed',
            error instanceof Error ? error.message : 'Unable to delete comment.',
            'error'
          );
        }
      }
    );
  };

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to add a comment.', 'error');
      return;
    }

    const trimmedComment = commentText.trim();

    if (!tree.id) {
      showStatusMessage('Comment Error', 'This tree does not have a valid ID.', 'error');
      return;
    }

    if (!trimmedComment && commentAttachments.length === 0) {
      showStatusMessage(
        'Comment Required',
        'Add some text or at least one image before submitting.',
        'error'
      );
      return;
    }

    try {
      setIsSubmittingComment(true);
      let photoIds: number[] = [];

      if (commentAttachments.length > 0) {
        photoIds = await uploadCommentDraftPhotos(tree.id, commentAttachments);
      }

      await addTreeComment(tree.id, trimmedComment, photoIds);
      await reloadActivity();
      setIsCommentModalVisible(false);
      setCommentText('');
      setCommentAttachments([]);
      setActiveTab('activity');
    } catch (error) {
      showStatusMessage(
        'Add Comment Failed',
        error instanceof Error ? error.message : 'Unable to add comment.',
        'error'
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to reply.', 'error');
      return;
    }

    if (!replyParent || replyParent.type !== 'tree_comment') {
      showStatusMessage('Reply Error', 'Could not determine which comment you are replying to.', 'error');
      return;
    }

    if (!Number.isFinite(replyParent.commentId) || replyParent.commentId <= 0) {
      showStatusMessage(
        'Reply Error',
        'This comment has no valid ID. Try refreshing the activity feed.',
        'error'
      );
      return;
    }

    if (!tree.id) {
      showStatusMessage('Reply Error', 'This tree does not have a valid ID.', 'error');
      return;
    }

    const trimmedReply = replyText.trim();

    if (!trimmedReply && replyAttachments.length === 0) {
      showStatusMessage(
        'Reply Required',
        'Add some text or at least one image before submitting your reply.',
        'error'
      );
      return;
    }

    try {
      setIsSubmittingReply(true);
      let photoIds: number[] = [];

      if (replyAttachments.length > 0) {
        photoIds = await uploadCommentDraftPhotos(tree.id, replyAttachments);
      }

      await addTreeCommentReply(Number(tree.id), replyParent.commentId, trimmedReply, photoIds);
      await reloadActivity();
      setIsReplyModalVisible(false);
      setReplyParent(null);
      setReplyText('');
      setReplyAttachments([]);
      setActiveTab('activity');
    } catch (error) {
      showStatusMessage(
        'Reply Failed',
        error instanceof Error ? error.message : 'Unable to post reply.',
        'error'
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleCopyQrLink = async () => {
    if (!qrValue) {
      showStatusMessage('QR unavailable', 'Tree link could not be generated.', 'error');
      return;
    }

    try {
      await Clipboard.setStringAsync(qrValue);
      showStatusMessage('Copied', 'Tree overview link copied to clipboard.', 'success');
    } catch (error) {
      showStatusMessage(
        'Copy Failed',
        error instanceof Error ? error.message : 'Unable to copy QR link.',
        'error'
      );
    }
  };

  const getQrPngDataUrl = async (): Promise<string> => {
    const svg = qrCodeRef.current;

    if (!svg) {
      showStatusMessage('QR Code is not ready yet', 'Tree link could not be generated.', 'error');
    }

    return new Promise((resolve) => {
      svg.toDataURL((data: string) => {
        resolve(`data:image/png;base64,${data}`);
      });
    });
  };

  const handleSaveQrCode = async () => {
    if (!canShowQrCode || !qrValue) {
      showStatusMessage('QR unavailable', 'Tree link could not be generated.', 'error');
      return;
    }

    try {
      const dataUrl = await getQrPngDataUrl();

      if (Platform.OS === 'web') {
        if (typeof document === 'undefined') {
          showStatusMessage('Error', 'Unable to download on this device', 'error');
        }

        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = `tree-${tree.id}-qr.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        showStatusMessage('Downloaded', 'QR code downloaded as PNG.', 'success');
        return;
      }

      const cacheDir = documentDirectory || cacheDirectory;
      if (!cacheDir) {
        showStatusMessage('Error', 'Unable to access local storage', 'error');
      }

      const base64 = dataUrl.replace('data:image/png;base64,', '');
      const fileUri = `${cacheDir}tree-${tree.id}-qr.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: `Save QR for Tree #${tree.id}`,
        });
        showStatusMessage('Ready to save', 'Use the share sheet to save the QR image.', 'success');
      } else {
        showStatusMessage('Saved', `QR code image created: ${fileUri}`, 'success');
      }
    } catch (error) {
      showStatusMessage(
        'Save Failed',
        error instanceof Error ? error.message : 'Unable to save QR code image.',
        'error'
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!tree.id) {
        setActivityItems([]);
        return;
      }

      try {
        setIsLoadingActivity(true);
        const feed = await fetchTreeFeed(tree.id);
        if (!cancelled) {
          setActivityItems(feed.map(mapFeedItemToActivity));
        }
      } catch (error) {
        console.error('Failed to load tree activity feed:', error);

        if (!cancelled) {
          setActivityItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingActivity(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [tree.id]);

  return (
    <View style={[styles.wrapper, { padding: layout.edgeInset }]} pointerEvents="box-none">
      <StatusMessageBox status={statusMessage} onClose={() => setStatusMessage(null)} topOffset={statusTopOffset} />

      <View
        style={[
          styles.card,
          { width: cardWidth, maxHeight: cardMaxHeight, borderRadius: layout.cardRadius },
        ]}
      >
        <View style={[styles.header, { paddingHorizontal: layout.panelPadding, paddingTop: layout.panelPadding }]}>
          <View style={styles.headerCopy}>
            <AppText style={styles.eyebrow}>Tree Marker</AppText>
            <AppText style={styles.title}>
              {displayTree.id !== undefined ? `Tree #${displayTree.id}` : 'Observed Tree'}
            </AppText>
            <AppText style={styles.subtitle}>
              {displayTree.species ? `${displayTree.species} • ` : ''}
              {photos.length} photos • {activityItems.length} updates
            </AppText>
          </View>

          <View style={styles.topRightActions}>
            {isLoggedIn && (
              <Pressable
                onPress={handleEditTreeData}
                style={[
                  styles.editTreeButton,
                  Platform.OS === 'android' && styles.editTreeButtonAndroid,
                  Platform.OS === 'android' && Layout.androidFlatSurface,
                ]}
              >
                <MaterialCommunityIcons name="pencil-outline" size={17} color="#FFFFFF" />
                <AppText style={styles.editTreeButtonText}>Edit</AppText>
              </Pressable>
            )}

            {canDeleteTree && (
              <Pressable
                onPress={handleDeleteTree}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#B3261E" />
              </Pressable>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.82}>
              <MaterialCommunityIcons name="close" size={20} color="#234229" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tabBar, { marginHorizontal: layout.panelPadding }]}>
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
                {showTabLabels ? (
                  <AppText style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                    {tab.label}
                  </AppText>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingHorizontal: layout.panelPadding,
              paddingBottom: layout.panelPadding,
            },
          ]}
          showsVerticalScrollIndicator
          indicatorStyle="black"
        >
          {activeTab === 'overview' ? (
            <TreeOverview
              tree={displayTree}
              photos={photos}
              photoCount={photos.length}
              activityCount={activityItems.length}
              healthMeta={healthMeta}
              observationItems={observationItems}
            />
          ) : null}

          {activeTab === 'photos' ? (
            <TreePhotos
              photos={photos}
              onDeletePhoto={handleDeletePhoto}
              canManagePhotos={canManagePhotos}
              isUploadingPhotos={isUploadingPhotos}
              canAddPhoto={isLoggedIn}
              onAddPhoto={handleAddPhoto}
            />
          ) : null}

          {activeTab === 'activity' ? (
            <TreeActivity
              threads={commentThreads}
              onDeleteComment={handleDeleteComment}
              onReply={handleOpenReply}
              isLoadingActivity={isLoadingActivity}
              isAdmin={isAdmin}
              isLoggedIn={isLoggedIn}
            />
          ) : null}

          {activeTab === 'qr' && canShowQrCode && qrValue ? (
            <TreeQrCode
              treeId={tree.id!}
              qrValue={qrValue}
              onCopy={handleCopyQrLink}
              onSave={handleSaveQrCode}
              qrRef={qrCodeRef}
            />
          ) : null}

          {activeTab === 'qr' && (!canShowQrCode || !qrValue) ? (
            <View style={styles.emptyStateCard}>
              <MaterialCommunityIcons name="qrcode-remove" size={30} color="#4A4A4A" />
              <AppText style={styles.emptyStateTitle}>QR code unavailable</AppText>
              <AppText style={styles.emptyStateBody}>
                This tree does not have enough information to generate a QR link yet.
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <TreeFooter
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onAddComment={handleAddComment}
          canAddComment={isLoggedIn}
          onClose={onClose}
          photoCount={photos.length}
          activityCount={activityItems.length}
          onAddPhoto={handleAddPhoto}
          canAddPhoto={isLoggedIn}
          isPhotoLimitReached={isPhotoLimitReached}
          isUploadingPhotos={isUploadingPhotos}
        />
      </View>

      <Modal
        visible={isCommentModalVisible && isLoggedIn}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingComment) {
            setIsCommentModalVisible(false);
            setCommentAttachments([]);
          }
        }}
      >
        <View style={[styles.modalBackdrop, { padding: layout.edgeInset }]}>
          <View style={[styles.modalCard, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}>
            <AppText style={styles.modalTitle}>Add Comment</AppText>
            <AppText style={styles.modalSubtitle}>
              Tell us how the tree is. You can add text, images, or both (up to {MAX_COMMENT_ATTACHMENTS}{' '}
              images, 10MB each).
            </AppText>

            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write your comment here (optional if you attach photos)..."
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
              editable={!isSubmittingComment}
            />

            <CommentAttachmentRow
              attachments={commentAttachments}
              disabled={isSubmittingComment}
              onRemove={(index) =>
                setCommentAttachments((current) => current.filter((_, i) => i !== index))
              }
            />

            <TouchableOpacity
              style={[
                styles.commentAttachButton,
                (isSubmittingComment || commentAttachments.length >= MAX_COMMENT_ATTACHMENTS) &&
                  styles.commentAttachButtonDisabled,
              ]}
              onPress={() => pickCommentAttachments(commentAttachments, setCommentAttachments)}
              disabled={isSubmittingComment || commentAttachments.length >= MAX_COMMENT_ATTACHMENTS}
              activeOpacity={0.82}
            >
              <MaterialCommunityIcons name="image-plus" size={20} color="#1B5E20" />
              <AppText style={styles.commentAttachButtonText}>Attach images</AppText>
            </TouchableOpacity>

            <AppText style={styles.commentAttachHint}>{getSupportedImageTypesMessage()}</AppText>

            <View style={styles.modalButtonRow}>
              <AppButton
                title={isSubmittingComment ? 'Posting...' : 'Post Comment'}
                variant="primary"
                onPress={handleSubmitComment}
                style={styles.modalButtonWrap}
                buttonStyle={styles.modalButton}
              />
              <AppButton
                title="Cancel"
                variant="outline"
                disabled={isSubmittingComment}
                onPress={() => {
                  setIsCommentModalVisible(false);
                  setCommentAttachments([]);
                }}
                style={styles.modalButtonWrap}
                buttonStyle={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isReplyModalVisible && isLoggedIn && replyParent !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingReply) {
            setIsReplyModalVisible(false);
            setReplyParent(null);
            setReplyAttachments([]);
          }
        }}
      >
        <View style={[styles.modalBackdrop, { padding: layout.edgeInset }]}>
          <View style={[styles.modalCard, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}>
            <AppText style={styles.modalTitle}>Reply</AppText>
            <AppText style={styles.modalSubtitle} numberOfLines={3}>
              Replying to:{' '}
              {replyParent?.content.trim() ||
                (replyParent && replyParent.photoUrls.length > 0
                  ? 'Comment with images'
                  : 'Comment')}
            </AppText>

            <TextInput
              style={styles.commentInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your reply (optional if you attach photos)..."
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
              editable={!isSubmittingReply}
            />

            <CommentAttachmentRow
              attachments={replyAttachments}
              disabled={isSubmittingReply}
              onRemove={(index) =>
                setReplyAttachments((current) => current.filter((_, i) => i !== index))
              }
            />

            <TouchableOpacity
              style={[
                styles.commentAttachButton,
                (isSubmittingReply || replyAttachments.length >= MAX_COMMENT_ATTACHMENTS) &&
                  styles.commentAttachButtonDisabled,
              ]}
              onPress={() => pickCommentAttachments(replyAttachments, setReplyAttachments)}
              disabled={isSubmittingReply || replyAttachments.length >= MAX_COMMENT_ATTACHMENTS}
              activeOpacity={0.82}
            >
              <MaterialCommunityIcons name="image-plus" size={20} color="#1B5E20" />
              <AppText style={styles.commentAttachButtonText}>Attach images</AppText>
            </TouchableOpacity>

            <AppText style={styles.commentAttachHint}>{getSupportedImageTypesMessage()}</AppText>

            <View style={styles.modalButtonRow}>
              <AppButton
                title={isSubmittingReply ? 'Posting...' : 'Post Reply'}
                variant="primary"
                onPress={handleSubmitReply}
                style={styles.modalButtonWrap}
                buttonStyle={styles.modalButton}
              />
              <AppButton
                title="Cancel"
                variant="outline"
                disabled={isSubmittingReply}
                onPress={() => {
                  setIsReplyModalVisible(false);
                  setReplyParent(null);
                  setReplyAttachments([]);
                }}
                style={styles.modalButtonWrap}
                buttonStyle={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditModalVisible && isLoggedIn}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingTreeData) {
            setIsEditModalVisible(false);
          }
        }}
      >
        <View
          style={[
            styles.editOverlay,
            { padding: layout.edgeInset, alignItems: isMobile ? 'stretch' : 'flex-end' },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.editPanel,
              isMobile ? styles.editPanelMobile : styles.editPanelDesktop,
              { borderRadius: layout.cardRadius },
            ]}
          >
            <ScrollView
              contentContainerStyle={[
                styles.editPanelContent,
                { padding: layout.panelPadding, paddingBottom: layout.panelPadding + 12 },
              ]}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.editHeaderRow}>
                <View style={styles.editHeaderCopy}>
                  <AppText style={styles.editEyebrow}>Edit Tree</AppText>
                  <AppText style={styles.editTitle}>Tree Details</AppText>
                  <AppText style={styles.editSubtitle}>Update details, photos, and notes for this tree.</AppText>
                </View>

                <AppButton
                  title="Close"
                  variant="tertiary"
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.editCloseButtonWrap}
                  buttonStyle={styles.editCloseButton}
                />
              </View>

              <View style={styles.editSection}>
                <AppText style={styles.editSectionTitle}>Observations</AppText>

                <TreeSpeciesSelect
                  value={editSpecies}
                  onChange={setEditSpecies}
                />

                <TreeHealthSelect value={editHealth} onChange={setEditHealth} />
              </View>

              <View style={styles.editSection}>
                <AppText style={styles.editSectionTitle}>Measurements</AppText>

                <View style={styles.editMetricsRow}>
                  <View style={styles.editMetricField}>
                    <AppText style={styles.editMetricLabel}>Diameter</AppText>
                    <View style={styles.editInputWithUnit}>
                      <AppInput
                        placeholder="0"
                        value={editDiameter}
                        onChangeText={(value) =>
                          handleEditNumericChange(value, 'diameter', setEditDiameter)
                        }
                        keyboardType="numeric"
                        invalid={!!editErrors.diameter}
                        containerStyle={styles.editInputUnitContainer}
                      />
                      <AppText style={styles.editUnitLabel}>cm</AppText>
                    </View>
                    {editErrors.diameter ? (
                      <AppText style={styles.editErrorText}>{editErrors.diameter}</AppText>
                    ) : null}
                  </View>

                  <View style={styles.editMetricField}>
                    <AppText style={styles.editMetricLabel}>Height</AppText>
                    <View style={styles.editInputWithUnit}>
                      <AppInput
                        placeholder="0"
                        value={editHeight}
                        onChangeText={(value) =>
                          handleEditNumericChange(value, 'height', setEditHeight)
                        }
                        keyboardType="numeric"
                        invalid={!!editErrors.height}
                        containerStyle={styles.editInputUnitContainer}
                      />
                      <AppText style={styles.editUnitLabel}>m</AppText>
                    </View>
                    {editErrors.height ? (
                      <AppText style={styles.editErrorText}>{editErrors.height}</AppText>
                    ) : null}
                  </View>
                </View>

                <View style={styles.editMetricField}>
                  <AppText style={styles.editMetricLabel}>Circumference</AppText>
                  <View style={styles.editInputWithUnit}>
                    <AppInput
                      placeholder="0"
                      value={editCircumference}
                      onChangeText={(value) =>
                        handleEditNumericChange(value, 'circumference', setEditCircumference)
                      }
                      keyboardType="numeric"
                      invalid={!!editErrors.circumference}
                      containerStyle={styles.editInputUnitContainer}
                    />
                    <AppText style={styles.editUnitLabel}>cm</AppText>
                  </View>
                  {editErrors.circumference ? (
                    <AppText style={styles.editErrorText}>{editErrors.circumference}</AppText>
                  ) : null}
                </View>

                <View style={styles.editEstimateBox}>
                  <AppText style={styles.editEstimateTitle}>Estimated Environmental Impact</AppText>
                  <AppText style={styles.editEstimateItem}>
                    Avoided Runoff: {editEstimatedStats.avoidedRunoff ?? '—'} m³
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    CO₂ Stored: {editEstimatedStats.carbonDioxideStored ?? '—'} kg
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    CO₂ Removed: {editEstimatedStats.carbonDioxideRemoved ?? '—'} kg
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Water Intercepted: {editEstimatedStats.waterIntercepted ?? '—'} m³
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Air Quality Gain: {editEstimatedStats.airQualityImprovement ?? '—'} g/year
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Leaf Area: {editEstimatedStats.leafArea ?? '—'} m²
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Evapotranspiration: {editEstimatedStats.evapotranspiration ?? '—'} m³
                  </AppText>
                </View>
              </View>

              <View style={styles.editSection}>
                <AppText style={styles.editSectionTitle}>Photos</AppText>
                <AppText style={styles.editPhotoHint}>Upload up to 5 photos</AppText>

                <TouchableOpacity
                  onPress={() => {
                    if (!isPhotoLimitReached && !isUploadingPhotos) {
                      handleAddPhoto();
                    }
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.editUploadDropZone,
                    (isPhotoLimitReached || isUploadingPhotos) && styles.editUploadDropZoneDisabled,
                  ]}
                >
                  <AppText style={styles.editCameraEmoji}>📷</AppText>
                  <AppText style={styles.editUploadTitle}>
                    {isUploadingPhotos ? 'Uploading...' : 'Tap to add a photo'}
                  </AppText>
                  <AppText style={styles.editUploadSummary}>
                    {photos.length}/5 photo{photos.length === 1 ? '' : 's'} selected
                  </AppText>
                </TouchableOpacity>

                {photos.length > 0 ? (
                  <View style={styles.editPhotoGrid}>
                    {photos.map((photo, index) => (
                      <TouchableOpacity
                        key={`${photo.image_url}-${index}`}
                        onPress={() => {
                          if (canManagePhotos) {
                            handleDeletePhoto(photo);
                          }
                        }}
                        style={styles.editPhotoCard}
                        activeOpacity={canManagePhotos ? 0.85 : 1}
                      >
                        <Image source={{ uri: photo.image_url }} style={styles.editPhotoImage} />
                        {canManagePhotos ? (
                          <View style={styles.editPhotoBadge}>
                            <AppText style={styles.editPhotoBadgeText}>Delete</AppText>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.editSection}>
                <AppText style={styles.editSectionTitle}>Notes</AppText>
                <AppInput
                  placeholder="Additional notes"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  style={styles.editFormInput}
                />
              </View>

              <View style={[styles.editFooter, isMobile && styles.editFooterMobile]}>
                <AppButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setIsEditModalVisible(false)}
                  style={[styles.editFooterButton, isMobile && styles.editFooterButtonMobile]}
                />

                <AppButton
                  title={isSavingTreeData ? 'Saving...' : 'Save Changes'}
                  variant="primary"
                  onPress={handleSubmitTreeData}
                  disabled={isSavingTreeData}
                  style={[styles.editFooterButton, isMobile && styles.editFooterButtonMobile]}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
    color: '#55705B',
    marginBottom: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#183221',
    lineHeight: 30,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#526056',
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7F1E3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: '#EAF3E6',
    borderRadius: 18,
    padding: 4,
    gap: 6,
  },

  tabButton: {
    flex: 1,
    minWidth: 52,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  tabButtonActive: {
    backgroundColor: '#2F6A3E',
  },

  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31553A',
  },

  tabButtonTextActive: {
    color: Theme.Colours.white,
  },

  contentScroll: {
    flexGrow: 0,
  },

  contentContainer: {
    paddingTop: 8,
    paddingBottom: 18,
  },

  sectionStack: {
    gap: 16,
  },

  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDEED9',
    minHeight: 220,
  },

  heroPhoto: {
    width: '100%',
    height: 240,
  },

  heroPlaceholder: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  heroPlaceholderTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#234229',
  },

  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#4E6352',
    textAlign: 'center',
  },

  heroOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  heroLabel: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },

  heroLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#234229',
  },

  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  healthBadgeText: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },

  summaryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#E9F4E5',
  },

  summaryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#234229',
  },

  infoSection: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#EEF6EB',
    borderWidth: 1,
    borderColor: '#D8E7D4',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#183221',
  },

  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5E6F61',
  },

  emptySectionText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#57685A',
  },

  snapshotTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#24402B',
  },

  snapshotBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#3C5141',
  },

  snapshotMeta: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#607264',
  },

  sectionActionWrap: {
    width: '100%',
  },

  sectionActionButton: {
    minHeight: 50,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  emptyStateCard: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#EEF4EB',
    borderWidth: 1,
    borderColor: '#D7E2D2',
    alignItems: 'center',
  },

  emptyStateTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#2B4330',
  },

  emptyStateBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#607264',
  },

  infoText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#55695A',
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
    flexShrink: 1,
  },

  activityTagWildlife: {
    backgroundColor: '#DFF2E3',
  },

  activityTagDisease: {
    backgroundColor: '#FBE6DD',
  },

  activityTagSeen: {
    backgroundColor: '#E7EFF2',
  },

  activityTagText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
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
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FAFDF8',
    borderWidth: 1,
    borderColor: '#DFE9DB',
  },

  feedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedAvatarWildlife: {
    backgroundColor: '#DFF2E3',
  },

  feedAvatarDisease: {
    backgroundColor: '#FBE6DD',
  },

  feedAvatarSeen: {
    backgroundColor: '#E7EFF2',
  },

  feedBody: {
    flex: 1,
    minWidth: 0,
  },

  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },

  deleteCommentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBE6DD',
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

  threadBlock: {
    marginBottom: 16,
    gap: 10,
  },

  replyCard: {
    marginLeft: 28,
    paddingLeft: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#C5DCC8',
    backgroundColor: '#F4FAF4',
  },

  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#E8F4EA',
    borderWidth: 1,
    borderColor: '#B9D4BE',
  },

  replyActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1B5E20',
  },

  commentImageScroll: {
    marginTop: 8,
    maxHeight: 112,
  },

  commentImageScrollContent: {
    gap: 8,
    paddingRight: 4,
  },

  commentThumb: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor: '#E8EDE8',
    borderWidth: 1,
    borderColor: '#CAD7C5',
  },

  commentAttachScroll: {
    marginTop: 12,
    maxHeight: 100,
  },

  commentAttachScrollContent: {
    gap: 10,
    paddingRight: 4,
  },

  commentAttachChip: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CAD7C5',
  },

  commentAttachThumb: {
    width: '100%',
    height: '100%',
  },

  commentAttachRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
  },

  commentAttachButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9AB89A',
    backgroundColor: '#EFF6EF',
  },

  commentAttachButtonDisabled: {
    opacity: 0.5,
  },

  commentAttachButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1B5E20',
  },

  commentAttachHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: '#5A6B5E',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3EBE3',
    backgroundColor: '#F8FBF8',
  },
  footerCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  footerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#E7F1E3',
    borderWidth: 1,
    borderColor: '#C5DCC8',
    flexShrink: 0,
  },

  footerBackText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#234229',
  },

  footerRightCluster: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  footerRightClusterCompact: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  footerButtonFull: {
    width: '100%',
    flexShrink: 0,
  },

  footerShortcutWrap: {
    flexShrink: 1,
    marginBottom: 0,
    minWidth: 0,
  },

  footerSecondaryButton: {
    minHeight: 50,
    marginBottom: 0,
    borderRadius: 14,
  },

  footerSecondaryText: {
    fontSize: 14,
    textAlign: 'center',
  },

  footerDoneWrap: {
    flexShrink: 0,
    marginBottom: 0,
  },

  footerCommentWrap: {
    flexShrink: 0,
    marginBottom: 0,
  },

  footerCommentButton: {
    minHeight: 50,
    marginBottom: 0,
    borderRadius: 14,
    backgroundColor: '#2D7F36',
    borderWidth: 1,
    borderColor: '#1E5A26',
    shadowColor: '#143A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 6,
  },

  footerCommentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  footerPrimaryButton: {
    minHeight: 50,
    marginBottom: 0,
    borderRadius: 14,
  },

  footerPrimaryText: {
    textAlign: 'center',
  },

  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
  },

  editPanel: {
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#F7FAF6',
    borderWidth: 1,
    borderColor: '#D5E0D4',
    shadowColor: '#101A12',
    shadowOffset: { width: -2, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 18,
  },

  editPanelDesktop: {
    width: '42%',
    maxWidth: 560,
    minWidth: 0,
  },

  editPanelMobile: {
    width: '100%',
  },

  editPanelContent: {
    paddingBottom: 30,
  },

  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  editHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  editEyebrow: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 2,
  },

  editTitle: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
  },

  editSubtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 3,
    maxWidth: 300,
  },

  editCloseButtonWrap: {
    marginBottom: 0,
  },

  editCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 0,
  },

  editSection: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE5DB',
    backgroundColor: Theme.Colours.white,
  },

  editSectionTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
    marginBottom: 10,
  },

  editFormInput: {
    marginBottom: 8,
  },

  editMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  editMetricField: {
    flex: 1,
    flexBasis: 160,
    minWidth: 0,
  },

  editMetricLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },

  editInputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  editInputUnitContainer: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },

  editUnitLabel: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    paddingRight: 4,
  },

  editErrorText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.error,
    marginTop: -4,
    marginBottom: 8,
  },

  editEstimateBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F4FBF3',
    borderWidth: 1,
    borderColor: '#D7E4D4',
    gap: 4,
  },

  editEstimateTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: '#23422A',
    marginBottom: 4,
  },

  editEstimateItem: {
    ...Theme.Typography.caption,
    color: '#35503B',
  },

  editPhotoHint: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 8,
  },

  editUploadDropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9AB89A',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6EF',
  },

  editUploadDropZoneDisabled: {
    opacity: 0.64,
  },

  editCameraEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },

  editUploadTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
    marginTop: 4,
  },

  editUploadSummary: {
    ...Theme.Typography.caption,
    marginTop: 4,
    color: Theme.Colours.textMuted,
  },

  editPhotoGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  editPhotoCard: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D4DED4',
  },

  editPhotoImage: {
    width: '100%',
    height: '100%',
  },

  editPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 23, 16, 0.78)',
  },

  editPhotoBadgeText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
    lineHeight: 14,
    fontSize: 11,
  },

  editFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  editFooterMobile: {
    flexDirection: 'column-reverse',
  },

  editFooterButton: {
    flex: 1,
    marginBottom: 0,
  },

  editFooterButtonMobile: {
    width: '100%',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE6D8',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#183221',
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#526056',
  },

  commentInput: {
    minHeight: 130,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#CAD7C5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#183221',
    backgroundColor: '#F8FBF7',
  },

  editInput: {
    minHeight: 48,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CAD7C5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#183221',
    backgroundColor: '#F8FBF7',
  },

  editFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },

  editNotesInput: {
    minHeight: 92,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CAD7C5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#183221',
    backgroundColor: '#F8FBF7',
  },

  editNumberInput: {
    flex: 1,
  },

  modalButtonRow: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },

  modalButtonWrap: {
    width: '100%',
  },

  modalButton: {
    minHeight: 48,
  },

  galleryHint: {
  marginTop: 6,
  marginBottom: 10,
  color: '#4A4A4A',
  fontSize: 13,
  },

  deletePhotoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  photoRail: {
    paddingRight: 10,
    gap: 14,
  },

  photoCard: {
    width: 220,
    flexShrink: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8F0E5',
  },

  galleryPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },

  photoCaptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31513A',
  },

  addPhotoTile: {
    width: 220,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#E4F0DF',
    borderWidth: 1,
    borderColor: '#CFE0CA',
  },

  addPhotoTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#234229',
  },

  addPhotoText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#56705C',
  },

  qrCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#EEF6EB',
    borderWidth: 1,
    borderColor: '#D8E7D4',
    alignItems: 'center',
  },

  qrCodeWrap: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E1D2',
  },

  qrCardTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#2B4330',
    textAlign: 'center',
  },

  qrCardBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#55695A',
    textAlign: 'center',
  },

  qrLinkBox: {
    width: '100%',
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CFDDCB',
    backgroundColor: '#F8FBF7',
  },

  qrLinkText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#31513A',
  },

  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  editTreeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2F6A3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#102C18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  editTreeButtonAndroid: {
    backgroundColor: Theme.Colours.primary,
    borderColor: '#CFE3CF',
    borderTopColor: '#EEF7EE',
    overflow: 'hidden',
  },

  editTreeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  uploadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EEF6EB',
    borderWidth: 1,
    borderColor: '#D0E5CC',
  },

  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },

  emptyPhotoState: {
    gap: 10,
  },

  addPhotoTileStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E4F0DF',
    borderWidth: 1,
    borderColor: '#CFE0CA',
    flexWrap: 'wrap',
  },
});
