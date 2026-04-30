import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles/theme';
import { getCurrentUser, logoutUser } from '@/utilities/authHelper';

const BASE_NAV_ITEMS = [
  { label: 'Home', route: '/' },
  { label: 'Map', route: '/mainPage' },
  { label: 'About', route: '/about' },
  { label: 'Resources', route: '/resources' },
  { label: 'FAQs', route: '/faqs' },
] as const;

const navScrollWebStyle = Platform.select({
  web: { overflowX: 'hidden' } as object,
  default: {},
});

export const NavBar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const user = await getCurrentUser();
      if (mounted) {
        setIsLoggedIn(Boolean(user));
        setUsername(user?.username ?? null);
      }
    };

    void loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = useMemo(
    () => BASE_NAV_ITEMS.filter((item) => !(isLoggedIn && item.label === 'Home')),
    [isLoggedIn],
  );

  const handleAuthAction = async () => {
    if (isLoggedIn) {
      const didLogout = await logoutUser();
      if (didLogout) {
        setIsLoggedIn(false);
        setUsername(null);
        router.replace('/');
      }
      return;
    }

    router.push('/login');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.brand}>
        <Image source={require('@/assets/images/tree_icon.png')} style={styles.logo} />
        <AppText style={styles.brandText}>TreeGuardians</AppText>
      </View>

      <View style={styles.sessionStatus}>
        <AppText style={styles.sessionStatusText} numberOfLines={1}>
          {username ? `Logged in as ${username}` : 'Browsing as Guest'}
        </AppText>
      </View>

      <View style={styles.linksWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.linksRow}
          showsHorizontalScrollIndicator={false}
          style={navScrollWebStyle}
        >
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route)}
              style={styles.linkButton}
              activeOpacity={0.8}
            >
              <AppText style={styles.linkText}>{item.label}</AppText>
            </TouchableOpacity>
          ))}          

          <TouchableOpacity
            onPress={() => {
              void handleAuthAction();
            }}
            style={styles.signInButton}
            activeOpacity={0.8}
          >
            <View style={styles.signInContent}>
              <Ionicons
                name={isLoggedIn ? 'log-out-outline' : 'person-outline'}
                size={15}
                color={Theme.Colours.white}
              />
              <AppText style={styles.signInText}>{isLoggedIn ? 'Sign Out' : 'Sign In'}</AppText>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: Theme.Radius.card,
    marginTop: Theme.Spacing.small,
    marginHorizontal: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.small,
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
    shadowColor: '#1B3A1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    zIndex: 50,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.Spacing.medium,
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: Theme.Spacing.small,
  },
  brandText: {
    color: Theme.Colours.textPrimary,
    fontSize: 16,
  },
  sessionStatus: {
    position: 'absolute',
    left: '35%',
    right: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  sessionStatusText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  linksWrapper: {
    flex: 1,
  },
  linksRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Theme.Spacing.small,
    flexGrow: 1,
  },
  linkButton: {
    paddingVertical: Theme.Spacing.extraSmall,
    paddingHorizontal: Theme.Spacing.small,
    borderRadius: Theme.Radius.small,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  linkText: {
    color: Theme.Colours.textPrimary,
    fontSize: 14,
  },
  signInButton: {
    paddingVertical: Theme.Spacing.extraSmall,
    paddingHorizontal: Theme.Spacing.medium,
    borderRadius: Theme.Radius.medium,
    backgroundColor: Theme.Colours.primary,
    shadowColor: Theme.Colours.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signInText: {
    color: Theme.Colours.white,
    fontSize: 14,
  },
});
