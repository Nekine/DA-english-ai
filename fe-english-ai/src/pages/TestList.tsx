import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, PlusCircle, Clock3, CheckCircle2, Loader2 } from "lucide-react";
import { useTestList } from "@/hooks/useTestList";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Header from "@/components/Navbar";

const PAGE_SIZE = 9;

const TestList = () => {
  const { data: tests, isLoading } = useTestList();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const normalizedTests = tests ?? [];
  const totalPages = Math.max(1, Math.ceil(normalizedTests.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pagedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return normalizedTests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [normalizedTests, currentPage]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  const formatCreatedAtDisplay = (createdAt: string) => {
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return createdAt;
    }

    const time = parsed.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const date = parsed.toLocaleDateString("vi-VN");
    return `${time} - ${date}`;
  };

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
              Đề thi TOEIC tạo bằng AI.
            </p>
            <Button onClick={() => navigate("/test-config")} size="lg" className="mt-2">
              <PlusCircle className="w-4 h-4 mr-2" />
              Tạo đề mới
            </Button>
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
            <>
              {(!tests || tests.length === 0) && (
                <Card className="p-8 text-center bg-white dark:bg-gray-800">
                  <h3 className="text-xl font-semibold mb-2">Chưa có đề nào</h3>
                  <p className="text-muted-foreground mb-4">Tạo đề đầu tiên để bắt đầu luyện TOEIC.</p>
                  <Button onClick={() => navigate("/test-config")}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Tạo đề ngay
                  </Button>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedTests.map((test) => (
                  <Link
                  key={test.testId}
                  to={`/test-exam/${test.testId}`}
                  className="group"
                >
                  <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/50 bg-white dark:bg-gray-800">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <FileText className="w-7 h-7 text-primary" />
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {formatCreatedAtDisplay(test.createdAt)}
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-accent">
                            {test.readyPartCount}/{test.totalPartCount} part sẵn sàng
                          </div>
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2">
                        {test.title}
                      </h3>

                      <p className="text-sm text-muted-foreground line-clamp-2">{test.topic}</p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5" />
                          {test.estimatedMinutes} phút
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {test.status === "ready" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          )}
                          {test.status === "ready" ? "Đã tạo xong" : "Đang tạo"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
                ))}
              </div>

              {normalizedTests.length > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>

                  {pageNumbers.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestList;
