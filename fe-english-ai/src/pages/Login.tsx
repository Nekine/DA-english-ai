import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { LockKeyhole, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/ThemeProvider';
import { authService } from '@/services/authService';
import { useAuth } from '@/components/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { theme } = useTheme();
    const { login } = useAuth();
    const { loginWithRedirect } = useAuth0();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCheckboxChange = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            rememberMe: checked,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username.trim() || !formData.password.trim()) {
            toast({
                title: "Thông tin không hợp lệ",
                description: "Vui lòng nhập tên đăng nhập và mật khẩu",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);

            // Gọi API backend để đăng nhập
            const response = await authService.login({
                emailOrUsername: formData.username,
                password: formData.password,
                rememberMe: formData.rememberMe,
            });

            if (!response.success) {
                throw new Error(response.message || 'Đăng nhập thất bại');
            }

            // Lưu thông tin user vào context (nếu cần)
            if (response.user) {
                login(response.user);
            }

            toast({
                title: "Đăng nhập thành công",
                description: response.message || `Chào mừng ${response.user?.username || response.user?.email} quay trở lại!`,
                variant: "default",
            });

            // Điều hướng dựa trên role
            if (response.user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/index');
            }

        } catch (error: unknown) {
            console.error('Login error:', error);
            const errorMessage = error instanceof Error ? error.message : "Tên đăng nhập hoặc mật khẩu không đúng";
            toast({
                title: "Đăng nhập thất bại",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-950 dark:via-rose-950 dark:to-fuchsia-950 px-4 py-8 ${theme === 'dark' ? 'dark' : ''}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center mb-8">
                    <Link to="/" className="flex items-center gap-2 mb-6">
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary via-dictionary to-exercises bg-clip-text text-transparent">EngBuddy</span>
                    </Link>
                    <h1 className="text-3xl font-bold dark:text-white mb-2">Đăng nhập</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-center">
                        Đăng nhập để tiếp tục hành trình học tiếng Anh của bạn
                    </p>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                                Tên đăng nhập
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder="Nhập tên đăng nhập"
                                    className="pl-10 py-6 rounded-xl text-base dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                                Mật khẩu
                            </Label>
                            <div className="relative">
                                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu"
                                    className="pl-10 pr-10 py-6 rounded-xl text-base dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="rememberMe"
                                    checked={formData.rememberMe}
                                    onCheckedChange={handleCheckboxChange}
                                    disabled={isLoading}
                                />
                                <Label
                                    htmlFor="rememberMe"
                                    className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                                >
                                    Ghi nhớ đăng nhập
                                </Label>
                            </div>
                            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                                Quên mật khẩu?
                            </Link>
                        </div>
                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-medium bg-primary hover:bg-primary/90"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin mr-2">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                    </span>
                                    Đang đăng nhập...
                                </>
                            ) : 'Đăng nhập'}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="mt-6 mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                    Hoặc đăng nhập với
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="flex justify-center gap-3">
                        {/* Google Button */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-[calc(50%-6px)] py-4 text-sm font-medium bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                            disabled={isLoading}
                            onClick={async () => {
                                try {
                                    setIsLoading(true);
                                    await loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } });
                                } catch (err) {
                                    console.error('Auth0 Google login error', err);
                                    toast({ title: 'Lỗi đăng nhập', description: 'Không thể đăng nhập bằng Google', variant: 'destructive' });
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google
                        </Button>

                        {/* Facebook Button */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-[calc(50%-6px)] py-4 text-sm font-medium bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                            disabled={isLoading}
                            onClick={async () => {
                                try {
                                    setIsLoading(true);
                                    await loginWithRedirect({ authorizationParams: { connection: 'facebook' } });
                                } catch (err) {
                                    console.error('Auth0 Facebook login error', err);
                                    toast({ title: 'Lỗi đăng nhập', description: 'Không thể đăng nhập bằng Facebook', variant: 'destructive' });
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook
                        </Button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="text-primary font-medium hover:underline">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </motion.div>
                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>© {new Date().getFullYear()} EngBuddy. All rights reserved.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;