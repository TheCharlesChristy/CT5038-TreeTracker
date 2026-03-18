import React from "react";
import { View, StyleSheet } from "react-native";
import { AppButton } from "./AppButton";
import { Theme } from "@/styles";
import { router } from "expo-router";

type UserRole = 'registered_user' | 'guardian' | 'admin';

interface RoleDashboardProps {
  role?: UserRole;
  onClose: () => void;
  onLogout: () => void;
}

export default function RoleDashboard({ role, onClose, onLogout }: RoleDashboardProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>

        {/* Always visible */}
        <AppButton
          title="Manage Profile"
          variant="primary"
          onPress={() => {
            onClose();
            router.push("/");
          }}
        />

        {/* Guardian */}
        {role === "guardian" && (
          <AppButton
            title="My Trees"
            variant="accent"
            onPress={() => {
              onClose();
              router.push("/");
            }}
          />
        )}

        {/* Admin */}
        {role === "admin" && (
          <AppButton
            title="Manage Users"
            variant="accent"
            onPress={() => {
              onClose();
              router.push("/");
            }}
          />
        )}

        <AppButton
          title="Logout"
          variant="secondary"
          onPress={() => {
            onClose();
            onLogout();
          }}
        />

          {/* Close Button */}
        <AppButton
          title="Close"
          variant="secondary"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },

  card: {
    width: "85%",
    maxWidth: 420,
    borderRadius: Theme.Border.medium,
    padding: 20,
  },

  closeButton: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 10,
  },
});