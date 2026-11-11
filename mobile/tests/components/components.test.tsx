import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { MetricCard } from '../../src/components/common/MetricCard';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { SensorStatusCard } from '../../src/components/common/SensorStatusCard';
import { ChartCard } from '../../src/components/common/ChartCard';
import { BottomNavigation } from '../../src/components/common/BottomNavigation';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('Common UI Component Tests', () => {
  describe('StatusBadge Component', () => {
    test('renders LIVE status correctly', () => {
      const { getByText } = render(<StatusBadge status="LIVE" />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    test('renders OFFLINE and STALE badges', () => {
      const { getByText: getOffline } = render(<StatusBadge status="OFFLINE" />);
      expect(getOffline('OFFLINE')).toBeTruthy();

      const { getByText: getStale } = render(<StatusBadge status="STALE" />);
      expect(getStale('STALE')).toBeTruthy();
    });

    test('renders CRITICAL and OPTIMAL pond health states', () => {
      const { getByText: getCrit } = render(<StatusBadge status="RED" />);
      expect(getCrit('CRITICAL')).toBeTruthy();

      const { getByText: getOpt } = render(<StatusBadge status="GREEN" />);
      expect(getOpt('OPTIMAL')).toBeTruthy();
    });
  });

  describe('MetricCard Component', () => {
    test('renders title, value, unit, and subtitle correctly', () => {
      const { getByText } = render(
        <MetricCard
          title="Total Biomass"
          value="12,500"
          unit="kg"
          subtitle="Penaeus vannamei"
          status="NORMAL"
        />
      );

      expect(getByText(/Total Biomass/i)).toBeTruthy();
      expect(getByText('12,500')).toBeTruthy();
      expect(getByText('kg')).toBeTruthy();
      expect(getByText('Penaeus vannamei')).toBeTruthy();
    });
  });

  describe('ConfirmationDialog Component', () => {
    test('renders safety notice and triggers confirm callback', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <ConfirmationDialog
          visible={true}
          title="Confirm Emergency Boost"
          message="Are you sure you want to activate emergency boost?"
          confirmLabel="Engage Boost"
          safetyNotice="Interlock Active: DO < 3.8 mg/L overrides stop commands."
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(getByText('Confirm Emergency Boost')).toBeTruthy();
      expect(getByText('Interlock Active: DO < 3.8 mg/L overrides stop commands.')).toBeTruthy();

      const confirmBtn = getByText('Engage Boost');
      fireEvent.press(confirmBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    test('triggers cancel callback on cancel button press', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <ConfirmationDialog
          visible={true}
          title="Confirm Stop"
          message="Stop aerator?"
          cancelLabel="Abort"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      const cancelBtn = getByText('Abort');
      fireEvent.press(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('SensorStatusCard Component', () => {
    test('renders normal DO reading as OPTIMAL', () => {
      const { getByText } = render(
        <SensorStatusCard parameter="do" value={6.4} />
      );

      expect(getByText(/Dissolved Oxygen/i)).toBeTruthy();
      expect(getByText('6.40')).toBeTruthy();
      expect(getByText('mg/L')).toBeTruthy();
      expect(getByText('OPTIMAL')).toBeTruthy();
    });

    test('renders hypoxic DO reading below 3.8 as CRITICAL', () => {
      const { getByText } = render(
        <SensorStatusCard parameter="do" value={3.2} />
      );

      expect(getByText('3.20')).toBeTruthy();
      expect(getByText('CRITICAL')).toBeTruthy();
    });

    test('renders unavailable reading cleanly without fabricated fallback', () => {
      const { getByText } = render(
        <SensorStatusCard parameter="do" value={null} sensorId="S-P1-DO" />
      );

      expect(getByText('—')).toBeTruthy();
      expect(getByText('UNAVAILABLE')).toBeTruthy();
    });

    test('renders stale water_level with SIMULATED provenance and advisory target', () => {
      const { getByText } = render(
        <SensorStatusCard
          parameter="water_level"
          value={1.32}
          provenance="SIMULATED"
          isStale={true}
          secondsAgo={180}
        />
      );

      expect(getByText('1.32')).toBeTruthy();
      expect(getByText('SIMULATED')).toBeTruthy();
      expect(getByText(/Advisory Target:/)).toBeTruthy();
      expect(getByText('180s ago (stale)')).toBeTruthy();
    });
  });

  describe('ChartCard Component', () => {
    test('renders title, provenance, range selector chips, and fires onRangeChange', () => {
      const onRangeChange = jest.fn();
      const { getByText } = render(
        <ChartCard
          title="Dissolved Oxygen Trend"
          subtitle="Hourly pond telemetry"
          provenance="LIVE"
          selectedRange="24h"
          ranges={['6h', '24h', '7d']}
          onRangeChange={onRangeChange}
          footerNote="Emerson NH3 computed by backend"
        >
          <Text>Chart Body Placeholder</Text>
        </ChartCard>
      );

      expect(getByText('Dissolved Oxygen Trend')).toBeTruthy();
      expect(getByText('Hourly pond telemetry')).toBeTruthy();
      expect(getByText('LIVE')).toBeTruthy();
      expect(getByText('Chart Body Placeholder')).toBeTruthy();
      expect(getByText('Emerson NH3 computed by backend')).toBeTruthy();

      fireEvent.press(getByText('6H'));
      expect(onRangeChange).toHaveBeenCalledWith('6h');
    });
  });

  describe('BottomNavigation Component', () => {
    test('renders tab items, formats 99+ badges, hides zero badges, and triggers onPress', () => {
      const onDash = jest.fn();
      const onAlerts = jest.fn();

      const { getByText, queryByText } = render(
        <BottomNavigation
          activeKey="dashboard"
          items={[
            {
              key: 'dashboard',
              label: 'Dashboard',
              icon: () => <Text>D</Text>,
              badgeCount: 0,
              onPress: onDash,
            },
            {
              key: 'alerts',
              label: 'Alerts',
              icon: () => <Text>A</Text>,
              badgeCount: 120,
              onPress: onAlerts,
            },
          ]}
        />
      );

      expect(getByText('Dashboard')).toBeTruthy();
      expect(getByText('Alerts')).toBeTruthy();
      expect(getByText('99+')).toBeTruthy();
      expect(queryByText('0')).toBeNull();

      fireEvent.press(getByText('Alerts'));
      expect(onAlerts).toHaveBeenCalledTimes(1);
    });
  });
});
