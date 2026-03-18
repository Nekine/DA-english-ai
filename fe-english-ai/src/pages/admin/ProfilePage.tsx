import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Camera,
  Save,
  Shield,
  Key,
  Bell
} from 'lucide-react';

const ProfilePage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Quản lý thông tin cá nhân và cài đặt tài khoản
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="relative mx-auto w-24 h-24">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  Ad
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                variant="outline"
              >
                <Camera className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
            <CardTitle className="text-gray-900 dark:text-white">Admin</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">admin@example.com</p>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Quản trị viên
            </Badge>
          </CardHeader>
        </Card>

        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <User className="h-5 w-5" />
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">Họ</Label>
                  <Input 
                    id="firstName" 
                    defaultValue="Admin" 
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">Tên</Label>
                  <Input 
                    id="lastName" 
                    defaultValue="User" 
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue="admin@example.com" 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Số điện thoại</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+84 123 456 789" 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <div>
                <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Giới thiệu</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Mô tả ngắn về bản thân..." 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Shield className="h-5 w-5" />
                Bảo mật
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-gray-700 dark:text-gray-300">Mật khẩu hiện tại</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword" className="text-gray-700 dark:text-gray-300">Mật khẩu mới</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">Xác nhận mật khẩu</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                />
              </div>
              
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Xác thực 2 lớp</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tăng cường bảo mật với xác thực 2 lớp
                  </p>
                </div>
                <Button variant="outline" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Key className="mr-2 h-4 w-4" />
                  Thiết lập
                </Button>
              </div>
              
              <Button variant="outline" className="w-full hover:bg-gray-100 dark:hover:bg-gray-700">
                Đổi mật khẩu
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;