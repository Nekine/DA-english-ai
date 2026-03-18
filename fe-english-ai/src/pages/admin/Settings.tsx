import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">
          Quản lý cấu hình và thiết lập của hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt chung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Bảo trì hệ thống</h4>
                <p className="text-sm text-muted-foreground">
                  Kích hoạt chế độ bảo trì để cập nhật hệ thống
                </p>
              </div>
              {/* Switch component có thể được thêm ở đây */}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Đăng ký tài khoản mới</h4>
                <p className="text-sm text-muted-foreground">
                  Cho phép người dùng tạo tài khoản mới
                </p>
              </div>
              {/* Switch component có thể được thêm ở đây */}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Thống kê chi tiết</h4>
                <p className="text-sm text-muted-foreground">
                  Thu thập dữ liệu phân tích người dùng
                </p>
              </div>
              {/* Switch component có thể được thêm ở đây */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;