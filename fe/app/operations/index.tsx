import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components';
import { operationsApi, OperationsDashboard } from '@/api/operationsApi';
import { formatVND } from '@/utils/format';

const { width } = Dimensions.get('window');

export default function OperationsDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<OperationsDashboard | null>(null);

  const fetchData = async () => {
    try {
      const response = await operationsApi.getDashboard();
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching operations dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const StatCard = ({ title, value, icon, color, subValue, subLabel }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={[styles.statValue, { color: color }]}>{formatVND(value)}</Text>
        {subValue !== undefined && (
          <Text style={styles.statSubText}>{subLabel}: {formatVND(subValue)}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Dashboard Vận Hành" 
        showBackButton 
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Tài chính tổng quát */}
          <Text style={styles.sectionTitle}>Tài Chính Tổng Quát</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              title="Tổng Vốn Công Ty" 
              value={data?.total_capital || 0} 
              icon="business-outline" 
              color="#8B5CF6" 
            />
            <StatCard 
              title="Doanh Thu Dự Án" 
              value={data?.project_revenue || 0} 
              icon="trending-up-outline" 
              color="#10B981" 
              subValue={data?.project_costs}
              subLabel="Chi phí"
            />
            <StatCard 
              title="Chi Phí Vận Hành" 
              value={data?.operations_costs || 0} 
              icon="cash-outline" 
              color="#F59E0B" 
            />
          </View>

          {/* Quản lý Tài sản */}
          <Text style={styles.sectionTitle}>Quản Lý Tài Sản</Text>
          <TouchableOpacity 
            style={styles.assetPreviewCard}
            onPress={() => router.push('/operations/assets')}
          >
            <View style={styles.assetHeader}>
              <View style={styles.assetInfo}>
                <Text style={styles.assetMainValue}>{data?.assets?.total || 0}</Text>
                <Text style={styles.assetMainLabel}>Tổng tài sản</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </View>
            
            <View style={styles.assetDetails}>
              <View style={styles.assetDetailItem}>
                <Text style={styles.assetDetailLabel}>Giá trị hiện tại</Text>
                <Text style={styles.assetDetailValue}>{formatVND(data?.assets?.total_value || 0)}</Text>
              </View>
              <View style={styles.assetDetailItem}>
                <Text style={styles.assetDetailLabel}>Khấu hao lũy kế</Text>
                <Text style={[styles.assetDetailValue, { color: '#EF4444' }]}>
                  -{formatVND(data?.assets?.total_depreciation || 0)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Quản lý Vật liệu */}
          <Text style={styles.sectionTitle}>Quản Lý Kho Vật Liệu</Text>
          <TouchableOpacity 
            style={[styles.assetPreviewCard, { borderLeftWidth: 4, borderLeftColor: '#3B82F6' }]}
            onPress={() => router.push('/materials')}
          >
            <View style={styles.assetHeader}>
              <View style={styles.assetInfo}>
                <Text style={styles.assetMainValue}>{data?.materials?.total_items || 0}</Text>
                <Text style={styles.assetMainLabel}>Mặt hàng</Text>
              </View>
              {data?.materials?.low_stock_count ? (
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>{data.materials.low_stock_count} Sắp hết</Text>
                  </View>
              ) : null}
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </View>
            
            <View style={styles.assetDetails}>
              <View style={styles.assetDetailItem}>
                <Text style={styles.assetDetailLabel}>Giá trị tồn kho</Text>
                <Text style={styles.assetDetailValue}>{formatVND(data?.materials?.total_value || 0)}</Text>
              </View>
              <View style={styles.assetDetailItem}>
                <Text style={styles.assetDetailLabel}>Tình trạng</Text>
                <Text style={[styles.assetDetailValue, { color: (data?.materials?.low_stock_count ?? 0) > 0 ? '#EF4444' : '#10B981' }]}>
                  {(data?.materials?.low_stock_count ?? 0) > 0 ? 'Cảnh báo tồn' : 'Ổn định'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Menu chức năng nhanh */}
          <Text style={styles.sectionTitle}>Chức Năng</Text>
          <View style={styles.menuGrid}>
            <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/operations/shareholders')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="people-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.menuText}>Cổ Đông</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/materials')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="cube-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.menuText}>Vật Liệu</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/operations/assets')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="construct-outline" size={24} color="#EC4899" />
              </View>
              <Text style={styles.menuText}>Tài Sản</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/company-costs')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#06B6D420' }]}>
                <Ionicons name="wallet-outline" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.menuText}>Chi Phí CP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/company-financial')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.menuText}>Báo Cáo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  assetPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  assetMainValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 8,
  },
  assetMainLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  assetDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetDetailItem: {
    flex: 1,
  },
  assetDetailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  assetDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  lowStockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  lowStockText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 32 - 24) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  scrollContent: { paddingBottom: 100 },
});
