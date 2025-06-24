import { SegmentedControl, TextInput, Button, Select, Paper, Title, Stack, LoadingOverlay } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { getAccountByPhone, createAccount } from '../services/account.service'
import useAccountStore from '../stores/account.store'
import { useNavigate } from 'react-router-dom'

const AuthenticationPage = () => {
    const [activeTab, setActiveTab] = useState('Đăng nhập')
    const [isLoading, handlers] = useDisclosure(false)

    // Login form
    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
        reset: resetLoginForm
    } = useForm({
        defaultValues: {
            loginPhoneNumber: ''
        }
    })

    // Signup form
    const {
        register: registerSignup,
        handleSubmit: handleSubmitSignup,
        formState: { errors: signupErrors },
        reset: resetSignupForm
    } = useForm({
        defaultValues: {
            signupPhoneNumber: '',
            fullName: '',
            role: ''
        }
    })

    // Reset appropriate form when changing tabs
    useEffect(() => {
        if (activeTab === 'Đăng nhập') {
            resetSignupForm();
        } else {
            resetLoginForm();
        }
    }, [activeTab, resetLoginForm, resetSignupForm]);

    const handleTabChange = (value) => {
        setActiveTab(value);
    }

    const onLoginSubmit = async (data) => {
        handlers.open() // Start loading

        try {
            await handleLogin(data.loginPhoneNumber)
        } finally {
            handlers.close() // Stop loading regardless of outcome
        }
    }

    const onSignupSubmit = async (data) => {
        handlers.open() // Start loading

        try {
            await handleSignup(data.fullName, data.signupPhoneNumber, data.role)
        } finally {
            handlers.close() // Stop loading regardless of outcome
        }
    }

    const setAccount = useAccountStore((state) => state.setAccount)
    const navigate = useNavigate()
    const handleLogin = async (phoneNumber) => {
        try {
            const account = await getAccountByPhone(phoneNumber)

            if (!account) {
                showNotification('Thông báo', 'Số điện thoại không tồn tại trong hệ thống', 'error')
                return
            }
            setAccount(account)


            showNotification('Đăng nhập thành công', 'Chào mừng bạn đã quay trở lại!', 'success')
            navigate("/")
            // Here you would normally redirect user to dashboard or home page
            // For example: navigate('/dashboard')
            console.log('Successfully logged in:', account)
        } catch (error) {
            showNotification('Lỗi đăng nhập', error.message || 'Đã xảy ra lỗi khi đăng nhập', 'error')
            console.error('Login error:', error)
        }
    }

    const handleSignup = async (fullName, phoneNumber, role) => {
        try {
            const [newAccount, message] = await createAccount(
                fullName,
                phoneNumber,
                mapRoleValue(role)
            )

            if (!newAccount) {
                showNotification('Thông báo', message, 'error')
                return
            }

            showNotification('Đăng ký thành công', 'Tài khoản của bạn đã được tạo thành công!', 'success')

            // Automatically switch to login tab
            setActiveTab('Đăng nhập')

            // Reset signup form
            resetSignupForm()
        } catch (error) {
            showNotification('Lỗi đăng ký', error.message || 'Đã xảy ra lỗi khi đăng ký', 'error')
            console.error('Signup error:', error)
        }
    }

    // Helper function to map UI role values to database role values
    const mapRoleValue = (uiRole) => {
        const roleMap = {
            'buyer': 'Người mua',
            'seller': 'Người bán',
            'admin': 'Quản trị viên'
        }
        return roleMap[uiRole] || uiRole
    }

    const showNotification = (title, message, type = 'default') => {
        const notificationProps = {
            title,
            message,
            autoClose: 5000
        }

        switch (type) {
            case 'success':
                notifications.show({
                    ...notificationProps,
                    color: 'green',
                    icon: <CheckIcon />
                })
                break
            case 'error':
                notifications.show({
                    ...notificationProps,
                    color: 'red',
                    icon: <CrossIcon />
                })
                break
            default:
                notifications.show(notificationProps)
        }
    }

    // Simple icon components
    const CheckIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.25 5.75L7.75 14.25L3.75 10.25"></path>
        </svg>
    )

    const CrossIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5L5 15"></path>
            <path d="M5 5L15 15"></path>
        </svg>
    )

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 md:p-4'>
            <Paper shadow="lg" p="lg" md:p="xl" className="w-full max-w-sm md:max-w-md relative">
                <LoadingOverlay
                    visible={isLoading}
                    overlayProps={{ radius: "sm", blur: 2 }}
                    loaderProps={{ color: 'blue', size: 'xl', variant: 'bars' }}
                />

                <Stack spacing="xl">                    <Title order={1} ta="center" className="text-yellow-500 text-2xl md:text-3xl">
                    Bekind Sales
                </Title>

                    <SegmentedControl
                        size="lg"
                        data={['Đăng nhập', 'Đăng ký']}
                        value={activeTab}
                        onChange={handleTabChange}
                        fullWidth
                    />

                    {activeTab === 'Đăng nhập' ? (
                        <form onSubmit={handleSubmitLogin(onLoginSubmit)} key="login-form">
                            <Stack spacing="lg">
                                <TextInput

                                    size="lg"
                                    label="Số điện thoại đăng nhập"
                                    placeholder="Nhập số điện thoại"
                                    error={loginErrors.loginPhoneNumber?.message}
                                    styles={{
                                        input: { fontSize: '16px', minHeight: '48px' },
                                        label: { fontSize: '16px', fontWeight: 500 }
                                    }}
                                    className="transition-all duration-300"
                                    {...registerLogin('loginPhoneNumber', {
                                        required: 'Vui lòng nhập số điện thoại',
                                        pattern: {
                                            value: /^[0-9]{10,11}$/,
                                            message: 'Số điện thoại phải có 10-11 chữ số'
                                        }
                                    })}
                                />

                                <Button
                                    fullWidth

                                    size="lg"
                                    type="submit"
                                    disabled={isLoading}
                                    className={`mt-6 transition-all duration-300 ${isLoading ? 'bg-opacity-80' : 'hover:bg-opacity-90 hover:shadow-lg'}`}
                                    styles={{
                                        root: {
                                            minHeight: '52px',
                                            fontSize: '18px',
                                            fontWeight: 600
                                        }
                                    }}
                                >
                                    Đăng nhập
                                </Button>
                            </Stack>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitSignup(onSignupSubmit)} key="signup-form">
                            <Stack spacing="lg">
                                <TextInput

                                    size="lg"
                                    label="Số điện thoại đăng ký"
                                    placeholder="Nhập số điện thoại mới"
                                    error={signupErrors.signupPhoneNumber?.message}
                                    styles={{
                                        input: { fontSize: '16px', minHeight: '48px' },
                                        label: { fontSize: '16px', fontWeight: 500 }
                                    }}
                                    className="transition-all duration-300"
                                    {...registerSignup('signupPhoneNumber', {
                                        required: 'Vui lòng nhập số điện thoại',
                                        pattern: {
                                            value: /^[0-9]{10,11}$/,
                                            message: 'Số điện thoại phải có 10-11 chữ số'
                                        }
                                    })}
                                />

                                <TextInput

                                    size="lg"
                                    label="Họ và tên"
                                    placeholder="Nhập họ và tên"
                                    error={signupErrors.fullName?.message}
                                    styles={{
                                        input: { fontSize: '16px', minHeight: '48px' },
                                        label: { fontSize: '16px', fontWeight: 500 }
                                    }}
                                    className="transition-all duration-300"
                                    {...registerSignup('fullName', {
                                        required: 'Vui lòng nhập họ và tên',
                                        minLength: {
                                            value: 2,
                                            message: 'Tên phải có ít nhất 2 ký tự'
                                        }
                                    })}
                                />

                                <Select
                                    label="Vai trò"

                                    size="lg"
                                    placeholder="Chọn vai trò"
                                    error={signupErrors.role?.message}
                                    data={[
                                        { value: 'buyer', label: 'Người mua' },
                                        { value: 'seller', label: 'Người bán' },
                                        { value: 'admin', label: 'Quản trị viên' }
                                    ]}
                                    styles={{
                                        input: { fontSize: '16px', minHeight: '48px' },
                                        label: { fontSize: '16px', fontWeight: 500 }
                                    }}
                                    className="transition-all duration-300"
                                    {...registerSignup('role', {
                                        required: 'Vui lòng chọn vai trò'
                                    })}
                                />

                                <Button
                                    fullWidth

                                    size="lg"
                                    type="submit"
                                    disabled={isLoading}
                                    className={`mt-6 transition-all duration-300 ${isLoading ? 'bg-opacity-80' : 'hover:bg-opacity-90 hover:shadow-lg'}`}
                                    styles={{
                                        root: {
                                            minHeight: '52px',
                                            fontSize: '18px',
                                            fontWeight: 600
                                        }
                                    }}
                                >
                                    Đăng ký
                                </Button>
                            </Stack>
                        </form>
                    )}
                </Stack>
            </Paper>
        </div>
    )
}

export default AuthenticationPage