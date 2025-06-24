import React, { useState, useEffect } from 'react';
import {
    Table,
    Checkbox,
    TextInput,
    Button,
    Group,
    Modal,
    Text,
    Select,
    Stack,
    UnstyledButton,
    Flex,
    Box,
    ActionIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaTimes } from 'react-icons/fa';
import { createAccount, getAllAccounts, updateAccount, deleteAccount } from '../services/account.service';

const AccountManagePage = () => {
    // State for accounts data and UI
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('full_name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        role: 'Quản lý'
    });

    // Role options
    const roleOptions = [
        { value: 'Quản lý', label: 'Quản lý' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Quản trị viên', label: 'Quản trị viên' }
    ];

    // Fetch accounts on component mount
    useEffect(() => {
        fetchAccounts();
    }, []);

    // Filter accounts when search query changes
    useEffect(() => {
        if (accounts.length > 0) {
            filterAndSortAccounts();
        }
    }, [searchQuery, sortBy, sortDirection, accounts]);

    // Fetch accounts from API
    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const response = await getAllAccounts();
            if (response.data) {
                setAccounts(response.data);
                setLoading(false);
            } else {
                notifications.show({
                    title: 'Lỗi',
                    message: response.message || 'Không có tài khoản nào hoặc lỗi khi lấy dữ liệu',
                    color: 'red',
                });
                setLoading(false);
            }
        } catch (error) {
            notifications.show({
                title: 'Lỗi',
                message: 'Đã xảy ra lỗi khi lấy dữ liệu tài khoản',
                color: 'red',
            });
            setLoading(false);
        }
    };

    // Filter and sort accounts based on search query and sort criteria
    const filterAndSortAccounts = () => {
        let filtered = [...accounts];

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(account =>
                account.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                account.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                account.role.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const valueA = a[sortBy].toString().toLowerCase();
            const valueB = b[sortBy].toString().toLowerCase();

            if (sortDirection === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        });

        setFilteredAccounts(filtered);
    };

    // Toggle sort direction and set sort field
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    // Handle row selection
    const toggleRow = (id) => {
        setSelectedRows(
            selectedRows.includes(id)
                ? selectedRows.filter((rowId) => rowId !== id)
                : [...selectedRows, id]
        );
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData({
            ...formData,
            [field]: value
        });
    };

    // Open create modal
    const openCreateModal = () => {
        setFormData({
            full_name: '',
            phone_number: '',
            role: 'Quản lý'
        });
        setCreateModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (account) => {
        setCurrentAccount(account);
        setFormData({
            full_name: account.full_name,
            phone_number: account.phone_number,
            role: account.role
        });
        setEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (account) => {
        setCurrentAccount(account);
        setDeleteModalOpen(true);
    };

    // Handle account creation
    const handleCreateAccount = async () => {
        try {
            const response = await createAccount(
                formData.full_name,
                formData.phone_number,
                formData.role
            );

            if (response.data) {
                notifications.show({
                    title: 'Thành công',
                    message: response.message || 'Tạo tài khoản thành công',
                    color: 'green',
                });
                setCreateModalOpen(false);
                fetchAccounts();
            } else {
                notifications.show({
                    title: 'Lỗi',
                    message: response.message || 'Lỗi khi tạo tài khoản',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Lỗi',
                message: 'Đã xảy ra lỗi khi tạo tài khoản',
                color: 'red',
            });
        }
    };

    // Handle account update
    const handleUpdateAccount = async () => {
        try {
            const response = await updateAccount(currentAccount.id, {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                role: formData.role
            });

            if (response.data) {
                notifications.show({
                    title: 'Thành công',
                    message: response.message || 'Cập nhật tài khoản thành công',
                    color: 'green',
                });
                setEditModalOpen(false);
                fetchAccounts();
            } else {
                notifications.show({
                    title: 'Lỗi',
                    message: response.message || 'Lỗi khi cập nhật tài khoản',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Lỗi',
                message: 'Đã xảy ra lỗi khi cập nhật tài khoản',
                color: 'red',
            });
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        try {
            const response = await deleteAccount(currentAccount.id);

            if (response.success) {
                notifications.show({
                    title: 'Thành công',
                    message: response.message || 'Xóa tài khoản thành công',
                    color: 'green',
                });
                setDeleteModalOpen(false);
                // Remove from selected rows if present
                if (selectedRows.includes(currentAccount.id)) {
                    setSelectedRows(selectedRows.filter(id => id !== currentAccount.id));
                }
                fetchAccounts();
            } else {
                notifications.show({
                    title: 'Lỗi',
                    message: response.message || 'Lỗi khi xóa tài khoản',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Lỗi',
                message: 'Đã xảy ra lỗi khi xóa tài khoản',
                color: 'red',
            });
        }
    };    // Header for the sortable columns
    const SortableHeader = ({ field, label }) => (
        <UnstyledButton onClick={() => handleSort(field)} style={{ display: 'flex', alignItems: 'center' }}>
            <Text fw={600}>{label}</Text>
            {sortBy === field && (
                <Box ml={5}>
                    {sortDirection === 'asc' ? <FaArrowUp size={14} /> : <FaArrowDown size={14} />}
                </Box>
            )}
        </UnstyledButton>
    );

    // Table rows
    const rows = (filteredAccounts.length > 0 ? filteredAccounts : []).map((account) => (
        <Table.Tr
            key={account.id}
            bg={selectedRows.includes(account.id) ? 'var(--mantine-color-blue-light)' : undefined}
        >
            <Table.Td>
                <Checkbox
                    aria-label="Select row"
                    checked={selectedRows.includes(account.id)}
                    onChange={() => toggleRow(account.id)}
                />
            </Table.Td>
            <Table.Td>{account.id}</Table.Td>
            <Table.Td>{account.full_name}</Table.Td>
            <Table.Td>{account.phone_number}</Table.Td>
            <Table.Td>{account.role}</Table.Td>            <Table.Td>
                <Group>
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(account)}>
                        <FaEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(account)}>
                        <FaTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <div>            <Flex justify="space-between" align="center" mb={20}>
            <TextInput
                placeholder="Tìm kiếm theo tên, số điện thoại hoặc vai trò"
                icon={<FaSearch size={14} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '60%' }}
            />
            <Button leftSection={<FaPlus size={14} />} onClick={openCreateModal}>
                Thêm tài khoản
            </Button>
        </Flex>

            {loading ? (
                <Text>Đang tải...</Text>
            ) : (
                <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th />
                            <Table.Th><SortableHeader field="id" label="ID" /></Table.Th>
                            <Table.Th><SortableHeader field="full_name" label="Tên đầy đủ" /></Table.Th>
                            <Table.Th><SortableHeader field="phone_number" label="Số điện thoại" /></Table.Th>
                            <Table.Th><SortableHeader field="role" label="Vai trò" /></Table.Th>
                            <Table.Th>Hành động</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
            )}

            {/* Create Modal */}
            <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Thêm tài khoản mới">
                <Stack>
                    <TextInput
                        label="Tên đầy đủ"
                        placeholder="Nhập tên đầy đủ"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        required
                    />
                    <TextInput
                        label="Số điện thoại"
                        placeholder="Nhập số điện thoại"
                        value={formData.phone_number}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        required
                    />
                    <Select
                        label="Vai trò"
                        placeholder="Chọn vai trò"
                        data={roleOptions}
                        value={formData.role}
                        onChange={(value) => handleInputChange('role', value)}
                        required
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" color="gray" onClick={() => setCreateModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreateAccount}>Tạo</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Modal */}
            <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh sửa tài khoản">
                <Stack>
                    <TextInput
                        label="Tên đầy đủ"
                        placeholder="Nhập tên đầy đủ"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        required
                    />
                    <TextInput
                        label="Số điện thoại"
                        placeholder="Nhập số điện thoại"
                        value={formData.phone_number}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        required
                    />
                    <Select
                        label="Vai trò"
                        placeholder="Chọn vai trò"
                        data={roleOptions}
                        value={formData.role}
                        onChange={(value) => handleInputChange('role', value)}
                        required
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" color="gray" onClick={() => setEditModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleUpdateAccount}>Lưu</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Modal */}
            <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Xóa tài khoản">
                <Stack>
                    <Text>Bạn có chắc chắn muốn xóa tài khoản của {currentAccount?.full_name}?</Text>
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" color="gray" onClick={() => setDeleteModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button color="red" onClick={handleDeleteAccount}>Xóa</Button>
                    </Group>
                </Stack>
            </Modal>
        </div>
    );
};

export default AccountManagePage;