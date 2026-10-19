import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { PrimaryButton } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

/** Shown for any route that does not exist — on web this is the static 404. */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={s.container}>
        <Text style={s.title} accessibilityRole="header">
          This screen doesn&apos;t exist.
        </Text>
        <Text style={s.body}>The link you followed may be out of date.</Text>
        <PrimaryButton
          label="Go to Today"
          onPress={() => router.replace('/')}
          accessibilityHint="Returns to your Today screen"
          style={s.action}
        />
      </View>
    </>
  );
}

const container: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: 24,
  backgroundColor: T.bg,
};
const title: TextStyle = {
  fontSize: 22,
  fontWeight: '800',
  color: T.ink,
  textAlign: 'center',
  letterSpacing: -0.4,
};
const body: TextStyle = { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 };
const action: ViewStyle = { marginTop: 14, alignSelf: 'center' };

const s = StyleSheet.create({ container, title, body, action });
