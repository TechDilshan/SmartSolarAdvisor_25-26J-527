import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Thermometer, Droplets, Wind, CloudRain, Sun, TrendingUp, Zap, Calendar } from 'lucide-react-native';
import { LineChart } from '../components/Charts';
import { mockSolarSystems, generateMockSensorData, generateMockPredictionData } from '../mocks/solarSystems';
import { SensorData, PredictionData } from '../types';
import Colors from '../constants/colors';

type SensorType = 'irradiance' | 'temperature' | 'humidity' | 'dustLevel' | 'rainLevel';

export default function PerformanceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id, title } = route.params;

  const system = mockSolarSystems.find(s => s.id === id);
 
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('irradiance');
  const [todayEnergy, setTodayEnergy] = useState(0);
  const [monthEnergy, setMonthEnergy] = useState(0);
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

  const addDataPoint = useCallback(() => {
    const newSensor = generateMockSensorData();
    const newPrediction = generateMockPredictionData();
   
    setSensorData(prev => [...prev.slice(-20), newSensor]);
    setPredictions(prev => [...prev.slice(-20), newPrediction]);
    setTodayEnergy(prev => prev + newPrediction.predictedEnergy);
    setMonthEnergy(prev => prev + newPrediction.predictedEnergy);
  }, []);

  useEffect(() => {
    addDataPoint();
    const interval = setInterval(addDataPoint, 5000);
    return () => clearInterval(interval);
  }, [addDataPoint]);

  if (!system) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>System not found</Text>
      </SafeAreaView>
    );
  }

  const isOnline = system.status === 'running';
  const latestSensor = sensorData[sensorData.length - 1];

  const getSensorValue = (sensor: SensorData, type: SensorType) => {
    switch (type) {
      case 'irradiance': return sensor.irradiance;
      case 'temperature': return sensor.temperature;
      case 'humidity': return sensor.humidity;
      case 'dustLevel': return sensor.dustLevel;
      case 'rainLevel': return sensor.rainLevel;
    }
  };

  const chartData = sensorData.map((data, index) => ({
    x: index,
    y: getSensorValue(data, selectedSensor),
  }));

  const predictionChartData = predictions.map((data, index) => ({
    x: index,
    y: data.predictedEnergy,
  }));

  const renderMetricCard = (
    icon: React.ReactNode,
    label: string,
    value: string,
    unit: string,
    status: 'normal' | 'warning' = 'normal'
  ) => (
    <View style={[styles.metricCard, status === 'warning' && styles.metricWarning]}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.systemName}>{system.siteName}</Text>
              <Text style={styles.systemCapacity}>{system.systemCapacity} kW System</Text>
            </View>
            <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
              {isOnline && <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />}
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          {latestSensor && (
            <Text style={styles.lastUpdated}>
              Last updated: {latestSensor.timestamp.toLocaleTimeString()}
            </Text>
          )}
        </View>
        {latestSensor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Real-Time Sensors</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                <Sun size={20} color={Colors.solarOrange} />,
                'Irradiance',
                latestSensor.irradiance.toFixed(0),
                'lux'
              )}
              {renderMetricCard(
                <Thermometer size={20} color={Colors.danger} />,
                'Temperature',
                latestSensor.temperature.toFixed(1),
                '°C'
              )}
              {renderMetricCard(
                <Droplets size={20} color={Colors.success} />,
                'Humidity',
                latestSensor.humidity.toFixed(0),
                '%'
              )}
              {renderMetricCard(
                <Wind size={20} color={Colors.warning} />,
                'Dust Level',
                latestSensor.dustLevel.toFixed(1),
                'mg/m³',
                latestSensor.dustLevel > 4 ? 'warning' : 'normal'
              )}
              {renderMetricCard(
                <CloudRain size={20} color={Colors.primary} />,
                'Rain Level',
                latestSensor.rainLevel.toFixed(1),
                '%'
              )}
            </View>
          </View>
        )}
        {sensorData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sensor Chart</Text>
            <View style={styles.chartControls}>
              {(['irradiance', 'temperature', 'humidity', 'dustLevel', 'rainLevel'] as SensorType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chartButton, selectedSensor === type && styles.chartButtonActive]}
                  onPress={() => setSelectedSensor(type)}
                >
                  <Text style={[styles.chartButtonText, selectedSensor === type && styles.chartButtonTextActive]}>
                    {type === 'irradiance' ? 'Sun' :
                     type === 'temperature' ? 'Temp' :
                     type === 'humidity' ? 'Humid' :
                     type === 'dustLevel' ? 'Dust' : 'Rain'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.chartContainer}>
              <LineChart data={chartData} color={Colors.solarOrange} />
            </View>
          </View>
        )}
        {predictions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ML Predicted Energy Output</Text>
            <View style={styles.energyCards}>
              <View style={styles.energyCard}>
                <Zap size={24} color={Colors.solarOrange} />
                <Text style={styles.energyLabel}>Today</Text>
                <Text style={styles.energyValue}>{todayEnergy.toFixed(2)}</Text>
                <Text style={styles.energyUnit}>kWh</Text>
              </View>
              <View style={styles.energyCard}>
                <TrendingUp size={24} color={Colors.success} />
                <Text style={styles.energyLabel}>This Month</Text>
                <Text style={styles.energyValue}>{monthEnergy.toFixed(2)}</Text>
                <Text style={styles.energyUnit}>kWh</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <LineChart data={predictionChartData} color={Colors.success} />
            </View>
          </View>
        )}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Daily', { id })}
          >
            <Calendar size={20} color={Colors.white} />
            <Text style={styles.navButtonText}>Daily Performance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Monthly', { id })}
          >
            <TrendingUp size={20} color={Colors.white} />
            <Text style={styles.navButtonText}>Monthly Summary</Text>
          </TouchableOpacity>
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
    color: Colors.white,
    marginBottom: 4,
  },
  systemCapacity: {
    fontSize: 14,
    color: Colors.gray,
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
    backgroundColor: Colors.success,
  },
  statusOffline: {
    backgroundColor: Colors.gray,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.gray,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.card,
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
    borderColor: Colors.warning,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.text,
  },
  metricUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.lightGray,
  },
  chartButtonActive: {
    backgroundColor: Colors.solarOrange,
  },
  chartButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chartButtonTextActive: {
    color: Colors.white,
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
  energyCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  energyCard: {
    flex: 1,
    backgroundColor: Colors.card,
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
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  energyUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});