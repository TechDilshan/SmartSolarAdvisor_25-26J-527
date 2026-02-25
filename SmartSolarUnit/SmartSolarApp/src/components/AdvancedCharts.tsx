import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import victory-native as any to avoid TypeScript issues with named exports
// across different library versions.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VictoryNative: any = require('victory-native');

const {
  VictoryChart,
  VictoryLine,
  VictoryTheme,
  VictoryLegend,
  VictoryGroup,
  VictoryAxis,
} = VictoryNative;

type TimePoint = {
  x: Date | string;
  y: number;
};

type TimeSeriesForecastPoint = {
  date: string;
  value: number;
  lower?: number;
  upper?: number;
  type: 'history' | 'forecast';
};

interface TimeSeriesForecastChartProps {
  data: TimeSeriesForecastPoint[];
}

export const TimeSeriesForecastChart: React.FC<TimeSeriesForecastChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) return null;

  const historyData: TimePoint[] = data
    .filter((d) => d.type === 'history')
    .map((d) => ({ x: d.date, y: d.value }));

  const forecastData: TimePoint[] = data
    .filter((d) => d.type === 'forecast')
    .map((d) => ({ x: d.date, y: d.value }));

  const lowerData: TimePoint[] = data
    .filter((d) => d.type === 'forecast' && d.lower != null)
    .map((d) => ({ x: d.date, y: d.lower as number }));

  const upperData: TimePoint[] = data
    .filter((d) => d.type === 'forecast' && d.upper != null)
    .map((d) => ({ x: d.date, y: d.upper as number }));

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 20, bottom: 60, left: 60, right: 40 }}
        domainPadding={{ x: 10, y: 20 }}
      >
        <VictoryAxis
          tickFormat={(t: string | any[]) =>
            typeof t === 'string'
              ? t.slice(5) // show MM-DD
              : t
          }
          style={{
            tickLabels: { fontSize: 9, angle: -45, textAnchor: 'end' },
          }}
        />
        <VictoryAxis
          dependentAxis
          label="kWh"
          style={{
            axisLabel: { padding: 40, fontSize: 10 },
            tickLabels: { fontSize: 10 },
          }}
        />

        {/* History line */}
        <VictoryLine
          data={historyData}
          style={{
            data: { stroke: '#0ea5e9', strokeWidth: 2 },
          }}
        />

        {/* Forecast central line */}
        <VictoryLine
          data={forecastData}
          style={{
            data: { stroke: '#f97316', strokeWidth: 2 },
          }}
        />

        {/* Forecast lower/upper bounds as dashed lines */}
        {lowerData.length > 0 && (
          <VictoryLine
            data={lowerData}
            style={{
              data: {
                stroke: '#94a3b8',
                strokeWidth: 1,
                strokeDasharray: '5,5',
              },
            }}
          />
        )}
        {upperData.length > 0 && (
          <VictoryLine
            data={upperData}
            style={{
              data: {
                stroke: '#94a3b8',
                strokeWidth: 1,
                strokeDasharray: '5,5',
              },
            }}
          />
        )}

        <VictoryLegend
          x={40}
          y={10}
          orientation="horizontal"
          gutter={12}
          style={{
            labels: { fontSize: 10 },
          }}
          data={[
            { name: 'Daily kWh', symbol: { fill: '#0ea5e9' } },
            { name: 'Forecast', symbol: { fill: '#f97316' } },
            { name: 'Bounds', symbol: { fill: '#94a3b8' } },
          ]}
        />
      </VictoryChart>
    </View>
  );
};

interface SeasonalChartProps {
  data: { label: string; solarKwh: number; avgTemp: number | null }[];
}

export const SeasonalTrendsChart: React.FC<SeasonalChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 20, bottom: 60, left: 60, right: 60 }}
        domainPadding={{ x: 10, y: 20 }}
      >
        <VictoryAxis
          tickValues={data.map((d) => d.label)}
          tickFormat={(t: any) => t}
          style={{
            tickLabels: { fontSize: 9, angle: -45, textAnchor: 'end' },
          }}
        />
        <VictoryAxis
          dependentAxis
          offsetX={60}
          tickFormat={(t: any) => `${t}°`}
          style={{
            tickLabels: { fontSize: 9 },
          }}
        />
        <VictoryAxis
          dependentAxis
          offsetX={320}
          orientation="right"
          tickFormat={(t: any) => `${t}`}
          style={{
            tickLabels: { fontSize: 9 },
          }}
        />

        <VictoryGroup>
          {/* Temperature line */}
          <VictoryLine
            data={data.map((d) => ({ x: d.label, y: d.avgTemp ?? 0 }))}
            style={{
              data: { stroke: '#ef4444', strokeWidth: 2 },
            }}
          />
          {/* Solar kWh line */}
          <VictoryLine
            data={data.map((d) => ({ x: d.label, y: d.solarKwh }))}
            style={{
              data: { stroke: '#0ea5e9', strokeWidth: 2 },
            }}
          />
        </VictoryGroup>

        <VictoryLegend
          x={40}
          y={10}
          orientation="horizontal"
          gutter={12}
          style={{
            labels: { fontSize: 10 },
          }}
          data={[
            { name: 'Avg temperature', symbol: { fill: '#ef4444' } },
            { name: 'Predicted solar (kWh)', symbol: { fill: '#0ea5e9' } },
          ]}
        />
      </VictoryChart>
    </View>
  );
};

interface FullYearForecastChartMobileProps {
  data: { label: string; value: number }[];
}

export const FullYearForecastChartMobile: React.FC<
  FullYearForecastChartMobileProps
> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.chartContainer}>
      <VictoryChart
        theme={VictoryTheme.material}
        padding={{ top: 20, bottom: 60, left: 60, right: 40 }}
        domainPadding={{ x: 10, y: 20 }}
      >
        <VictoryAxis
          tickValues={data.map((d) => d.label)}
          tickFormat={(t: any) => t}
          style={{
            tickLabels: { fontSize: 9, angle: -45, textAnchor: 'end' },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(t: any) => `${t}`}
          style={{
            tickLabels: { fontSize: 10 },
          }}
        />

        <VictoryLine
          data={data.map((d) => ({ x: d.label, y: d.value }))}
          style={{
            data: { stroke: '#f97316', strokeWidth: 2 },
          }}
        />
      </VictoryChart>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

