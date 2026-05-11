import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularCountdownProps {
  /** Countdown duration in seconds. */
  duration: number;
  /** Circle diameter in pixels. */
  size?: number;
  /** Ring stroke width in pixels. */
  strokeWidth?: number;
  /** Active ring colour. */
  color?: string;
  /** Background track colour. */
  trackColor?: string;
  /** Hides the centre number when false. */
  showLabel?: boolean;
  /** Shows only the background track when true. */
  trackOnly?: boolean;
  /** Called once when progress reaches zero. */
  onComplete?: () => void;
}

const FRAME_MS = 1000 / 60;

export function CircularCountdown({
  duration,
  size = 36,
  strokeWidth = 3,
  color = '#194C22',
  trackColor = '#D2E4D4',
  showLabel = true,
  trackOnly = false,
  onComplete,
}: CircularCountdownProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [progress, setProgress] = useState(1);
  const startTime = useRef(Date.now());
  const completed = useRef(false);

  const secondsLeft = Math.ceil(progress * duration);
  const dashOffset = (1 - progress) * circumference;

  useEffect(() => {
    if (trackOnly) {
      return;
    }

    startTime.current = Date.now();
    completed.current = false;

    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 1 - elapsed / (duration * 1000));
      setProgress(remaining);

      if (remaining <= 0 && !completed.current) {
        completed.current = true;
        onComplete?.();
        return;
      }

      timer = setTimeout(tick, FRAME_MS);
    };

    let timer = setTimeout(tick, FRAME_MS);
    return () => clearTimeout(timer);
  }, [duration, onComplete, trackOnly]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={[styles.svg, { transform: [{ rotate: '-90deg' }] }]}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {!trackOnly ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        ) : null}
      </Svg>
      {!trackOnly && showLabel ? (
        <View style={styles.label}>
          <Text style={[styles.number, { color }]}>{secondsLeft}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  label: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: 13,
    fontWeight: '700',
  },
});
