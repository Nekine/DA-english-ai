import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, ArrowLeft } from "lucide-react";
import { useTestList } from "@/hooks/useTestList";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Header from "@/components/Navbar";

const TestList = () => {
  const { data: tests, isLoading } = useTestList();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/index")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="space-y-8">
          <div className="text-center space-y-4 py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-soft mb-4">
              <FileText className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Luyện Đề TOEIC
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hệ thống đề thi TOEIC đầy đủ với giải thích chi tiết, giúp bạn ôn luyện hiệu quả
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="w-20 h-20 rounded-xl mx-auto" />
                    <Skeleton className="w-full h-6" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tests?.map((test) => (
                <Link 
                  key={test.testId}
                  to={`/test-config/${test.testId}`}
                  className="group"
                >
                  <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/50 bg-white dark:bg-gray-800">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {test.title}
                      </h3>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestList;
