import { View, StyleSheet } from 'react-native';
import MapComponent from '../components/base/MapComponent';
import { router } from 'expo-router';
import { NavigationButton } from '../components/base/NavigationButton';
import { AppContainer } from '../components/base/AppContainer';

export default function MainPage() {
  return (
    <AppContainer noPadding>

      <MapComponent style={StyleSheet.absoluteFillObject}/>

      {/* Top Left Back */}
      <View style={ styles.topLeft }>
      <NavigationButton onPress={() => router.push('/')}>
        ← Home
      </NavigationButton>
      </View>

    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topLeft: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
  },
});