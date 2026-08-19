import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#E8543F' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'גילוי',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'מפה',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'צאטים',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
