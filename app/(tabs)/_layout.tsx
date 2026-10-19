import { Tabs } from 'expo-router';
import { Icons, ICON_STROKE } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: { backgroundColor: T.bg, borderTopColor: T.line },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Icons.tabToday color={color} size={size} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <Icons.tabPlan color={color} size={size} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="cardio"
        options={{
          title: 'Cardio',
          tabBarIcon: ({ color, size }) => (
            <Icons.tabCardio color={color} size={size} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Icons.tabProgress color={color} size={size} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => (
            <Icons.tabYou color={color} size={size} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
    </Tabs>
  );
}
