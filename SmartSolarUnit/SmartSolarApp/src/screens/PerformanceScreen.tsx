import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Thermometer, Droplets, Wind, CloudRain, Sun, TrendingUp, Zap, Calendar, AlertCircle } from 'lucide-react-native';
import { LineChart } from '../components/Charts';
import { useSolarSite, useSensorData, usePredictionData } from '../hooks/useBackendAPI';
import { SensorData, PredictionData } from '../types';
import { useTheme } from '../contexts/ThemeContext';

type SensorType = 'irradiance' | 'temperature' | 'humidity' | 'dustLevel' | 'rainLevel';

export default function PerformanceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id, title, customerName } = route.params || {};
  const { colors } = useTheme();

  const { site, loading: siteLoading } = useSolarSite(id, 10000); // Poll every 10 seconds
  const { data: sensorData, loading: sensorLoading } = useSensorData(site?.deviceId || null, 5000); // Poll every 5 seconds
  const { data: predictions, dailyTotal, monthlyTotal, loading: predictionLoading } = usePredictionData(
    customerName || site?.customerName || null,
    id,
    10000 // Poll every 10 seconds
  );

  const [selectedSensor, setSelectedSensor] = useState<SensorType>('irradiance');
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const isLoading = siteLoading || sensorLoading || predictionLoading;
  const isOnline = site?.status === 'running';
  const latestSensor = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;

  const getSensorValue = (sensor: SensorData, type: SensorType) => {
    switch (type) {
      case 'irradiance': return sensor.irradiance;
      case 'temperature': return sensor.temperature;
      case 'humidity': return sensor.humidity;
      case 'dustLevel': return sensor.dustLevel;
      case 'rainLevel': return sensor.rainLevel;
      default: return 0;
    }
  };

  // Use more data points and time-based X-axis
  const chartData = sensorData.slice(-30).map((data, index) => ({
    x: index,
    y: getSensorValue(data, selectedSensor),
    timestamp: data.timestamp,
  }));

  const predictionChartData = predictions.slice(-30).map((data, index) => ({
    x: index,
    y: data.predictedEnergy,
    timestamp: data.timestamp,
  }));

  const renderMetricCard = (
    icon: React.ReactNode,
    label: string,
    value: string,
    unit: string,
    status: 'normal' | 'warning' = 'normal'
  ) => (
    <View style={[styles.metricCard, { backgroundColor: colors.card }, status === 'warning' && { borderWidth: 2, borderColor: colors.warning }]}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>
    </View>
  );

  if (isLoading && !site) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.solarOrange} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!site) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>System not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.systemName, { color: colors.white }]}>{site.siteName || title}</Text>
              <Text style={[styles.systemCapacity, { color: colors.gray }]}>{site.systemCapacity} kW System</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isOnline ? colors.success : colors.gray }]}>
              {isOnline && <Animated.View style={[styles.statusDot, { backgroundColor: colors.white }, { transform: [{ scale: pulseAnim }] }]} />}
              <Text style={[styles.statusText, { color: colors.white }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          {latestSensor && (
            <Text style={[styles.lastUpdated, { color: colors.gray }]}>
              Last updated: {latestSensor.timestamp.toLocaleTimeString()}
            </Text>
          )}
        </View>
        {latestSensor && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Real-Time Sensors</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                <Sun size={20} color={colors.solarOrange} />,
                'Irradiance',
                latestSensor.irradiance.toFixed(0),
                'lux'
              )}
              {renderMetricCard(
                <Thermometer size={20} color={colors.danger} />,
                'Temperature',
                latestSensor.temperature.toFixed(1),
                '°C'
              )}
              {renderMetricCard(
                <Droplets size={20} color={colors.success} />,
                'Humidity',
                latestSensor.humidity.toFixed(0),
                '%'
              )}
              {renderMetricCard(
                <Wind size={20} color={colors.warning} />,
                'Dust Level',
                latestSensor.dustLevel.toFixed(1),
                'mg/m³',
                latestSensor.dustLevel > 4 ? 'warning' : 'normal'
              )}
              {renderMetricCard(
                <CloudRain size={20} color={colors.primary} />,
                'Rain Level',
                latestSensor.rainLevel.toFixed(1),
                '%'
              )}
            </View>
          </View>
        )}
        {sensorData.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sensor Chart</Text>
            <View style={styles.chartControls}>
              {(['irradiance', 'temperature', 'humidity', 'dustLevel', 'rainLevel'] as SensorType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chartButton, { backgroundColor: selectedSensor === type ? colors.solarOrange : colors.lightGray }]}
                  onPress={() => setSelectedSensor(type)}
                >
                  <Text style={[styles.chartButtonText, { color: selectedSensor === type ? colors.white : colors.text }]}>
                    {type === 'irradiance' ? 'Sun' :
                     type === 'temperature' ? 'Temp' :
                     type === 'humidity' ? 'Humid' :
                     type === 'dustLevel' ? 'Dust' : 'Rain'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
              <LineChart 
                data={chartData} 
                color={colors.solarOrange}
                unit={selectedSensor === 'irradiance' ? ' lux' : 
                      selectedSensor === 'temperature' ? ' °C' :
                      selectedSensor === 'humidity' ? ' %' :
                      selectedSensor === 'dustLevel' ? ' mg/m³' : ' %'}
              />
            </View>
          </View>
        )}
        {predictions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ML Predicted Energy Output</Text>
            <View style={styles.energyCards}>
              <View style={[styles.energyCard, { backgroundColor: colors.card }]}>
                <Zap size={24} color={colors.solarOrange} />
                <Text style={[styles.energyLabel, { color: colors.textSecondary }]}>Today</Text>
                <Text style={[styles.energyValue, { color: colors.text }]}>{dailyTotal.toFixed(2)}</Text>
                <Text style={[styles.energyUnit, { color: colors.textSecondary }]}>kWh</Text>
              </View>
              <View style={[styles.energyCard, { backgroundColor: colors.card }]}>
                <TrendingUp size={24} color={colors.success} />
                <Text style={[styles.energyLabel, { color: colors.textSecondary }]}>This Month</Text>
                <Text style={[styles.energyValue, { color: colors.text }]}>{monthlyTotal.toFixed(2)}</Text>
                <Text style={[styles.energyUnit, { color: colors.textSecondary }]}>kWh</Text>
              </View>
            </View>
            <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
              <LineChart 
                data={predictionChartData} 
                color={colors.success}
                unit=" kWh"
              />
            </View>
          </View>
        )}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Daily', { id, customerName: customerName || site.customerName })}
          >
            <Calendar size={20} color={colors.white} />
            <Text style={[styles.navButtonText, { color: colors.white }]}>Daily Performance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Monthly', { id, customerName: customerName || site.customerName })}
          >
            <TrendingUp size={20} color={colors.white} />
            <Text style={[styles.navButtonText, { color: colors.white }]}>Monthly Summary</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  header: {
    padding: 20,
    paddingTop: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  systemName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  systemCapacity: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOnline: {
  },
  statusOffline: {
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  lastUpdated: {
    fontSize: 12,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricWarning: {
    borderWidth: 2,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  metricUnit: {
    fontSize: 14,
  },
  chartControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chartButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chartButtonActive: {
  },
  chartButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  chartButtonTextActive: {
  },
  chartContainer: {
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  energyCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  energyCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  energyLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  energyUnit: {
    fontSize: 14,
  },
  navigationButtons: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 16,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
