import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';
import { BarChart } from '../components/Charts';
import { useSolarSite, useDailyPerformance } from '../hooks/useBackendAPI';
import Colors from '../constants/colors';

export default function DailyPerformanceScreen() {
  const route = useRoute<any>();
  const { id, customerName } = route.params || {};
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { site } = useSolarSite(id, 10000);
  const effectiveCustomerName = customerName || site?.customerName || null;

  const { hourlyData, totalEnergy, loading, error } = useDailyPerformance(
    effectiveCustomerName,
    id,
    selectedDate,
    30000 // Poll every 30 seconds
  );

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const chartData = hourlyData.map(item => ({
    x: item.hour,
    y: item.energy,
  }));

  const peakHour = hourlyData.length > 0
    ? hourlyData.reduce((max, item) => item.energy > max.energy ? item : max).hour
    : 0;
  const peakOutput = hourlyData.length > 0
    ? Math.max(...hourlyData.map(h => h.energy))
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(-1)}
            >
              <ChevronLeft size={24} color={Colors.white} />
            </TouchableOpacity>
           
            <View style={styles.dateInfo}>
              <Calendar size={20} color={Colors.solarOrange} />
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(1)}
            >
              <ChevronRight size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        {loading && hourlyData.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.solarOrange} />
            <Text style={styles.loadingText}>Loading daily performance...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Energy Generated</Text>
              <Text style={styles.totalValue}>{totalEnergy.toFixed(2)}</Text>
              <Text style={styles.totalUnit}>kWh</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hourly Breakdown</Text>
              <View style={styles.chartContainer}>
                <BarChart data={chartData} height={300} color={Colors.solarOrange} />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Peak Performance</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Peak Hour</Text>
                  <Text style={styles.statValue}>
                    {peakHour}:00
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Peak Output</Text>
                  <Text style={styles.statValue}>
                    {peakOutput.toFixed(2)} kWh
                  </Text>
                </View>
              </View>
            </View>
          </>
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
    backgroundColor: Colors.primary,
    padding: 20,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
  },
  totalCard: {
    margin: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.solarOrange,
    marginBottom: 4,
  },
  totalUnit: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
});
