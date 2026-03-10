import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Theme, Typography } from '@/styles';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { TreeDetails } from '@/objects/TreeDetails';
import * as ImagePicker from 'expo-image-picker';
import { useActionSheet } from '@expo/react-native-action-sheet';

const { height: windowHeight } = Dimensions.get('window');

type ActiveInput =
  | 'notes'
  | 'wildlife'
  | 'disease'
  | 'diameter'
  | 'height'
  | 'circumference'
  | null;

interface PlotDashBoardProps {
  onConfirm: (details: TreeDetails) => void;
  onCancel: () => void;
  onSelectManual: () => void;
  onSelectDevice: () => void;
}

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
  const [activeInput, setActiveInput] = useState<ActiveInput>('notes');
  const [addDisease, setAddDisease] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [photos, setPhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  const { showActionSheetWithOptions } = useActionSheet();

  const showImageOptions = (index: number) => {
    const isWeb = Platform.OS === 'web';

    const options = isWeb
      ? ['Choose from Gallery', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Cancel'];

    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      (selectedIndex) => {
        if (selectedIndex === cancelButtonIndex) return;

        if (!isWeb && selectedIndex === 0) {
          takePhoto(index);
        } else {
          pickImage(index);
        }
      }
    );
  };

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  };

  const pickImage = async (index: number) => {
    const permisisonResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permisisonResult.granted) {
      alert('Permission to access photos is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      if (asset.mimeType === 'image/gif') {
        alert('GIF files are not supported. Please select a static Image');
        return;
      }

      const updated = [...photos];
      updated[index] = result.assets[0].uri;
      setPhotos(updated);
    }
  };

  const takePhoto = async (index: number) => {
    const permisisonResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permisisonResult.granted) {
      alert('Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const updated = [...photos];
      updated[index] = result.assets[0].uri;
      setPhotos(updated);
    }
  };

  const [errors, setErrors] = useState({
    diameter: '',
    height: '',
    circumference: '',
  });

  const isNumeric = (value: string) => /^(\d+)?([.]\d*)?$/.test(value);

  const handleNumericChange = (
    value: string,
    field: 'diameter' | 'height' | 'circumference',
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);

    setErrors((prev) => ({
      ...prev,
      [field]: value.trim() === '' || isNumeric(value) ? '' : 'Invalid input',
    }));
  };

  const validate = () => {
    const newErrors = {
      diameter: '',
      height: '',
      circumference: '',
    };

    let isValid = true;

    if (diameter.trim() !== '' && !isNumeric(diameter)) {
      newErrors.diameter = 'Invalid input';
      isValid = false;
    }

    if (height.trim() !== '' && !isNumeric(height)) {
      newErrors.height = 'Invalid input';
      isValid = false;
    }

    if (circumference.trim() !== '' && !isNumeric(circumference)) {
      newErrors.circumference = 'Invalid input';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    onConfirm({
      notes: notes.trim() || undefined,
      wildlife: wildlife.trim() || undefined,
      disease: addDisease ? disease.trim() || undefined : undefined,
      diameter: diameter.trim() ? Number(diameter) : undefined,
      height: height.trim() ? Number(height) : undefined,
      circumference: circumference.trim() ? Number(circumference) : undefined,
      photos: photos.filter((p): p is string => p !== null),
    });
  };

  const hasError = (field: ActiveInput) => {
    if (!field) return false;
    return errors[field as keyof typeof errors] !== '';
  };

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.card,
          isMobile ? styles.cardMobile : styles.cardDesktop,
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.cardContent,
            isMobile ? styles.cardContentMobile : styles.cardContentDesktop,
          ]}
          showsVerticalScrollIndicator={true}
        >
          <AppText style={Theme.Typography.title}>Plot Tree</AppText>

          <View style={styles.selectorRow}>
            <TouchableOpacity
              onPress={() => setActiveInput('notes')}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'notes' && styles.selectorActive,
              ]}
            >
              <AppText style={styles.selectorText}>Notes</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveInput('wildlife')}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'wildlife' && styles.selectorActive,
              ]}
            >
              <AppText style={styles.selectorText}>Wildlife</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveInput('disease');
                setAddDisease(true);
              }}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'disease' && styles.selectorActive,
              ]}
            >
              <AppText style={styles.selectorText}>Disease</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveInput('diameter')}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'diameter' && styles.selectorActive,
                hasError('diameter') && styles.selectorError,
              ]}
            >
              <AppText style={styles.selectorText}>Diameter</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveInput('height')}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'height' && styles.selectorActive,
                hasError('height') && styles.selectorError,
              ]}
            >
              <AppText style={styles.selectorText}>Height</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveInput('circumference')}
              style={[
                styles.selectorButton,
                isMobile
                  ? styles.selectorButtonMobile
                  : styles.selectorButtonDesktop,
                activeInput === 'circumference' && styles.selectorActive,
                hasError('circumference') && styles.selectorError,
              ]}
            >
              <AppText style={styles.selectorText}>Circumference</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.dynamicInputArea}>
            {activeInput === 'notes' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Notes / Seen Observations"
                  value={notes}
                  onChangeText={setNotes}
                  style={styles.input}
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>{' '}</AppText>
                </View>
              </View>
            )}

            {activeInput === 'wildlife' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Wildlife"
                  value={wildlife}
                  onChangeText={setWildlife}
                  style={styles.input}
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>{' '}</AppText>
                </View>
              </View>
            )}

            {activeInput === 'disease' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Disease"
                  value={disease}
                  onChangeText={setDisease}
                  style={styles.input}
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>{' '}</AppText>
                </View>
              </View>
            )}

            {activeInput === 'diameter' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Diameter (cm)"
                  value={diameter}
                  onChangeText={(value) =>
                    handleNumericChange(value, 'diameter', setDiameter)
                  }
                  style={[styles.input, errors.diameter ? styles.inputError : null]}
                  keyboardType="numeric"
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>
                    {errors.diameter || ' '}
                  </AppText>
                </View>
              </View>
            )}

            {activeInput === 'height' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Height (m)"
                  value={height}
                  onChangeText={(value) =>
                    handleNumericChange(value, 'height', setHeight)
                  }
                  style={[styles.input, errors.height ? styles.inputError : null]}
                  keyboardType="numeric"
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>
                    {errors.height || ' '}
                  </AppText>
                </View>
              </View>
            )}

            {activeInput === 'circumference' && (
              <View style={styles.inputBlock}>
                <AppInput
                  placeholder="Circumference (cm)"
                  value={circumference}
                  onChangeText={(value) =>
                    handleNumericChange(value, 'circumference', setCircumference)
                  }
                  style={[
                    styles.input,
                    errors.circumference ? styles.inputError : null,
                  ]}
                  keyboardType="numeric"
                />
                <View style={styles.errorContainer}>
                  <AppText style={styles.errorMessage}>
                    {errors.circumference || ' '}
                  </AppText>
                </View>
              </View>
            )}
          </View>

          <AppText style={Theme.Typography.title}>Upload Photos</AppText>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.photoBox,
                  isMobile ? styles.photoBoxMobile : styles.photoBoxDesktop,
                ]}
                onPress={() => {
                  if (!photo) {
                    showImageOptions(index);
                  }
                }}
                activeOpacity={0.8}
              >
                {photo ? (
                  <>
                    <Image source={{ uri: photo }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removePhoto(index)}
                    >
                      <AppText style={styles.deleteText}>x</AppText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.plusContainer}>
                    <AppText style={styles.plusText}>+</AppText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.footer, isMobile && styles.footerMobile]}>
            <AppButton
              title="Select on Map"
              variant="primary"
              onPress={() => {
                if (!validate()) return;
                handleSubmit();
                onSelectManual();
              }}
              style={[styles.button, isMobile && styles.buttonMobile]}
            />

            <AppButton
              title="Use my Location"
              variant="accent"
              onPress={() => {
                if (!validate()) return;
                handleSubmit();
                onSelectDevice();
              }}
              style={[styles.button, isMobile && styles.buttonMobile]}
            />

            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              style={[styles.button, isMobile && styles.buttonMobile]}
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  card: {
    borderRadius: Theme.Radius.medium,
  },

  cardMobile: {
    width: '94%',
    height: windowHeight * 0.9,
    padding: 16,
  },

  cardDesktop: {
    width: '90%',
    maxHeight: windowHeight * 0.91,
    padding: 20,
    borderRadius: Theme.Radius.medium,
  },

  cardContent: {
    paddingBottom: 12,
    paddingRight: 6,
  },

  cardContentMobile: {
    // Nothing needed here, but different styling placeholder
  },

  cardContentDesktop: {
    paddingBottom: 20,
  },

  input: {
    borderWidth: Theme.Border.extraSmall,
    borderColor: Theme.Colours.gray,
    borderRadius: Theme.Radius.small,
    padding: 10,
  },

  inputError: {
    borderColor: Theme.Colours.error,
  },

  errorMessage: {
    ...Typography.body,
    color: Theme.Colours.error,
    marginTop: 4,
    marginBottom: 8,
    fontWeight: 'bold',
  },

  dynamicInputArea: {
    minHeight: 80,
    marginBottom: 14,
  },

  inputBlock: {
    width: '100%',
  },

  errorContainer: {
    minHeight: 20,
    justifyContent: 'center',
  },

  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 12,
  },

  selectorButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.Radius.small,
    borderWidth: 1,
    borderColor: Theme.Colours.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  selectorButtonMobile: {
    width: '48%', // to allow space for "circumference"
  },

  selectorButtonDesktop: {
    flex: 1,
  },

  selectorText: {
    textAlign: 'center',
    flexShrink: 1,
    fontWeight: 'bold',
  },

  selectorActive: {
    backgroundColor: Theme.Colours.accent,
    borderColor: Theme.Colours.accent,
  },

  selectorError: {
    borderColor: Theme.Colours.error,
    backgroundColor: '#ffe6e6',
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  photoBox: {
    aspectRatio: 1,
    borderRadius: Theme.Radius.small,
    borderWidth: 2,
    borderColor: Theme.Colours.black,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },

  photoBoxMobile: {
    width: '48%',
  },

  photoBoxDesktop: {
    width: '23%',
  },

  image: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.Radius.small,
  },

  plusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
  },

  plusText: {
    fontSize: 36,
    fontWeight: 'bold',
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 40,
  },

  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Theme.Colours.error,
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteText: {
    color: Theme.Colours.white,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },

  footerMobile: {
    flexDirection: 'column',
  },

  button: {
    flex: 1,
  },

  buttonMobile: {
    width: '100%',
    marginHorizontal: 0,
  },
});