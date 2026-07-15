import React from 'react';
import { createStackNavigator }     from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets }        from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons }                 from '@expo/vector-icons';
import { LinearGradient }           from 'expo-linear-gradient';
import { BlurView }                 from 'expo-blur';

import { useAuth }           from '../context/AuthContext';
import { Colors }            from '../theme';

import LoginScreen           from '../screens/auth/LoginScreen';
import RegisterScreen        from '../screens/auth/RegisterScreen';
import DashboardScreen       from '../screens/main/DashboardScreen';
import InputMakananScreen    from '../screens/main/InputMakananScreen';
import TambahDataScreen      from '../screens/main/TambahDataScreen';
import LaporanScreen         from '../screens/main/LaporanScreen';
import ProfileScreen         from '../screens/main/ProfileScreen';
import WeightTrackerScreen   from '../screens/main/WeightTrackerScreen';
import WaterTrackerScreen    from '../screens/main/WaterTrackerScreen';
import AiChatScreen          from '../screens/main/AiChatScreen';
import EditProfileScreen     from '../screens/main/EditProfileScreen';
import MealTemplatesScreen   from '../screens/main/MealTemplatesScreen';
import StreakScreen          from '../screens/main/StreakScreen';
import BarcodeScannerScreen  from '../screens/main/BarcodeScannerScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── Hardcoded strings — tidak bergantung import ROUTES ──
// (Menghindari undefined jika ROUTES belum ter-load saat bundle)
const TAB_ICONS = {
  Dashboard:   { active: 'grid',          inactive: 'grid-outline'          },
  InputMakanan:{ active: 'restaurant',    inactive: 'restaurant-outline'    },
  Laporan:     { active: 'bar-chart',     inactive: 'bar-chart-outline'     },
  Profil:      { active: 'person-circle', inactive: 'person-circle-outline' },
};

// ─── Tab Navigator ────────────────────────────────────
// ─── Custom Tab Bar ──────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  const TABS = [
    { name: 'Dashboard',    label: 'Beranda', active: 'grid',          inactive: 'grid-outline'          },
    { name: 'InputMakanan', label: 'Input',   active: 'restaurant',    inactive: 'restaurant-outline'    },
    { name: 'Laporan',      label: 'Laporan', active: 'bar-chart',     inactive: 'bar-chart-outline'     },
    { name: 'Profil',       label: 'Profil',  active: 'person-circle', inactive: 'person-circle-outline' },
  ];

  return (
    <View style={[tabSt.wrapper, { paddingBottom: bottomPad }]}>
      <View style={tabSt.shadowBox}>
      <BlurView intensity={60} tint="light" style={tabSt.blur}>
        <LinearGradient
          colors={['rgba(255,255,255,0.92)', 'rgba(240,253,244,0.96)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={tabSt.gradient}
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const tab = TABS[index];
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            return (
              <View key={route.key} style={tabSt.tabItem}>
                <View
                  style={[tabSt.tabBtn, focused && tabSt.tabBtnActive]}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={onPress}
                >
                  {focused && (
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={tabSt.activePill}
                    />
                  )}
                  <Ionicons
                    name={focused ? tab.active : tab.inactive}
                    size={focused ? 18 : 17}
                    color={focused ? '#FFFFFF' : '#94A3B8'}
                  />
                </View>
                <View style={tabSt.labelRow}>
                  <View style={[tabSt.dot, focused && tabSt.dotActive]} />
                </View>
              </View>
            );
          })}
        </LinearGradient>
      </BlurView>
      </View>
    </View>
  );
}

const tabSt = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  blur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.80)',
  },

  /* ── 12-layer realistic shadow (seperti KaloriCard) ── */
  shadowBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 24,
    // iOS: shadow merata semua sisi
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    // Android: pakai outline border tipis gelap untuk simulasi shadow merata
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    backgroundColor: 'transparent',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    shadowColor: 'rgba(34,197,94,0.40)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
  },
  labelRow: {
    height: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: '#22C55E',
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ title: 'Beranda' }} />
      <Tab.Screen name="InputMakanan" component={InputMakananScreen} options={{ title: 'Input'   }} />
      <Tab.Screen name="Laporan"      component={LaporanScreen}      options={{ title: 'Laporan' }} />
      <Tab.Screen name="Profil"       component={ProfileScreen}      options={{ title: 'Profil'  }} />
    </Tab.Navigator>
  );
}

// ─── Auth Stack ───────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen}    />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Main Stack ───────────────────────────────────────
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"           component={MainTabs}            />
      <Stack.Screen name="TambahData"     component={TambahDataScreen}    />
      <Stack.Screen name="WeightTracker"  component={WeightTrackerScreen} />
      <Stack.Screen name="WaterTracker"   component={WaterTrackerScreen}  />
      <Stack.Screen name="AiChat"         component={AiChatScreen}        />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen}   />
      <Stack.Screen name="MealTemplates"  component={MealTemplatesScreen} />
      <Stack.Screen name="Streak"         component={StreakScreen}         />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen}/>
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoggedIn, isReady } = useAuth();

  // Tampilkan loading selama:
  // 1. isReady false  → AsyncStorage restore belum selesai (token belum di-set ke Axios)
  // 2. isLoggedIn null → state awal sebelum restore
  // Tanpa ini, DashboardScreen mount sebelum token ada → 401
  if (!isReady || isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return isLoggedIn ? <MainStack /> : <AuthStack />;
}