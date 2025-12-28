import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { TrendingUp, Zap, Calendar } from 'lucide-react-native';
import { LineChart } from '../components/Charts';
import { mockSolarSystems } from '../mocks/solarSystems';
import Colors from '../constants/colors';

export default function MonthlySummaryScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const system = mockSolarSystems.find(s => s.id === id);
 
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const dailyData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const energy = Math.random() * 30 + 40;
      return {
        date: day,
        energy: parseFloat(energy.toFixed(2)),
      };
    });
  }, [daysInMonth]);

  const totalEnergy = useMemo(() => {
    return dailyData.reduce((sum, item) => sum + item.energy, 0);
  }, [dailyData]);

  const averageDaily = useMemo(() => {
    return totalEnergy / dailyData.length;
  }, [totalEnergy, dailyData.length]);

  const chartData = dailyData.map(item => ({
    x: item.date,
    y: item.energy,
  }));

  if (!system) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>System not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.monthBadge}>
            <Calendar size={20} color={Colors.white} />
            <Text style={styles.monthText}>{currentMonth}</Text>
          </View>
        </View>
        <View style={styles.totalCard}>
          <TrendingUp size={32} color={Colors.success} />
          <Text style={styles.totalLabel}>Total Energy This Month</Text>
          <Text style={styles.totalValue}>{totalEnergy.toFixed(2)}</Text>
          <Text style={styles.totalUnit}>kWh</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Zap size={24} color={Colors.solarOrange} />
            <Text style={styles.statLabel}>Daily Average</Text>
            <Text style={styles.statValue}>{averageDaily.toFixed(2)} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.success} />
            <Text style={styles.statLabel}>Best Day</Text>
            <Text style={styles.statValue}>
              {Math.max(...dailyData.map(d => d.energy)).toFixed(2)} kWh
            </Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Performance Trend</Text>
          <View style={styles.chartContainer}>
            <LineChart data={chartData} height={300} color={Colors.solarOrange} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Consistent Production</Text>
            <Text style={styles.insightText}>
              Your solar system is performing well with an average of {averageDaily.toFixed(1)} kWh per day.
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Monthly Projection</Text>
            <Text style={styles.insightText}>
              Based on current trends, you're on track to generate approximately {(totalEnergy / currentDate.getDate() * daysInMonth).toFixed(0)} kWh this month.
            </Text>
          </View>
        </View>
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
    alignItems: 'center',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.white,
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
    marginTop: 12,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
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
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
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
  insightCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});