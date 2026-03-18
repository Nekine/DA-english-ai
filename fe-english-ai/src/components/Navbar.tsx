import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Book, GraduationCap, MessageCircle, User, Sun, Moon, Globe, Settings, LogOut, UserCircle, Pencil, FileText, Trophy, TrendingUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from './ui/sheet';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth0Integration } from '@/hooks/useAuth0Integration';

const Navbar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, login, logout } = useAuth();
  const { handleLogout: auth0Logout } = useAuth0Integration();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    email: user?.email || '',
  });

  const navItems = [
    { name: 'Bảng xếp hạng', path: '/leaderboard', icon: Trophy, color: 'text-yellow-600' },
    { name: 'Tiến độ', path: '/progress', icon: TrendingUp, color: 'text-blue-600' },
    { name: 'AI Chat', path: '/chat', icon: MessageCircle, color: 'text-rose-600' },
    { name: 'Từ điển', path: '/dictionary', icon: Book, color: 'text-pink-600' },
    { 
      name: 'Bài tập', 
      icon: GraduationCap, 
      color: 'text-fuchsia-600',
      subItems: [
        { name: 'Ngữ pháp', path: '/exercises' },
        { name: 'Luyện nghe', path: '/listening' },
        { name: 'Luyện nói', path: '/speaking' },
        { name: 'Đọc hiểu', path: '/reading-exercises' },
        { name: 'Viết', path: '/writing-mode' },
      ]
    },
    { name: 'Luyện Đề TOEIC', path: '/test-list', icon: FileText, color: 'text-blue-600' },
  ];

  const handleLogout = async () => {
    await auth0Logout();
    navigate('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditToggle = () => {
    setIsEditing(true);
    setFormData({
      username: user?.username || '',
      fullName: user?.fullName || '',
      email: user?.email || '',
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // TODO: Call backend API to update user profile
      // For now, just update local state
      login({ 
        ...user, 
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email,
      });

      toast({
        title: "Cập nhật thành công",
        description: "Thông tin cá nhân đã được lưu.",
        variant: "default",
      });

      setIsEditing(false);
    } catch (error: unknown) {
      console.error('Update error:', error);
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra khi lưu thông tin. Vui lòng kiểm tra lại.";
      toast({
        title: "Cập nhật thất bại",
        description: message,
        variant: "destructive",
      });
    }
  };



  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-lg bg-background/80 dark:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/index" className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              EngBuddy
            </span>
          </motion.div>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          {navItems.map((item) => {
            // Check if item has submenu
            if (item.subItems) {
              const isAnySubActive = item.subItems.some(sub => location.pathname === sub.path);
              return (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all duration-200 relative",
                        isAnySubActive 
                          ? "text-foreground bg-slate-100 dark:bg-slate-800" 
                          : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      <span>{item.name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {item.subItems.map((subItem) => (
                      <DropdownMenuItem key={subItem.path} asChild>
                        <Link to={subItem.path} className="cursor-pointer flex items-center gap-2">
                          <span className={cn("w-1.5 h-1.5 rounded-full", item.color.replace('text-', 'bg-'))} />
                          {subItem.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            // Regular nav item
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all duration-200",
                  isActive 
                    ? "text-foreground bg-slate-100 dark:bg-slate-800" 
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", item.color)} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        

        <div className="flex items-center gap-4">
          <Link to="/pricing">
            <Button 
              variant={location.pathname === "/pricing" ? "default" : "ghost"}
              size="sm"
            >
              Premium
            </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-border relative">
                <User className="h-5 w-5" />
                {user && user.accountType === 'premium' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background"></span>
                )}
                <span className="sr-only">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-medium">
                <div className="flex flex-col space-y-1">
                  <span>{user ? `Xin chào, ${user.username || user.fullName}` : 'Khách'}</span>
                  {user && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.accountType === 'premium' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                          Premium
                          {user.premiumExpiresAt && (
                            <span className="ml-1">- Hết hạn: {new Date(user.premiumExpiresAt).toLocaleDateString('vi-VN')}</span>
                          )}
                          {!user.premiumExpiresAt && (
                            <span className="ml-1">- Vĩnh viễn</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                          Free
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {user ? (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Thông tin cá nhân</span>
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Thông tin cá nhân</DialogTitle>
                        <DialogDescription>
                          Xem và cập nhật thông tin tài khoản của bạn
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="flex items-center justify-center mb-6">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary">
                              <UserCircle className="w-20 h-20 text-muted-foreground" />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute bottom-0 right-0 rounded-full size-8 p-0"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isEditing ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="username" className="font-medium text-sm">Tên đăng nhập</Label>
                              <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fullName" className="font-medium text-sm">Họ và tên</Label>
                              <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="font-medium text-sm">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Vai trò</h4>
                              <p className="text-muted-foreground">{user?.role || 'user'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Tên đăng nhập</h4>
                              <p className="text-muted-foreground">{user?.username || 'Chưa có'}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Họ và tên</h4>
                              <p className="text-muted-foreground">{user?.fullName || 'Chưa có'}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Email</h4>
                              <p className="text-muted-foreground">{user?.email || 'Chưa có'}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Vai trò</h4>
                              <p className="text-muted-foreground">{user?.role || 'user'}</p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Loại tài khoản</h4>
                              <p className="text-muted-foreground">
                                {user?.accountType === 'premium' ? (
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                    Premium
                                    {user.premiumExpiresAt && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (Hết hạn: {new Date(user.premiumExpiresAt).toLocaleDateString('vi-VN')})
                                      </span>
                                    )}
                                    {!user.premiumExpiresAt && (
                                      <span className="text-xs text-muted-foreground ml-1">(Vĩnh viễn)</span>
                                    )}
                                  </span>
                                ) : (
                                  'Free'
                                )}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        {isEditing ? (
                          <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                              Hủy
                            </Button>
                            <Button onClick={handleSave}>Lưu thay đổi</Button>
                          </>
                        ) : (
                          <Button variant="outline" onClick={handleEditToggle}>
                            Chỉnh sửa
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Sheet>
                    <SheetTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Cài đặt</span>
                      </DropdownMenuItem>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Cài đặt</SheetTitle>
                        <SheetDescription>
                          Tùy chỉnh các thiết lập cho ứng dụng
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-4 space-y-6">
                        <div className="space-y-4">
                          <h3 className="font-medium">Giao diện</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Chế độ tối</span>
                            <Button variant="outline" size="sm" onClick={toggleTheme}>
                              {theme === 'dark' ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
                              {theme === 'dark' ? 'Sáng' : 'Tối'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <SheetFooter>
                        <Button variant="outline">Hủy</Button>
                        <Button>Lưu thay đổi</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>

                  {/* Admin access - chỉ hiển thị cho admin */}
                  {(user.role === 'admin' || 
                    user.role === 'super_admin' ||
                    user.email?.includes('admin')) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Quản trị hệ thống</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate('/login')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Đăng nhập</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/register')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Đăng ký</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Sheet>
                    <SheetTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Cài đặt</span>
                      </DropdownMenuItem>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Cài đặt</SheetTitle>
                        <SheetDescription>
                          Tùy chỉnh các thiết lập cho ứng dụng
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-4 space-y-6">
                        <div className="space-y-4">
                          <h3 className="font-medium">Giao diện</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Chế độ tối</span>
                            <Button variant="outline" size="sm" onClick={toggleTheme}>
                              {theme === 'dark' ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
                              {theme === 'dark' ? 'Sáng' : 'Tối'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <SheetFooter>
                        <Button variant="outline">Hủy</Button>
                        <Button>Lưu thay đổi</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="md:hidden flex items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-center",
                location.pathname === item.path ? item.color : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Navbar;