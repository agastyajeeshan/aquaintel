import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { MetricCard } from '../../src/components/common/MetricCard';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { SensorStatusCard } from '../../src/components/common/SensorStatusCard';

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
  });
});
