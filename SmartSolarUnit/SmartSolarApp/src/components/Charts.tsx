import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
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
    position: 'absolute',
  },
  scrollableChartContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  yAxisContainer: {
    width: 50,
    position: 'relative',
  },
  yAxisLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'right',
    width: 40,
  },
  scrollableChartArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  barValueLabel: {
    fontSize: 8,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  xAxisTitleContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  xAxisTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
});

interface CandleChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function CandleChart({ data, height = 250, color = Colors.solarOrange }: CandleChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const padding = { left: 50, right: 20, top: 20, bottom: 90 };
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate minimum width for scrollable chart (each bar needs space)
  const minBarWidth = 20;
  const barGap = 4;
  const chartContentWidth = Math.max(screenWidth - padding.left - padding.right, data.length * (minBarWidth + barGap));
  const barWidth = Math.max(minBarWidth, (chartContentWidth / data.length) - barGap);

  if (data.length === 0) return null;

  const maxY = Math.max(...data.map(d => d.value), 1);
  const yAxisSteps = 5;
  const yStep = maxY / yAxisSteps;

  return (
    <View style={[styles.scrollableChartContainer, { height }]}>
      {/* Y-Axis Labels */}
      <View style={[styles.yAxisContainer, { height: chartHeight, marginTop: padding.top }]}>
        {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
          const value = maxY - (i * yStep);
          return (
            <Text key={i} style={[styles.yAxisLabel, { position: 'absolute', top: (i * chartHeight / yAxisSteps) - 8 }]}>
              {value.toFixed(1)}
            </Text>
          );
        })}
        <Text style={[styles.yAxisLabel, { position: 'absolute', bottom: -20, left: -40 }]}>
          Energy (kWh)
        </Text>
      </View>
     
      {/* Scrollable Chart Area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingRight: padding.right }}
          style={{ flex: 1 }}
        >
          <View style={[styles.scrollableChartArea, { width: chartContentWidth, height: chartHeight, marginTop: padding.top }]}>
            {/* Grid Lines */}
            {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
              <View
                key={`grid-${i}`}
                style={[
                  styles.gridLine,
                  {
                    position: 'absolute',
                    top: (i * chartHeight / yAxisSteps),
                    width: chartContentWidth,
                  }
                ]}
              />
            ))}
            
            {/* Bars */}
            {data.map((point, i) => {
              const barHeight = maxY > 0 ? (point.value / maxY) * chartHeight : 0;
              const xPosition = i * (barWidth + barGap);
              
              return (
                <View
                  key={i}
                  style={[
                    styles.barContainer,
                    {
                      left: xPosition,
                      width: barWidth,
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        width: barWidth,
                        backgroundColor: color,
                        bottom: 0,
                      },
                    ]}
                  />
                  {/* X-Axis Labels - Show date for every bar, rotate for better fit */}
                  <Text 
                    style={[
                      styles.xAxisLabel,
                      {
                        position: 'absolute',
                        bottom: -35,
                        width: 50,
                        left: -(25 - barWidth / 2),
                        textAlign: 'center',
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {point.label}
                  </Text>
                  {/* Value label on top of bar */}
                  {barHeight > 20 && (
                    <Text
                      style={[
                        styles.barValueLabel,
                        {
                          position: 'absolute',
                          bottom: barHeight + 4,
                          width: barWidth,
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {point.value.toFixed(1)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
        
        {/* X-Axis Title */}
        <View style={styles.xAxisTitleContainer}>
          <Text style={styles.xAxisTitle}>Date</Text>
        </View>
      </View>
    </View>
  );
}