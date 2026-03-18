import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Clock, Users } from 'lucide-react';

const TestsPage = () => {
  const tests = [
    {
      id: 1,
      title: "TOEIC 2025 - Đề 01",
      type: "TOEIC Full",
      category: "Listening + Reading",
      level: "Intermediate",
      status: "published",
      createdDate: "2024-03-10",
      attempts: 1234,
      duration: "120 phút"
    },
    {
      id: 2,
      title: "Business English Test",
      type: "Listening",
      category: "Business",
      level: "Advanced",
      status: "draft",
      createdDate: "2024-03-12",
      attempts: 0,
      duration: "45 phút"
    },
    {
      id: 3,
      title: "Grammar Practice Test",
      type: "Reading",
      category: "Grammar",
      level: "Beginner",
      status: "published",
      createdDate: "2024-03-08",
      attempts: 856,
      duration: "60 phút"
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'published') {
      return <Badge variant="default" className="bg-green-500">Đã xuất bản</Badge>;
    }
    return <Badge variant="secondary">Bản nháp</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'TOEIC Full': 'bg-blue-500',
      'Listening': 'bg-purple-500',
      'Reading': 'bg-orange-500',
      'Speaking': 'bg-green-500',
      'Writing': 'bg-red-500'
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={`${colors[type as keyof typeof colors] || 'bg-gray-500'} text-white`}
      >
        {type}
      </Badge>
    );
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      'Beginner': 'bg-green-500',
      'Intermediate': 'bg-yellow-500',
      'Advanced': 'bg-red-500'
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`border-current ${colors[level as keyof typeof colors]} text-white`}
      >
        {level}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Đề / Bài test</h1>
          <p className="text-gray-600">
            Quản lý tất cả các bài kiểm tra và đề thi
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo đề mới
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng đề thi</p>
                <p className="text-xl font-bold">86</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Lượt thi</p>
                <p className="text-xl font-bold">9,420</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trung bình</p>
                <p className="text-xl font-bold">78%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Plus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Mới tuần này</p>
                <p className="text-xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đề thi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test) => (
              <div 
                key={test.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-lg">{test.title}</h3>
                    {getTypeBadge(test.type)}
                    {getLevelBadge(test.level)}
                    {getStatusBadge(test.status)}
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>📚 {test.category}</span>
                    <span>⏱️ {test.duration}</span>
                    <span>👥 {test.attempts.toLocaleString()} lượt thi</span>
                    <span>📅 {new Date(test.createdDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestsPage;