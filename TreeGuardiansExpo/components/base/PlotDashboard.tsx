import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Theme } from '@/styles';
import { AppButton } from './AppButton'
import { AppInput } from './AppInput'
import { AppText } from './AppText'

const { height } = Dimensions.get('window')

interface PlotDashBoardProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export default function PlotDashboard({
    onConfirm,
    onCancel,
}: PlotDashBoardProps) {

  const [addDisease, setAddDisease] = useState(false);
  const [photos, setPhotos] = useState<(string | null)[]>([ null, null, null, null ])

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  }

  return (
    <View style={styles.overlay}>
      {/* Blur Background */}
      <BlurView intensity={50} style={StyleSheet.absoluteFill}/>
      <View style={styles.dim}/>

      {/* Centre card */}
      <View style={styles.card}>
        <AppText style={Theme.Typography.title}>Plot Tree</AppText>

        <AppInput
          placeholder="Tree Type"
          style={styles.input}
        />

        <AppInput
          placeholder="Wildlife"
          style={styles.input}
        />

        {/* Checkbox */}
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
          placeholder="Disease"
          style={styles.input}
          />
        )}

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

        <View style={styles.footer}>
          <AppButton
          title="Submit" 
          variant="primary"
          onPress={onConfirm}
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
        // backgroundColor: Theme.Colours.accent,
        padding: 20,
        borderRadius: Theme.Radius.medium,
    },

    input: {
        borderWidth: Theme.Border.extraSmall,
        borderColor: Theme.Colours.gray,
        borderRadius: Theme.Radius.small,
        padding: 12,
        marginBottom: 10,
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