import { useNavigate } from "react-router-dom";
import Header from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, ArrowLeft, Sparkles } from "lucide-react";

const WritingMode = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="text-center space-y-4 py-8 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-soft mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CHỌN CHẾ ĐỘ LUYỆN VIẾT
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chọn chế độ luyện viết phù hợp với mục tiêu học tập của bạn
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Essay Writing Mode - AI Generated */}
          <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Luyện viết bài văn</CardTitle>
              <CardDescription className="text-base">
                Viết bài luận, đoạn văn theo chủ đề và nhận phản hồi chi tiết
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>Luyện viết đoạn văn và bài luận hoàn chỉnh</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>Nhận đánh giá chi tiết về ngữ pháp, từ vựng, mạch lạc</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>Phù hợp để luyện thi IELTS, TOEFL Writing</span>
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => navigate("/writing")}
              >
                Bắt đầu viết bài văn
              </Button>
            </CardContent>
          </Card>

          {/* Sentence Writing Mode - AI Generated */}
          <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Luyện viết câu theo chủ đề</CardTitle>
              <CardDescription className="text-base">
                Luyện tập viết từng câu đơn lẻ và nhận feedback tức thì
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>AI tạo câu tiếng Việt theo chủ đề bạn chọn</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>Dịch sang tiếng Anh và nhận đánh giá ngay lập tức</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <span>Có gợi ý từ vựng và cấu trúc câu khi cần</span>
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => navigate("/sentence-writing")}
              >
                Bắt đầu viết câu
              </Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default WritingMode;
