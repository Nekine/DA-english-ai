import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTestDetail } from "@/hooks/useTestDetail";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const TestExam = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { data: testDetail, isLoading } = useTestDetail(testId || null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(7200); // 120 phút = 7200 giây
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    if (!showInstructions) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showInstructions]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const convertGoogleDriveUrl = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/\/d\/([^/]+)/);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  };

  if (isLoading || !testDetail) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg">Đang tải bài test...</span>
        </div>
      </div>
    );
  }

  const currentQuestion = testDetail.questions[currentQuestionIndex];
  const totalQuestions = testDetail.questions.length;

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/test-list")}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-lg font-semibold">Q 1/{totalQuestions}</div>
            <div className="bg-destructive text-white px-4 py-2 rounded-lg font-mono">
              {formatTime(timeLeft)}
            </div>
          </div>

          <Card className="p-6 md:p-12 bg-white dark:bg-gray-800">
            <h1 className="text-2xl md:text-3xl font-bold mb-8">Part 1: PHOTOGRAPHS</h1>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                <strong>Directions:</strong> For each question, you will listen to four short statements about a picture in your test book.
                These statements will not be printed and will only be spoken one time. Select the statement that best describes what
                is happening in the picture and mark the corresponding letter (A), (B), (C), or (D) on the answer sheet.
              </p>
              <p>
                The statement that best describes the picture is (B), "The man is sitting at the desk." So, you should mark letter (B)
                on the answer sheet.
              </p>
            </div>
          </Card>

          <Button
            size="lg"
            className="w-full mt-8 text-lg py-6"
            onClick={() => setShowInstructions(false)}
          >
            BẮT ĐẦU
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/test-list")}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-lg font-semibold">
              Q {currentQuestionIndex + 1}/{totalQuestions}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-destructive text-white px-3 md:px-4 py-2 rounded-lg font-mono font-semibold text-sm md:text-base">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* Left Side - Question */}
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold mb-4">Câu {currentQuestionIndex + 1}</h2>

              {currentQuestion.questionType && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                  <p className="font-semibold text-sm">{currentQuestion.questionType.trim()}</p>
                </div>
              )}

              {/* Audio Player */}
              {currentQuestion.audioUrl && (
                <div className="mb-6">
                  <iframe
                    src={convertGoogleDriveUrl(currentQuestion.audioUrl) || ''}
                    className="w-full h-16 border rounded-lg"
                    allow="autoplay"
                  />
                </div>
              )}

              {/* Image */}
              {currentQuestion.imageUrl && (
                <div className="mb-4">
                  <img
                    src={currentQuestion.imageUrl}
                    alt={`Question ${currentQuestion.questionNumber}`}
                    className="w-full rounded-lg border"
                  />
                </div>
              )}

              {currentQuestion.questionText && (
                <div className="mt-4">
                  <p className="text-lg">{currentQuestion.questionText}</p>
                </div>
              )}
            </Card>

            {/* Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Trang chủ
              </Button>

              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Câu trước
              </Button>

              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="flex-shrink-0"
              >
                Câu sau
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Right Side - Answer Selection */}
          <div>
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold mb-6">Chọn đáp án</h3>

              <RadioGroup
                value={userAnswers[currentQuestion.questionId] || ""}
                onValueChange={(value) => {
                  setUserAnswers({
                    ...userAnswers,
                    [currentQuestion.questionId]: value,
                  });
                  setShowExplanation({
                    ...showExplanation,
                    [currentQuestion.questionId]: true,
                  });
                }}
                className="space-y-4"
              >
                {["A", "B", "C", "D"].map((option) => {
                  const isSelected = userAnswers[currentQuestion.questionId] === option;
                  const isCorrect = currentQuestion.correctAnswerLabel === option;
                  const shouldShowResult = showExplanation[currentQuestion.questionId];

                  let borderColor = "border-border";
                  let bgColor = "";

                  if (shouldShowResult) {
                    if (isSelected && isCorrect) {
                      borderColor = "border-green-500";
                      bgColor = "bg-green-50 dark:bg-green-950/30";
                    } else if (isSelected && !isCorrect) {
                      borderColor = "border-red-500";
                      bgColor = "bg-red-50 dark:bg-red-950/30";
                    } else if (isCorrect) {
                      borderColor = "border-green-500";
                      bgColor = "bg-green-50/50 dark:bg-green-950/20";
                    }
                  }

                  return (
                    <div
                      key={option}
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${borderColor} ${bgColor}`}
                    >
                      <RadioGroupItem value={option} id={`option-${option}`} />
                      <Label
                        htmlFor={`option-${option}`}
                        className="text-lg font-medium cursor-pointer flex-1"
                      >
                        {option}
                      </Label>
                      {shouldShowResult && isCorrect && (
                        <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✓ Đúng</span>
                      )}
                      {shouldShowResult && isSelected && !isCorrect && (
                        <span className="text-red-600 dark:text-red-400 font-semibold text-sm">✗ Sai</span>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              {showExplanation[currentQuestion.questionId] && (
                <div className="mt-6 p-4 bg-accent/30 rounded-lg border-l-4 border-primary">
                  <h4 className="font-semibold mb-2 text-primary">Giải thích đáp án:</h4>
                  <div className="text-sm space-y-2 whitespace-pre-line text-muted-foreground">
                    {currentQuestion.answerExplanation}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestExam;
