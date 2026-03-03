import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton'
import { AppInput } from './AppInput'
import { AppText } from './AppText'
import { TreeDetails } from '@/objects/TreeDetails';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native'
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Platform } from 'react-native';

const { height } = Dimensions.get('window')

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
  // tree Details
  const [treeType, setTreeType] = useState('');
  const [wildlife, setWildlife] = useState('');
  const [disease, setDisease] = useState('');
  const [addDisease, setAddDisease] = useState(false);

  // ========================================================================================
  // photo placeholders, removal, picking and camera
  const [photos, setPhotos] = useState<(string | null)[]>([ null, null, null, null ])
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
  }

  const pickImage = async (index: number) => {
    // Asking for permission
    const permisisonResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permisisonResult.granted) {
      alert("Permission to access photos is required!");
      return;
    }

    // opening gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // blocking gifs
      if (asset.mimeType === 'image/gif') {
        alert('GIF files are not suppoted. Please select a static Image');
        return;
      }

      const updated = [...photos];
      updated[index] = result.assets[0].uri;
      setPhotos(updated);
    }
  }

  const takePhoto = async (index: number) => {
    const permisisonResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permisisonResult.granted) {
      alert("Camera permission is required!");
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

  // ========================================================================================
  // if the user does not input anything into plot dashboard
  const [errors, setErrors] = useState({
    treeType: '',
    wildlife: '',
    disease: '',
  });

  const validate = () => {
    const newErrors = {
      treeType: '',
      wildlife: '',
      disease: '',
    };

    let isValid = true;

    if (!treeType.trim()) {
      newErrors.treeType = 'Tree type field is required...'
      isValid = false;
    }

    if (!wildlife.trim()) {
      newErrors.wildlife = 'wildlife field is required...'
      isValid = false;
    }

    if (addDisease && !disease.trim()) {
      newErrors.disease = 'Disease information is required...'
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }

  const handleSubmit = () => {
    if (!validate()) return;

    onConfirm({
      treeType: treeType.trim(),
      wildlife: wildlife.trim(),
      disease: addDisease ? disease.trim() : undefined,
      photos: photos.filter((p): p is string => p !== null)
    });
  }

  return (
    <View style={styles.overlay}>

      {/* Centre card */}
      <View style={styles.card}>
        <AppText style={Theme.Typography.title}>Plot Tree</AppText>

        {/* Tree type and if needed: error message */}
        <AppInput
        // if there is no input then show error message in input
        placeholder={ 
          errors.treeType ? errors.treeType : "Tree Type"
        }
        value={treeType}
        onChangeText={(text) => {
          setTreeType(text);

          // clear error while typing
          if (errors.treeType) {
            setErrors(prev => ({ ...prev, treeType: '' }));
          }
        }}
        style={[
          styles.input,
          errors.treeType && styles.errorText
        ]}
        />

        {/* Wildlife and if needed: error message */}
        <AppInput
        // if there is no input then show error message in input
        placeholder={ 
          errors.wildlife ? errors.wildlife : "wildlife"
        }
        value={wildlife}
        onChangeText={(text) => {
          setWildlife(text);

          // clear error while typing
          if (errors.wildlife) {
            setErrors(prev => ({ ...prev, wildlife: '' }));
          }
        }}
        style={[
          styles.input,
          errors.wildlife && styles.errorText
        ]}
        />

        {/* Checkbox for Disease and if needed: error message*/}
        <TouchableOpacity
          onPress={() => setAddDisease(!addDisease)}
          style={styles.checkboxRow}
        >
          <View style={[
            styles.checkbox,
            addDisease && styles.checkboxActive
          ]}/>
          <AppText>Add Disease?</AppText>
        </TouchableOpacity>

        {addDisease && (
          <AppInput
          // if there is no input then show error message in input
          placeholder={ 
            errors.disease ? errors.disease : "Disease"
          }
          value={disease}
          onChangeText={(text) => {
            setDisease(text);

            // clear error while typing
            if (errors.disease) {
              setErrors(prev => ({ ...prev, disease: '' }));
            }
          }}
          style={[
            styles.input,
            errors.disease && styles.errorText
          ]}
          />
        )}

        {/* Uploading photos */}
        <AppText style={Theme.Typography.title}>
          Upload Photos
        </AppText>

        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
            key={index} 
            style={styles.photoBox}
            // only open picker if empty
            onPress={() => {
              if (!photo) {showImageOptions(index)} 
            }}
            activeOpacity={0.8}
            >
              {photo ? (
                <>
                <Image source={{ uri: photo }}style={styles.image} />
                <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removePhoto(index)}
                >
                  <AppText style={ styles.deleteText }> x </AppText>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.plusContainer}>
                  <AppText style={styles.plusText}> + </AppText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Submitting treeDraft */}
        <View style={styles.footer}>
          <AppButton
          title="Select on Map" 
          variant="primary"
          onPress={() => {
            if (!validate()) return; // stop if there are invalid fields

            handleSubmit();
            onSelectManual();
          }}
          style={styles.button} />

          <AppButton
          title="Use my Location" 
          variant="accent"
          onPress={() => {
            if (!validate()) return; // stop if there are invalid fields

            handleSubmit();
            onSelectDevice();
          }}
          style={styles.button} />

          <AppButton 
          title="Cancel" 
          variant="secondary"
          onPress={onCancel}
          style={styles.button} />
        </View>
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
      zIndex: 999, // required for web
  },

  plusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
  },

  plusText: {
    fontSize: 60,
    fontWeight: 'bold',
    opacity: 0.5,
    textAlign: 'center',
    top: -10
  },

  content: {
    flex: 1,
    marginTop: 15,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  card: {
      width: '90%',
      height: height * 0.90, // covering the screen
      padding: 20,
      borderRadius: Theme.Radius.medium,
  },

  input: {
      borderWidth: Theme.Border.extraSmall,
      borderColor: Theme.Colours.gray,
      borderRadius: Theme.Radius.small,
      padding: 6,
  },

  image: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.Radius.small,
  },

  checkboxRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: 12,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: Theme.Border.extraSmall,
    borderColor: Theme.Colours.gray,
    marginRight: 10,
    borderRadius: Theme.Radius.small,
  },

  checkboxActive: {
      backgroundColor: Theme.Colours.accent,
  },

  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  photoBox: {
    width: '17%',
    aspectRatio: 1,
    borderRadius: Theme.Border.medium,
    borderWidth: 3,
    borderColor: Theme.Colours.black,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },

  deleteButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 40,
    height: 40,
    borderRadius: Theme.Radius.large,
    backgroundColor: Theme.Colours.error,
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteText: {
    color: Theme.Colours.white,
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    top: -7,
    right: 2
  },

  errorText: {
    borderColor: Theme.Colours.error,
  },

  fullButton: {
    marginBottom: 10,
  },

  button: {
  flex: 1,
  marginHorizontal: 5,
  },
});