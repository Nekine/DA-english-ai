import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import userService, { StatusReason } from '@/services/userService';
import { Loader2 } from 'lucide-react';

interface StatusReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonCode: string, reasonNote: string) => void;
  username: string;
  newStatus: 'active' | 'inactive' | 'banned';
}

const statusConfig = {
  active: {
    title: '🔓 Kích hoạt tài khoản',
    description: 'Bạn đang kích hoạt lại tài khoản',
    reasonLabel: 'Lý do kích hoạt',
    reasonPlaceholder: 'Ví dụ: Đã xác minh thông tin, đã giải quyết vấn đề, yêu cầu từ cấp trên...',
    warningText: 'Tài khoản sẽ có thể đăng nhập và sử dụng hệ thống bình thường.',
    warningColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warningTextColor: 'text-green-800 dark:text-green-200',
    titleColor: 'text-green-600 dark:text-green-400',
    buttonVariant: 'default' as const,
    buttonText: 'Xác nhận kích hoạt',
  },
  inactive: {
    title: '⏸️ Tạm khóa tài khoản',
    description: 'Bạn đang tạm khóa tài khoản',
    reasonLabel: 'Lý do tạm khóa',
    reasonPlaceholder: 'Ví dụ: Vi phạm nhỏ, cần xác minh thông tin, yêu cầu tạm thời...',
    warningText: 'Tài khoản sẽ bị tạm khóa và không thể đăng nhập cho đến khi được kích hoạt lại.',
    warningColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    warningTextColor: 'text-yellow-800 dark:text-yellow-200',
    titleColor: 'text-yellow-600 dark:text-yellow-400',
    buttonVariant: 'destructive' as const,
    buttonText: 'Xác nhận tạm khóa',
  },
  banned: {
    title: '🚫 Cấm tài khoản vĩnh viễn',
    description: 'Bạn đang cấm vĩnh viễn tài khoản',
    reasonLabel: 'Lý do cấm vĩnh viễn',
    reasonPlaceholder: 'Ví dụ: Vi phạm nghiêm trọng, spam, lừa đảo, hành vi không phù hợp...',
    warningText: 'Hành động này KHÔNG THỂ HOÀN TÁC. Tài khoản sẽ bị khóa vĩnh viễn và không thể kích hoạt lại.',
    warningColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warningTextColor: 'text-red-800 dark:text-red-200',
    titleColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'destructive' as const,
    buttonText: 'Xác nhận cấm vĩnh viễn',
  },
};

export const StatusReasonDialog: React.FC<StatusReasonDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  username,
  newStatus,
}) => {
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [availableReasons, setAvailableReasons] = useState<StatusReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const config = statusConfig[newStatus];

  // Fetch available reasons when dialog opens
  useEffect(() => {
    if (open) {
      fetchReasons();
    }
  }, [open]);

  const fetchReasons = async () => {
    try {
      setLoadingReasons(true);
      const reasons = await userService.getStatusReasons();
      setAvailableReasons(reasons);
      
      // Auto-select first reason if available
      if (reasons.length > 0) {
        setReasonCode(reasons[0].ReasonCode);
      }
    } catch (error) {
      console.error('Error fetching status reasons:', error);
      // Fallback reasons if API fails
      setAvailableReasons([
        { ReasonCode: 'OTHER', ReasonName: 'Lý do khác', Description: null, IsTemporary: false }
      ]);
      setReasonCode('OTHER');
    } finally {
      setLoadingReasons(false);
    }
  };

  const handleConfirm = () => {
    if (reasonCode && reasonNote.trim()) {
      const trimmedNote = reasonNote.trim();
      // Reset immediately
      setReasonCode('');
      setReasonNote('');
      onConfirm(reasonCode, trimmedNote);
    }
  };

  const handleCancel = () => {
    setReasonCode('');
    setReasonNote('');
    onOpenChange(false);
  };

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setReasonCode('');
      setReasonNote('');
    }
  }, [open]);

  const selectedReason = availableReasons.find(r => r.ReasonCode === reasonCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className={config.titleColor}>
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description} <strong>"{username}"</strong>.
            <br />
            Vui lòng chọn lý do và ghi rõ chi tiết để lưu vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Reason Code Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="reasonCode" className="text-left font-semibold">
              Loại lý do <span className="text-red-500">*</span>
            </Label>
            {loadingReasons ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải danh sách lý do...
              </div>
            ) : (
              <Select
                value={reasonCode}
                onValueChange={setReasonCode}
                disabled={availableReasons.length === 0}
              >
                <SelectTrigger id="reasonCode" className="rounded-lg">
                  <SelectValue placeholder="Chọn lý do..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReasons.map((reason) => (
                    <SelectItem key={reason.ReasonCode} value={reason.ReasonCode}>
                      <div className="flex flex-col">
                        <span className="font-medium">{reason.ReasonName}</span>
                        {reason.Description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {reason.Description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedReason?.Description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                💡 {selectedReason.Description}
              </p>
            )}
          </div>

          {/* Reason Note Textarea */}
          <div className="grid gap-2">
            <Label htmlFor="reasonNote" className="text-left font-semibold">
              {config.reasonLabel} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reasonNote"
              placeholder={config.reasonPlaceholder}
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {reasonNote.length}/500 ký tự
            </p>
          </div>

          <div className={`${config.warningColor} border rounded-lg p-3`}>
            <p className={`text-sm ${config.warningTextColor}`}>
              <strong>Lưu ý:</strong> {config.warningText}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="rounded-lg"
          >
            Hủy
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={!reasonCode || !reasonNote.trim() || loadingReasons}
            className="rounded-lg"
          >
            {config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
