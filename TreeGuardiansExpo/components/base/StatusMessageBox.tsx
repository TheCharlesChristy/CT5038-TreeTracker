import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { CircularCountdown } from '@/components/base/CircularCountdown';
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
  /** Seconds before auto-redirect on success (shows countdown). Omit to disable. */
  redirectDuration?: number;
};

export function StatusMessageBox({ status, onClose, redirectDuration }: StatusMessageBoxProps) {
  const [copyFeedback, setCopyFeedback] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (status) {
      setCopyFeedback('');
      opacity.setValue(0);
      translateY.setValue(-20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [status?.createdAt]);

  if (!status) {
    return null;
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

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
    <Animated.View
      style={[
        styles.wrap,
        isSuccess ? styles.successWrap : styles.errorWrap,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <AppText style={[styles.title, isSuccess ? styles.successTitle : styles.errorTitle]}>
        {status.title}
      </AppText>
      <AppText style={styles.body}>{status.message}</AppText>

      {isSuccess && redirectDuration ? (
        <View style={styles.countdownRow}>
          <CircularCountdown duration={redirectDuration} color="#194C22" trackColor="#D2E4D4" />
          <AppText style={styles.countdownText}>Redirecting&hellip;</AppText>
        </View>
      ) : null}

      {copyFeedback ? (
        <AppText style={styles.copyFeedback}>{copyFeedback}</AppText>
      ) : null}

      <View style={styles.actions}>
        {!isSuccess && (
          <AppButton
            title="Copy"
            variant="outline"
            onPress={handleCopy}
            style={styles.actionButton}
          />
        )}
        <AppButton
          title={isSuccess ? 'Continue' : 'Close'}
          variant="secondary"
          onPress={handleClose}
          style={styles.actionButton}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 260,
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
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
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  countdownText: {
    ...Theme.Typography.caption,
    color: '#194C22',
    fontWeight: '600',
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
