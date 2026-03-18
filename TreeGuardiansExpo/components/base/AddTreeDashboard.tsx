import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { TreeDetails } from '@/objects/TreeDetails';
import * as ImagePicker from 'expo-image-picker';
import { useActionSheet } from '@expo/react-native-action-sheet';

type NumericField = 'diameter' | 'height' | 'circumference';

interface PlotDashBoardProps {
  onConfirm: (details: TreeDetails) => void;
  onCancel: () => void;
  onSelectManual: () => void;
  onSelectDevice: () => void;
}

const MAX_PHOTOS = 5;

export default function PlotDashboard({
  onConfirm,
  onCancel,
  onSelectManual,
  onSelectDevice,
}: PlotDashBoardProps) {
  const [notes, setNotes] = useState('');
  const [wildlife, setWildlife] = useState('');
  const [disease, setDisease] = useState('');
  const [diameter, setDiameter] = useState('');
  const [height, setHeight] = useState('');
  const [circumference, setCircumference] = useState('');

  const [errors, setErrors] = useState<Record<NumericField, string>>({
    diameter: '',
    height: '',
    circumference: '',
  });

  const [photos, setPhotos] = useState<string[]>([]);

  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const { showActionSheetWithOptions } = useActionSheet();

  const isNumeric = (value: string) => /^(\d+)?([.]\d*)?$/.test(value);

  const handleNumericChange = (
    value: string,
    field: NumericField,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);
    setErrors((prev) => ({
      ...prev,
      [field]: value.trim() === '' || isNumeric(value) ? '' : 'Enter a valid number',
    }));
  };

  const validate = () => {
    const nextErrors: Record<NumericField, string> = {
      diameter: diameter.trim() && !isNumeric(diameter) ? 'Enter a valid number' : '',
      height: height.trim() && !isNumeric(height) ? 'Enter a valid number' : '',
      circumference:
        circumference.trim() && !isNumeric(circumference) ? 'Enter a valid number' : '',
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => value === '');
  };

  const submitDetails = () => {
    onConfirm({
      notes: notes.trim() || undefined,
      wildlife: wildlife.trim() || undefined,
      disease: disease.trim() || undefined,
      diameter: diameter.trim() ? Number(diameter) : undefined,
      height: height.trim() ? Number(height) : undefined,
      circumference: circumference.trim() ? Number(circumference) : undefined,
      photos,
    });
  };

  const chooseImageSource = (slotIndex: number) => {
    const isWeb = Platform.OS === 'web';
    const options = isWeb
      ? ['Choose from Gallery', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Remove Photo', 'Cancel'];

    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === cancelButtonIndex) {
          return;
        }

        const removeIndex = isWeb ? 1 : 2;
        if (selectedIndex === removeIndex) {
          setPhotos((prev) => prev.filter((_, index) => index !== slotIndex));
          return;
        }

        if (!isWeb && selectedIndex === 0) {
          await takePhoto();
          return;
        }

        await pickImage();
      }
    );
  };

  const canAddPhoto = photos.length < MAX_PHOTOS;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets[0];

    if (selected.mimeType === 'image/gif') {
      alert('GIF files are not supported. Please choose a static image.');
      return;
    }

    setPhotos((prev) => [...prev.slice(0, MAX_PHOTOS - 1), selected.uri]);
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setPhotos((prev) => [...prev.slice(0, MAX_PHOTOS - 1), result.assets[0].uri]);
  };

  const summaryText = useMemo(() => {
    return `${photos.length}/${MAX_PHOTOS} photo${photos.length === 1 ? '' : 's'} selected`;
  }, [photos.length]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.panel, isMobile ? styles.panelMobile : styles.panelDesktop]}>
        <ScrollView
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.headerRow}>
            <View>
              <AppText style={styles.eyebrow}>Add Tree</AppText>
              <AppText style={styles.title}>Tree Details</AppText>
              <AppText style={styles.subtitle}>Complete details, then choose how to pin the tree.</AppText>
            </View>

            <AppButton
              title="Close"
              variant="tertiary"
              onPress={onCancel}
              style={styles.closeButtonWrap}
              buttonStyle={styles.closeButton}
            />
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Observations</AppText>

            <AppInput
              placeholder="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.input}
            />

            <AppInput
              placeholder="Wildlife Seen"
              value={wildlife}
              onChangeText={setWildlife}
              style={styles.input}
            />

            <AppInput
              placeholder="Disease"
              value={disease}
              onChangeText={setDisease}
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Measurements</AppText>

            <View style={styles.metricsRow}>
              <View style={styles.metricField}>
                <AppInput
                  placeholder="Diameter (cm)"
                  value={diameter}
                  onChangeText={(value) => handleNumericChange(value, 'diameter', setDiameter)}
                  keyboardType="numeric"
                  invalid={!!errors.diameter}
                  style={styles.input}
                />
                {errors.diameter ? <AppText style={styles.errorText}>{errors.diameter}</AppText> : null}
              </View>

              <View style={styles.metricField}>
                <AppInput
                  placeholder="Height (m)"
                  value={height}
                  onChangeText={(value) => handleNumericChange(value, 'height', setHeight)}
                  keyboardType="numeric"
                  invalid={!!errors.height}
                  style={styles.input}
                />
                {errors.height ? <AppText style={styles.errorText}>{errors.height}</AppText> : null}
              </View>
            </View>

            <View style={styles.metricField}>
              <AppInput
                placeholder="Circumference (cm)"
                value={circumference}
                onChangeText={(value) =>
                  handleNumericChange(value, 'circumference', setCircumference)
                }
                keyboardType="numeric"
                invalid={!!errors.circumference}
                style={styles.input}
              />
              {errors.circumference ? (
                <AppText style={styles.errorText}>{errors.circumference}</AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Photos</AppText>
            <AppText style={styles.photoHint}>Upload up to 5 photos</AppText>

            <TouchableOpacity
              onPress={() => {
                if (canAddPhoto) {
                  chooseImageSource(photos.length);
                }
              }}
              activeOpacity={0.85}
              style={[styles.uploadDropZone, !canAddPhoto && styles.uploadDropZoneDisabled]}
            >
              <AppText style={styles.cameraEmoji}>📷</AppText>
              <AppText style={styles.uploadTitle}>Tap to add a photo</AppText>
              <AppText style={styles.uploadSummary}>{summaryText}</AppText>
            </TouchableOpacity>

            {photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={`${photo}-${index}`}
                    onPress={() => chooseImageSource(index)}
                    style={styles.photoCard}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: photo }} style={styles.photoImage} />
                    <View style={styles.photoBadge}>
                      <AppText style={styles.photoBadgeText}>Edit</AppText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[styles.footer, isMobile && styles.footerMobile]}>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              style={[styles.footerButton, isMobile && styles.footerButtonMobile]}
            />

            <AppButton
              title="Use My Location"
              variant="outline"
              onPress={() => {
                if (!validate()) {
                  return;
                }
                submitDetails();
                onSelectDevice();
              }}
              style={[styles.footerButton, isMobile && styles.footerButtonMobile]}
            />

            <AppButton
              title="Select On Map"
              variant="primary"
              onPress={() => {
                if (!validate()) {
                  return;
                }
                submitDetails();
                onSelectManual();
              }}
              style={[styles.footerButton, isMobile && styles.footerButtonMobile]}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 12,
    right: 0,
    bottom: 104,
    left: 0,
    zIndex: 220,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 14,
  },

  panel: {
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

  panelDesktop: {
    width: '42%',
    maxWidth: 560,
    minWidth: 430,
  },

  panelMobile: {
    width: '100%',
  },

  panelContent: {
    padding: 18,
    paddingBottom: 30,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  eyebrow: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },

  title: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
  },

  subtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 3,
    maxWidth: 300,
  },

  closeButtonWrap: {
    marginBottom: 0,
  },

  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 0,
  },

  section: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE5DB',
    backgroundColor: Theme.Colours.white,
  },

  sectionTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
    marginBottom: 10,
  },

  input: {
    marginBottom: 8,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  metricField: {
    flex: 1,
  },

  errorText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.error,
    marginTop: -4,
    marginBottom: 8,
  },

  photoHint: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 8,
  },

  uploadDropZone: {
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

  uploadDropZoneDisabled: {
    opacity: 0.64,
  },

  cameraEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },

  uploadTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
  },

  uploadSummary: {
    ...Theme.Typography.caption,
    marginTop: 4,
    color: Theme.Colours.textMuted,
  },

  photoGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  photoCard: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D4DED4',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 23, 16, 0.78)',
  },

  photoBadgeText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
    lineHeight: 14,
    fontSize: 11,
  },

  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  footerMobile: {
    flexDirection: 'column-reverse',
  },

  footerButton: {
    flex: 1,
    marginBottom: 0,
  },

  footerButtonMobile: {
    width: '100%',
  },
});