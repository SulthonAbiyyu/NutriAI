import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../theme";

export default function ScreenWrapper({
  children,
  scroll = false,
  refreshing = false,
  onRefresh,
  padHorizontal = true,
  style,
  contentStyle,
}) {
  const insets = useSafeAreaInsets();

  const baseStyle = [styles.container, { paddingTop: insets.top }, style];

  const contentContainer = [
    padHorizontal && styles.padH,
    { paddingBottom: insets.bottom + Spacing.lg },
    contentStyle,
  ];

  if (scroll) {
    return (
      <View style={baseStyle}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.bg}
          translucent
        />
        <ScrollView
          style={{ flex: 1, backgroundColor: Colors.bg }}
          contentContainerStyle={contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[baseStyle, padHorizontal && styles.padH]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.bg}
        translucent
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  padH: {
    paddingHorizontal: Spacing.md,
  },
});
