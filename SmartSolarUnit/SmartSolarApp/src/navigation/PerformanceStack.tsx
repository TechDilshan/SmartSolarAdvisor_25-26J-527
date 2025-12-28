import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerformanceScreen from '../screens/PerformanceScreen';
import DailyPerformanceScreen from '../screens/DailyPerformanceScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import Colors from '../constants/colors';

export type PerformanceStackParamList = {
  Performance: { id: string; title: string };
  Daily: undefined;
  Monthly: undefined;
};

const Stack = createStackNavigator<PerformanceStackParamList>();

export default function PerformanceStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
      }}
    >
      <Stack.Screen 
        name="Performance" 
        component={PerformanceScreen} 
        options={({ route }) => ({ title: route.params?.title || 'Performance' })}
      />
      <Stack.Screen name="Daily" component={DailyPerformanceScreen} options={{ title: 'Daily Performance' }} />
      <Stack.Screen name="Monthly" component={MonthlySummaryScreen} options={{ title: 'Monthly Summary' }} />
    </Stack.Navigator>
  );
}