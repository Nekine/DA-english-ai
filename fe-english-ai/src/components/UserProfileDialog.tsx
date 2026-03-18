import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Shield, 
  GraduationCap, 
  Users,
  CheckCircle2,
  XCircle,
  Ban as BanIcon,
  Calendar
} from 'lucide-react';
import userService, { UserProfile } from '@/services/userService';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserProfile(userId);
      setUser(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Không thể tải thông tin người dùng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
    }
  }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getInitials = (username: string) => {
    const words = username.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[words.length - 1][0];
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getAccountTypeInfo = (accountType: string, premiumExpiresAt?: string) => {
    const isPremium = accountType === 'premium';
    const isLifetime = isPremium && !premiumExpiresAt;
    
    if (isPremium) {
      return {
        label: isLifetime ? 'Premium Vĩnh viễn' : 'Premium',
        className: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-400',
        icon: Shield,
        description: isLifetime ? 'Truy cập vĩnh viễn tất cả tính năng' : `Hết hạn: ${premiumExpiresAt ? new Date(premiumExpiresAt).toLocaleDateString('vi-VN') : 'Không xác định'}`
      };
    }
    
    return {
      label: 'Miễn phí',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: Users,
      description: 'Tài khoản miễn phí với giới hạn tính năng'
    };
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { 
      label: string; 
      className: string; 
      icon: typeof CheckCircle2;
      description: string;
    }> = {
      'active': { 
        label: 'Đang hoạt động', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
        description: 'Tài khoản có thể đăng nhập và sử dụng bình thường'
      },
      'inactive': { 
        label: 'Tạm khóa', 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: XCircle,
        description: 'Tài khoản tạm thời không thể đăng nhập'
      },
      'banned': { 
        label: 'Bị cấm vĩnh viễn', 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: BanIcon,
        description: 'Tài khoản bị khóa vĩnh viễn và không thể kích hoạt lại'
      }
    };
    
    return statusMap[status] || statusMap['inactive'];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl text-blue-600 dark:text-blue-400">
            <UserIcon className="h-7 w-7" />
            Thông tin người dùng
          </DialogTitle>
          <DialogDescription className="text-base">
            Chi tiết thông tin tài khoản và trạng thái
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Đang tải thông tin...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mx-6 my-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : user ? (
          <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
            <div className="space-y-5">
            {/* Avatar + Basic Info */}
            <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl">
              <Avatar className="h-20 w-20 flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-bold">
                  {getInitials(user.FullName || user.Username)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate mb-1">
                  {user.FullName || user.Username}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                  @{user.Username}
                </p>
                <Badge className={`${getAccountTypeInfo(user.AccountType, user.PremiumExpiresAt).className} text-sm px-3 py-1`}>
                  {getAccountTypeInfo(user.AccountType, user.PremiumExpiresAt).label}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Account Type + Status - Two Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Account Type */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Loại tài khoản
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-full">
                  {(() => {
                    const accountInfo = getAccountTypeInfo(user.AccountType, user.PremiumExpiresAt);
                    const AccountIcon = accountInfo.icon;
                    return (
                      <div className="flex flex-col gap-3">
                        <div className="p-2 bg-white dark:bg-gray-900 rounded-md flex-shrink-0 w-fit">
                          <AccountIcon className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                          <Badge variant="secondary" className={`${accountInfo.className} text-sm mb-2`}>
                            {accountInfo.label}
                          </Badge>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {accountInfo.description}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Trạng thái
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-full">
                  {(() => {
                    const statusInfo = getStatusInfo(user.Status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div className="flex flex-col gap-3">
                        <div className="p-2 bg-white dark:bg-gray-900 rounded-md flex-shrink-0 w-fit">
                          <StatusIcon className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <Badge variant="secondary" className={`${statusInfo.className} text-sm mb-2`}>
                            {statusInfo.label}
                          </Badge>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {statusInfo.description}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <Separator />

            {/* Learning Statistics */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Thống kê học tập
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-lg flex-shrink-0 w-fit">
                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng XP</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {user.TotalXP || 0}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-lg flex-shrink-0 w-fit">
                    <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Thời gian học</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {user.TotalStudyTime || 0}
                      <span className="text-sm font-normal ml-1">phút</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {user.Bio && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Tiểu sử
                  </h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.Bio}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Address */}
            {user.Address && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Địa chỉ
                  </h4>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md flex-shrink-0">
                      <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.Address}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Thông tin liên hệ
              </h4>
              
              {/* Email */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.Email}
                  </p>
                </div>
              </div>

              {/* Phone */}
              {user.Phone ? (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số điện thoại</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.Phone}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md flex-shrink-0">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số điện thoại</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Chưa cập nhật
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Account Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Thông tin tài khoản
              </h4>
              
              {user.CreatedAt && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-md flex-shrink-0">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngày tạo tài khoản</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {new Date(user.CreatedAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {user.LastActiveAt && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hoạt động cuối</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {new Date(user.LastActiveAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
