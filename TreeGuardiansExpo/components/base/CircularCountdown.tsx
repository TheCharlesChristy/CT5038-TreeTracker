import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularCountdownProps {
  /** Total duration in seconds */
  duration: number;
  /** Diameter of the circle in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Colour of the countdown ring */
  color?: string;
  /** Colour of the background track */
  trackColor?: string;
  /** Called when the countdown reaches zero */
  onComplete?: () => void;
}

const FRAME_MS = 1000 / 60; // ~60 fps

export function CircularCountdown({
  duration,
  size = 36,
  strokeWidth = 3,
  color = '#194C22',
  trackColor = '#D2E4D4',
  onComplete,
}: CircularCountdownProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [progress, setProgress] = useState(1); // 1 = full, 0 = empty
  const startTime = useRef(Date.now());
  const completed = useRef(false);

  const secondsLeft = Math.ceil(progress * duration);
  const dashOffset = (1 - progress) * circumference;

  useEffect(() => {
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
  }, [duration]);

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
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.number, { color }]}>{secondsLeft}</Text>
      </View>
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
