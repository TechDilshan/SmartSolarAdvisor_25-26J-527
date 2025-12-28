import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity as ActivityIcon, AlertCircle, Sun, Zap, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSolarSites, usePredictionData, useDailyEnergy30Days } from '../hooks/useBackendAPI';
import { CandleChart } from '../components/Charts';
import { SolarSystem } from '../types';
import Colors from '../constants/colors';

export default function HomeScreen() {  
  const navigation = useNavigation<any>();
  const { sites, loading, error, refetch } = useSolarSites(5000); // Poll every 5 seconds
  
  // Get first site for summary and chart (or aggregate all sites)
  const firstSite = sites.length > 0 ? sites[0] : null;
  const { dailyTotal, monthlyTotal } = usePredictionData(
    firstSite?.customerName || null,
    firstSite?.id || null,
    10000
  );
  
  const { dailyData: dailyEnergy30Days, loading: chartLoading } = useDailyEnergy30Days(
    firstSite?.customerName || null,
    firstSite?.id || null,
    30
  );
  
  const chartData = useMemo(() => {
    return dailyEnergy30Days.map(item => ({
      label: item.label,
      value: item.totalKwh,
    }));
  }, [dailyEnergy30Days]);

  const renderSystemCard = (system: SolarSystem) => {
    const isOnline = system.status === 'running';
    return (
      <TouchableOpacity
        key={system.id}
        style={styles.card}
        onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName, customerName: system.customerName } })}
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
          <ActivityIcon size={14} color={Colors.textSecondary} />
          <Text style={styles.lastUpdated}>
            Updated {system.lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName, customerName: system.customerName } })}
        >
          <Text style={styles.viewButtonText}>View Live Performance</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading && sites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Solar Systems</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.solarOrange} />
          <Text style={styles.loadingText}>Loading your solar systems...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Solar Systems</Text>
        <Text style={styles.subtitle}>{sites.length} installation{sites.length !== 1 ? 's' : ''}</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && sites.length > 0}
            onRefresh={refetch}
            tintColor={Colors.solarOrange}
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Energy Summary Cards */}
        {sites.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Zap size={24} color={Colors.solarOrange} />
              <Text style={styles.summaryLabel}>Today's Predicted Energy</Text>
              <Text style={styles.summaryValue}>{dailyTotal.toFixed(2)}</Text>
              <Text style={styles.summaryUnit}>kWh</Text>
            </View>
            <View style={styles.summaryCard}>
              <TrendingUp size={24} color={Colors.success} />
              <Text style={styles.summaryLabel}>Monthly Predicted Energy</Text>
              <Text style={styles.summaryValue}>{monthlyTotal.toFixed(2)}</Text>
              <Text style={styles.summaryUnit}>kWh</Text>
            </View>
          </View>
        )}
        
        {/* 30-Day Energy Chart */}
        {sites.length > 0 && chartData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Daily Energy Generation (Last 30 Days)</Text>
            <View style={styles.chartContainer}>
              {chartLoading ? (
                <ActivityIndicator size="large" color={Colors.solarOrange} />
              ) : (
                <CandleChart data={chartData} height={250} color={Colors.solarOrange} />
              )}
            </View>
          </View>
        )}
        
        {sites.length > 0 ? (
          <>
            <Text style={styles.sitesTitle}>My Solar Systems</Text>
            {sites.map(renderSystemCard)}
          </>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No solar systems found</Text>
            <Text style={styles.emptyText}>
              Your assigned solar installations will appear here
            </Text>
          </View>
        ) : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
  errorContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.solarOrange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  summaryUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chartSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
  },
  sitesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
});
