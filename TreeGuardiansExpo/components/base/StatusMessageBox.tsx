import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { CircularCountdown } from '@/components/base/CircularCountdown';
import { Theme } from '@/styles';

const SUCCESS_AUTO_DISMISS_MS = 4000;

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
  countdownLabel?: string;
  closeLabel?: string;
  showCopyButton?: boolean;
  /** Override the default top position (16px). Use to push below a nav bar. */
  topOffset?: number;
};

export function StatusMessageBox({
  status,
  onClose,
  redirectDuration,
  countdownLabel,
  closeLabel,
  showCopyButton,
  topOffset,
}: StatusMessageBoxProps) {
  const [copyFeedback, setCopyFeedback] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const statusCreatedAt = status?.createdAt;
  const statusVariant = status?.variant;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (statusCreatedAt !== undefined && statusVariant) {
      setCopyFeedback('');
      opacity.setValue(0);
      translateY.setValue(-20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();

      if (statusVariant === 'success') {
        if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
          ]).start(() => onCloseRef.current());
        }, SUCCESS_AUTO_DISMISS_MS);
      }
    }

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [opacity, statusCreatedAt, statusVariant, translateY]);

  if (!status) {
    return null;
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
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
  const shouldShowCountdown = Boolean(redirectDuration);
  const shouldShowCopyButton = showCopyButton ?? !isSuccess;

  return (
    <Animated.View
      style={[
        styles.wrap,
        isSuccess ? styles.successWrap : styles.errorWrap,
        { opacity, transform: [{ translateY }] },
        topOffset !== undefined ? { top: topOffset } : undefined,
      ]}
    >
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollInner}
        showsVerticalScrollIndicator
        bounces={false}
      >
        <AppText style={[styles.title, isSuccess ? styles.successTitle : styles.errorTitle]}>
          {status.title}
        </AppText>
        <AppText style={styles.body}>{status.message}</AppText>
      </ScrollView>

      {shouldShowCountdown ? (
        <View style={styles.countdownRow}>
          <CircularCountdown
            duration={redirectDuration!}
            color={isSuccess ? '#194C22' : Theme.Colours.error}
            trackColor={isSuccess ? '#D2E4D4' : '#F0C9C9'}
          />
          <AppText style={[styles.countdownText, !isSuccess && styles.countdownTextError]}>
            {countdownLabel ?? 'Redirecting…'}
          </AppText>
        </View>
      ) : null}

      {copyFeedback ? (
        <AppText style={styles.copyFeedback}>{copyFeedback}</AppText>
      ) : null}

      <View style={styles.actions}>
        {shouldShowCopyButton && (
          <AppButton
            title="Copy"
            variant="outline"
            onPress={handleCopy}
            style={styles.actionButton}
          />
        )}
        <AppButton
          title={closeLabel ?? (isSuccess ? 'Continue' : 'Close')}
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
    maxHeight: 320,
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
  contentScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  contentScrollInner: {
    paddingBottom: 2,
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
  countdownTextError: {
    color: Theme.Colours.error,
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
