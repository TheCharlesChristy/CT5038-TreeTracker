import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { StatusMessageBox, StatusMessage } from './StatusMessageBox';
import { TreeDataStats } from './TreeDataStats';
import { getTreeHealthOption } from './TreeHealthSelect';
import { Tree, TreePhoto } from '@/objects/TreeDetails';
import {
  addTreeComment,
  deleteTreeComment,
  deleteTree,
  deleteTreePhoto,
  fetchTreeFeed,
  fetchTrees,
  TreeFeedItem,
  updateTreeData,
  uploadTreePhotos,
} from '@/lib/treeApi';
import { showConfirm } from '@/utilities/showConfirm';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { TreeHealth, TreeHealthSelect } from './TreeHealthSelect';
import { TreeSpeciesSelect } from './TreeSpeciesSelect';
import { estimateTreeEcoStats } from '@/lib/treeEcoEstimates';

type PopupTab = 'overview' | 'photos' | 'activity';
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
};

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

function mapFeedItemToActivity(item: TreeFeedItem): ActivityItem {
  const commentId = Number(item.comment_id);
  const userId = item.user_id != null ? Number(item.user_id) : null;

  switch (item.item_type) {
    case 'tree_comment':
      return {
        key: `tree-comment-${commentId}`,
        commentId,
        userId,
        type: 'tree_comment',
        title: 'Comment',
        content: item.content?.trim() || 'No comment provided.',
        meta: formatFeedMeta(item),
        icon: 'message-text-outline',
      };

    case 'reply':
      return {
        key: `reply-${commentId}`,
        commentId,
        userId,
        type: 'reply',
        title: 'Reply',
        content: item.content?.trim() || 'No reply provided.',
        meta: formatFeedMeta(item),
        icon: 'reply-outline',
      };

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

      <View style={styles.summaryChipRow}>
        {tree.species ? (
          <View style={styles.summaryChip}>
            <MaterialCommunityIcons name="pine-tree" size={14} color="#1B5E20" />
            <AppText style={styles.summaryChipText}>{tree.species}</AppText>
          </View>
        ) : null}

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

      <View style={styles.sectionStack}>
        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>Observations</AppText>
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
  onAddPhoto,
  onDeletePhoto,
  canAddPhoto,
  canManagePhotos,
  isPhotoLimitReached,
  isUploadingPhotos,
}: {
  photos: TreePhoto[];
  onAddPhoto: () => void;
  onDeletePhoto: (photo: TreePhoto) => void;
  canAddPhoto: boolean;
  canManagePhotos: boolean;
  isPhotoLimitReached: boolean;
  isUploadingPhotos: boolean;
}) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Photo Gallery</AppText>
        <AppText style={styles.sectionMeta}>{photos.length} items</AppText>
      </View>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.photoRail}
        >
          {photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.image_url }} style={styles.galleryPhoto} />

              <View style={styles.photoCaption}>
                <AppText style={styles.photoCaptionText}>Photo {index + 1}</AppText>

                {canManagePhotos ? (
                  <TouchableOpacity
                    onPress={() => onDeletePhoto(photo)}
                    activeOpacity={0.8}
                    style={styles.deletePhotoButton}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={16}
                      color="#8C2D04"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}

          {canAddPhoto && !isPhotoLimitReached ? (
            <TouchableOpacity
              style={styles.addPhotoTile}
              onPress={onAddPhoto}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={26}
                color="#1B5E20"
              />
              <AppText style={styles.addPhotoTitle}>Add photo</AppText>
              <AppText style={styles.addPhotoText}>
                You can upload up to 5 images for this tree.
              </AppText>
            </TouchableOpacity>
          ) : null}
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
          Scroll horizontally to view more than two Photos!
        </AppText>
      </View>

      {canAddPhoto ? (
        <AppButton
          title={
            isUploadingPhotos
              ? 'Uploading...'
              : isPhotoLimitReached
                ? 'Photo Limit Reached'
                : 'Add Photo'
          }
          variant="secondary"
          onPress={onAddPhoto}
          disabled={isPhotoLimitReached || isUploadingPhotos}
          style={styles.sectionActionWrap}
          buttonStyle={styles.sectionActionButton}
        />
      ) : null}
    </View>
  );
}

function TreeActivity({
  items,
  onAddComment,
  onDeleteComment,
  isLoadingActivity,
  currentUserId,
  isAdmin,
}: {
  items: ActivityItem[];
  onAddComment: () => void;
  onDeleteComment: (item: ActivityItem) => void;
  isLoadingActivity: boolean;
  currentUserId: number | null;
  isAdmin: boolean;
}) {
  const isLoggedIn = typeof currentUserId === 'number' && currentUserId > 0;

  const commentItems = items.filter(
    (item) => item.type === 'tree_comment' || item.type === 'reply'
  );

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <AppText style={styles.sectionTitle}>Activity Feed</AppText>
        <AppText style={styles.sectionMeta}>{commentItems.length} comments</AppText>
      </View>

      <View style={styles.infoSection}>
        <AppText style={styles.sectionTitle}>Community</AppText>
        <AppText style={styles.infoText}>
          When commenting on a tree, make sure it is relevant to the tree.
        </AppText>
      </View>

      {isLoggedIn ? (
        <AppButton
          title="Add Comment"
          variant="secondary"
          onPress={onAddComment}
          style={styles.sectionActionWrap}
          buttonStyle={styles.sectionActionButton}
        />
      ) : null}

      {isLoadingActivity ? (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="loading" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>Loading comments</AppText>
          <AppText style={styles.emptyStateBody}>
            Fetching the latest community comments for this tree.
          </AppText>
        </View>
      ) : commentItems.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <MaterialCommunityIcons name="message-outline" size={30} color="#4A4A4A" />
          <AppText style={styles.emptyStateTitle}>No comments yet</AppText>
          <AppText style={styles.emptyStateBody}>
            Start the discussion by leaving the first comment for this tree.
          </AppText>
        </View>
      ) : (
        commentItems.map((item) => (
          <View key={item.key} style={styles.feedCard}>
            <View style={[styles.feedAvatar, styles.feedAvatarSeen]}>
              <MaterialCommunityIcons name={item.icon} size={18} color="#165B2A" />
            </View>

            <View style={styles.feedBody}>
              <View style={styles.feedTopRow}>
                <ActivityTag item={item} />

                {isAdmin ? (
                  <TouchableOpacity
                    onPress={() => onDeleteComment(item)}
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

              <AppText style={styles.feedText}>{item.content}</AppText>
              <AppText style={styles.feedMeta}>{item.meta}</AppText>
            </View>
          </View>
        ))
      )}
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

export default function TreeDetailsDashboard({
  tree,
  onClose,
  currentUserId,
  isAdmin,
}: TreeDetailsDashboardProps) {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<PopupTab>('overview');
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
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

  const commentItems = activityItems.filter(isCommentActivity);
  const observationItems = activityItems.filter(isObservationActivity);

  const editEstimatedStats = useMemo(() => {
    return estimateTreeEcoStats({
      species: editSpecies,
      diameter: parseEstimateNumber(editDiameter),
      height: parseEstimateNumber(editHeight),
      circumference: parseEstimateNumber(editCircumference),
    });
  }, [editSpecies, editDiameter, editHeight, editCircumference]);

  const cardWidth = Math.min(width - 28, 520);
  const cardMaxHeight = Math.min(height * 0.78, 720);

  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

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
    return 'Supported image types: JPG, JPEG, PNG and WEBP.';
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

  const handleAddComment = () => {
    if (!isLoggedIn) {
      showStatusMessage('Login Required', 'You need to sign in to add a comment.', 'error');
      return;
    }

    setCommentText('');
    setIsCommentModalVisible(true);
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
      throw new Error(`${label} must be a valid number.`);
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

    if (!trimmedComment) {
      showStatusMessage('Comment Required', 'Please enter a comment before submitting.', 'error');
      return;
    }

    try {
      setIsSubmittingComment(true);
      await addTreeComment(tree.id, trimmedComment);
      await reloadActivity();
      setIsCommentModalVisible(false);
      setCommentText('');
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
    <View style={styles.wrapper} pointerEvents="box-none">
      <StatusMessageBox status={statusMessage} onClose={() => setStatusMessage(null)} />

      <View style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}>
        <View style={styles.header}>
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

          {isLoggedIn && (
            <Pressable
              onPress={handleEditTreeData}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#2F6A3E" />
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
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhoto}
              canAddPhoto={isLoggedIn}
              canManagePhotos={canManagePhotos}
              isPhotoLimitReached={isPhotoLimitReached}
              isUploadingPhotos={isUploadingPhotos}
            />
          ) : null}

          {activeTab === 'activity' ? (
            <TreeActivity
              items={commentItems}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              isLoadingActivity={isLoadingActivity}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ) : null}
        </ScrollView>

        <TreeFooter
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onClose={onClose}
          photoCount={photos.length}
          activityCount={activityItems.length}
        />
      </View>

      <Modal
        visible={isCommentModalVisible && isLoggedIn}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingComment) {
            setIsCommentModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>Add Comment</AppText>
            <AppText style={styles.modalSubtitle}>Tell us how the tree is!</AppText>

            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write your comment here..."
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
              editable={!isSubmittingComment}
            />

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
                onPress={() => setIsCommentModalVisible(false)}
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
        <View style={styles.editOverlay} pointerEvents="box-none">
          <View style={[styles.editPanel, width < 900 ? styles.editPanelMobile : styles.editPanelDesktop]}>
            <ScrollView
              contentContainerStyle={styles.editPanelContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.editHeaderRow}>
                <View>
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
                    <AppInput
                      placeholder="Diameter (cm)"
                      value={editDiameter}
                      onChangeText={(value) =>
                        handleEditNumericChange(value, 'diameter', setEditDiameter)
                      }
                      keyboardType="numeric"
                      invalid={!!editErrors.diameter}
                      style={styles.editFormInput}
                    />
                    {editErrors.diameter ? (
                      <AppText style={styles.editErrorText}>{editErrors.diameter}</AppText>
                    ) : null}
                  </View>

                  <View style={styles.editMetricField}>
                    <AppInput
                      placeholder="Height (m)"
                      value={editHeight}
                      onChangeText={(value) =>
                        handleEditNumericChange(value, 'height', setEditHeight)
                      }
                      keyboardType="numeric"
                      invalid={!!editErrors.height}
                      style={styles.editFormInput}
                    />
                    {editErrors.height ? (
                      <AppText style={styles.editErrorText}>{editErrors.height}</AppText>
                    ) : null}
                  </View>
                </View>

                <View style={styles.editMetricField}>
                  <AppInput
                    placeholder="Circumference (cm)"
                    value={editCircumference}
                    onChangeText={(value) =>
                      handleEditNumericChange(value, 'circumference', setEditCircumference)
                    }
                    keyboardType="numeric"
                    invalid={!!editErrors.circumference}
                    style={styles.editFormInput}
                  />
                  {editErrors.circumference ? (
                    <AppText style={styles.editErrorText}>{editErrors.circumference}</AppText>
                  ) : null}
                </View>

                <View style={styles.editEstimateBox}>
                  <AppText style={styles.editEstimateTitle}>Estimated Environmental Impact</AppText>
                  <AppText style={styles.editEstimateItem}>
                    Avoided Runoff: {editEstimatedStats.avoidedRunoff ?? '-'} m3
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    CO2 Stored: {editEstimatedStats.carbonDioxideStored ?? '-'} kg
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    CO2 Removed: {editEstimatedStats.carbonDioxideRemoved ?? '-'} kg
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Water Intercepted: {editEstimatedStats.waterIntercepted ?? '-'} m3
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Air Quality Gain: {editEstimatedStats.airQualityImprovement ?? '-'} g/year
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Leaf Area: {editEstimatedStats.leafArea ?? '-'} m2
                  </AppText>
                  <AppText style={styles.editEstimateItem}>
                    Evapotranspiration: {editEstimatedStats.evapotranspiration ?? '-'} m3
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

              <View style={[styles.editFooter, width < 900 && styles.editFooterMobile]}>
                <AppButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setIsEditModalVisible(false)}
                  style={[styles.editFooterButton, width < 900 && styles.editFooterButtonMobile]}
                />

                <AppButton
                  title={isSavingTreeData ? 'Saving...' : 'Save Changes'}
                  variant="primary"
                  onPress={handleSubmitTreeData}
                  disabled={isSavingTreeData}
                  style={[styles.editFooterButton, width < 900 && styles.editFooterButtonMobile]}
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#55705B',
    marginBottom: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#183221',
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
    marginHorizontal: 18,
    marginBottom: 8,
    backgroundColor: '#EAF3E6',
    borderRadius: 18,
    padding: 4,
    gap: 6,
  },

  tabButton: {
    flex: 1,
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
    paddingHorizontal: 18,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },

  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    minHeight: 50,
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
    minHeight: 50,
    marginBottom: 0,
    borderRadius: 14,
  },

  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 14,
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
    minWidth: 430,
  },

  editPanelMobile: {
    width: '100%',
  },

  editPanelContent: {
    padding: 18,
    paddingBottom: 30,
  },

  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  editEyebrow: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    gap: 10,
  },

  editMetricField: {
    flex: 1,
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
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
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
    marginLeft: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#FDECEC',
  },

  photoCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  photoRail: {
    paddingRight: 10,
    gap: 14,
  },

  photoCard: {
    width: 220,
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: '#E8F0E5',
  },

  galleryPhoto: {
    width: '100%',
    height: 220,
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

  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
