import React, { useState } from 'react';
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

interface BanReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  username: string;
}

export const BanReasonDialog: React.FC<BanReasonDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  username,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      const trimmedReason = reason.trim();
      setReason(''); // Reset immediately
      onConfirm(trimmedReason); // Parent will close dialog
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  // Reset reason when dialog closes
  React.useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">
            ⚠️ Cấm tài khoản vĩnh viễn
          </DialogTitle>
          <DialogDescription>
            Bạn đang thực hiện cấm vĩnh viễn tài khoản <strong>"{username}"</strong>.
            <br />
            Vui lòng ghi rõ lý do để lưu vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason" className="text-left font-semibold">
              Lý do cấm tài khoản <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ví dụ: Vi phạm quy định, spam, lừa đảo, hành vi không phù hợp..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {reason.length}/500 ký tự
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Lưu ý:</strong> Hành động này không thể hoàn tác. 
              Người dùng sẽ không thể đăng nhập vào hệ thống.
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="rounded-lg bg-red-600 hover:bg-red-700"
          >
            Xác nhận cấm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
