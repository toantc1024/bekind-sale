import React, { useState, useEffect } from 'react'
import {
    Container, Title, Table, TextInput, Group, Button,
    Text, Box, Modal, Stack, Select, Checkbox,
    UnstyledButton, ActionIcon, Paper, Grid, Card,
    useMantineTheme
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { FaSearch, FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { getAllHouses, createHouse, updateHouse, deleteHouse } from '../services/house.service'
import { getManagersNameMap } from '../services/account.service'

const HouseManagePage = () => {
    // Theme for responsive design
    const theme = useMantineTheme();

    // State for houses data and UI
    const [houses, setHouses] = useState([]);
    const [filteredHouses, setFilteredHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('address');
    const [sortDirection, setSortDirection] = useState('asc');
    const [managers, setManagers] = useState({});

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentHouse, setCurrentHouse] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        address: '',
        manager_id: ''
    });

    // Fetch houses on component mount
    useEffect(() => {
        fetchHouses();
        fetchManagers();
    }, []);

    // Filter houses when search query changes
    useEffect(() => {
        filterAndSortHouses();
    }, [searchQuery, sortBy, sortDirection, houses]);

    // Fetch houses from API
    const fetchHouses = async () => {
        setLoading(true);
        try {
            const response = await getAllHouses();
            if (response.data) {
                setHouses(response.data);
                setFilteredHouses(response.data);
            } else {
                setHouses([]);
                setFilteredHouses([]);
            }
        } catch (error) {
            console.error("Error fetching houses:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to fetch houses',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch manager accounts for the dropdown
    const fetchManagers = async () => {
        try {
            const { nameMap } = await getManagersNameMap();
            setManagers(nameMap);
        } catch (error) {
            console.error("Error fetching managers:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to fetch manager accounts',
                color: 'red'
            });
        }
    };

    // Filter and sort houses based on search query and sort criteria
    const filterAndSortHouses = () => {
        let filtered = [...houses];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(house =>
                house.address.toLowerCase().includes(query) ||
                (managers[house.manager_id] && managers[house.manager_id].toLowerCase().includes(query))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            if (sortBy === 'address') {
                aValue = a.address.toLowerCase();
                bValue = b.address.toLowerCase();
            } else if (sortBy === 'manager') {
                aValue = managers[a.manager_id] ? managers[a.manager_id].toLowerCase() : '';
                bValue = managers[b.manager_id] ? managers[b.manager_id].toLowerCase() : '';
            } else {
                aValue = a[sortBy];
                bValue = b[sortBy];
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredHouses(filtered);
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
        setSelectedRows(prev => {
            if (prev.includes(id)) {
                return prev.filter(rowId => rowId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Open create modal
    const openCreateModal = () => {
        setFormData({
            address: '',
            manager_id: ''
        });
        setCreateModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (house) => {
        setCurrentHouse(house);
        setFormData({
            address: house.address,
            manager_id: String(house.manager_id)
        });
        setEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (house) => {
        setCurrentHouse(house);
        setDeleteModalOpen(true);
    };

    // Handle house creation
    const handleCreateHouse = async () => {
        try {
            const response = await createHouse(
                parseInt(formData.manager_id),
                formData.address
            );

            if (response.data) {
                notifications.show({
                    title: 'Success',
                    message: response.message,
                    color: 'green'
                });
                setCreateModalOpen(false);
                fetchHouses();
            } else {
                notifications.show({
                    title: 'Error',
                    message: response.message,
                    color: 'red'
                });
            }
        } catch (error) {
            console.error("Error creating house:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to create house',
                color: 'red'
            });
        }
    };

    // Handle house update
    const handleUpdateHouse = async () => {
        try {
            const response = await updateHouse(currentHouse.id, {
                address: formData.address,
                manager_id: parseInt(formData.manager_id)
            });

            if (response.data) {
                notifications.show({
                    title: 'Success',
                    message: response.message,
                    color: 'green'
                });
                setEditModalOpen(false);
                fetchHouses();
            } else {
                notifications.show({
                    title: 'Error',
                    message: response.message,
                    color: 'red'
                });
            }
        } catch (error) {
            console.error("Error updating house:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update house',
                color: 'red'
            });
        }
    };

    // Handle house deletion
    const handleDeleteHouse = async () => {
        try {
            const response = await deleteHouse(currentHouse.id);

            if (response.success) {
                notifications.show({
                    title: 'Success',
                    message: response.message,
                    color: 'green'
                });
                setDeleteModalOpen(false);
                fetchHouses();
                setSelectedRows(prev => prev.filter(id => id !== currentHouse.id));
            } else {
                notifications.show({
                    title: 'Error',
                    message: response.message,
                    color: 'red'
                });
            }
        } catch (error) {
            console.error("Error deleting house:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete house',
                color: 'red'
            });
        }
    };

    // Header for the sortable columns
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

    // Table view for larger screens
    const TableView = () => (
        <Table striped highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th style={{ width: 40 }}></Table.Th>
                    <Table.Th style={{ width: 60 }}>ID</Table.Th>
                    <Table.Th><SortableHeader field="address" label="Địa chỉ" /></Table.Th>
                    <Table.Th><SortableHeader field="manager" label="Quản lý" /></Table.Th>
                    <Table.Th style={{ width: 100 }}>Thao tác</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {filteredHouses.map((house) => (
                    <Table.Tr
                        key={house.id}
                        bg={selectedRows.includes(house.id) ? 'var(--mantine-color-blue-light)' : undefined}
                    >
                        <Table.Td>
                            <Checkbox
                                aria-label="Select row"
                                checked={selectedRows.includes(house.id)}
                                onChange={() => toggleRow(house.id)}
                            />
                        </Table.Td>
                        <Table.Td>{house.id}</Table.Td>
                        <Table.Td>{house.address}</Table.Td>
                        <Table.Td>{managers[house.manager_id] || 'N/A'}</Table.Td>
                        <Table.Td>
                            <Group>
                                <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(house)}>
                                    <FaEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(house)}>
                                    <FaTrash size={16} />
                                </ActionIcon>
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );

    // Card view for smaller screens
    const CardView = () => (
        <Grid>
            {filteredHouses.map((house) => (
                <Grid.Col key={house.id} span={{ base: 12, xs: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <Text fw={700}>House #{house.id}</Text>
                            <Checkbox
                                aria-label="Select house"
                                checked={selectedRows.includes(house.id)}
                                onChange={() => toggleRow(house.id)}
                            />
                        </Group>

                        <Text mb={8}><b>Địa chỉ:</b> {house.address}</Text>
                        <Text mb="xl"><b>Quản lý:</b> {managers[house.manager_id] || 'N/A'}</Text>

                        <Group justify="flex-end">
                            <Button
                                variant="light"
                                color="blue"
                                leftSection={<FaEdit />}
                                onClick={() => openEditModal(house)}
                            >
                                Sửa
                            </Button>
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<FaTrash />}
                                onClick={() => openDeleteModal(house)}
                            >
                                Xóa
                            </Button>
                        </Group>
                    </Card>
                </Grid.Col>
            ))}
        </Grid>
    );

    // Convert manager object to options for select input
    const managerOptions = Object.entries(managers).map(([id, name]) => ({
        value: id,
        label: name
    }));

    return (
        <Container size="xl" p="md">
            <Title order={2} mb="md">Quản Lý Nhà</Title>

            {/* Control bar */}
            <Paper p="md" mb="md">
                <Group justify="space-between">
                    <TextInput
                        placeholder="Tìm kiếm theo địa chỉ hoặc quản lý..."
                        icon={<FaSearch size={14} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        style={{ flexGrow: 1 }}
                    />
                    <Button
                        leftSection={<FaPlus size={14} />}
                        onClick={openCreateModal}
                    >
                        Thêm Nhà
                    </Button>
                </Group>
            </Paper>            {/* Content with responsive design using Tailwind */}
            {!loading && (
                <>
                    <div className="">
                        <TableView />
                    </div>
                    {/* <div className="block md:hidden">
                        <CardView />
                    </div> */}
                </>
            )}

            {/* Create Modal */}
            <Modal
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Thêm Nhà Mới"
                centered
            >
                <Stack>
                    <TextInput
                        label="Địa chỉ"
                        placeholder="Nhập địa chỉ nhà"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.currentTarget.value)}
                        required
                    />
                    <Select
                        label="Quản lý"
                        placeholder="Chọn quản lý"
                        data={managerOptions}
                        value={formData.manager_id}
                        onChange={(value) => handleInputChange('manager_id', value)}
                        required
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreateHouse}>Tạo</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Modal */}
            <Modal
                opened={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Chỉnh Sửa Nhà"
                centered
            >
                <Stack>
                    <TextInput
                        label="Địa chỉ"
                        placeholder="Nhập địa chỉ nhà"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.currentTarget.value)}
                        required
                    />
                    <Select
                        label="Quản lý"
                        placeholder="Chọn quản lý"
                        data={managerOptions}
                        value={formData.manager_id}
                        onChange={(value) => handleInputChange('manager_id', value)}
                        required
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleUpdateHouse}>Cập nhật</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Xác nhận xóa"
                centered
            >
                <Text mb="md">
                    Bạn có chắc chắn muốn xóa nhà tại địa chỉ "{currentHouse?.address}"?
                </Text>
                <Group justify="flex-end">
                    <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Hủy</Button>
                    <Button color="red" onClick={handleDeleteHouse}>Xóa</Button>
                </Group>
            </Modal>
        </Container>
    );
};

export default HouseManagePage