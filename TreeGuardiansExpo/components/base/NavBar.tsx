import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Theme } from '@/styles/theme';

const NAV_ITEMS = [
  { label: 'Home', route: '/' },
  { label: 'Map', route: '/mainPage' },
  { label: 'About', route: '/about' },
  { label: 'Resources', route: '/resources' },
  { label: 'FAQs', route: '/faqs' },
  { label: 'Sign In', route: '/login' },
] as const;

export const NavBar = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.brand}>
        <Image source={require('@/assets/images/tree_icon.png')} style={styles.logo} />
        <AppText style={styles.brandText}>TreeGuardians</AppText>
      </View>

      <View style={styles.linksWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.linksRow}
          showsHorizontalScrollIndicator={false}
        >
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route)}
              style={item.label === 'Sign In' ? styles.signInButton : styles.linkButton}
              activeOpacity={0.8}
            >
              {item.label === 'Sign In' ? (
                <View style={styles.signInContent}>
                  <Ionicons name="person-outline" size={15} color={Theme.Colours.white} />
                  <AppText style={styles.signInText}>{item.label}</AppText>
                </View>
              ) : (
                <AppText style={styles.linkText}>{item.label}</AppText>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
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

