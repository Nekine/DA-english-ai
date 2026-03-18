import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/components/AuthContext';

const LoginAlt: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
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

            const { data, error } = await supabase
                .from('user')
                .select('*')
                .eq('tendangnhap', formData.username)
                .eq('password', formData.password)
                .single();

            if (error || !data) {
                throw new Error('Thông tin đăng nhập không đúng');
            }

            login(data);

            toast({
                title: "Đăng nhập thành công",
                description: `Chào mừng ${data.tendangnhap} quay trở lại!`,
                variant: "default",
            });

            navigate('/index');

        } catch (error) {
            console.error('Login error:', error);
            toast({
                title: "Đăng nhập thất bại",
                description: "Tên đăng nhập hoặc mật khẩu không đúng",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl font-bold mb-6">BTL</h1>
                        <p className="text-xl mb-8 text-white/90">
                            Nền tảng học tiếng Anh thông minh
                        </p>
                        <div className="space-y-4 text-white/80">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-white rounded-full" />
                                <span>Từ điển thông minh với AI</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-white rounded-full" />
                                <span>Bài tập tương tác phong phú</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-white rounded-full" />
                                <span>Trò chuyện với AI assistant</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                <div className="absolute bottom-32 right-32 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full blur-lg" />
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md space-y-8"
                >
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-foreground">Chào mừng trở lại</h2>
                        <p className="text-muted-foreground">
                            Đăng nhập để tiếp tục hành trình học tập của bạn
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-sm font-medium">
                                    Tên đăng nhập
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="Nhập tên đăng nhập"
                                        className="pl-10 h-12 border-border focus:border-primary"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Mật khẩu
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nhập mật khẩu"
                                        className="pl-10 pr-10 h-12 border-border focus:border-primary"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <Link to="/forgot-password" className="text-primary hover:underline">
                                Quên mật khẩu?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-medium"
                            disabled={isLoading}
                        >
                            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="text-primary font-medium hover:underline">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>

                    {/* Back to original login */}
                    <div className="text-center">
                        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                            Quay về trang đăng nhập cũ
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginAlt;