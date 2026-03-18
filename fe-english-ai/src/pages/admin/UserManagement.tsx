
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, UserCheck, UserX, AlertCircle, RefreshCw, Users as UsersIcon, Shield, GraduationCap, Ban, History, User as UserIcon, TrendingUp, BookOpen, AlertTriangle, BarChart3, Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import userService, { User, UserStatistics, PaginationInfo } from '@/services/userService';
import { StatusReasonDialog } from '@/components/StatusReasonDialog';
import { ConfirmStatusDialog } from '@/components/ConfirmStatusDialog';
import { UserStatusHistoryDialog } from '@/components/UserStatusHistoryDialog';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { UserStatisticsCharts } from '@/components/UserStatisticsCharts';
import { PremiumExpirationPanel } from '@/components/admin/PremiumExpirationPanel';

// Memoized Statistics Cards component to prevent re-render
const StatisticsCards = React.memo(({ statistics, allUsers, isLoading }: { statistics: UserStatistics | null, allUsers: User[], isLoading: boolean }) => {
  const premiumCount = allUsers.filter(u => u.AccountType === 'premium').length;
  const activeCount = allUsers.filter(u => u.Status === 'active').length;
  const premiumRate = allUsers.length > 0 ? Math.round((premiumCount / allUsers.length) * 100) : 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Tổng học viên */}
      <Card className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng học viên</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading || !statistics ? '...' : statistics.TotalUsers}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <UsersIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Đang hoạt động */}
      <Card className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Đang hoạt động</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {isLoading ? '...' : activeCount}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <UserCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mới tháng này */}
      <Card className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mới tháng này</p>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                {isLoading || !statistics ? '...' : statistics.NewThisMonth}
              </p>
            </div>
            <div className="p-3 bg-pink-100 dark:bg-pink-900/40 rounded-xl">
              <TrendingUp className="h-7 w-7 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium */}
      <Card className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Premium</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {isLoading ? '...' : premiumCount}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <Shield className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tỷ lệ Premium */}
      <Card className="rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tỷ lệ Premium</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {isLoading ? '...' : `${premiumRate}%`}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
              <TrendingUp className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

StatisticsCards.displayName = 'StatisticsCards';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users for stats
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Filtered users for search
  const [searchQuery, setSearchQuery] = useState(''); // Search query
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Status filter
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all'); // Account type filter
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    CurrentPage: 1,
    PageSize: 8,
    TotalCount: 0,
    TotalPages: 0,
    HasPrevious: false,
    HasNext: false
  });
  const [loading, setLoading] = useState(true); // Initial full page load
  const [paginationLoading, setPaginationLoading] = useState(false); // Loading when changing pages
  const [searchLoading, setSearchLoading] = useState(false); // Loading when searching
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('student'); // Default to show students only
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  
  // Status reason dialog state
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingStatusWithReason, setPendingStatusWithReason] = useState<{
    userId: number;
    username: string;
    currentStatus: string;
    newStatus: 'active' | 'inactive' | 'banned';
  } | null>(null);
  
  // User status history dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{
    userId: number;
    username: string;
  } | null>(null);
  
  // User profile dialog state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<number | null>(null);
  
  // Confirm dialog state (not used anymore, keeping for backward compatibility)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    userId: number;
    username: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);

  // Prevent duplicate toasts with ref
  const isExecutingRef = useRef(false); // Prevent concurrent executions

  // Fetch initial data (statistics and all users) - only once
  const fetchInitialData = useCallback(async () => {
    try {
      console.log('[UserManagement] Fetching initial data...');
      
      // Fetch statistics
      const stats = await userService.getUserStatistics();
      setStatistics(stats);
      console.log('[UserManagement] Statistics fetched:', stats);
      
      // Fetch all users for stats calculation
      const allData = await userService.getAllUsers();
      setAllUsers(allData);
      console.log('[UserManagement] All users fetched:', allData.length);
    } catch (err) {
      console.error('[UserManagement] Error fetching initial data:', err);
    }
  }, []);

  // Fetch users from API (paginated)
  const fetchUsers = useCallback(async (page: number = 1, isInitialLoad: boolean = false) => {
    try {
      // Use different loading state based on whether it's initial load or pagination
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setPaginationLoading(true);
      }
      setError(null);
      
      console.log('[UserManagement] Fetching users, page:', page, 'filter:', filter, 'search:', searchQuery, 'status:', statusFilter);
      
      // Fetch paginated users with search query, status filter, and account type filter
      const response = await userService.getUsers(
        page, 
        8, 
        filter === 'all' ? undefined : filter,
        searchQuery || undefined,
        statusFilter === 'all' ? undefined : statusFilter,
        accountTypeFilter === 'all' ? undefined : accountTypeFilter
      );
      console.log('[UserManagement] Users fetched:', response);
      setUsers(response.Data);
      setPagination(response.Pagination);
    } catch (err) {
      console.error('[UserManagement] Error fetching users:', err);
      setError('Không thể tải danh sách người dùng. Vui lòng thử lại sau.');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setPaginationLoading(false);
      }
    }
  }, [filter, searchQuery, statusFilter, accountTypeFilter]);

  // Initial load
  useEffect(() => {
    fetchInitialData(); // Fetch stats and all users once
    fetchUsers(1, true); // Fetch first page with initial load flag
  }, [fetchInitialData, fetchUsers]);

  // Sync filteredUsers with users (no client-side filtering needed, all done server-side)
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  // Debounce search query - trigger API call when user stops typing
  useEffect(() => {
    // Show loading immediately when user types
    if (searchQuery) {
      setSearchLoading(true);
    }

    const timer = setTimeout(() => {
      // Reset to page 1 when search query changes
      fetchUsers(1, false);
      setSearchLoading(false);
    }, 300); // 300ms debounce - faster response

    return () => {
      clearTimeout(timer);
      setSearchLoading(false);
    };
  }, [searchQuery, fetchUsers]);

  // Status filter change - immediately trigger API call (no debounce)
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip on first render to avoid double fetch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Reset to page 1 when status filter changes
    fetchUsers(1, false);
  }, [statusFilter, fetchUsers]);

  // Handle initial status change click (show reason dialog for ALL status changes)
  const handleStatusChangeClick = (userId: number, username: string, currentStatus: string, newStatus: 'active' | 'inactive' | 'banned') => {
    if (currentStatus === newStatus) return;

    console.log('handleStatusChangeClick called:', { userId, username, currentStatus, newStatus });

    // All status changes now require a reason
    setPendingStatusWithReason({ userId, username, currentStatus, newStatus });
    setReasonDialogOpen(true);
  };

  // Execute the actual status change after confirmation
  const executeStatusChange = useCallback(async (
    userId: number, 
    username: string, 
    newStatus: string, 
    reasonNote?: string,
    reasonCode?: string
  ) => {
    // Prevent concurrent executions
    if (isExecutingRef.current) {
      console.log('Already executing, skipping...');
      return;
    }

    const statusLabels: Record<string, string> = {
      'active': 'Kích hoạt',
      'inactive': 'Tạm khóa',
      'banned': 'Cấm vĩnh viễn'
    };

    try {
      isExecutingRef.current = true;
      setUpdatingUserId(userId);
      setError(null);

      // Use provided reasonCode, fallback to 'OTHER' if not provided
      const finalReasonCode = reasonCode || 'OTHER';
      // TODO: Get changedByUserID from auth context (logged-in admin)
      const changedByUserID = 1; // Temporary hardcode

      await userService.updateUserStatus(
        userId, 
        newStatus, 
        finalReasonCode, 
        reasonNote, 
        changedByUserID
      );

      // Update local state for both filtered users and all users
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.UserID === userId ? { ...u, Status: newStatus } : u
        )
      );
      
      setAllUsers(prevAllUsers =>
        prevAllUsers.map(u =>
          u.UserID === userId ? { ...u, Status: newStatus } : u
        )
      );

      // Refresh statistics after status change
      try {
        const stats = await userService.getUserStatistics();
        setStatistics(stats);
      } catch (statErr) {
        console.error('Error refreshing statistics:', statErr);
      }

      // Success - no toast notification, UI updates automatically
      console.log(`✅ Status updated successfully for user ${userId} to ${newStatus}`, {
        reasonCode: finalReasonCode,
        reasonNote
      });
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Không thể cập nhật trạng thái. Vui lòng thử lại sau.');
      
      // Show error toast with unique ID
      toast.error('❌ Không thể cập nhật trạng thái', {
        id: `status-error-${userId}`,
        description: 'Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
        duration: 4000,
      });
    } finally {
      setUpdatingUserId(null);
      isExecutingRef.current = false;
    }
  }, []); // Empty deps - function is stable

  // Handle confirm from confirm dialog
  const handleConfirmStatusChange = useCallback(() => {
    console.log('handleConfirmStatusChange called:', pendingStatusChange);
    if (pendingStatusChange) {
      executeStatusChange(
        pendingStatusChange.userId,
        pendingStatusChange.username,
        pendingStatusChange.newStatus
      );
      setPendingStatusChange(null);
      setConfirmDialogOpen(false); // Close dialog explicitly
    }
  }, [pendingStatusChange, executeStatusChange]);

  // Handle status change with reason
  const handleStatusChangeWithReason = useCallback((reasonCode: string, reasonNote: string) => {
    console.log('handleStatusChangeWithReason called:', { pendingStatusWithReason, reasonCode, reasonNote });
    if (pendingStatusWithReason) {
      executeStatusChange(
        pendingStatusWithReason.userId,
        pendingStatusWithReason.username,
        pendingStatusWithReason.newStatus,
        reasonNote, // Pass reasonNote
        reasonCode  // Pass reasonCode
      );
      setPendingStatusWithReason(null);
      setReasonDialogOpen(false); // Close dialog explicitly
    }
  }, [pendingStatusWithReason, executeStatusChange]);

  // Handle open status history dialog
  const handleOpenHistory = (userId: number, username: string) => {
    setSelectedUserForHistory({ userId, username });
    setHistoryDialogOpen(true);
  };

  // Handle open profile dialog
  const handleOpenProfile = (userId: number) => {
    setSelectedUserForProfile(userId);
    setProfileDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'active': { label: 'Hoạt động', className: 'bg-green-500 dark:bg-green-600 text-white' },
      'inactive': { label: 'Không hoạt động', className: 'bg-gray-500 dark:bg-gray-600 text-white' },
      'banned': { label: 'Bị cấm', className: 'bg-red-500 dark:bg-red-600 text-white' }
    };
    
    const statusInfo = statusMap[status] || statusMap['inactive'];
    return (
      <Badge variant="default" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string; icon: typeof Shield }> = {
      'admin': { 
        label: 'Quản trị viên', 
        className: 'bg-purple-500 dark:bg-purple-600 text-white',
        icon: Shield
      },
      'student': { 
        label: 'Học viên', 
        className: 'bg-orange-500 dark:bg-orange-600 text-white',
        icon: UsersIcon
      }
    };
    
    const roleInfo = roleMap[role] || roleMap['student'];
    const Icon = roleInfo.icon;
    
    return (
      <Badge variant="secondary" className={roleInfo.className}>
        <Icon className="h-3 w-3 mr-1" />
        {roleInfo.label}
      </Badge>
    );
  };

  const getInitials = (username: string) => {
    const words = username.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[words.length - 1][0];
    }
    return username.substring(0, 2).toUpperCase();
  };

  // Export to Excel function
  const handleExportToExcel = async () => {
    try {
      setSearchLoading(true);
      toast.info('Đang chuẩn bị dữ liệu xuất file...');

      // Fetch all users with current filters
      // Backend limits to 100 per request, so we need to fetch multiple times
      const allUsers: User[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 100; // Maximum allowed by backend

      while (hasMore) {
        const response = await userService.getUsers(
          currentPage, 
          pageSize,
          filter, 
          searchQuery || undefined, 
          statusFilter !== 'all' ? statusFilter : undefined,
          accountTypeFilter !== 'all' ? accountTypeFilter : undefined
        );

        if (response.Data && response.Data.length > 0) {
          allUsers.push(...response.Data);
          
          // Check if there are more pages
          if (currentPage < response.Pagination.TotalPages) {
            currentPage++;
            toast.info(`Đang tải trang ${currentPage}/${response.Pagination.TotalPages}...`);
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (!allUsers || allUsers.length === 0) {
        toast.warning('Không có dữ liệu để xuất');
        setSearchLoading(false);
        return;
      }

      toast.info(`Đang xuất ${allUsers.length} học viên...`);

      // Prepare data for Excel
      const excelData = allUsers.map((user, index) => ({
        'STT': index + 1,
        'ID': user.UserID,
        'Họ và tên': user.FullName || '',
        'Username': user.Username,
        'Email': user.Email || '',
        'Số điện thoại': user.Phone || '',
        'Loại tài khoản': user.AccountType === 'premium' ? 'Premium' : 'Miễn phí',
        'Trạng thái': user.Status === 'active' ? 'Hoạt động' : 
                      user.Status === 'inactive' ? 'Không hoạt động' : 'Bị cấm'
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học viên');

      // Auto-size columns
      const maxWidth = 30;
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.min(
          maxWidth,
          Math.max(
            key.length,
            ...excelData.map(row => String(row[key as keyof typeof row] || '').length)
          )
        )
      }));
      ws['!cols'] = colWidths;

      // Generate filename based on filters
      let filename = 'Danh_sach_hoc_vien';
      
      if (statusFilter !== 'all') {
        const statusName = statusFilter === 'active' ? 'hoat_dong' : 
                          statusFilter === 'inactive' ? 'tam_khoa' : 'bi_cam';
        filename += `_${statusName}`;
      }
      
      if (searchQuery) {
        filename += `_tim_kiem`;
      }
      
      filename += `_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}`;
      filename += '.xlsx';

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success(`Đã xuất ${allUsers.length} học viên thành công!`);
      setSearchLoading(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Lỗi khi xuất file Excel');
      setSearchLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.TotalPages) {
      fetchUsers(newPage);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const current = pagination?.CurrentPage || 1;
    const total = pagination?.TotalPages || 0;

    if (total <= 1) return pages;

    // Always show first page
    pages.push(1);

    // Show pages around current page
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...');
    }

    // Add pages around current
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (end < total - 1) {
      pages.push('...');
    }

    // Always show last page if total > 1
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  };

  // Calculate stats from ALL users, not filtered users
  const userStats = {
    total: allUsers.length,
    premium: allUsers.filter(u => u.AccountType === 'premium').length,
    free: allUsers.filter(u => u.AccountType === 'free').length,
    active: allUsers.filter(u => u.Status === 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý người dùng</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý tài khoản và thông tin người dùng
          </p>
        </div>
        <Button onClick={() => fetchUsers(pagination.CurrentPage)} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Statistics Cards - Memoized to prevent re-render during search/pagination */}
      <StatisticsCards statistics={statistics} allUsers={allUsers} isLoading={loading} />

      {/* Tabs for User List and Statistics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1">
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:shadow-md data-[state=active]:font-semibold"
          >
            <UsersIcon className="h-4 w-4" />
            Danh sách học viên
          </TabsTrigger>
          <TabsTrigger 
            value="statistics" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:shadow-md data-[state=active]:font-semibold"
          >
            <BarChart3 className="h-4 w-4" />
            Biểu đồ thống kê
          </TabsTrigger>
          <TabsTrigger 
            value="premium" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:shadow-md data-[state=active]:font-semibold"
          >
            <Shield className="h-4 w-4" />
            Quản lý Premium
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: User List */}
        <TabsContent value="users" className="mt-6">
          <Card className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                {searchLoading && (
                  <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                )}
                <Input
                  placeholder="Tìm kiếm theo tên, username hoặc ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${searchLoading ? 'pr-10' : ''}`}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] border-blue-200 dark:border-blue-800 focus:ring-blue-500">
                  <Filter className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Tất cả
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Hoạt động
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-yellow-600" />
                      Tạm khóa
                    </div>
                  </SelectItem>
                  <SelectItem value="banned">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-600" />
                      Bị cấm
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                <SelectTrigger className="w-[180px] border-amber-200 dark:border-amber-800 focus:ring-amber-500 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                  <Shield className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                  <SelectValue placeholder="Lọc theo loại tài khoản" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Tất cả
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      Premium
                    </div>
                  </SelectItem>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-gray-600" />
                      Miễn phí
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="default" onClick={handleExportToExcel} disabled={searchLoading}>
              <Download className="mr-2 h-4 w-4" />
              Xuất file
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl"></div>
                    <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Không có người dùng nào'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {/* Pagination loading overlay */}
              {paginationLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Đang tải...</span>
                  </div>
                </div>
              )}
              
              {filteredUsers.map((user, index) => (
                <div 
                  key={user.UserID} 
                  className="group relative flex items-center justify-between p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/30 to-purple-50/0 dark:from-blue-950/0 dark:via-blue-950/10 dark:to-purple-950/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  {/* Left side: STT + ID Badge + Avatar + Info */}
                  <div className="flex items-center space-x-4 relative z-10">
                    {/* STT (Số thứ tự) */}
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-sm shadow-sm">
                      {((pagination?.CurrentPage || 1) - 1) * (pagination?.PageSize || 8) + index + 1}
                    </div>
                    
                    {/* ID Badge */}
                    <div className="flex-shrink-0">
                      <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                        ID: {user.UserID}
                      </Badge>
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-800 shadow-md">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white text-base font-semibold">
                        {getInitials(user.Username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate text-base">
                          {user.FullName || user.Username}
                        </p>
                        {user.AccountType === 'premium' ? (
                          <Badge className="bg-gradient-to-r from-yellow-100 via-amber-100 to-orange-100 text-amber-800 dark:from-yellow-900/40 dark:via-amber-900/40 dark:to-orange-900/40 dark:text-yellow-300 text-xs px-2 py-0.5 flex-shrink-0 border border-amber-200 dark:border-amber-800 shadow-sm">
                            <Shield className="h-3 w-3 mr-0.5" />
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            Miễn phí
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">@{user.Username}</p>
                    </div>
                  </div>
                  
                  {/* Right side: Status Badge + Action Buttons */}
                  <div className="flex items-center space-x-3 relative z-10">
                    {/* Current Status Badge */}
                    <div className="mr-2">
                      {getStatusBadge(user.Status)}
                    </div>
                    
                    {/* Status Action Buttons */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      {/* Active Button */}
                      <Button 
                        variant={user.Status === 'active' ? 'default' : 'ghost'}
                        size="sm" 
                        className={`h-9 px-3 rounded-lg transition-all duration-200 ${
                          user.Status === 'active' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md shadow-green-500/30' 
                            : 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105'
                        } ${user.Status === 'banned' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={user.Status === 'banned' ? 'Không thể kích hoạt tài khoản đã bị cấm vĩnh viễn' : 'Kích hoạt tài khoản'}
                        onClick={() => handleStatusChangeClick(user.UserID, user.Username, user.Status, 'active')}
                        disabled={updatingUserId === user.UserID || user.Status === 'banned'}
                      >
                        {updatingUserId === user.UserID && user.Status !== 'active' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className={`h-4 w-4 ${user.Status === 'active' ? '' : 'text-green-600 dark:text-green-400'}`} />
                        )}
                      </Button>

                      {/* Inactive Button */}
                      <Button 
                        variant={user.Status === 'inactive' ? 'default' : 'ghost'}
                        size="sm" 
                        className={`h-9 px-3 rounded-lg transition-all duration-200 ${
                          user.Status === 'inactive' 
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-md shadow-yellow-500/30' 
                            : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:scale-105'
                        } ${user.Status === 'banned' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={user.Status === 'banned' ? 'Không thể tạm khóa tài khoản đã bị cấm vĩnh viễn' : 'Tạm khóa tài khoản'}
                        onClick={() => handleStatusChangeClick(user.UserID, user.Username, user.Status, 'inactive')}
                        disabled={updatingUserId === user.UserID || user.Status === 'banned'}
                      >
                        {updatingUserId === user.UserID && user.Status !== 'inactive' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className={`h-4 w-4 ${user.Status === 'inactive' ? '' : 'text-yellow-600 dark:text-yellow-400'}`} />
                        )}
                      </Button>

                      {/* Banned Button */}
                      <Button 
                        variant={user.Status === 'banned' ? 'default' : 'ghost'}
                        size="sm" 
                        className={`h-9 px-3 rounded-lg transition-all duration-200 ${
                          user.Status === 'banned' 
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-md shadow-red-500/30' 
                            : 'hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105'
                        }`}
                        title="Cấm vĩnh viễn"
                        onClick={() => handleStatusChangeClick(user.UserID, user.Username, user.Status, 'banned')}
                        disabled={updatingUserId === user.UserID}
                      >
                        {updatingUserId === user.UserID && user.Status !== 'banned' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className={`h-4 w-4 ${user.Status === 'banned' ? '' : 'text-red-600 dark:text-red-400'}`} />
                        )}
                      </Button>
                    </div>

                    {/* More Options Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 border-gray-300 dark:border-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleOpenProfile(user.UserID)}
                          className="cursor-pointer"
                        >
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>Xem thông tin chi tiết</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handleOpenHistory(user.UserID, user.Username)}
                          className="cursor-pointer"
                        >
                          <History className="mr-2 h-4 w-4" />
                          <span>Lịch sử thay đổi trạng thái</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredUsers.length > 0 && (pagination?.TotalPages || 0) > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {/* Hiển thị {(((pagination?.CurrentPage || 1) - 1) * (pagination?.PageSize || 8)) + 1} - {Math.min((pagination?.CurrentPage || 1) * (pagination?.PageSize || 8), pagination?.TotalCount || 0)} trong tổng số {pagination?.TotalCount || 0} học viên */}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange((pagination?.CurrentPage || 1) - 1)}
                  disabled={!pagination?.HasPrevious}
                  className="h-8 w-8 p-0"
                  title="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Numbers */}
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-2 text-gray-500">...</span>
                    ) : (
                      <Button
                        variant={page === pagination?.CurrentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        className={`h-8 w-8 p-0 ${
                          page === pagination?.CurrentPage 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : ''
                        }`}
                      >
                        {page}
                      </Button>
                    )}
                  </React.Fragment>
                ))}

                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange((pagination?.CurrentPage || 1) + 1)}
                  disabled={!pagination?.HasNext}
                  className="h-8 w-8 p-0"
                  title="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab 2: Statistics & Charts */}
        <TabsContent value="statistics" className="mt-6">
          <UserStatisticsCharts loading={loading} />
        </TabsContent>

        {/* Tab 3: Premium Management */}
        <TabsContent value="premium" className="mt-6">
          <PremiumExpirationPanel />
        </TabsContent>
      </Tabs>

      {/* Status Reason Dialog - For all status changes */}
      <StatusReasonDialog
        open={reasonDialogOpen}
        onOpenChange={setReasonDialogOpen}
        onConfirm={handleStatusChangeWithReason}
        username={pendingStatusWithReason?.username || ''}
        newStatus={pendingStatusWithReason?.newStatus || 'active'}
      />

      {/* User Status History Dialog */}
      <UserStatusHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        userId={selectedUserForHistory?.userId || 0}
        username={selectedUserForHistory?.username || ''}
      />

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedUserForProfile || 0}
      />
    </div>
  );
};

export default UserManagement;