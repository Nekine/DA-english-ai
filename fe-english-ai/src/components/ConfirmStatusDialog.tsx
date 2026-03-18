import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ConfirmStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  username: string;
  currentStatus: string;
  newStatus: string;
}

const statusLabels: Record<string, string> = {
  'active': 'Kích hoạt',
  'inactive': 'Tạm khóa',
  'banned': 'Cấm vĩnh viễn'
};

export const ConfirmStatusDialog: React.FC<ConfirmStatusDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  username,
  currentStatus,
  newStatus,
}) => {
  const handleConfirm = () => {
    onConfirm(); // Parent will close dialog
  };

  const isDestructive = newStatus === 'banned' || newStatus === 'inactive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${isDestructive ? 'text-orange-500' : 'text-blue-500'}`} />
            Xác nhận thay đổi trạng thái
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            Bạn có chắc chắn muốn chuyển trạng thái tài khoản <span className="font-semibold text-gray-900 dark:text-white">"{username}"</span> từ{' '}
            <span className="font-semibold">{statusLabels[currentStatus]}</span> sang{' '}
            <span className={`font-semibold ${newStatus === 'banned' ? 'text-red-600' : newStatus === 'inactive' ? 'text-gray-600' : 'text-green-600'}`}>
              {statusLabels[newStatus]}
            </span>?
          </DialogDescription>
          
          {newStatus === 'inactive' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Tài khoản sẽ bị tạm khóa và không thể đăng nhập cho đến khi được kích hoạt lại.
              </p>
            </div>
          )}

          {newStatus === 'active' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Tài khoản sẽ được kích hoạt và có thể đăng nhập bình thường.
              </p>
            </div>
          )}
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
