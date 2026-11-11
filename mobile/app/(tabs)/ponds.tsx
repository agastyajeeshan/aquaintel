import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { PondCard } from '../../src/components/common/PondCard';
import { EmptyState } from '../../src/components/common/FeedbackStates';
import { Search, Filter, Plus } from 'lucide-react-native';

export default function PondsScreen() {
  const router = useRouter();
  const { ponds, operatingMode, fetchFarmData } = useFarmStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFarmData();
    setRefreshing(false);
  };

  const filteredPonds = ponds.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pond_number).includes(search);
    const matchesFilter = filter === 'ALL' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      <AppHeader
        title="Pond Fleet"
        subtitle={`${ponds.length} Commercial Ponds Active`}
        provenance={operatingMode}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {/* Search and Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchWrapper}>
          <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search pond number or name..."
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.filterChips}>
          {(['ALL', 'GREEN', 'YELLOW', 'RED'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                filter === status && styles.chipActive,
                filter === status && status === 'GREEN' && { borderColor: theme.colors.success },
                filter === status && status === 'YELLOW' && { borderColor: theme.colors.warning },
                filter === status && status === 'RED' && { borderColor: theme.colors.critical },
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === status && styles.chipTextActive,
                ]}
              >
                {status === 'ALL'
                  ? 'All Ponds'
                  : status === 'GREEN'
                  ? 'Optimal'
                  : status === 'YELLOW'
                  ? 'Warning'
                  : 'Critical'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredPonds}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PondCard
            pond={item}
            onPress={() => router.push(`/ponds/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Ponds Match Filter"
            description="Try clearing your search query or selecting 'All Ponds'."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primaryDark,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
});
