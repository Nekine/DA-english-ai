// Admin Reading Exercises Management Component
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import type { AdminExercise } from '@/services/adminService';
import { adminService } from '@/services/adminService';
import { BookOpen, Bot, Eye, RefreshCw, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ExerciseStats {
  totalExercises: number;
  byLevel: {
    Beginner: number;
    Intermediate: number;
    Advanced: number;
  };
  byType: {
    'Part 5': number;
    'Part 6': number;
    'Part 7': number;
  };
}

export const AdminReadingExercisesManager = () => {
  const [exercises, setExercises] = useState<AdminExercise[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load exercises from database
      const exercisesData = await adminService.getExercises();
      
      // Ensure exercisesData is an array before processing
      if (!Array.isArray(exercisesData)) {
        console.error('Invalid exercises data format:', exercisesData);
        throw new Error('Exercises data is not an array');
      }
      
      console.log('AdminReadingExercisesManager - Loaded exercises:', exercisesData);
      
      setExercises(exercisesData);
      
      // Calculate stats from real data
      const stats: ExerciseStats = {
        totalExercises: exercisesData.length,
        byLevel: {
          Beginner: exercisesData.filter(e => e.level === 'Beginner').length,
          Intermediate: exercisesData.filter(e => e.level === 'Intermediate').length,
          Advanced: exercisesData.filter(e => e.level === 'Advanced').length
        },
        byType: {
          'Part 5': exercisesData.filter(e => e.type === 'Part 5').length,
          'Part 6': exercisesData.filter(e => e.type === 'Part 6').length,
          'Part 7': exercisesData.filter(e => e.type === 'Part 7').length
        }
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Failed to load exercises:', error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải danh sách bài tập từ database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (exerciseId: number) => {
    if (confirm('Bạn có chắc muốn xóa bài tập này?')) {
      try {
        await adminService.deleteExercise(exerciseId);
        toast({
          title: "Thành công",
          description: "Đã xóa bài tập thành công"
        });
        loadData(); // Refresh data
      } catch (error) {
        console.error('Failed to delete exercise:', error);
        toast({
          title: "Lỗi",
          description: "Không thể xóa bài tập",
          variant: "destructive"
        });
      }
    }
  };

  if (loading || !stats) return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Đang tải dữ liệu bài tập...</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Reading Exercises đã tạo ({stats.totalExercises})
        </CardTitle>
        <CardDescription>
          Quản lý bài tập Reading đã tạo từ Admin Upload
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.byType['Part 5']}</div>
            <div className="text-sm text-blue-600">Part 5</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.byType['Part 6']}</div>
            <div className="text-sm text-green-600">Part 6</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.byType['Part 7']}</div>
            <div className="text-sm text-purple-600">Part 7</div>
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <div key={exercise.exerciseId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{exercise.name}</h4>
                  <Badge variant="secondary">{exercise.type}</Badge>
                  <Badge variant={
                    exercise.level === 'Beginner' ? 'default' :
                    exercise.level === 'Intermediate' ? 'secondary' : 'destructive'
                  }>
                    {exercise.level}
                  </Badge>
                  {/* AI vs Admin Badge */}
                  {exercise.sourceType === 'ai' ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      <User className="h-3 w-3 mr-1" />
                      Admin Created
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {exercise.attemptCount || 0} lượt làm bài • Tạo lúc {
                    exercise.createdAt 
                      ? new Date(exercise.createdAt).toLocaleDateString('vi-VN')
                      : 'Không xác định'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(exercise.exerciseId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {exercises.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Chưa có bài tập nào được tạo. Hãy tạo bài tập từ tab "Tạo đề thi".
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};