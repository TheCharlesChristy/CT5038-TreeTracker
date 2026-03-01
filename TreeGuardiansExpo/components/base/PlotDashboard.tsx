import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Theme } from '@/styles';
import { AppButton } from './AppButton'
import { AppInput } from './AppInput'
import { AppText } from './AppText'
import { TreeDetails } from '../../objects/TreeDetails';

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

  // photo placeholders and removal
  const [photos, setPhotos] = useState<(string | null)[]>([ null, null, null, null ])

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  }

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
    });
  }

  return (
    <View style={styles.overlay}>
      {/* Blur Background */}
      <BlurView intensity={50} style={StyleSheet.absoluteFill}/>
      <View style={styles.dim}/>

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
            <View key={index} style={styles.photoBox}>
              {photo && (
                <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removePhoto(index)}
                >
                  <AppText
                  style={{
                    color: Theme.Colours.error,
                    fontSize: 60,
                    fontWeight: 'bold',
                  }}> X </AppText>

                </TouchableOpacity>
              )}
            </View>
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

    dim: {
      ...StyleSheet.absoluteFillObject,
    },

    errorText: {
      borderColor: Theme.Colours.error,
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
      backgroundColor: Theme.Colours.gray,
      borderRadius: Theme.Border.medium,
      marginBottom: 10,
      position: 'relative',
    },

    deleteButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: Theme.Colours.error,
      width: 22,
      height: 22,
      borderRadius: Theme.Radius.medium,
      justifyContent: 'center',
      alignItems: 'center',
    },

    deleteText: {
      color: Theme.Colours.white,
      fontSize: 12,
    },

    fullButton: {
      marginBottom: 10,
    },

    button: {
    flex: 1,
    marginHorizontal: 5,
    }
});