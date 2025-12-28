import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, MapPin, LogOut, X, Sun, Moon, Settings } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { databaseService } from '../services/database';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const loadProfilePicture = async () => {
    if (user?.id) {
      const picture = await databaseService.getProfilePicture(user.id);
      setProfilePicture(picture);
    }
  };

  useEffect(() => {
    loadProfilePicture();
  }, [user]);

  // Reload profile picture when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfilePicture();
    }, [user])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.title, { color: theme.colors.white }]}>Profile</Text>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={theme.colors.white} />
          ) : (
            <HamburgerIcon size={24} color={theme.colors.white} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {profilePicture ? (
            <Image 
              source={{ uri: profilePicture }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <User size={48} color={theme.colors.white} />
            </View>
          )}
          <Text style={[styles.name, { color: theme.colors.text }]}>{user.customerName || user.email}</Text>
          <Text style={[styles.role, { color: theme.colors.textSecondary }]}>Solar System Owner</Text>
        </View>

        {/* Settings Button */}
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={handleSettingsPress}
        >
          <Settings size={20} color={theme.colors.solarOrange} />
          <Text style={[styles.settingsText, { color: theme.colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
              <Mail size={20} color={theme.colors.solarOrange} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user.email}</Text>
            </View>
          </View>
          {user.customerName && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
                  <MapPin size={20} color={theme.colors.solarOrange} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Customer Name</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user.customerName}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Theme Toggle Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.lightGray }]}>
              {isDark ? (
                <Moon size={20} color={theme.colors.primary} />
              ) : (
                <Sun size={20} color={theme.colors.solarOrange} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Theme</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.solarOrange }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.danger }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.danger} />
          <Text style={[styles.logoutText, { color: theme.colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});