// 🚀 SIMPLE ADMIN TEST - Test useAdminProgress import 
// ✅ FOCUS: Reading exercises only, basic user management

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminDashboard, useAdminUsers } from '@/hooks/useAdminProgress';
import { AdminUser } from '@/services/adminService';
import React from 'react';

const SimpleAdminTest: React.FC = () => {
  const { data: users, isLoading } = useAdminUsers();
  const { data: dashboard } = useAdminDashboard();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Test - Reading Only</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">Active: {dashboard?.systemStats?.activeUsers || 0}</p>
            <p className="text-lg">Exercises: {dashboard?.systemStats?.totalExercises || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard?.systemStats?.averageScore || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users?.map((user: AdminUser) => (
              <div key={user.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{user.totalXp} XP</p>
                  <p className="text-sm">Level {user.level}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAdminTest;