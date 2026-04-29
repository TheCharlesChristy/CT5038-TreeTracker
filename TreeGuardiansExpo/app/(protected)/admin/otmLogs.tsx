import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import { fetchOtmLogs, OtmLogEntry, OtmLogLevel } from '@/lib/adminApi';

const POLL_INTERVAL_MS = 5000;
const LEVEL_FILTERS: Array<OtmLogLevel | null> = [null, 'error', 'warn', 'info'];

const LEVEL_META: Record<OtmLogLevel, { label: string; color: string; bg: string }> = {
  error: { label: 'ERROR', color: '#8C2D04', bg: '#FFF0EC' },
  warn:  { label: 'WARN',  color: '#92400E', bg: '#FFFBEB' },
  info:  { label: 'INFO',  color: '#1B5E20', bg: '#F0FBF1' },
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour12: false }) + '.' +
      String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return iso;
  }
}

function LevelBadge({ level }: { level: OtmLogLevel }) {
  const m = LEVEL_META[level];
  return (
    <View style={[styles.levelBadge, { backgroundColor: m.bg }]}>
      <AppText style={[styles.levelBadgeText, { color: m.color }]}>{m.label}</AppText>
    </View>
  );
}

function LogRow({ entry }: { entry: OtmLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasMeta = entry.meta !== null;

  return (
    <TouchableOpacity
      activeOpacity={hasMeta ? 0.75 : 1}
      onPress={() => hasMeta && setExpanded((v) => !v)}
      style={[styles.logRow, entry.level === 'error' && styles.logRowError, entry.level === 'warn' && styles.logRowWarn]}
    >
      <View style={styles.logRowHeader}>
        <AppText style={styles.logTimestamp}>{formatTimestamp(entry.timestamp)}</AppText>
        <LevelBadge level={entry.level} />
        <View style={styles.logTextGroup}>
          <AppText style={styles.logScope}>{entry.scope}</AppText>
          <AppText style={styles.logEvent}>{entry.event}</AppText>
        </View>
        {hasMeta ? (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Theme.Colours.textMuted}
          />
        ) : null}
      </View>

      {expanded && hasMeta ? (
        <View style={styles.logMeta}>
          <AppText style={styles.logMetaText}>
            {JSON.stringify(entry.meta, null, 2)}
          </AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function OtmLogsPage() {
  const { user, isLoading } = useSessionUser();
  const authorized = canAccessManageUsers(user?.role);

  const [entries, setEntries] = useState<OtmLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState<OtmLogLevel | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const lastIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLogs = useCallback(async (incremental: boolean) => {
    try {
      const after = incremental ? lastIdRef.current : 0;
      const data = await fetchOtmLogs({ limit: 200, after: after || undefined, level: levelFilter });
      setTotal(data.total);
      setLastUpdated(new Date());
      setError(null);

      if (data.entries.length > 0) {
        const maxId = data.entries[data.entries.length - 1].id;
        if (maxId > lastIdRef.current) lastIdRef.current = maxId;

        setEntries((prev) => {
          const combined = incremental ? [...prev, ...data.entries] : data.entries;
          // Keep the most recent 500 in state
          return combined.slice(-500);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs.');
    } finally {
      setIsInitialLoad(false);
    }
  }, [levelFilter]);

  // Full reload when filter changes
  useEffect(() => {
    if (!authorized) return;
    lastIdRef.current = 0;
    setEntries([]);
    setIsInitialLoad(true);
    loadLogs(false);
  }, [authorized, levelFilter, loadLogs]);

  // Polling
  useEffect(() => {
    if (!authorized || !isLive) return;

    timerRef.current = setInterval(() => {
      loadLogs(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [authorized, isLive, loadLogs]);

  if (isLoading) {
    return (
      <AppContainer>
        <View style={styles.centered}>
          <AppText style={styles.muted}>Checking access...</AppText>
        </View>
      </AppContainer>
    );
  }

  if (!authorized) {
    return (
      <AppContainer>
        <View style={styles.topBar}>
          <NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
        </View>
        <AppText variant="title" style={styles.title}>Access Restricted</AppText>
        <AppText style={styles.muted}>
          Your account role ({user?.role ?? 'guest'}) does not have permission to view OTM logs.
        </AppText>
      </AppContainer>
    );
  }

  const displayed = levelFilter
    ? entries.filter((e) => e.level === levelFilter)
    : entries;

  return (
    <AppContainer>
      <View style={styles.topBar}>
        <NavigationButton onPress={() => router.push('/mainPage')}>Back to Map</NavigationButton>
      </View>

      <AppText variant="title" style={styles.title}>OTM Interaction Log</AppText>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {LEVEL_FILTERS.map((lvl) => (
            <TouchableOpacity
              key={lvl ?? 'all'}
              style={[styles.filterChip, levelFilter === lvl && styles.filterChipActive]}
              onPress={() => setLevelFilter(lvl)}
              activeOpacity={0.8}
            >
              <AppText style={[styles.filterChipText, levelFilter === lvl && styles.filterChipTextActive]}>
                {lvl ? LEVEL_META[lvl].label : 'ALL'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.liveChip, isLive && styles.liveChipActive]}
          onPress={() => setIsLive((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
          <AppText style={[styles.liveChipText, isLive && styles.liveChipTextActive]}>
            {isLive ? 'LIVE' : 'PAUSED'}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <AppText style={styles.muted}>
          {displayed.length} entries shown · {total} total captured
        </AppText>
        {lastUpdated ? (
          <AppText style={styles.muted}>
            Updated {lastUpdated.toLocaleTimeString(undefined, { hour12: false })}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      {isInitialLoad ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.Colours.primary} />
          <AppText style={styles.muted}>Loading logs...</AppText>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="text-box-search-outline" size={32} color={Theme.Colours.textMuted} />
          <AppText style={styles.muted}>No log entries yet.</AppText>
          <AppText style={styles.muted}>OTM interactions will appear here once the integration is active.</AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.logList}
          showsVerticalScrollIndicator={false}
          // Scroll to bottom automatically when new entries arrive
          onContentSizeChange={(_w, _h) => {}}
        >
          {[...displayed].reverse().map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </ScrollView>
      )}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: Theme.Spacing.medium,
  },
  title: {
    color: Theme.Colours.primary,
    marginBottom: Theme.Spacing.small,
  },
  muted: {
    color: Theme.Colours.textMuted,
    fontSize: 13,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#F4FBF3',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterChipActive: {
    backgroundColor: Theme.Colours.primary,
    borderColor: Theme.Colours.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#F4FBF3',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveChipActive: {
    borderColor: '#16a34a',
    backgroundColor: '#F0FBF1',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.Colours.textMuted,
  },
  liveDotActive: {
    backgroundColor: '#16a34a',
  },
  liveChipText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textMuted,
  },
  liveChipTextActive: {
    color: '#16a34a',
  },

  // Status
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  // Error
  errorCard: {
    borderRadius: Theme.Radius.medium,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.medium,
  },
  errorText: {
    color: '#8C2D04',
    fontSize: 13,
  },

  // Empty
  emptyCard: {
    borderRadius: Theme.Radius.medium,
    borderWidth: 1,
    borderColor: '#D7E4D4',
    backgroundColor: '#F9FCF9',
    padding: Theme.Spacing.large,
    alignItems: 'center',
    gap: 8,
  },

  // Log list
  logList: {
    flex: 1,
  },
  logRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8F0E8',
    backgroundColor: '#FAFCFA',
    marginBottom: 6,
    padding: 10,
  },
  logRowError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF8F8',
  },
  logRowWarn: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF0',
  },
  logRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  logTimestamp: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Theme.Colours.textMuted,
    minWidth: 80,
  },
  levelBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  logTextGroup: {
    flex: 1,
    gap: 1,
  },
  logScope: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Theme.Colours.textMuted,
  },
  logEvent: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Theme.Colours.textPrimary,
  },
  logMeta: {
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F1',
    padding: 8,
  },
  logMetaText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#2D4A30',
  },
});
