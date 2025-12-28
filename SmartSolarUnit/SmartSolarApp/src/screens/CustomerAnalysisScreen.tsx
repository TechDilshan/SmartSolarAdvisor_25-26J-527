import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Zap, Sun, AlertCircle, Activity, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSolarSites, usePredictionData, useDailyEnergy30Days } from '../hooks/useBackendAPI';
import { CandleChart } from '../components/Charts';
import Colors from '../constants/colors';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';

export default function CustomerAnalysisScreen() {
  const { user } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { sites, loading, error, refetch } = useSolarSites(10000);

  // Calculate aggregated statistics across all sites
  const aggregatedStats = useMemo(() => {
    let totalCapacity = 0;
    let totalPanels = 0;
    let totalInverters = 0;
    let activeSites = 0;
    let completedSites = 0;

    sites.forEach((site) => {
      totalCapacity += site.systemCapacity;
      totalPanels += site.panelCount;
      totalInverters += site.inverterCapacity;
      if (site.status === 'running') {
        activeSites++;
      } else {
        completedSites++;
      }
    });

    return {
      totalCapacity,
      totalPanels,
      totalInverters,
      activeSites,
      completedSites,
      totalSites: sites.length,
    };
  }, [sites]);

  // Get first site for summary data (or aggregate if needed)
  const firstSite = sites.length > 0 ? sites[0] : null;
  const { dailyTotal, monthlyTotal } = usePredictionData(
    firstSite?.customerName || null,
    firstSite?.id || null,
    15000
  );

  // Get 30-day chart data
  const startDate = firstSite?.created_at || null;
  const { dailyData: dailyEnergy30Days, loading: chartLoading } = useDailyEnergy30Days(
    firstSite?.customerName || null,
    firstSite?.id || null,
    30,
    startDate
  );

  const chartData = useMemo(() => {
    return dailyEnergy30Days.map(item => ({
      label: item.label,
      value: item.totalKwh,
    }));
  }, [dailyEnergy30Days]);

  // Calculate average daily energy
  const averageDailyEnergy = useMemo(() => {
    if (dailyEnergy30Days.length === 0) return 0;
    const total = dailyEnergy30Days.reduce((sum, item) => sum + item.totalKwh, 0);
    return total / dailyEnergy30Days.length;
  }, [dailyEnergy30Days]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (aggregatedStats.totalCapacity === 0) {
      return {
        avgEfficiency: 0,
        peakDay: 0,
        avgMonthlyProjection: monthlyTotal,
      };
    }

    // Estimate efficiency (kWh per kW capacity)
    const avgEfficiency = dailyTotal / aggregatedStats.totalCapacity;
    
    // Find peak day from chart data
    const peakDay = Math.max(...dailyEnergy30Days.map(item => item.totalKwh), 0);

    return {
      avgEfficiency: avgEfficiency || 0,
      peakDay,
      avgMonthlyProjection: monthlyTotal,
    };
  }, [dailyTotal, aggregatedStats.totalCapacity, dailyEnergy30Days, monthlyTotal]);

  if (loading && sites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Customer Analysis</Text>
          <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
            {isOpen ? (
              <X size={24} color={Colors.white} />
            ) : (
              <HamburgerIcon size={24} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.solarOrange} />
          <Text style={styles.loadingText}>Loading analysis data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Customer Analysis</Text>
          <Text style={styles.subtitle}>{user?.customerName || user?.email || 'Customer'}</Text>
        </View>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={Colors.white} />
          ) : (
            <HamburgerIcon size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
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
          </View>
        )}

        {/* Customer Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Activity size={24} color={Colors.solarOrange} />
              <Text style={styles.cardTitle}>Overview</Text>
            </View>
          </View>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Total Systems</Text>
              <Text style={styles.overviewValue}>{aggregatedStats.totalSites}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Active Systems</Text>
              <Text style={[styles.overviewValue, styles.activeValue]}>{aggregatedStats.activeSites}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Total Capacity</Text>
              <Text style={styles.overviewValue}>{aggregatedStats.totalCapacity.toFixed(1)} kW</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Total Panels</Text>
              <Text style={styles.overviewValue}>{aggregatedStats.totalPanels}</Text>
            </View>
          </View>
        </View>

        {/* Energy Statistics */}
        {sites.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Zap size={28} color={Colors.solarOrange} />
              <Text style={styles.statLabel}>Today's Energy</Text>
              <Text style={styles.statValue}>{dailyTotal.toFixed(2)}</Text>
              <Text style={styles.statUnit}>kWh</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={28} color={Colors.success} />
              <Text style={styles.statLabel}>Monthly Energy</Text>
              <Text style={styles.statValue}>{monthlyTotal.toFixed(2)}</Text>
              <Text style={styles.statUnit}>kWh</Text>
            </View>
          </View>
        )}

        {/* Performance Metrics */}
        {sites.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <BarChart3 size={24} color={Colors.solarOrange} />
                <Text style={styles.cardTitle}>Performance Metrics</Text>
              </View>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Avg Daily Energy</Text>
                <Text style={styles.metricValue}>{averageDailyEnergy.toFixed(2)}</Text>
                <Text style={styles.metricUnit}>kWh/day</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Peak Day</Text>
                <Text style={styles.metricValue}>{performanceMetrics.peakDay.toFixed(2)}</Text>
                <Text style={styles.metricUnit}>kWh</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>System Efficiency</Text>
                <Text style={styles.metricValue}>{performanceMetrics.avgEfficiency.toFixed(2)}</Text>
                <Text style={styles.metricUnit}>kWh/kW</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Monthly Projection</Text>
                <Text style={styles.metricValue}>{performanceMetrics.avgMonthlyProjection.toFixed(0)}</Text>
                <Text style={styles.metricUnit}>kWh</Text>
              </View>
            </View>
          </View>
        )}

        {/* 30-Day Energy Chart */}
        {sites.length > 0 && chartData.length > 0 && (
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Sun size={24} color={Colors.solarOrange} />
              <Text style={styles.chartTitle}>Energy Generation Trend (30 Days)</Text>
            </View>
            <View style={styles.chartContainer}>
              {chartLoading ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator size="large" color={Colors.solarOrange} />
                </View>
              ) : (
                <CandleChart data={chartData} height={250} color={Colors.solarOrange} />
              )}
            </View>
          </View>
        )}

        {/* System Status Summary */}
        {sites.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Sun size={24} color={Colors.solarOrange} />
                <Text style={styles.cardTitle}>System Status</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, styles.statusOnline]} />
                  <Text style={styles.statusLabel}>Active Systems</Text>
                  <Text style={styles.statusValue}>{aggregatedStats.activeSites}</Text>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, styles.statusOffline]} />
                  <Text style={styles.statusLabel}>Completed Systems</Text>
                  <Text style={styles.statusValue}>{aggregatedStats.completedSites}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Total Inverter Capacity</Text>
                  <Text style={styles.statusValue}>{aggregatedStats.totalInverters.toFixed(1)} kW</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {sites.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No data available</Text>
            <Text style={styles.emptyText}>
              Customer analysis will appear here once solar systems are configured
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  headerTextContainer: {
    flex: 1,
  },
  menuButton: {
    padding: 4,
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
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  activeValue: {
    color: Colors.success,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
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
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  chartSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  chartContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  chartLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusOnline: {
    backgroundColor: Colors.success,
  },
  statusOffline: {
    backgroundColor: Colors.gray,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
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

