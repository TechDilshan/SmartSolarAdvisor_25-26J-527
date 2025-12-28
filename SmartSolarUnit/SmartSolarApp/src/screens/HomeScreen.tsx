import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, AlertCircle, Sun } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { mockSolarSystems } from '../mocks/solarSystems';
import { SolarSystem } from '../types';
import Colors from '../constants/colors';

export default function HomeScreen() {  
  const navigation = useNavigation<any>();

  const renderSystemCard = (system: SolarSystem) => {
    const isOnline = system.status === 'running';
    return (
      <TouchableOpacity
        key={system.id}
        style={styles.card}
        onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Sun size={24} color={Colors.solarOrange} />
            <Text style={styles.cardTitle}>{system.siteName}</Text>
          </View>
          <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusText}>{isOnline ? 'Running' : 'Completed'}</Text>
          </View>
        </View>
        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Capacity</Text>
            <Text style={styles.statValue}>{system.systemCapacity} kW</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Panels</Text>
            <Text style={styles.statValue}>{system.panelCount}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Inverter</Text>
            <Text style={styles.statValue}>{system.inverterCapacity} kW</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Activity size={14} color={Colors.textSecondary} />
          <Text style={styles.lastUpdated}>
            Updated {system.lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName } })}
        >
          <Text style={styles.viewButtonText}>View Live Performance</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Solar Systems</Text>
        <Text style={styles.subtitle}>{mockSolarSystems.length} installations</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mockSolarSystems.length > 0 ? (
          mockSolarSystems.map(renderSystemCard)
        ) : (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No solar systems found</Text>
            <Text style={styles.emptyText}>
              Your assigned solar installations will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOnline: {
    backgroundColor: '#DCFCE7',
  },
  statusOffline: {
    backgroundColor: Colors.lightGray,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: Colors.success,
  },
  dotOffline: {
    backgroundColor: Colors.gray,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewButton: {
    backgroundColor: Colors.solarOrange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});