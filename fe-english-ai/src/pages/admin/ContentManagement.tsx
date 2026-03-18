import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

const ContentManagement = () => {
  // Mock data - thay thế bằng API call thực tế
  const content = [
    {
      id: 1,
      title: "Basic English Conversation",
      type: "exercise",
      category: "Speaking",
      level: "Beginner",
      status: "published",
      createdDate: "2024-03-10",
      views: 1234
    },
    {
      id: 2,
      title: "Business English Vocabulary",
      type: "lesson",
      category: "Vocabulary",
      level: "Advanced",
      status: "draft",
      createdDate: "2024-03-12",
      views: 0
    },
    {
      id: 3,
      title: "Grammar Practice: Present Perfect",
      type: "exercise",
      category: "Grammar",
      level: "Intermediate",
      status: "published",
      createdDate: "2024-03-08",
      views: 856
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
      'exercise': 'bg-blue-500',
      'lesson': 'bg-purple-500',
      'topic': 'bg-orange-500'
    };
    
    const labels = {
      'exercise': 'Bài tập',
      'lesson': 'Bài học',
      'topic': 'Chủ đề'
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={`${colors[type as keyof typeof colors]} text-white`}
      >
        {labels[type as keyof typeof labels]}
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
          <h1 className="text-3xl font-bold">Quản lý nội dung</h1>
          <p className="text-muted-foreground">
            Quản lý bài học, bài tập và nội dung học tập
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nội dung mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nội dung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {content.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{item.title}</h3>
                    {getTypeBadge(item.type)}
                    {getLevelBadge(item.level)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Thể loại: {item.category}</span>
                    <span>Tạo: {new Date(item.createdDate).toLocaleDateString('vi-VN')}</span>
                    <span>Lượt xem: {item.views.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {getStatusBadge(item.status)}
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;