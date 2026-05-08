import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { AppTouchableOpacity as TouchableOpacity } from './AppTouchableOpacity';
import { Theme } from '@/styles/theme';
import { Layout } from '@/styles/layout';
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
  const { width } = useWindowDimensions();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const useCompactMenu = width < 760;

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
    setIsMenuOpen(false);

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

  const handleNavigate = (route: (typeof BASE_NAV_ITEMS)[number]['route']) => {
    setIsMenuOpen(false);
    router.push(route);
  };

  return (
    <View style={[styles.wrapper, useCompactMenu && styles.wrapperCompact]}>
      <View style={styles.brand}>
        <Image source={require('@/assets/images/tree_icon.png')} style={styles.logo} />
        <AppText style={styles.brandText}>TreeGuardians</AppText>
      </View>

      {username && !useCompactMenu ? (
        <View style={styles.sessionStatus}>
          <AppText style={styles.sessionStatusText} numberOfLines={1}>
            {`Logged in as ${username}`}
          </AppText>
        </View>
      ) : null}

      {useCompactMenu ? (
        <View style={styles.compactMenuWrap}>
          <TouchableOpacity
            onPress={() => setIsMenuOpen((current) => !current)}
            style={styles.menuButton}
            activeOpacity={0.84}
          >
            <Ionicons
              name={isMenuOpen ? 'close-outline' : 'menu-outline'}
              size={24}
              color={Theme.Colours.primary}
            />
          </TouchableOpacity>

          {isMenuOpen ? (
            <View style={styles.menuDropdown}>
              {username ? (
                <View style={styles.menuSessionPill}>
                  <AppText style={styles.menuSessionText} numberOfLines={1}>
                    {`Logged in as ${username}`}
                  </AppText>
                </View>
              ) : null}

              {navItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handleNavigate(item.route)}
                style={styles.menuItem}
                activeOpacity={0.82}
                >
                  <AppText style={styles.menuItemText}>{item.label}</AppText>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => {
                  void handleAuthAction();
                }}
                style={[
                  styles.menuAuthButton,
                  Platform.OS === 'android' && styles.primaryNavActionAndroid,
                  Platform.OS === 'android' && Layout.androidFlatSurface,
                ]}
                activeOpacity={0.84}
              >
                <View style={styles.signInContent}>
                  <Ionicons
                    name={isLoggedIn ? 'log-out-outline' : 'person-outline'}
                    size={16}
                    color={Theme.Colours.white}
                  />
                  <AppText style={styles.signInText}>{isLoggedIn ? 'Sign Out' : 'Sign In'}</AppText>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : (
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
                onPress={() => handleNavigate(item.route)}
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
              style={[
                styles.signInButton,
                Platform.OS === 'android' && styles.primaryNavActionAndroid,
                Platform.OS === 'android' && Layout.androidFlatSurface,
              ]}
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
      )}
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
  wrapperCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 320,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.Spacing.medium,
    flexShrink: 0,
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
    minWidth: 0,
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
  primaryNavActionAndroid: {
    backgroundColor: Theme.Colours.primary,
    borderColor: '#CFE3CF',
    borderTopColor: '#EEF7EE',
    overflow: 'hidden',
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
  compactMenuWrap: {
    marginLeft: 'auto',
    position: 'relative',
    zIndex: 330,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    minWidth: 210,
    maxWidth: 280,
    padding: 8,
    gap: 6,
    borderRadius: Theme.Radius.card,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    shadowColor: '#1B3A1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 340,
  },
  menuSessionPill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  menuSessionText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
  },
  menuItemText: {
    color: Theme.Colours.textPrimary,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  menuAuthButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Theme.Colours.primary,
    alignItems: 'center',
    shadowColor: Theme.Colours.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
});
