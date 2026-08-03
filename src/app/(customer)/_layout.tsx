import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Brand } from '../../constants/theme'

// แท็บลายเป็น 3 ปุ่มตามมั่นตาม: สั่งซัก ✓ / รายการ ☰ / โปรไฟล์ 👤 บนพื้น teal
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Brand.white,
        tabBarStyle: {
          backgroundColor: Brand.primary,
          borderTopWidth: 0,
          height: 64,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="packages"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="☰" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />

      <Tabs.Screen name="select" options={{ href: null }} />
      <Tabs.Screen name="summary" options={{ href: null }} />
      <Tabs.Screen name="status" options={{ href: null }} />
      <Tabs.Screen name="order-detail" options={{ href: null }} />
      <Tabs.Screen name="delivery-photos" options={{ href: null }} />
      <Tabs.Screen name="coins" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="add-address" options={{ href: null }} />
    </Tabs>
  )
}
