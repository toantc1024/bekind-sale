import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Title, Table, TextInput, Group, Button,
    Text, Box, Modal, Stack, Select, Paper, Grid, Card,
    ActionIcon, Menu, Tabs, Badge, Tooltip, Divider, Popover
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DateTimePicker, DateInput } from '@mantine/dates';
import { BarChart, LineChart, PieChart } from '@mantine/charts';
import dayjs from 'dayjs';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaFilter, FaArrowUp, FaArrowDown, FaEllipsisV, FaCalendarAlt, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import {
    getGuestsWithDetails, createGuest, updateGuest, deleteGuest,
    getMarketersNameMap, getHousesNameMap, getGuestStatusOptions, subscribeToGuests,
    getGuestAnalyticsByMarketer, getGuestAnalyticsByManager
} from '../services/guest.service';
import useAccountStore from '../stores/account.store';

const GuestManagePage = () => {
    // Account store
    const account = useAccountStore((state) => state.account);

    // States for guests data
    const [guests, setGuests] = useState([]);
    const [filteredGuests, setFilteredGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Sorting states
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    // Filter states
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        marketer_id: null,
        house_id: null,
        status: null,
        view_date_from: null,
        view_date_to: null
    });

    // Dropdown data
    const [marketers, setMarketers] = useState({});
    const [houses, setHouses] = useState({});
    // Status options: make sure we're using the correct 5 statuses
    const statusOptions = useMemo(() => [
        "Mới",
        "Đã chốt",
        "Chuẩn bị xem",
        "Đang chăm sóc",
        "Không chốt"
    ], []);

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentGuest, setCurrentGuest] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        marketer_id: '',
        house_id: '',
        guest_name: '',
        guest_phone_number: '',
        view_date: null,
        status: 'Mới',
        admin_note: '',
        manager_note: ''
    });
    // View mode (table or card)
    const [viewMode, setViewMode] = useState('table');

    // Active tab (list or statistics)
    const [activeTab, setActiveTab] = useState('list');

    // Statistics data
    const [marketerStats, setMarketerStats] = useState([]);
    const [managerStats, setManagerStats] = useState([]);

    // Date range for statistics: fix the date selection issue
    const [startDate, setStartDate] = useState(dayjs().startOf('week').toDate());
    const [endDate, setEndDate] = useState(dayjs().endOf('week').toDate());
    const [datePopoverOpened, setDatePopoverOpened] = useState(false);

    // Chart data
    const [chartData, setChartData] = useState({
        statusDistribution: [],
        dailyGuests: [],
        marketerPerformance: [],
        managerPerformance: []
    });

    // Fetch guests and dropdown data on component mount
    useEffect(() => {
        fetchGuests();
        fetchDropdownData();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToGuests((payload) => {
            console.log('Real-time update:', payload);
            fetchGuests(); // Refresh the guest list when a change occurs
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Fetch statistics data when tab changes to statistics or date range changes
    useEffect(() => {
        if (activeTab === 'statistics') {
            fetchStatisticsData();
        }
    }, [activeTab, startDate, endDate]);

    // Filter guests when search query, filters, or date range changes
    useEffect(() => {
        filterAndSortGuests();
    }, [searchQuery, sortBy, sortDirection, filters, guests, startDate, endDate]);

    // Fetch statistics data from API
    const fetchStatisticsData = async () => {
        setLoading(true);
        try {
            const formattedStartDate = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null;
            const formattedEndDate = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null;

            // Fetch marketer statistics with role-based filtering
            const marketerResponse = await getGuestAnalyticsByMarketer(
                formattedStartDate,
                formattedEndDate,
                account?.role,
                account?.id
            );
            if (marketerResponse.data) {
                setMarketerStats(marketerResponse.data);
            }

            // Fetch manager statistics with role-based filtering
            const managerResponse = await getGuestAnalyticsByManager(
                formattedStartDate,
                formattedEndDate,
                account?.role,
                account?.id
            );
            if (managerResponse.data) {
                setManagerStats(managerResponse.data);
            }

            // Prepare chart data
            prepareChartData(marketerResponse.data, managerResponse.data);
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

    // Prepare data for charts
    const prepareChartData = (marketerData = [], managerData = []) => {
        // Status distribution for pie charts
        const marketerStatusCounts = {};
        const managerStatusCounts = {};

        statusOptions.forEach(status => {
            marketerStatusCounts[status] = 0;
            managerStatusCounts[status] = 0;
        });

        marketerData.forEach(marketer => {
            statusOptions.forEach(status => {
                marketerStatusCounts[status] += marketer[status] || 0;
            });
        });

        managerData.forEach(manager => {
            statusOptions.forEach(status => {
                managerStatusCounts[status] += manager[status] || 0;
            });
        });

        const marketerStatusDistribution = Object.entries(marketerStatusCounts).map(([status, value]) => ({
            status,
            value
        }));

        const managerStatusDistribution = Object.entries(managerStatusCounts).map(([status, value]) => ({
            status,
            value
        }));

        // Daily guests for line chart
        const dailyData = {};

        const filteredGuests = guests.filter(guest => {
            const guestDate = dayjs(guest.created_at);
            return (!startDate || guestDate.isAfter(dayjs(startDate).startOf('day'))) &&
                (!endDate || guestDate.isBefore(dayjs(endDate).endOf('day')));
        });

        filteredGuests.forEach(guest => {
            const date = dayjs(guest.created_at).format('YYYY-MM-DD');
            if (!dailyData[date]) {
                dailyData[date] = { date };
                statusOptions.forEach(status => {
                    dailyData[date][status] = 0;
                });
            }
            dailyData[date][guest.status]++;
        });

        const dailyGuests = Object.values(dailyData).sort((a, b) =>
            dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1
        );

        // Marketer performance for bar chart
        const marketerPerformance = marketerData.map(m => ({
            marketer: m.marketer_name,
            'Mới': m['Mới'] || 0,
            'Đã chốt': m['Đã chốt'] || 0,
            'Chuẩn bị xem': m['Chuẩn bị xem'] || 0,
            'Đang chăm sóc': m['Đang chăm sóc'] || 0,
            'Không xem': m['Không xem'] || 0,
            'Không chốt': m['Không chốt'] || 0,
        })).slice(0, 10); // Limit to top 10 for better readability

        // Manager performance for bar chart
        const managerPerformance = managerData.map(m => ({
            manager: m.manager_name,
            'Mới': m['Mới'] || 0,
            'Đã chốt': m['Đã chốt'] || 0,
            'Chuẩn bị xem': m['Chuẩn bị xem'] || 0,
            'Đang chăm sóc': m['Đang chăm sóc'] || 0,
            'Không xem': m['Không xem'] || 0,
            'Không chốt': m['Không chốt'] || 0,
        })).slice(0, 10); // Limit to top 10 for better readability

        setChartData({
            marketerStatusDistribution,
            managerStatusDistribution,
            dailyGuests,
            marketerPerformance,
            managerPerformance
        });
    };

    // Fetch guests from API
    const fetchGuests = async () => {
        setLoading(true);
        const { data } = await getGuestsWithDetails(
            account?.role,
            account?.id
        );

        if (data) {
            setGuests(data);
        } else {
            setGuests([]);
            notifications.show({
                title: 'Lỗi',
                message: 'Không thể tải danh sách khách hàng',
                color: 'red'
            });
        }
        setLoading(false);
    };

    // Fetch dropdown data
    const fetchDropdownData = async () => {
        const fetchMarketers = async () => {
            const { nameMap } = await getMarketersNameMap();
            setMarketers(nameMap || {});
        };

        const fetchHouses = async () => {
            const { addressMap } = await getHousesNameMap(
                account?.role === 'Quản lý' ? account.id : null
            );
            setHouses(addressMap || {});
        };

        await Promise.all([fetchMarketers(), fetchHouses()]);
    };
    // Filter and sort guests
    const filterAndSortGuests = () => {
        let filtered = [...guests];

        // Apply date range filter
        if (startDate) {
            const fromDate = dayjs(startDate).startOf('day');
            filtered = filtered.filter(guest => dayjs(guest.created_at).isAfter(fromDate));
        }

        if (endDate) {
            const toDate = dayjs(endDate).endOf('day');
            filtered = filtered.filter(guest => dayjs(guest.created_at).isBefore(toDate));
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(guest =>
                guest.guest_name?.toLowerCase().includes(query) ||
                guest.guest_phone_number?.toLowerCase().includes(query) ||
                guest.house?.address?.toLowerCase().includes(query) ||
                guest.marketer?.full_name?.toLowerCase().includes(query)
            );
        }

        // Apply advanced filters
        if (filters.marketer_id) {
            filtered = filtered.filter(guest => String(guest.marketer_id) === String(filters.marketer_id));
        }

        if (filters.house_id) {
            filtered = filtered.filter(guest => String(guest.house_id) === String(filters.house_id));
        }

        if (filters.status) {
            filtered = filtered.filter(guest => guest.status === filters.status);
        }

        if (filters.view_date_from) {
            const fromDate = dayjs(filters.view_date_from).startOf('day');
            filtered = filtered.filter(guest => guest.view_date && dayjs(guest.view_date).isAfter(fromDate));
        }

        if (filters.view_date_to) {
            const toDate = dayjs(filters.view_date_to).endOf('day');
            filtered = filtered.filter(guest => guest.view_date && dayjs(guest.view_date).isBefore(toDate));
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === 'view_date') {
                valA = valA ? new Date(valA) : new Date(0);
                valB = valB ? new Date(valB) : new Date(0);
            } else if (sortBy === 'marketer') {
                valA = a.marketer?.full_name || '';
                valB = b.marketer?.full_name || '';
            } else if (sortBy === 'house') {
                valA = a.house?.address || '';
                valB = b.house?.address || '';
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB?.toLowerCase();
            }

            if (valA === valB) return 0;

            const direction = sortDirection === 'asc' ? 1 : -1;
            return valA < valB ? -1 * direction : 1 * direction;
        });

        setFilteredGuests(filtered);
    };

    // Handle column sort
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    };

    // Get sort indicator for column header
    const getSortIndicator = (column) => {
        if (sortBy !== column) return null;
        return sortDirection === 'asc' ? <FaArrowUp size={14} /> : <FaArrowDown size={14} />;
    };

    // Handle form input change
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Reset form data - Updated to handle roles correctly
    const resetFormData = () => {
        const initialFormData = {
            // Default value depends on role
            marketer_id: account?.role === 'Marketing' ? account.id : '',
            house_id: '',
            guest_name: '',
            guest_phone_number: '',
            view_date: null,
            status: 'Mới',
            admin_note: '',
            manager_note: ''
        };

        // Set marketer_id to null for managers
        if (account?.role === 'Quản lý') {
            initialFormData.marketer_id = null;
        }

        setFormData(initialFormData);
    };

    // Check for existing guest with same phone number
    const checkExistingGuest = (phoneNumber) => {
        return guests.find(guest =>
            guest.guest_phone_number === phoneNumber.trim()
        );
    };

    // Handle create guest - Updated to handle duplicates and KPI counting
    const handleCreateGuest = async () => {
        // Validation
        if (!formData.guest_name || !formData.guest_phone_number || !formData.house_id) {
            notifications.show({
                title: 'Lỗi',
                message: 'Vui lòng điền đầy đủ thông tin',
                color: 'red'
            });
            return;
        }

        // Check for existing guest with same phone number
        const existingGuest = checkExistingGuest(formData.guest_phone_number);

        if (existingGuest) {
            // If guest exists, update their status to "Đã chốt" and keep original marketer/manager for KPI
            const updateData = {
                status: 'Đã chốt',
                // Keep original marketer_id and house_id for KPI counting
                marketer_id: existingGuest.marketer_id,
                house_id: existingGuest.house_id,
                // Update other fields with new information
                guest_name: formData.guest_name,
                view_date: formData.view_date ? dayjs(formData.view_date).toISOString() : existingGuest.view_date,
                admin_note: formData.admin_note || existingGuest.admin_note,
                manager_note: formData.manager_note || existingGuest.manager_note
            };

            const { data, message } = await updateGuest(
                existingGuest.id,
                updateData,
                account?.role,
                account?.id
            );

            if (data) {
                notifications.show({
                    title: 'Thành công',
                    message: `Khách hàng đã tồn tại với số điện thoại này. Đã cập nhật trạng thái thành "Đã chốt" và tính KPI cho ${existingGuest.marketer?.full_name || 'nhân viên marketing'} ban đầu.`,
                    color: 'green'
                });
                setCreateModalOpen(false);
                resetFormData();
                fetchGuests();
            } else {
                notifications.show({
                    title: 'Lỗi',
                    message: message,
                    color: 'red'
                });
            }
            return;
        }

        // If no existing guest, create new guest as normal
        let guestData = { ...formData };

        if (account?.role === 'Marketing') {
            // Marketing users always use their own ID
            guestData.marketer_id = account.id;
        } else if (account?.role === 'Quản lý') {
            // Managers set marketer_id to null
            guestData.marketer_id = null;
        }
        // Admin can choose any marketer

        guestData.view_date = formData.view_date ? dayjs(formData.view_date).toISOString() : null;

        const { data, message } = await createGuest(guestData);

        if (data) {
            notifications.show({
                title: 'Thành công',
                message: message,
                color: 'green'
            });
            setCreateModalOpen(false);
            resetFormData();
            fetchGuests();
        } else {
            notifications.show({
                title: 'Lỗi',
                message: message,
                color: 'red'
            });
        }
    };

    // Handle edit guest
    const handleEditGuest = async () => {
        if (!currentGuest) return;

        // Validation
        if (!formData.guest_name || !formData.guest_phone_number || !formData.house_id) {
            notifications.show({
                title: 'Lỗi',
                message: 'Vui lòng điền đầy đủ thông tin',
                color: 'red'
            });
            return;
        }

        const updates = {
            ...formData,
            view_date: formData.view_date ? dayjs(formData.view_date).toISOString() : null
        };

        const { data, message } = await updateGuest(
            currentGuest.id,
            updates,
            account?.role,
            account?.id
        );

        if (data) {
            notifications.show({
                title: 'Thành công',
                message: message,
                color: 'green'
            });
            setEditModalOpen(false);
            setCurrentGuest(null);
            fetchGuests();
        } else {
            notifications.show({
                title: 'Lỗi',
                message: message,
                color: 'red'
            });
        }
    };

    // Handle delete guest
    const handleDeleteGuest = async () => {
        if (!currentGuest) return;

        const { success, message } = await deleteGuest(
            currentGuest.id,
            account?.role,
            account?.id
        );

        if (success) {
            notifications.show({
                title: 'Thành công',
                message: message,
                color: 'green'
            });
            setDeleteModalOpen(false);
            setCurrentGuest(null);
            fetchGuests();
        } else {
            notifications.show({
                title: 'Lỗi',
                message: message,
                color: 'red'
            });
        }
    };

    // Open edit modal and populate form
    const openEditModal = (guest) => {
        setCurrentGuest(guest);
        setFormData({
            marketer_id: guest.marketer_id,
            house_id: guest.house_id,
            guest_name: guest.guest_name,
            guest_phone_number: guest.guest_phone_number,
            view_date: guest.view_date ? new Date(guest.view_date) : null,
            status: guest.status,
            admin_note: guest.admin_note || '',
            manager_note: guest.manager_note || ''
        });
        setEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (guest) => {
        setCurrentGuest(guest);
        setDeleteModalOpen(true);
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({
            marketer_id: null,
            house_id: null,
            status: null,
            view_date_from: null,
            view_date_to: null
        });
    };
    // Set view mode based on screen width
    useEffect(() => {
        const handleResize = () => {
            setViewMode(window.innerWidth < 768 ? 'card' : 'table');
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Calculate statistics whenever guests data changes
    useEffect(() => {
        if (guests.length > 0) {
            calculateStatistics();
        }
    }, [guests]);

    // Calculate statistics from guest data
    const calculateStatistics = () => {
        // Statistics by marketer
        const marketerData = {};
        // Statistics by manager
        const managerData = {};

        // Initialize status counts
        const initStatusCounts = () => ({
            'Mới': 0,
            'Đã chốt': 0,
            'Chốt': 0,
            'Chuẩn bị xem': 0,
            'Đang chăm sóc': 0,
            'Không xem': 0,
            'Không chốt': 0,
            'total': 0
        });

        // Process each guest
        guests.forEach(guest => {
            if (!guest.marketer || !guest.house || !guest.house.manager) return;

            const marketerId = guest.marketer.id;
            const marketerName = guest.marketer.full_name;
            const managerId = guest.house.manager.id;
            const managerName = guest.house.manager.full_name;
            const status = guest.status;

            // Update marketer stats
            if (!marketerData[marketerId]) {
                marketerData[marketerId] = {
                    name: marketerName,
                    ...initStatusCounts()
                };
            }
            marketerData[marketerId][status] = (marketerData[marketerId][status] || 0) + 1;
            marketerData[marketerId].total++;

            // Update manager stats
            if (!managerData[managerId]) {
                managerData[managerId] = {
                    name: managerName,
                    ...initStatusCounts()
                };
            }
            managerData[managerId][status] = (managerData[managerId][status] || 0) + 1;
            managerData[managerId].total++;
        });

        // Convert to arrays
        setMarketerStats(Object.values(marketerData));
        setManagerStats(Object.values(managerData));
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '–';
        return dayjs(dateString).format('DD/MM/YYYY HH:mm');
    };

    // Status color mapping: update to include only the 5 valid statuses
    const getStatusColor = (status) => {
        switch (status) {
            case 'Đã chốt': return 'green';
            case 'Chuẩn bị xem': return 'blue';
            case 'Đang chăm sóc': return 'orange';
            case 'Không chốt': return 'red';
            case 'Mới':
            default: return 'teal';
        }
    };

    // Set date preset: fix date selection function
    const setDatePreset = (preset) => {
        let newStartDate, newEndDate;

        switch (preset) {
            case 'today':
                newStartDate = dayjs().startOf('day').toDate();
                newEndDate = dayjs().endOf('day').toDate();
                break;
            case 'yesterday':
                newStartDate = dayjs().subtract(1, 'day').startOf('day').toDate();
                newEndDate = dayjs().subtract(1, 'day').endOf('day').toDate();
                break;
            case 'thisWeek':
                newStartDate = dayjs().startOf('week').toDate();
                newEndDate = dayjs().endOf('week').toDate();
                break;
            case 'lastWeek':
                newStartDate = dayjs().subtract(1, 'week').startOf('week').toDate();
                newEndDate = dayjs().subtract(1, 'week').endOf('week').toDate();
                break;
            case 'thisMonth':
                newStartDate = dayjs().startOf('month').toDate();
                newEndDate = dayjs().endOf('month').toDate();
                break;
            case 'lastMonth':
                newStartDate = dayjs().subtract(1, 'month').startOf('month').toDate();
                newEndDate = dayjs().subtract(1, 'month').endOf('month').toDate();
                break;
            default:
                return;
        }

        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setDatePopoverOpened(false);
    };

    // Export to Excel function
    const exportToExcel = () => {
        try {
            // Prepare data for export
            const exportData = filteredGuests.map((guest, index) => ({
                'STT': index + 1,
                'Tên khách hàng': guest.guest_name || '',
                'Số điện thoại': guest.guest_phone_number || '',
                'Marketing': guest.marketer ? guest.marketer.full_name : '',
                'Nhà': guest.house ? guest.house.address : '',
                'Ngày xem': guest.view_date ? dayjs(guest.view_date).format('DD/MM/YYYY HH:mm') : '',
                'Trạng thái': guest.status || '',
                'Ghi chú Admin': guest.admin_note || '',
                'Ghi chú Quản lý': guest.manager_note || '',
                'Ngày tạo': dayjs(guest.created_at).format('DD/MM/YYYY HH:mm'),
                'Ngày cập nhật': guest.updated_at ? dayjs(guest.updated_at).format('DD/MM/YYYY HH:mm') : ''
            }));

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Set column widths
            const columnWidths = [
                { wch: 5 },   // STT
                { wch: 20 },  // Tên khách hàng
                { wch: 15 },  // Số điện thoại
                { wch: 20 },  // Marketing
                { wch: 30 },  // Nhà
                { wch: 18 },  // Ngày xem
                { wch: 15 },  // Trạng thái
                { wch: 30 },  // Ghi chú Admin
                { wch: 30 },  // Ghi chú Quản lý
                { wch: 18 },  // Ngày tạo
                { wch: 18 }   // Ngày cập nhật
            ];
            worksheet['!cols'] = columnWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách khách hàng');

            // Generate filename with current date
            const fileName = `Danh_sach_khach_hang_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;

            // Save file
            XLSX.writeFile(workbook, fileName);

            notifications.show({
                title: 'Thành công',
                message: `Đã xuất file ${fileName}`,
                color: 'green'
            });
        } catch (error) {
            console.error('Export error:', error);
            notifications.show({
                title: 'Lỗi',
                message: 'Không thể xuất file Excel',
                color: 'red'
            });
        }
    };

    // Export statistics to Excel
    const exportStatisticsToExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();

            // Export marketer statistics if available
            if ((account?.role === 'Quản trị viên' || account?.role === 'Marketing') && marketerStats.length > 0) {
                const marketerData = marketerStats.map((stat, index) => ({
                    'STT': index + 1,
                    'Nhân viên Marketing': stat.marketer_name || '',
                    'Mới': stat['Mới'] || 0,
                    'Đã chốt': stat['Đã chốt'] || 0,
                    'Chuẩn bị xem': stat['Chuẩn bị xem'] || 0,
                    'Đang chăm sóc': stat['Đang chăm sóc'] || 0,
                    'Không xem': stat['Không xem'] || 0,
                    'Không chốt': stat['Không chốt'] || 0,
                    'Tổng': stat.total || 0
                }));

                const marketerWorksheet = XLSX.utils.json_to_sheet(marketerData);
                marketerWorksheet['!cols'] = [
                    { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
                    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
                ];
                XLSX.utils.book_append_sheet(workbook, marketerWorksheet, 'Thống kê Marketing');
            }

            // Export manager statistics if available
            if ((account?.role === 'Quản trị viên' || account?.role === 'Quản lý') && managerStats.length > 0) {
                const managerData = managerStats.map((stat, index) => ({
                    'STT': index + 1,
                    'Quản lý': stat.manager_name || '',
                    'Mới': stat['Mới'] || 0,
                    'Đã chốt': stat['Đã chốt'] || 0,
                    'Chuẩn bị xem': stat['Chuẩn bị xem'] || 0,
                    'Đang chăm sóc': stat['Đang chăm sóc'] || 0,
                    'Không xem': stat['Không xem'] || 0,
                    'Không chốt': stat['Không chốt'] || 0,
                    'Tổng': stat.total || 0
                }));

                const managerWorksheet = XLSX.utils.json_to_sheet(managerData);
                managerWorksheet['!cols'] = [
                    { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
                    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
                ];
                XLSX.utils.book_append_sheet(workbook, managerWorksheet, 'Thống kê Quản lý');
            }

            // Generate filename with current date and date range
            const fileName = `Thong_ke_khach_hang_${dayjs(startDate).format('DD-MM-YYYY')}_den_${dayjs(endDate).format('DD-MM-YYYY')}.xlsx`;

            // Save file
            XLSX.writeFile(workbook, fileName);

            notifications.show({
                title: 'Thành công',
                message: `Đã xuất file thống kê ${fileName}`,
                color: 'green'
            });
        } catch (error) {
            console.error('Export statistics error:', error);
            notifications.show({
                title: 'Lỗi',
                message: 'Không thể xuất file thống kê Excel',
                color: 'red'
            });
        }
    };

    return (
        <Container fluid>
            {/* Header */}
            <Group position="apart" mb="md">
                <Title order={2}>Quản lý khách hàng</Title>
                <Group>
                    {activeTab === 'list' && (
                        <>
                            <Button
                                leftIcon={<FaFileExcel />}
                                variant="outline"
                                color="green"
                                onClick={exportToExcel}
                                disabled={filteredGuests.length === 0}
                            >
                                Xuất Excel
                            </Button>
                            <Button
                                leftIcon={<FaPlus />}
                                onClick={() => {
                                    resetFormData();
                                    setCreateModalOpen(true);
                                }}
                            >
                                Thêm khách hàng
                            </Button>
                        </>
                    )}
                    {activeTab === 'statistics' && (
                        <Button
                            leftIcon={<FaFileExcel />}
                            variant="outline"
                            color="green"
                            onClick={exportStatisticsToExcel}
                            disabled={marketerStats.length === 0 && managerStats.length === 0}
                        >
                            Xuất thống kê Excel
                        </Button>
                    )}
                </Group>
            </Group>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                <Tabs.List>
                    <Tabs.Tab value="list">Danh sách</Tabs.Tab>
                    <Tabs.Tab value="statistics">Thống kê</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {/* Date Range Selection - Show for both tabs */}
            <Group position="apart" mb="md">
                <Popover
                    opened={datePopoverOpened}
                    onChange={setDatePopoverOpened}
                    position="bottom"
                    width={300}
                    withArrow
                    shadow="md"
                >
                    <Popover.Target>
                        <Button
                            variant="outline"
                            leftIcon={<FaCalendarAlt />}
                            onClick={() => setDatePopoverOpened((o) => !o)}
                        >
                            {dayjs(startDate).format('DD/MM/YYYY')} - {dayjs(endDate).format('DD/MM/YYYY')}
                        </Button>
                    </Popover.Target>
                    <Popover.Dropdown>
                        <Stack>
                            <Group position="apart">
                                <DateInput
                                    label="Từ ngày"
                                    placeholder="Chọn ngày bắt đầu"
                                    value={startDate}
                                    onChange={(date) => {
                                        if (date) setStartDate(date);
                                    }}
                                    valueFormat="DD/MM/YYYY"
                                    maxDate={endDate}
                                />
                                <DateInput
                                    label="Đến ngày"
                                    placeholder="Chọn ngày kết thúc"
                                    value={endDate}
                                    onChange={(date) => {
                                        if (date) setEndDate(date);
                                    }}
                                    valueFormat="DD/MM/YYYY"
                                    minDate={startDate}
                                />
                            </Group>
                            <Divider my="xs" label="Chọn nhanh" labelPosition="center" />
                            <Group grow>
                                <Button variant="light" compact onClick={() => setDatePreset('today')}>Hôm nay</Button>
                                <Button variant="light" compact onClick={() => setDatePreset('yesterday')}>Hôm qua</Button>
                            </Group>
                            <Group grow>
                                <Button variant="light" compact onClick={() => setDatePreset('thisWeek')}>Tuần này</Button>
                                <Button variant="light" compact onClick={() => setDatePreset('lastWeek')}>Tuần trước</Button>
                            </Group>
                            <Group grow>
                                <Button variant="light" compact onClick={() => setDatePreset('thisMonth')}>Tháng này</Button>
                                <Button variant="light" compact onClick={() => setDatePreset('lastMonth')}>Tháng trước</Button>
                            </Group>
                        </Stack>
                    </Popover.Dropdown>
                </Popover>

                {/* Search and Filter Bar - Only show in list view */}
                {activeTab === 'list' && (
                    <Group>
                        <TextInput
                            placeholder="Tìm kiếm khách hàng..."
                            icon={<FaSearch />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '250px' }}
                        />
                        <Button
                            leftIcon={<FaFilter />}
                            variant="outline"
                            onClick={() => setFilterModalOpen(true)}
                        >
                            Lọc
                        </Button>
                    </Group>
                )}
            </Group>

            {/* Active Filters - Only show in list view */}
            {activeTab === 'list' && Object.values(filters).some(v => v !== null) && (
                <Group mb="md" spacing="xs">
                    <Text size="sm">Bộ lọc đang áp dụng:</Text>
                    {filters.marketer_id && (<Badge color="blue" variant="light">
                        Marketing: {marketers[filters.marketer_id]}
                    </Badge>
                    )}
                    {filters.house_id && (
                        <Badge color="teal" variant="light">
                            Nhà: {houses[filters.house_id]}
                        </Badge>
                    )}
                    {filters.status && (
                        <Badge color={getStatusColor(filters.status)} variant="light">
                            Trạng thái: {filters.status}
                        </Badge>
                    )}
                    {(filters.view_date_from || filters.view_date_to) && (
                        <Badge color="violet" variant="light">
                            Ngày xem: {filters.view_date_from && dayjs(filters.view_date_from).format('DD/MM/YYYY')}
                            {filters.view_date_from && filters.view_date_to ? ' → ' : ''}
                            {filters.view_date_to && dayjs(filters.view_date_to).format('DD/MM/YYYY')}
                        </Badge>
                    )}
                    <Button
                        variant="subtle"
                        compact
                        onClick={resetFilters}
                    >
                        Xóa bộ lọc
                    </Button>
                </Group>
            )}

            {/* List Tab Content */}
            {activeTab === 'list' && (
                <>
                    {/* Table View */}
                    {viewMode === 'table' && (
                        <Box mb="xl" className="overflow-x-auto w-full">
                            <Table striped highlightOnHover className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">                                <th onClick={() => handleSort('guest_name')} style={{ cursor: 'pointer' }} className="px-3 py-3">
                                        <Group position="apart">
                                            <span>Tên khách hàng</span>
                                            {getSortIndicator('guest_name')}
                                        </Group>
                                    </th>
                                        <th onClick={() => handleSort('guest_phone_number')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden md:table-cell">
                                            <Group position="apart">
                                                <span>Số điện thoại</span>
                                                {getSortIndicator('guest_phone_number')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('marketer_id')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden lg:table-cell">
                                            <Group position="apart">
                                                <span>Marketing</span>
                                                {getSortIndicator('marketer_id')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('house_id')} style={{ cursor: 'pointer' }} className="px-3 py-3">
                                            <Group position="apart">
                                                <span>Nhà</span>
                                                {getSortIndicator('house_id')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('view_date')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden md:table-cell">
                                            <Group position="apart">
                                                <span>Ngày xem</span>
                                                {getSortIndicator('view_date')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }} className="px-3 py-3">
                                            <Group position="apart">
                                                <span>Trạng thái</span>
                                                {getSortIndicator('status')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('admin_note')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden xl:table-cell">
                                            <Group position="apart">
                                                <span>Ghi chú Admin</span>
                                                {getSortIndicator('admin_note')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('manager_note')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden xl:table-cell">
                                            <Group position="apart">
                                                <span>Ghi chú Quản lý</span>
                                                {getSortIndicator('manager_note')}
                                            </Group>
                                        </th>
                                        <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }} className="px-3 py-3 hidden lg:table-cell">
                                            <Group position="apart">
                                                <span>Ngày tạo</span>
                                                {getSortIndicator('created_at')}
                                            </Group>
                                        </th>
                                        <th className="px-3 py-3">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>                            {loading ? (
                                    <tr>
                                        <td colSpan={10}><Text align="center" className="py-4">Đang tải...</Text></td>
                                    </tr>
                                ) : filteredGuests.length === 0 ? (
                                    <tr>
                                        <td colSpan={10}><Text align="center" className="py-4">Không có khách hàng nào</Text></td>
                                    </tr>
                                ) : (filteredGuests.map(guest => (
                                    <tr key={guest.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-4">{guest.guest_name}</td>
                                        <td className="px-3 py-4 hidden md:table-cell">{guest.guest_phone_number}</td>
                                        <td className="px-3 py-4 hidden lg:table-cell">{guest.marketer ? guest.marketer.full_name : '–'}</td>
                                        <td className="px-3 py-4">{guest.house ? guest.house.address : '–'}</td>
                                        <td className="px-3 py-4 hidden md:table-cell">{formatDate(guest.view_date)}</td>
                                        <td className="px-3 py-4">
                                            <Badge color={getStatusColor(guest.status)}>
                                                {guest.status}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-4 hidden xl:table-cell">
                                            <Tooltip label={guest.admin_note} disabled={!guest.admin_note} multiline width={200} withArrow>
                                                <Text size="sm" lineClamp={2}>
                                                    {guest.admin_note || '–'}
                                                </Text>
                                            </Tooltip>
                                        </td>
                                        <td className="px-3 py-4 hidden xl:table-cell">
                                            <Tooltip label={guest.manager_note} disabled={!guest.manager_note} multiline width={200} withArrow>
                                                <Text size="sm" lineClamp={2}>
                                                    {guest.manager_note || '–'}
                                                </Text>
                                            </Tooltip>
                                        </td>
                                        <td className="px-3 py-4 hidden lg:table-cell">{formatDate(guest.created_at)}</td>
                                        <td className="px-3 py-4">
                                            <Group spacing={5} noWrap>
                                                <ActionIcon color="blue" onClick={() => openEditModal(guest)}>
                                                    <FaEdit />
                                                </ActionIcon>
                                                <ActionIcon color="red" onClick={() => openDeleteModal(guest)}>
                                                    <FaTrash />
                                                </ActionIcon>
                                            </Group>
                                        </td>
                                    </tr>
                                ))
                                )}
                                </tbody>
                            </Table>                    </Box>
                    )}

                    {/* Card View */}
                    {viewMode === 'card' && (
                        <Grid gutter="md">
                            {loading ? (
                                <Grid.Col xs={12}>
                                    <Text align="center">Đang tải...</Text>
                                </Grid.Col>
                            ) : filteredGuests.length === 0 ? (
                                <Grid.Col xs={12}>
                                    <Text align="center">Không có khách hàng nào</Text>
                                </Grid.Col>
                            ) : (
                                filteredGuests.map(guest => (
                                    <Grid.Col xs={12} sm={6} lg={4} key={guest.id}>                                <Card shadow="sm" p="md" withBorder>
                                        <Group position="apart" mb="xs">
                                            <Text weight={500}>{guest.guest_name}</Text>
                                            {/* Show menu on larger screens, direct buttons on smaller screens */}
                                            <Group spacing="xs" className="sm:hidden">
                                                <Button
                                                    leftIcon={<FaEdit />}
                                                    compact
                                                    variant="light"
                                                    color="blue"
                                                    onClick={() => openEditModal(guest)}
                                                >
                                                    Sửa
                                                </Button>
                                                <Button
                                                    leftIcon={<FaTrash />}
                                                    compact
                                                    variant="light"
                                                    color="red"
                                                    onClick={() => openDeleteModal(guest)}
                                                >
                                                    Xóa
                                                </Button>
                                            </Group>
                                        </Group>

                                        <Badge color={getStatusColor(guest.status)} mb="sm">
                                            {guest.status}
                                        </Badge>

                                        <Text size="sm" mb="xs">
                                            <b>SĐT:</b> {guest.guest_phone_number}
                                        </Text>                    <Text size="sm" mb="xs">
                                            <b>Marketing:</b> {guest.marketer ? guest.marketer.full_name : '–'}
                                        </Text>

                                        <Text size="sm" mb="xs">
                                            <b>Nhà:</b> {guest.house ? guest.house.address : '–'}
                                        </Text>

                                        <Text size="sm" mb="xs">
                                            <b>Ngày xem:</b> {formatDate(guest.view_date)}
                                        </Text>

                                        <Text size="sm" color="dimmed">
                                            <b>Ngày tạo:</b> {formatDate(guest.created_at)}
                                        </Text>

                                        {/* Admin Note */}
                                        <Divider my="xs" label="Ghi chú" labelPosition="center" />

                                        <Tooltip label={guest.admin_note} disabled={!guest.admin_note} multiline width={280}>
                                            <Text size="sm" mb="xs">
                                                <b>Ghi chú Admin:</b> <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {guest.admin_note || '–'}
                                                </span>
                                            </Text>
                                        </Tooltip>

                                        <Tooltip label={guest.manager_note} disabled={!guest.manager_note} multiline width={280}>
                                            <Text size="sm" mb="xs">
                                                <b>Ghi chú Quản lý:</b> <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {guest.manager_note || '–'}
                                                </span>
                                            </Text>
                                        </Tooltip>
                                    </Card>
                                    </Grid.Col>
                                ))
                            )}
                        </Grid>
                    )}
                </>
            )}

            {/* Statistics Tab Content */}
            {activeTab === 'statistics' && (
                <Box mt="md">
                    {loading ? (
                        <Text align="center" my="xl">Đang tải dữ liệu thống kê...</Text>
                    ) : (
                        <>
                            {/* Show Marketer Statistics - Only visible to Admin or Marketers for their own data */}
                            {(account?.role === 'Quản trị viên' || account?.role === 'Marketing') && (
                                <>
                                    <Title order={3} mb="md">Báo cáo theo Marketing</Title>
                                    <Box mb="xl" className="overflow-x-auto w-full">
                                        <Table striped highlightOnHover className="min-w-full">
                                            <thead className="bg-gray-50">
                                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    <th className="px-3 py-3">Nhân viên Marketing</th>
                                                    <th className="px-3 py-3">Mới</th>
                                                    <th className="px-3 py-3">Đã chốt</th>
                                                    <th className="px-3 py-3">Chuẩn bị xem</th>
                                                    <th className="px-3 py-3">Đang chăm sóc</th>
                                                    <th className="px-3 py-3">Không xem</th>
                                                    <th className="px-3 py-3">Không chốt</th>
                                                    <th className="px-3 py-3">Tổng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {marketerStats.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8}><Text align="center" className="py-4">Không có dữ liệu</Text></td>
                                                    </tr>
                                                ) : (
                                                    marketerStats.map((stat, index) => (
                                                        <tr key={index}>
                                                            <td className="px-3 py-2 font-medium">{stat.marketer_name}</td>
                                                            <td className="px-3 py-2">{stat['Mới'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Đã chốt'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Chuẩn bị xem'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Đang chăm sóc'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Không xem'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Không chốt'] || 0}</td>
                                                            <td className="px-3 py-2 font-bold">{stat.total || 0}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </Table>
                                    </Box>
                                </>
                            )}

                            {/* Show Manager Statistics - Only visible to Admin or Managers for their houses */}
                            {(account?.role === 'Quản trị viên' || account?.role === 'Quản lý') && (
                                <>
                                    <Title order={3} mb="md" mt="xl">Báo cáo theo Quản lý</Title>
                                    <Box mb="xl" className="overflow-x-auto w-full">
                                        <Table striped highlightOnHover className="min-w-full">
                                            <thead className="bg-gray-50">
                                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    <th className="px-3 py-3">Quản lý</th>
                                                    <th className="px-3 py-3">Mới</th>
                                                    <th className="px-3 py-3">Đã chốt</th>
                                                    <th className="px-3 py-3">Chuẩn bị xem</th>
                                                    <th className="px-3 py-3">Đang chăm sóc</th>
                                                    <th className="px-3 py-3">Không xem</th>
                                                    <th className="px-3 py-3">Không chốt</th>
                                                    <th className="px-3 py-3">Tổng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {managerStats.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8}><Text align="center" className="py-4">Không có dữ liệu</Text></td>
                                                    </tr>
                                                ) : (
                                                    managerStats.map((stat, index) => (
                                                        <tr key={index}>
                                                            <td className="px-3 py-2 font-medium">{stat.manager_name}</td>
                                                            <td className="px-3 py-2">{stat['Mới'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Đã chốt'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Chuẩn bị xem'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Đang chăm sóc'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Không xem'] || 0}</td>
                                                            <td className="px-3 py-2">{stat['Không chốt'] || 0}</td>
                                                            <td className="px-3 py-2 font-bold">{stat.total || 0}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </Table>
                                    </Box>
                                </>
                            )}

                            {/* Visualizations section with role-based adaptations */}
                            <Title order={3} mb="md" mt="xl">Biểu đồ thống kê</Title>
                            <Grid gutter="md">
                                {/* Marketing Section - Only show if user is Admin or Marketing */}
                                {(account?.role === 'Quản trị viên' || account?.role === 'Marketing') && (
                                    <Grid.Col span={12}>
                                        <Paper p="md" withBorder mb="md">
                                            <Title order={4} mb="lg">Thống kê Marketing</Title>
                                            <Grid>
                                                {/* Pie Chart - Marketing Status Distribution */}
                                                <Grid.Col md={6} mb="md">
                                                    <Title order={5} mb="sm" align="center">Phân bố trạng thái khách hàng (Marketing)</Title>
                                                    {chartData.marketerStatusDistribution?.length > 0 ? (
                                                        <PieChart
                                                            h={300}
                                                            withLabelsLine
                                                            labelsPosition="outside"
                                                            labelsType="percent"
                                                            tooltipDataSource="segment"
                                                            withTooltip
                                                            tooltipProps={{
                                                                position: 'top',
                                                                withArrow: true,
                                                                arrowSize: 6
                                                            }}
                                                            withLabels
                                                            data={chartData.marketerStatusDistribution
                                                                .filter(item => item.value > 0)
                                                                .map(item => ({
                                                                    name: item.status,
                                                                    value: item.value,
                                                                    color: getStatusColor(item.status)
                                                                }))}
                                                        />
                                                    ) : (
                                                        <Text align="center" my="xl">Không có dữ liệu</Text>
                                                    )}
                                                </Grid.Col>

                                                {/* Bar Chart - Marketer Performance */}
                                                <Grid.Col md={6} mb="md">
                                                    <Title order={5} mb="sm" align="center">Hiệu suất theo Marketing</Title>
                                                    {chartData.marketerPerformance?.length > 0 ? (
                                                        <BarChart
                                                            h={300}
                                                            data={chartData.marketerPerformance}
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
                                                        <Text align="center" my="xl">Không có dữ liệu</Text>
                                                    )}
                                                </Grid.Col>
                                            </Grid>
                                        </Paper>
                                    </Grid.Col>
                                )}

                                {/* Manager Section - Only show if user is Admin or Manager */}
                                {(account?.role === 'Quản trị viên' || account?.role === 'Quản lý') && (
                                    <Grid.Col span={12}>
                                        <Paper p="md" withBorder mb="md">
                                            <Title order={4} mb="lg">Thống kê Quản lý</Title>
                                            <Grid>
                                                {/* Pie Chart - Manager Status Distribution */}
                                                <Grid.Col md={6} mb="md">
                                                    <Title order={5} mb="sm" align="center">Phân bố trạng thái khách hàng (Quản lý)</Title>
                                                    {chartData.managerStatusDistribution?.length > 0 ? (
                                                        <PieChart
                                                            h={300}
                                                            withLabelsLine
                                                            labelsPosition="outside"
                                                            labelsType="percent"
                                                            tooltipDataSource="segment"
                                                            withTooltip
                                                            tooltipProps={{
                                                                position: 'top',
                                                                withArrow: true,
                                                                arrowSize: 6
                                                            }}
                                                            withLabels
                                                            data={chartData.managerStatusDistribution
                                                                .filter(item => item.value > 0)
                                                                .map(item => ({
                                                                    name: item.status,
                                                                    value: item.value,
                                                                    color: getStatusColor(item.status)
                                                                }))}
                                                        />
                                                    ) : (
                                                        <Text align="center" my="xl">Không có dữ liệu</Text>
                                                    )}
                                                </Grid.Col>

                                                {/* Bar Chart - Manager Performance */}
                                                <Grid.Col md={6} mb="md">
                                                    <Title order={5} mb="sm" align="center">Hiệu suất theo Quản lý</Title>
                                                    {chartData.managerPerformance?.length > 0 ? (
                                                        <BarChart
                                                            h={300}
                                                            data={chartData.managerPerformance}
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
                                                        <Text align="center" my="xl">Không có dữ liệu</Text>
                                                    )}
                                                </Grid.Col>
                                            </Grid>
                                        </Paper>
                                    </Grid.Col>
                                )}

                                {/* Line Chart - Daily Guests - Visible to all roles */}
                                <Grid.Col span={12}>
                                    <Paper p="md" withBorder>
                                        <Title order={4} mb="sm" align="center">Số lượng khách hàng theo ngày</Title>
                                        {chartData.dailyGuests?.length > 0 ? (
                                            <LineChart
                                                h={300}
                                                data={chartData.dailyGuests}
                                                dataKey="date"
                                                series={[
                                                    { name: 'Mới', color: 'teal.6' },
                                                    { name: 'Đã chốt', color: 'green.6' },
                                                    { name: 'Chuẩn bị xem', color: 'blue.6' },
                                                    { name: 'Đang chăm sóc', color: 'orange.6' },
                                                    { name: 'Không chốt', color: 'red.6' }
                                                ]}
                                                curveType="linear"
                                                withTooltip
                                                withLegend
                                            />
                                        ) : (
                                            <Text align="center" my="xl">Không có dữ liệu</Text>
                                        )}
                                    </Paper>
                                </Grid.Col>
                            </Grid>
                        </>
                    )}
                </Box>
            )}

            {/* Create Guest Modal - Updated for role-based fields */}
            <Modal
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Thêm khách hàng mới"
                size="lg"
            >
                <Stack spacing="md">
                    {/* Only show marketer selection for Admin role */}
                    {account?.role === 'Quản trị viên' && (
                        <Select
                            label="Marketing"
                            placeholder="Chọn Marketing"
                            data={Object.entries(marketers).map(([id, name]) => ({ value: id, label: name }))}
                            value={String(formData.marketer_id)}
                            onChange={(value) => handleInputChange('marketer_id', value)}
                        />
                    )}

                    {/* For Marketing users, show their name but disable selection */}
                    {account?.role === 'Marketing' && (
                        <TextInput
                            label="Marketing"
                            value={account?.full_name || ''}
                            disabled
                        />
                    )}

                    {/* For Houses: managers can only select their houses, admin can select any */}
                    <Select
                        label="Nhà"
                        placeholder="Chọn nhà"
                        data={Object.entries(houses).map(([id, address]) => ({ value: id, label: address }))}
                        value={String(formData.house_id)}
                        onChange={(value) => handleInputChange('house_id', value)}
                        required
                    />

                    <TextInput
                        label="Tên khách hàng"
                        placeholder="Nhập tên khách hàng"
                        value={formData.guest_name}
                        onChange={(e) => handleInputChange('guest_name', e.target.value)}
                        required
                    />

                    <TextInput
                        label="Số điện thoại"
                        placeholder="Nhập số điện thoại"
                        value={formData.guest_phone_number}
                        onChange={(e) => handleInputChange('guest_phone_number', e.target.value)}
                        required
                    />

                    <DateTimePicker
                        label="Ngày xem"
                        placeholder="Chọn ngày và giờ xem nhà"
                        valueFormat="DD/MM/YYYY HH:mm"
                        value={formData.view_date}
                        onChange={(value) => handleInputChange('view_date', value)}
                        clearable
                        presets={[
                            { value: dayjs().add(1, 'day').set('hour', 9).set('minute', 0).toDate(), label: 'Ngày mai 9:00' },
                            { value: dayjs().add(1, 'day').set('hour', 15).set('minute', 0).toDate(), label: 'Ngày mai 15:00' },
                            { value: dayjs().add(2, 'day').set('hour', 10).set('minute', 0).toDate(), label: 'Ngày kia 10:00' },
                            { value: dayjs().add(3, 'day').set('hour', 14).set('minute', 0).toDate(), label: '3 ngày sau 14:00' }
                        ]}
                    />

                    <Select
                        label="Trạng thái"
                        placeholder="Chọn trạng thái"
                        data={statusOptions.map(status => ({ value: status, label: status }))}
                        value={formData.status}
                        onChange={(value) => handleInputChange('status', value)}
                    />

                    {/* Admin note - view only for Marketing */}
                    {account?.role === 'Marketing' ? (
                        <TextInput
                            label="Ghi chú Admin"
                            value={formData.admin_note || ''}
                            disabled
                        />
                    ) : (
                        <TextInput
                            label="Ghi chú Admin"
                            placeholder="Nhập ghi chú admin"
                            value={formData.admin_note || ''}
                            onChange={(e) => handleInputChange('admin_note', e.target.value)}
                        />
                    )}

                    {/* Manager note - Only visible to Manager and Admin */}
                    {(account?.role === 'Quản lý' || account?.role === 'Quản trị viên') && (
                        <TextInput
                            label="Ghi chú quản lý"
                            placeholder="Nhập ghi chú quản lý"
                            value={formData.manager_note || ''}
                            onChange={(e) => handleInputChange('manager_note', e.target.value)}
                        />
                    )}

                    <Group position="right" mt="md">
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreateGuest}>Thêm</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Guest Modal - Updated for role-based fields */}
            <Modal
                opened={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Sửa thông tin khách hàng"
                size="lg"
            >
                <Stack spacing="md">
                    {/* Only Admin can change marketer */}
                    {account?.role === 'Quản trị viên' && (
                        <Select
                            label="Marketing"
                            placeholder="Chọn Marketing"
                            data={Object.entries(marketers).map(([id, name]) => ({ value: id, label: name }))}
                            value={String(formData.marketer_id)}
                            onChange={(value) => handleInputChange('marketer_id', value)}
                        />
                    )}

                    {/* For Marketing users, show their name but disable selection */}
                    {account?.role === 'Marketing' && (
                        <TextInput
                            label="Marketing"
                            value={currentGuest?.marketer?.full_name || account?.full_name || ''}
                            disabled
                        />
                    )}

                    {/* Houses: managers can only select their houses, admin can select any */}
                    <Select
                        label="Nhà"
                        placeholder="Chọn nhà"
                        data={Object.entries(houses).map(([id, address]) => ({ value: id, label: address }))}
                        value={String(formData.house_id)}
                        onChange={(value) => handleInputChange('house_id', value)}
                        required
                    />

                    <TextInput
                        label="Tên khách hàng"
                        placeholder="Nhập tên khách hàng"
                        value={formData.guest_name}
                        onChange={(e) => handleInputChange('guest_name', e.target.value)}
                        required
                    />

                    <TextInput
                        label="Số điện thoại"
                        placeholder="Nhập số điện thoại"
                        value={formData.guest_phone_number}
                        onChange={(e) => handleInputChange('guest_phone_number', e.target.value)}
                        required
                    />

                    <DateTimePicker
                        label="Ngày xem"
                        placeholder="Chọn ngày và giờ xem nhà"
                        valueFormat="DD/MM/YYYY HH:mm"
                        value={formData.view_date}
                        onChange={(value) => handleInputChange('view_date', value)}
                        clearable
                        presets={[
                            { value: dayjs().add(1, 'day').set('hour', 9).set('minute', 0).toDate(), label: 'Ngày mai 9:00' },
                            { value: dayjs().add(1, 'day').set('hour', 15).set('minute', 0).toDate(), label: 'Ngày mai 15:00' },
                            { value: dayjs().add(2, 'day').set('hour', 10).set('minute', 0).toDate(), label: 'Ngày kia 10:00' },
                            { value: dayjs().add(3, 'day').set('hour', 14).set('minute', 0).toDate(), label: '3 ngày sau 14:00' }
                        ]}
                    />

                    <Select
                        label="Trạng thái"
                        placeholder="Chọn trạng thái"
                        data={statusOptions.map(status => ({ value: status, label: status }))}
                        value={formData.status}
                        onChange={(value) => handleInputChange('status', value)}
                    />

                    {/* Admin note - view only for Marketing */}
                    {account?.role === 'Marketing' ? (
                        <TextInput
                            label="Ghi chú Admin"
                            value={formData.admin_note || ''}
                            disabled
                        />
                    ) : (
                        <TextInput
                            label="Ghi chú Admin"
                            placeholder="Nhập ghi chú admin"
                            value={formData.admin_note || ''}
                            onChange={(e) => handleInputChange('admin_note', e.target.value)}
                        />
                    )}

                    {/* Manager note - Marketing can view and edit, Manager and Admin can edit */}
                    <TextInput
                        label="Ghi chú quản lý"
                        placeholder="Nhập ghi chú quản lý"
                        value={formData.manager_note || ''}
                        onChange={(e) => handleInputChange('manager_note', e.target.value)}
                    />

                    <Group position="right" mt="md">
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleEditGuest}>Cập nhật</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Guest Modal */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Xóa khách hàng"
                size="md"
            >
                <Text mb="md">Bạn có chắc chắn muốn xóa khách hàng {currentGuest?.guest_name}?</Text>
                <Group position="right">
                    <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Hủy</Button>
                    <Button color="red" onClick={handleDeleteGuest}>Xóa</Button>
                </Group>
            </Modal>

            {/* Filter Modal */}
            <Modal
                opened={filterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                title="Lọc khách hàng"
            >
                <Stack>                    <Select
                    label="Marketing"
                    placeholder="Chọn Marketing"
                    data={Object.entries(marketers).map(([id, name]) => ({ value: id, label: name }))}
                    value={filters.marketer_id}
                    onChange={(value) => setFilters(prev => ({ ...prev, marketer_id: value }))}
                    clearable
                />

                    <Select
                        label="Nhà"
                        placeholder="Chọn nhà"
                        data={Object.entries(houses).map(([id, address]) => ({ value: id, label: address }))}
                        value={filters.house_id}
                        onChange={(value) => setFilters(prev => ({ ...prev, house_id: value }))}
                        clearable
                    />

                    <Select
                        label="Trạng thái"
                        placeholder="Chọn trạng thái"
                        data={statusOptions.map(status => ({ value: status, label: status }))}
                        value={filters.status}
                        onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                        clearable
                    />

                    <DateTimePicker
                        label="Ngày xem từ"
                        placeholder="Chọn ngày bắt đầu"
                        valueFormat="DD/MM/YYYY HH:mm"
                        value={filters.view_date_from}
                        onChange={(value) => setFilters(prev => ({ ...prev, view_date_from: value }))}
                        clearable
                    />

                    <DateTimePicker
                        label="Ngày xem đến"
                        placeholder="Chọn ngày kết thúc"
                        valueFormat="DD/MM/YYYY HH:mm"
                        value={filters.view_date_to}
                        onChange={(value) => setFilters(prev => ({ ...prev, view_date_to: value }))}
                        clearable
                    />

                    <Group position="right" mt="md">
                        <Button variant="outline" onClick={resetFilters}>Xóa lọc</Button>
                        <Button onClick={() => setFilterModalOpen(false)}>Áp dụng</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default GuestManagePage;