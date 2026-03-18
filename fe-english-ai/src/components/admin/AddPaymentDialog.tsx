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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import paymentService from "@/services/paymentService";
import { Loader2 } from "lucide-react";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [userInfo, setUserInfo] = useState<{ fullName?: string; accountType?: string; status?: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    amount: '218900',
    method: 'Chuyển khoản',
    durationMonths: '1',
    note: '',
  });

  // Pricing calculator
  const calculateAmount = (months: number) => {
    if (months === 6) {
      return 1098900; // 999,000 + VAT 10%
    }
    return months * 218900; // 199,000 + VAT per month
  };

  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email) {
      setUserInfo(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await paymentService.checkEmail(email);
      if (result.exists) {
        setUserInfo({
          fullName: result.fullName,
          accountType: result.accountType,
          status: result.status,
        });
        if (result.status !== 'active') {
          toast.warning(`Tài khoản đang ở trạng thái: ${result.status}`);
        }
      } else {
        setUserInfo(null);
        toast.error('Email không tồn tại trong hệ thống');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setUserInfo(null);
      toast.error('Không thể kiểm tra email');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (!userInfo) {
      toast.error('Email chưa được xác thực hoặc không tồn tại trong hệ thống');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Số tiền không hợp lệ');
      return;
    }

    const months = parseInt(formData.durationMonths);
    if (isNaN(months) || months <= 0) {
      toast.error('Số tháng không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      const response = await paymentService.addManualPayment({
        email: formData.email.trim(),
        amount: amount,
        method: formData.method,
        isLifetime: false, // Luôn là có thời hạn
        durationMonths: months,
        note: formData.note.trim() || undefined,
      }) as { success: boolean; message: string };

      if (response.success) {
        toast.success(response.message || 'Đã thêm thanh toán thành công!');
        
        // Reset form
        setFormData({
          email: '',
          amount: '218900',
          method: 'Chuyển khoản',
          durationMonths: '1',
          note: '',
        });
        setUserInfo(null);
        
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Không thể thêm thanh toán');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm thanh toán thủ công</DialogTitle>
          <DialogDescription>
            Nhập thông tin thanh toán để nâng cấp tài khoản user lên Premium
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email người dùng <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setUserInfo(null);
              }}
              onBlur={handleEmailBlur}
              required
              disabled={loading || checkingEmail}
            />
            {checkingEmail && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang kiểm tra email...
              </p>
            )}
            {userInfo && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Tìm thấy: <strong>{userInfo.fullName || 'N/A'}</strong>
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Loại TK: <span className="font-medium">{userInfo.accountType}</span> | 
                  Trạng thái: <span className="font-medium">{userInfo.status}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">
              Số tháng đăng ký <span className="text-red-500">*</span>
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="12"
              value={formData.durationMonths}
              onChange={(e) => {
                const months = parseInt(e.target.value) || 1;
                const newAmount = calculateAmount(months);
                setFormData({ 
                  ...formData, 
                  durationMonths: e.target.value,
                  amount: newAmount.toString()
                });
              }}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              1 tháng: 218,900 VNĐ | 6 tháng: 1,098,900 VNĐ (Giảm 16%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Tổng số tiền (VNĐ) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              disabled={loading}
              className="font-semibold"
            />
            <p className="text-xs text-gray-500">
              = {parseInt(formData.amount || '0').toLocaleString('vi-VN')} VNĐ
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Phương thức thanh toán</Label>
            <Input
              id="method"
              placeholder="Chuyển khoản, MoMo, ZaloPay..."
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Ghi chú về giao dịch..."
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Thêm thanh toán
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
