export const Colors = {
  bg: "#F4F7F6",
  bgSecondary: "#EEF2F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F5F2",
  primary: "#16A34A",
  primaryDark: "#15803D",
  primaryLight: "#DCFCE7",
  primaryMuted: "#BBF7D0",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  success: "#10B981",
  successLight: "#ECFDF5",
  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  textInverse: "#FFFFFF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  divider: "#F1F5F2",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.4)",
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h3: { fontSize: 18, fontWeight: "700", color: Colors.text },
  h4: { fontSize: 16, fontWeight: "600", color: Colors.text },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  bodyBold: { fontSize: 14, fontWeight: "600", color: Colors.text },
  small: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  caption: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  number: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
};
