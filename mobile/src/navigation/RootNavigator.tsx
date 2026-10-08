import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ProjectDetailScreen } from '../screens/projects/ProjectDetailScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading Taskline..." />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: Colors.textPrimary,
        },
        headerTintColor: Colors.primary,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProjectDetail"
            component={ProjectDetailScreen}
            options={({ route }) => ({
              title: route.params?.projectName || 'Project Details',
            })}
          />
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={({ route }) => ({
              title: route.params?.taskTitle || 'Task Details',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
