import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, History, ArrowRight, User, Calendar, FileText, Clock, Shield, UserCheck, UserX, Ban } from 'lucide-react';
import userService, { StatusHistory } from '@/services/userService';

interface UserStatusHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  username: string;
}

export const UserStatusHistoryDialog: React.FC<UserStatusHistoryDialogProps> = ({
  open,
  onOpenChange,
  userId,
  username,
}) => {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserStatusHistory(userId);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching status history:', err);
      setError('Không thể tải lịch sử thay đổi trạng thái. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchHistory();
    }
  }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      'active': { 
        label: 'Hoạt động', 
        className: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
        icon: UserCheck
      },
      'inactive': { 
        label: 'Tạm khóa', 
        className: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 dark:from-yellow-900/30 dark:to-amber-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
        icon: UserX
      },
      'banned': { 
        label: 'Bị cấm', 
        className: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/30 dark:to-rose-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
        icon: Ban
      }
    };
    
    const statusInfo = statusMap[status] || statusMap['inactive'];
    const StatusIcon = statusInfo.icon;
    
    return (
      <Badge variant="secondary" className={`${statusInfo.className} flex items-center gap-1 px-3 py-1 shadow-sm`}>
        <StatusIcon className="h-3.5 w-3.5" />
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
              <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold">
              Lịch sử thay đổi trạng thái
            </span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-gray-500" />
            Tài khoản: <strong className="text-gray-900 dark:text-white">@{username}</strong>
            <Badge variant="outline" className="ml-2">ID: {userId}</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Đang tải lịch sử...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="my-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Chưa có lịch sử thay đổi trạng thái
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {history.map((record, index) => (
                <div key={record.HistoryID}>
                  <div className="relative pl-10 pb-6">
                    {/* Timeline dot with gradient */}
                    <div className="absolute left-0 top-1.5 w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full border-4 border-white dark:border-gray-900 shadow-lg shadow-blue-500/30 z-10"></div>
                    
                    {/* Timeline line */}
                    {index < history.length - 1 && (
                      <div className="absolute left-[11px] top-8 w-[2px] h-[calc(100%+0.5rem)] bg-gradient-to-b from-blue-300 via-indigo-300 to-purple-300 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700"></div>
                    )}
                    
                    {/* Content Card */}
                    <div className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                      {/* Header: Time + Admin Info */}
                      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                            {formatDateTime(record.ChangedAt)}
                          </span>
                        </div>
                        
                        {record.ChangedByUsername && (
                          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Người thực hiện</span>
                              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                @{record.ChangedByUsername}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status Change with Animation */}
                      <div className="flex items-center gap-3 mb-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        {record.FromStatus ? (
                          <>
                            <div className="flex-shrink-0">
                              {getStatusBadge(record.FromStatus)}
                            </div>
                            <div className="flex-shrink-0">
                              <ArrowRight className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-pulse" />
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(record.ToStatus)}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trạng thái khởi tạo:</span>
                            {getStatusBadge(record.ToStatus)}
                          </div>
                        )}
                      </div>

                      {/* Reason Section */}
                      {record.ReasonCode && (
                        <div className="space-y-3">
                          <Separator className="bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                                <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide">
                                    Lý do
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    {record.ReasonCode}
                                  </Badge>
                                </div>
                                <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                                  {record.ReasonName || record.ReasonCode}
                                </p>
                                {record.ReasonNote && (
                                  <div className="mt-2 bg-white dark:bg-gray-900 p-3 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                      "{record.ReasonNote}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expires At (if applicable) */}
                      {record.ExpiresAt && (
                        <div className="mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                          <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <div className="flex flex-col">
                            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Thời hạn hiệu lực</span>
                            <span className="text-sm font-bold text-red-700 dark:text-red-300">
                              {formatDateTime(record.ExpiresAt)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
