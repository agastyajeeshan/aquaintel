import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { theme } from '../../theme';

interface ForecastPointData {
  horizon: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface ForecastBandChartProps {
  title: string;
  unit: string;
  currentValue: number;
  forecastPoints: ForecastPointData[];
  modelInfo?: string;
  disclaimer?: string;
}

export const ForecastBandChart: React.FC<ForecastBandChartProps> = ({
  title,
  unit,
  currentValue,
  forecastPoints,
  modelInfo = 'Hybrid Physics-ML Predictive Engine v2.1',
  disclaimer = 'Advisory 90% confidence uncertainty interval.',
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 48, 280);
  const chartHeight = 190;

  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const allPoints = [
    { horizon: 'Now', predicted: currentValue, lower: currentValue, upper: currentValue },
    ...forecastPoints,
  ];

  const allValues = [
    currentValue,
    ...forecastPoints.map((f) => f.predicted),
    ...forecastPoints.map((f) => f.lower),
    ...forecastPoints.map((f) => f.upper),
  ];

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const margin = (rawMax - rawMin) * 0.2 || 0.5;
  const minY = Math.max(0, rawMin - margin);
  const maxY = rawMax + margin;

  const getY = (val: number) =>
    paddingTop + innerHeight - ((val - minY) / (maxY - minY)) * innerHeight;

  const getX = (idx: number) =>
    paddingLeft + (idx / (allPoints.length - 1)) * innerWidth;

  // Build confidence interval polygon (upper forward, lower backward)
  const upperCoords = allPoints.map((p, i) => `${getX(i)},${getY(p.upper)}`);
  const lowerCoords = [...allPoints].reverse().map((p, i) => `${getX(allPoints.length - 1 - i)},${getY(p.lower)}`);
  const bandD = `M ${upperCoords.join(' L ')} L ${lowerCoords.join(' L ')} Z`;

  // Build predicted line path
  const predCoords = allPoints.map((p, i) => `${getX(i)},${getY(p.predicted)}`);
  const predLineD = `M ${predCoords.join(' L ')}`;

  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.modelText}>{modelInfo}</Text>
        </View>
        <Text style={styles.currentVal}>
          {currentValue.toFixed(1)} {unit}
        </Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal grid ticks */}
        {ticks.map((t, i) => (
          <React.Fragment key={i}>
            <Line
              x1={paddingLeft}
              y1={getY(t)}
              x2={chartWidth - paddingRight}
              y2={getY(t)}
              stroke={theme.colors.border}
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <SvgText
              x={paddingLeft - 6}
              y={getY(t) + 4}
              fontSize="10"
              fill={theme.colors.textSecondary}
              textAnchor="end"
            >
              {t.toFixed(1)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* 90% Confidence Interval Band */}
        <Path d={bandD} fill={theme.colors.secondaryLight} opacity={0.7} />

        {/* Forecast Predicted Line */}
        <Path
          d={predLineD}
          fill="none"
          stroke={theme.colors.secondary}
          strokeWidth="2.5"
          strokeDasharray="5 3"
        />

        {/* Horizon Points */}
        {allPoints.map((p, i) => (
          <React.Fragment key={i}>
            <Circle
              cx={getX(i)}
              cy={getY(p.predicted)}
              r={4}
              fill={i === 0 ? theme.colors.primary : theme.colors.secondary}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <SvgText
              x={getX(i)}
              y={chartHeight - 8}
              fontSize="10"
              fill={theme.colors.textSecondary}
              textAnchor="middle"
            >
              {p.horizon}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>

      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
  },
  modelText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  currentVal: {
    ...theme.typography.headingSm,
    color: theme.colors.primary,
  },
  disclaimer: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },
});
