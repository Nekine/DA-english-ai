import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Header from '@/components/Navbar';
import { useAuth } from '@/components/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { teacherReviewService, TeacherReview } from '@/services/teacherReviewService';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  User,
  Calendar,
  FileText,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const TeacherReviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<TeacherReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    if (!user?.userId) {
      toast.error('Vui lòng đăng nhập để xem kết quả');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const data = await teacherReviewService.getMyReviews(user.userId);
      setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = filterStatus === 'all' 
    ? reviews 
    : reviews.filter(r => r.reviewStatus === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Đạt</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Không đạt</Badge>;
      case 'needs_regrade':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Cần chấm lại</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getScoreChange = (original: number | null, final: number | null) => {
    if (original === null || final === null) return null;
    const change = final - original;
    if (change > 0) {
      return <span className="text-green-600 flex items-center"><TrendingUp className="w-4 h-4 mr-1" />+{change.toFixed(1)}</span>;
    } else if (change < 0) {
      return <span className="text-red-600 flex items-center"><TrendingDown className="w-4 h-4 mr-1" />{change.toFixed(1)}</span>;
    }
    return <span className="text-gray-600">Không đổi</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại trang chủ
        </Button>

        <div className="text-center space-y-4 py-8 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-soft mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            KẾT QUẢ CHẤM BỞI GIÁO VIÊN
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Xem lại các bài tập đã được giáo viên chấm lại với nhận xét chi tiết
          </p>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium">Lọc theo trạng thái:</span>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  Tất cả ({reviews.length})
                </Button>
                <Button
                  variant={filterStatus === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('approved')}
                  className={filterStatus === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Đạt ({reviews.filter(r => r.reviewStatus === 'approved').length})
                </Button>
                <Button
                  variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('rejected')}
                  className={filterStatus === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  Không đạt ({reviews.filter(r => r.reviewStatus === 'rejected').length})
                </Button>
                <Button
                  variant={filterStatus === 'needs_regrade' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('needs_regrade')}
                >
                  Cần chấm lại ({reviews.filter(r => r.reviewStatus === 'needs_regrade').length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {filterStatus === 'all' 
                    ? 'Chưa có bài tập nào được giáo viên chấm. Hãy hoàn thành bài tập và chờ giáo viên đánh giá!'
                    : `Không có bài tập nào với trạng thái "${filterStatus}"`
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          /* Reviews list */
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card 
                key={review.completionId}
                className="hover:shadow-lg transition-all hover:border-blue-500"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{review.exerciseTitle}</CardTitle>
                        {getStatusBadge(review.reviewStatus)}
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {review.exerciseType || 'Bài tập'} • {review.exerciseCategory || 'Tổng hợp'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {review.reviewedAt && format(new Date(review.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {review.reviewerName}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Scores */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Điểm AI chấm</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {review.originalScore !== null ? review.originalScore.toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        review.reviewStatus === 'approved' 
                          ? 'bg-green-50 dark:bg-green-950/30' 
                          : review.reviewStatus === 'rejected' 
                          ? 'bg-red-50 dark:bg-red-950/30'
                          : 'bg-gray-50 dark:bg-gray-950/30'
                      }`}>
                        <div className="text-sm text-muted-foreground mb-1">Điểm giáo viên chấm</div>
                        <div className={`text-2xl font-bold ${
                          review.reviewStatus === 'approved' 
                            ? 'text-green-600' 
                            : review.reviewStatus === 'rejected' 
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {review.finalScore !== null ? review.finalScore.toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Thay đổi</div>
                        <div className="text-2xl font-bold">
                          {getScoreChange(review.originalScore, review.finalScore)}
                        </div>
                      </div>
                    </div>

                    {/* Review notes */}
                    {review.reviewNotes && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                              Nhận xét của giáo viên:
                            </div>
                            <p className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                              {review.reviewNotes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher-review/${review.completionId}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherReviews;
