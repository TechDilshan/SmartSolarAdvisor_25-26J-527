import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, MapPin, LogOut, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import Colors from '../constants/colors';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();

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

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={Colors.white} />
          ) : (
            <HamburgerIcon size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={48} color={Colors.white} />
          </View>
          <Text style={styles.name}>{user.customerName || user.email}</Text>
          <Text style={styles.role}>Solar System Owner</Text>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Mail size={20} color={Colors.solarOrange} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
          {user.customerName && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <MapPin size={20} color={Colors.solarOrange} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Customer Name</Text>
                  <Text style={styles.infoValue}>{user.customerName}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
});