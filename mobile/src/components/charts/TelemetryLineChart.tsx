import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../../theme';

interface DataPoint {
  timestamp: string;
  value: number;
}

interface TelemetryLineChartProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  optimalMin?: number;
  optimalMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  color?: string;
  height?: number;
  width?: number;
}

export const TelemetryLineChart: React.FC<TelemetryLineChartProps> = ({
  data,
  title,
  unit = '',
  optimalMin,
  optimalMax,
  criticalMin,
  criticalMax,
  color = theme.colors.primary,
  height = 180,
  width: customWidth,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = customWidth || Math.max(screenWidth - 48, 280);
  const chartHeight = height;

  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height: chartHeight }]}>
        <Text style={styles.emptyText}>No historical telemetry data available</Text>
      </View>
    );
  }

  // Calculate range bounds
  let values = data.map((d) => d.value);
  if (optimalMin !== undefined) values.push(optimalMin);
  if (optimalMax !== undefined) values.push(optimalMax);
  if (criticalMin !== undefined) values.push(criticalMin);
  if (criticalMax !== undefined) values.push(criticalMax);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rangeMargin = (rawMax - rawMin) * 0.15 || 1.0;
  const minY = Math.max(0, rawMin - rangeMargin);
  const maxY = rawMax + rangeMargin;

  const getY = (val: number) => {
    return paddingTop + innerHeight - ((val - minY) / (maxY - minY)) * innerHeight;
  };

  const getX = (idx: number) => {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * innerWidth;
  };

  // Build SVG Path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const pathD = `M ${points.join(' L ')}`;

  // Area fill below line
  const areaD = `${pathD} L ${getX(data.length - 1)},${paddingTop + innerHeight} L ${getX(0)},${paddingTop + innerHeight} Z`;

  // Horizontal guide ticks (min, mid, max)
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.currentValue}>
            {data[data.length - 1]?.value.toFixed(2)} {unit}
          </Text>
        </View>
      )}

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Optimal Range Shading */}
        {optimalMin !== undefined && optimalMax !== undefined && (
          <Rect
            x={paddingLeft}
            y={getY(optimalMax)}
            width={innerWidth}
            height={Math.max(0, getY(optimalMin) - getY(optimalMax))}
            fill={theme.colors.successLight}
            opacity={0.5}
          />
        )}

        {/* Horizontal Grid lines */}
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

        {/* Critical Min/Max lines */}
        {criticalMin !== undefined && (
          <Line
            x1={paddingLeft}
            y1={getY(criticalMin)}
            x2={chartWidth - paddingRight}
            y2={getY(criticalMin)}
            stroke={theme.colors.critical}
            strokeDasharray="2 2"
            strokeWidth="1.5"
          />
        )}

        {/* Area Gradient Fill */}
        <Path d={areaD} fill="url(#gradientFill)" />

        {/* Main Line */}
        <Path d={pathD} fill="none" stroke={color} strokeWidth="2.5" />

        {/* Data points */}
        {data.map((d, i) => (
          <Circle
            key={i}
            cx={getX(i)}
            cy={getY(d.value)}
            r={data.length > 20 ? (i === data.length - 1 ? 4 : 0) : 3}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis labels (start and end timestamps) */}
        {data.length > 0 && (
          <>
            <SvgText
              x={paddingLeft}
              y={chartHeight - 8}
              fontSize="10"
              fill={theme.colors.textSecondary}
              textAnchor="start"
            >
              {data[0].timestamp}
            </SvgText>
            <SvgText
              x={chartWidth - paddingRight}
              y={chartHeight - 8}
              fontSize="10"
              fill={theme.colors.textSecondary}
              textAnchor="end"
            >
              {data[data.length - 1].timestamp}
            </SvgText>
          </>
        )}
      </Svg>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
  },
  currentValue: {
    ...theme.typography.headingSm,
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});
