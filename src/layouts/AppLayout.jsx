import classes from '../styles/AppLayout.module.css';
import { useDisclosure } from '@mantine/hooks';
import BEKIND_LOGO from '../assets/bekind.png'
import { HiHome, HiKey, HiLogin, HiUser, HiLogout } from 'react-icons/hi'
import useAccountStore from '../stores/account.store';
import { AppShell, Button, Group, Text, Modal, Paper } from '@mantine/core';
import { Burger } from '@mantine/core';
import { Skeleton } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

export default function AppLayout() {
    const navigate = useNavigate();
    const [opened, { toggle }] = useDisclosure();
    const path = useLocation().pathname;
    const account = useAccountStore((state) => state.account);
    const clearAccount = useAccountStore((state) => state.clearAccount);
    const [active, setActive] = useState(path || '/quan-ly-khach');

    // Logout modal state
    const [logoutModalOpened, setLogoutModalOpened] = useState(false);

    useEffect(() => {
        // if path is "/", auto navigate to "/quan-ly-khach"
        if (path === '/') {
            navigate('/quan-ly-khach');
            setActive('/quan-ly-khach');
        }
    }, [path, navigate]);

    useEffect(() => {
        if (!account) {
            navigate('/dang-nhap');
        }
    }, [account])

    const data = [
        { link: '/quan-ly-khach', label: 'Quản lý khách hàng', icon: HiUser },
        ...(account?.role === "Quản trị viên"
            ? [
                { link: '/quan-ly-tai-khoan', label: 'Quản lý tài khoản', icon: HiKey },
                { link: '/quan-ly-nha', label: 'Quản lý nhà', icon: HiHome },
            ]
            : []),
    ];

    const links = data.map((item) => (
        <a
            className={classes.link}
            data-active={item.link === active || undefined}
            href={item.link}
            key={item.label}
            onClick={(event) => {
                event.preventDefault();
                setActive(item.link);
                navigate(item.link);
            }}
        >
            <item.icon className={classes.linkIcon} stroke={1.5} />
            <span>{item.label}</span>
        </a>
    ));

    // Handle logout confirmation
    const handleLogout = () => {
        clearAccount();
        setLogoutModalOpened(false);
        navigate('/dang-nhap');
    };

    return (
        <AppShell
            header={{ height: { base: 60, md: 70, lg: 80 } }}
            navbar={{
                width: { base: 200, md: 300, lg: 400 },
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >

            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <img src={BEKIND_LOGO} alt="BeKind Logo" className="h-10 w-auto" />
                    {account && (
                        <Text fw={500} size="sm" ml="auto">
                            {account.full_name} ({account.role})
                        </Text>
                    )}
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md">
                {links}
                <Button
                    mt="auto"
                    leftIcon={<HiLogout />}
                    // color="red" 
                    // variant="light"
                    onClick={() => setLogoutModalOpened(true)}
                >
                    Đăng xuất
                </Button>
            </AppShell.Navbar>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>

            {/* Logout Confirmation Modal */}
            <Modal
                opened={logoutModalOpened}
                onClose={() => setLogoutModalOpened(false)}
                title={
                    <Text fw={700} size="lg">Xác nhận đăng xuất</Text>
                }
                centered
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <Paper p="md" withBorder shadow="sm" radius="md" bg="gray.0">
                    <Text>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</Text>
                    <Text size="sm" c="dimmed" mt="xs">
                        Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.
                    </Text>
                </Paper>

                <Group position="right" mt="md">
                    <Button variant="default" onClick={() => setLogoutModalOpened(false)}>
                        Hủy bỏ
                    </Button>
                    <Button color="red" onClick={handleLogout}>
                        Đăng xuất
                    </Button>
                </Group>
            </Modal>
        </AppShell>
    );
}