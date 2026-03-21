import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';

type ErrorMessageBoxProps = {
  message: string;
  visible?: boolean;
};

export function ErrorMessageBox({ message, visible = true }: ErrorMessageBoxProps) {
  if (!visible || !message.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Error</AppText>
      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9B6B6',
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  title: {
    ...Theme.Typography.caption,
    color: Theme.Colours.error,
    fontFamily: 'Poppins_600SemiBold',
  },
  message: {
    ...Theme.Typography.caption,
    color: Theme.Colours.error,
    marginTop: 2,
  },
});
