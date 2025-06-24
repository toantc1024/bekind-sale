import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Grid, Tabs, Select, Group } from '@mantine/core';
import { BarChart, LineChart, PieChart } from '@mantine/charts';
import { notifications } from '@mantine/notifications';
import useAccountStore from '../stores/account.store';
import { getGuestAnalyticsByMarketer, getGuestAnalyticsByManager } from '../services/guest.service';

// Sample product sales data
const salesData = [
  { month: 'January', Smartphones: 1200, Laptops: 900, Tablets: 200 },
  { month: 'February', Smartphones: 1900, Laptops: 1200, Tablets: 400 },
  { month: 'March', Smartphones: 400, Laptops: 1000, Tablets: 200 },
  { month: 'April', Smartphones: 1000, Laptops: 200, Tablets: 800 },
  { month: 'May', Smartphones: 800, Laptops: 1400, Tablets: 1200 },
  { month: 'June', Smartphones: 750, Laptops: 600, Tablets: 1000 },
];

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [marketerStats, setMarketerStats] = useState([]);
  const [managerStats, setManagerStats] = useState([]);

  const account = useAccountStore((state) => state.account);

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuestStats();
    }
  }, [activeTab]);

  const fetchGuestStats = async () => {
    setLoading(true);
    try {
      // Fetch marketer statistics
      const marketerResponse = await getGuestAnalyticsByMarketer();
      if (marketerResponse.data) {
        setMarketerStats(marketerResponse.data);
      }

      // Fetch manager statistics
      const managerResponse = await getGuestAnalyticsByManager();
      if (managerResponse.data) {
        setManagerStats(managerResponse.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      notifications.show({
        title: 'Lỗi',
        message: 'Không thể tải dữ liệu thống kê',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // Transform manager stats for bar chart
  const prepareManagerChartData = () => {
    return managerStats.slice(0, 5).map(manager => ({
      manager: manager.manager_name,
      'Đã chốt': manager['Đã chốt'] || 0,
      'Chuẩn bị xem': manager['Chuẩn bị xem'] || 0,
      'Đang chăm sóc': manager['Đang chăm sóc'] || 0,
      'Mới': manager['Mới'] || 0, 
      'Không chốt': manager['Không chốt'] || 0
    }));
  };

  // Transform marketer stats for bar chart
  const prepareMarketerChartData = () => {
    return marketerStats.slice(0, 5).map(marketer => ({
      marketer: marketer.marketer_name,
      'Đã chốt': marketer['Đã chốt'] || 0,
      'Chuẩn bị xem': marketer['Chuẩn bị xem'] || 0,
      'Đang chăm sóc': marketer['Đang chăm sóc'] || 0,
      'Mới': marketer['Mới'] || 0,
      'Không chốt': marketer['Không chốt'] || 0
    }));
  };

  return (
    <Container fluid>
      <Title order={2} mb="md">Bảng điều khiển thống kê</Title>
      
      <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
        <Tabs.List>
          <Tabs.Tab value="products">Thống kê sản phẩm</Tabs.Tab>
          <Tabs.Tab value="guests">Thống kê khách hàng</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === 'products' && (
        <Grid gutter="md">
          <Grid.Col span={12}>
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Doanh số sản phẩm theo tháng</Title>
              <BarChart
                h={400}
                data={salesData}
                dataKey="month"
                series={[
                  { name: 'Smartphones', color: 'indigo.6' },
                  { name: 'Laptops', color: 'violet.6' },
                  { name: 'Tablets', color: 'blue.6' },
                ]}
                withLegend
                withTooltip
              />
            </Paper>
          </Grid.Col>
          
          <Grid.Col md={6}>
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Xu hướng doanh số</Title>
              <LineChart
                h={350}
                data={salesData}
                dataKey="month"
                series={[
                  { name: 'Smartphones', color: 'indigo.6' },
                  { name: 'Laptops', color: 'violet.6' },
                  { name: 'Tablets', color: 'blue.6' },
                ]}
                curveType="linear"
                withLegend
                withTooltip
              />
            </Paper>
          </Grid.Col>
          
          <Grid.Col md={6}>
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Phân bố sản phẩm</Title>
              <PieChart
                h={350}
                data={[
                  { name: 'Smartphones', value: 6050, color: 'indigo.6' },
                  { name: 'Laptops', value: 5300, color: 'violet.6' },
                  { name: 'Tablets', value: 3800, color: 'blue.6' },
                ]}
                withLabels
                withTooltip
                labelsPosition="inside"
                labelsType="percent"
                withLegend
              />
            </Paper>
          </Grid.Col>
        </Grid>
      )}

      {activeTab === 'guests' && (
        <>
          {loading ? (
            <Text align="center" my="xl">Đang tải dữ liệu thống kê...</Text>
          ) : (
            <Grid gutter="md">
              <Grid.Col span={12}>
                <Paper p="md" withBorder mb="md">
                  <Title order={4} mb="lg">Hiệu suất theo Marketing</Title>
                  {marketerStats.length > 0 ? (
                    <BarChart
                      h={400}
                      data={prepareMarketerChartData()}
                      dataKey="marketer"
                      series={[
                        { name: 'Đã chốt', color: 'green.6' },
                        { name: 'Chuẩn bị xem', color: 'blue.6' },
                        { name: 'Đang chăm sóc', color: 'orange.6' },
                        { name: 'Mới', color: 'teal.6' },
                        { name: 'Không chốt', color: 'red.6' }
                      ]}
                      tickLine="y"
                      withTooltip
                      withLegend
                    />
                  ) : (
                    <Text align="center" my="xl">Không có dữ liệu marketing</Text>
                  )}
                </Paper>
              </Grid.Col>

              <Grid.Col span={12}>
                <Paper p="md" withBorder mb="md">
                  <Title order={4} mb="lg">Hiệu suất theo Quản lý</Title>
                  {managerStats.length > 0 ? (
                    <BarChart
                      h={400}
                      data={prepareManagerChartData()}
                      dataKey="manager"
                      series={[
                        { name: 'Đã chốt', color: 'green.6' },
                        { name: 'Chuẩn bị xem', color: 'blue.6' },
                        { name: 'Đang chăm sóc', color: 'orange.6' },
                        { name: 'Mới', color: 'teal.6' },
                        { name: 'Không chốt', color: 'red.6' }
                      ]}
                      tickLine="y"
                      withTooltip
                      withLegend
                    />
                  ) : (
                    <Text align="center" my="xl">Không có dữ liệu quản lý</Text>
                  )}
                </Paper>
              </Grid.Col>
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default DashboardPage;
