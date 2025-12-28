import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/colors';

interface LineChartProps {
  data: { x: number; y: number }[];
  height?: number;
  color?: string;
  showLabels?: boolean;
}

export function LineChart({ data, height = 200, color = Colors.solarOrange, showLabels = true }: LineChartProps) {
  const width = Dimensions.get('window').width - 40;
  const padding = { left: 40, right: 20, top: 20, bottom: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const maxX = Math.max(...data.map(d => d.x));
  const minX = Math.min(...data.map(d => d.x));
  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  const points = data.map((point) => {
    const x = ((point.x - minX) / xRange) * chartWidth;
    const y = chartHeight - ((point.y - minY) / yRange) * chartHeight;
    return { x, y };
  });

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.yAxis}>
        <Text style={styles.axisLabel}>{maxY.toFixed(0)}</Text>
        <Text style={styles.axisLabel}>{(maxY / 2).toFixed(0)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>
     
      <View style={{ flex: 1 }}>
        <View style={[styles.chartArea, { height: chartHeight, marginTop: padding.top }]}>
          {points.map((point, i) => (
            <View
              key={i}
              style={[
                styles.point,
                {
                  left: point.x + padding.left,
                  bottom: point.y,
                  backgroundColor: color,
                },
              ]}
            />
          ))}
          {points.map((point, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            const length = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
            const angle = Math.atan2(point.y - prev.y, point.x - prev.x);
           
            return (
              <View
                key={`line-${i}`}
                style={[
                  styles.line,
                  {
                    left: prev.x + padding.left,
                    bottom: prev.y,
                    width: length,
                    backgroundColor: color,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
        </View>
       
        {showLabels && (
          <View style={styles.xAxis}>
            <Text style={styles.axisLabel}>{minX.toFixed(0)}</Text>
            <Text style={styles.axisLabel}>{((minX + maxX) / 2).toFixed(0)}</Text>
            <Text style={styles.axisLabel}>{maxX.toFixed(0)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface BarChartProps {
  data: { x: number; y: number }[];
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 200, color = Colors.solarOrange }: BarChartProps) {
  const width = Dimensions.get('window').width - 40;
  const padding = { left: 40, right: 20, top: 20, bottom: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.y));
  const barWidth = Math.max(8, chartWidth / data.length - 4);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.yAxis}>
        <Text style={styles.axisLabel}>{maxY.toFixed(0)}</Text>
        <Text style={styles.axisLabel}>{(maxY / 2).toFixed(0)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>
     
      <View style={{ flex: 1 }}>
        <View style={[styles.chartArea, { height: chartHeight, marginTop: padding.top, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }]}>
          {data.map((point, i) => {
            const barHeight = maxY > 0 ? (point.y / maxY) * chartHeight : 0;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    backgroundColor: color,
                  },
                ]}
              />
            );
          })}
        </View>
       
        <View style={styles.xAxis}>
          <Text style={styles.axisLabel}>0</Text>
          <Text style={styles.axisLabel}>{Math.floor(data.length / 2)}</Text>
          <Text style={styles.axisLabel}>{data.length - 1}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 40,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 40,
    alignItems: 'center',
  },
  axisLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  chartArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  point: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  line: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

interface CandleChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function CandleChart({ data, height = 200, color = Colors.solarOrange }: CandleChartProps) {
  const width = Dimensions.get('window').width - 40;
  const padding = { left: 40, right: 20, top: 20, bottom: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(4, chartWidth / data.length - 2);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.yAxis}>
        <Text style={styles.axisLabel}>{maxY.toFixed(1)}</Text>
        <Text style={styles.axisLabel}>{(maxY / 2).toFixed(1)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>
     
      <View style={{ flex: 1 }}>
        <View style={[styles.chartArea, { height: chartHeight, marginTop: padding.top, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }]}>
          {data.map((point, i) => {
            const barHeight = maxY > 0 ? (point.value / maxY) * chartHeight : 0;
            return (
              <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: barWidth,
                      backgroundColor: color,
                    },
                  ]}
                />
                {i % Math.ceil(data.length / 6) === 0 && (
                  <Text style={[styles.axisLabel, { fontSize: 8, width: barWidth + 4 }]} numberOfLines={1}>
                    {point.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}