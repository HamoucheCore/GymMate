import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { GymMateProvider, useGym } from '@/lib/gymmate/store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Anchor the root stack to the tabs so any deep link keeps a back path.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Cross-fade away from the splash instead of the default hard cut.
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [loaded, error] = useFonts({
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Medium': require('../assets/fonts/JetBrainsMono-Medium.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={DarkTheme}>
      {/* Dark-only product: keep system chrome (status bar) light-on-dark app-wide. */}
      <StatusBar style="light" />
      <GymMateProvider>
        <RouteGate>
          <Stack screenOptions={{ contentStyle: { backgroundColor: T.bg } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="nutrition" options={{ headerShown: false }} />
          </Stack>
        </RouteGate>
      </GymMateProvider>
    </ThemeProvider>
  );
}

/**
 * Decides the first screen a launch should show, and only lifts the splash
 * once the decision has landed.
 *
 * - Before hydration it renders nothing, so the native splash stays up and no
 *   empty Today screen (or onboarding flash) is ever visible.
 * - A profile-less install is sent to `/onboarding`; a profiled install that is
 *   sitting on `/onboarding` is sent back to the tabs — unless the flow is in
 *   edit mode (`?edit=1`), which is left entirely to the flow.
 * - The splash is hidden once fonts (guaranteed above) and hydration are both
 *   ready *and* the route has settled, so there is never a wrong-route flash.
 * - Between hydration and that settle, an opaque, *touch-blocking* barricade
 *   covers the tree so the wrong screen can neither be seen nor tapped.
 */
function RouteGate({ children }: { children: ReactNode }) {
  const { state } = useGym();
  const router = useRouter();
  const segments = useSegments();
  const { edit } = useGlobalSearchParams<{ edit?: string }>();

  const inOnboarding = segments[0] === 'onboarding';
  const editing = edit === '1';

  useEffect(() => {
    if (!state.hydrated) return;

    if (!state.profile && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (state.profile && inOnboarding && !editing) {
      router.replace('/(tabs)');
    }
  }, [state.hydrated, state.profile, inOnboarding, editing, router]);

  const settled = state.hydrated && (state.profile !== null || inOnboarding);

  useEffect(() => {
    if (settled) {
      SplashScreen.hideAsync().catch(() => {
        // Hiding is best-effort; never block the UI on it.
      });
    }
  }, [settled]);

  if (!state.hydrated) {
    return null;
  }

  return (
    <>
      {children}
      {settled ? null : <View style={s.barricade} />}
    </>
  );
}

const s = StyleSheet.create({
  barricade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.bg,
  },
});
