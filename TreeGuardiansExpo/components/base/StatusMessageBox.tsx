import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';

type StatusVariant = 'success' | 'error';

export type StatusMessage = {
  title: string;
  message: string;
  variant: StatusVariant;
  createdAt: number;
};

type StatusMessageBoxProps = {
  status: StatusMessage | null;
  onClose: () => void;
};

export function StatusMessageBox({ status, onClose }: StatusMessageBoxProps) {
  const [copyFeedback, setCopyFeedback] = useState('');

  if (!status) {
    return null;
  }

  const handleCopy = async () => {
    const payload = `${status.title}\n\n${status.message}`;

    try {
      await Clipboard.setStringAsync(payload);
      setCopyFeedback('Copied to clipboard.');
    } catch {
      setCopyFeedback('Copy failed on this device.');
    }
  };

  const isSuccess = status.variant === 'success';

  return (
    <View style={[styles.wrap, isSuccess ? styles.successWrap : styles.errorWrap]}>
      <AppText style={[styles.title, isSuccess ? styles.successTitle : styles.errorTitle]}>
        {status.title}
      </AppText>
      <AppText style={styles.body}>{status.message}</AppText>

      {copyFeedback ? (
        <AppText style={styles.copyFeedback}>{copyFeedback}</AppText>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title="Copy Message"
          variant="outline"
          onPress={handleCopy}
          style={styles.actionButton}
        />
        <AppButton
          title="Close"
          variant="secondary"
          onPress={onClose}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 260,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  successWrap: {
    borderColor: '#B8D8BC',
    backgroundColor: '#EEFAF0',
  },
  errorWrap: {
    borderColor: '#E5B5B5',
    backgroundColor: '#FFF2F2',
  },
  title: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
  },
  successTitle: {
    color: '#194C22',
  },
  errorTitle: {
    color: Theme.Colours.error,
  },
  body: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    marginTop: 4,
  },
  copyFeedback: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 6,
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    marginBottom: 0,
  },
});
