import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { reportsApi } from '../../src/services/api/reports.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MetricCard } from '../../src/components/common/MetricCard';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { DailyReportSummary } from '../../src/types';
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from 'lucide-react-native';

export default function ReportsScreen() {
  const router = useRouter();
  const { operatingMode } = useFarmStore();

  const [report, setReport] = useState<DailyReportSummary | null>(null);
  const [selectedPondFilter, setSelectedPondFilter] = useState<number | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setError(null);
    try {
      const data = await reportsApi.getDailyReport();
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Failed to generate operational report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const handleDownloadCsv = async () => {
    setExporting(true);
    try {
      const csvText = await reportsApi.downloadCsvReport();
      await Share.share({
        title: `AquaIntel Report (${report?.report_id || 'CSV'})`,
        message: csvText,
      });
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Failed to download CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const exec = report?.executive_summary;
  const filteredRows =
    selectedPondFilter === 'ALL'
      ? report?.pond_status_table || []
      : (report?.pond_status_table || []).filter((r) => r.pond_number === selectedPondFilter);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Reports & Analytics"
        subtitle="Daily Operational Audits"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !report ? (
        <LoadingState message="Compiling executive daily report..." />
      ) : error && !report ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Header Action Banner */}
          <View style={styles.downloadCard}>
            <View style={styles.downloadLeft}>
              <FileSpreadsheet size={24} color={theme.colors.primary} />
              <View>
                <Text style={styles.downloadTitle}>Daily CSV Farm Export</Text>
                <Text style={styles.downloadSubtitle}>
                  Raw telemetry, biomass, FCR, and probe readings
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadCsv} disabled={exporting}>
              <Download size={14} color="#FFFFFF" />
              <Text style={styles.downloadBtnText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
            </TouchableOpacity>
          </View>

          {/* Report Metadata */}
          {report && (
            <View style={styles.reportHeaderCard}>
              <Text style={styles.reportId}>{report.report_id}</Text>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDate}>Generated: {report.generated_at}</Text>
            </View>
          )}

          {/* Executive Summary KPIs */}
          {exec && (
            <View style={styles.kpiGrid}>
              <MetricCard
                title="Total Ponds"
                value={exec.total_ponds}
                subtitle={`${exec.healthy_count} Optimal, ${exec.warning_count} Warning, ${exec.critical_count} Critical`}
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Total Biomass"
                value={exec.total_biomass_kg?.toLocaleString()}
                unit="kg"
                subtitle="Commercial stock"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Feed Dispensed"
                value={exec.feed_dispensed_today_kg}
                unit="kg"
                subtitle={`Across ${exec.total_ponds} ponds`}
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Energy Cost"
                value={`₹${exec.estimated_daily_energy_cost_inr?.toLocaleString()}`}
                subtitle={`${exec.energy_consumed_kwh} kWh consumed`}
                status="NORMAL"
                style={styles.kpiItem}
              />
            </View>
          )}

          {/* Pond Status Breakdown Table */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pond Status Audit</Text>
          </View>

          {/* Pond Filter Chips */}
          {report?.pond_status_table && report.pond_status_table.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.filterChip, selectedPondFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setSelectedPondFilter('ALL')}
              >
                <Text style={[styles.filterChipText, selectedPondFilter === 'ALL' && styles.filterChipTextActive]}>
                  All Ponds
                </Text>
              </TouchableOpacity>
              {report.pond_status_table.map((p) => (
                <TouchableOpacity
                  key={p.pond_number}
                  style={[styles.filterChip, selectedPondFilter === p.pond_number && styles.filterChipActive]}
                  onPress={() => setSelectedPondFilter(p.pond_number)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedPondFilter === p.pond_number && styles.filterChipTextActive,
                    ]}
                  >
                    P{String(p.pond_number).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 1.2 }]}>POND</Text>
              <Text style={[styles.th, { flex: 1 }]}>DOC</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>BIOMASS</Text>
              <Text style={[styles.th, { flex: 1 }]}>SURVIVAL</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>STATUS</Text>
            </View>

            {filteredRows.map((row, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.td, styles.tdBold, { flex: 1.2 }]}>
                  Pond {String(row.pond_number).padStart(2, '0')}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>{row.doc}d</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{row.biomass_kg?.toLocaleString()} kg</Text>
                <Text style={[styles.td, { flex: 1 }]}>{row.survival_pct}%</Text>
                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                  <StatusBadge status={row.status} size="sm" />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  downloadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  downloadSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reportHeaderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  reportId: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 2,
  },
  reportDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  kpiItem: {
    flex: 1,
    minWidth: '47%',
  },
  sectionHeader: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
    paddingHorizontal: 6,
  },
  td: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  tdBold: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});
