import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCheck, Info, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReviewResultProps {
  review: string;
  onBack: () => void;
}

export const ReviewResult = ({ review, onBack }: ReviewResultProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(review);
    setCopied(true);
    toast.success("Đã sao chép nhận xét");
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract score from review
  const extractScore = (text: string): string | null => {
    const scoreMatch = text.match(/##\s*Điểm số:\s*(\d+)\/100/i);
    return scoreMatch ? scoreMatch[1] : null;
  };

  const score = extractScore(review);

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-indigo-600";
    if (score >= 40) return "from-orange-500 to-amber-600";
    return "from-red-500 to-rose-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="gap-2 border-border hover:bg-accent"
        >
          {copied ? (
            <>
              <CheckCheck className="w-4 h-4" />
              Đã sao chép
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Sao chép
            </>
          )}
        </Button>
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="ml-2 text-blue-900 dark:text-blue-100">
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Kết quả chấm nhanh bởi AI
            </p>
            <p className="text-sm leading-relaxed">
              Đây là kết quả đánh giá tự động do AI thực hiện, mang tính chất <strong>tham khảo</strong> và có thể chưa hoàn toàn chính xác. 
              Kết quả chấm chi tiết và chính thức sẽ được <strong>cô giáo trực tiếp đánh giá</strong> và gửi đến bạn trong <strong>vài giờ tới</strong>. 
              Cảm ơn bạn đã kiên nhẫn chờ đợi! 📝✨
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {score && (
        <Card className={`p-8 shadow-lg bg-gradient-to-br ${getScoreGradient(parseInt(score))} text-white`}>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium uppercase tracking-wider opacity-90">Điểm số tạm thời (AI)</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-6xl font-bold">{score}</span>
              <span className="text-4xl font-semibold opacity-80">/100</span>
            </div>
            <div className="pt-2">
              <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 shadow-soft">
        <div className="prose prose-pink max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-border">
                  {children}
                </h1>
              ),
              h2: ({ children }) => {
                // Hide the score heading since we display it separately
                const text = String(children);
                if (text.includes('Điểm số:')) {
                  return null;
                }
                return (
                  <h2 className="text-xl font-bold text-foreground mt-6 mb-3">
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-foreground leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-primary">
                  {children}
                </strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-accent/50 rounded-r">
                  {children}
                </blockquote>
              ),
            }}
          >
            {review}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  );
};
