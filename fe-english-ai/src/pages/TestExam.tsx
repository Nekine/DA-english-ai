import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Loader2,
  Play,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTestDetail } from "@/hooks/useTestDetail";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { testExamService, type SubmitTestExamResponse } from "@/services/testExamService";

const TestExam = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: testDetail, isLoading, isFetching } = useTestDetail(testId || null);

  const [selectedPartNumber, setSelectedPartNumber] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittedParts, setSubmittedParts] = useState<Record<number, boolean>>({});
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examSubmissionResult, setExamSubmissionResult] = useState<SubmitTestExamResponse | null>(null);
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(7200); // 120 phút = 7200 giây
  const [showInstructions, setShowInstructions] = useState(true);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const sortedParts = useMemo(
    () => (testDetail?.parts ?? []).slice().sort((a, b) => a.partNumber - b.partNumber),
    [testDetail?.parts],
  );
  const readyParts = useMemo(
    () => sortedParts.filter((part) => part.status === "ready"),
    [sortedParts],
  );

  const selectedPart = useMemo(() => {
    return sortedParts.find((part) => part.partNumber === selectedPartNumber) ?? sortedParts[0];
  }, [sortedParts, selectedPartNumber]);

  const currentQuestion = selectedPart?.questions[currentQuestionIndex];
  const isPart2 = selectedPart?.partNumber === 2;
  const totalQuestionsInPart = selectedPart?.questions.length ?? 0;
  const currentQuestionAnswered = Boolean(
    currentQuestion && userAnswers[currentQuestion.questionId],
  );
  const isPartCompleted = Boolean(
    selectedPart &&
      selectedPart.status === "ready" &&
      selectedPart.questions.length > 0 &&
      selectedPart.questions.every((question) => Boolean(userAnswers[question.questionId])),
  );
  const canSubmitCurrentPart = Boolean(
    selectedPart &&
      selectedPart.status === "ready" &&
      isPartCompleted,
  );
  const totalSelectedParts = testDetail?.generation.totalParts ?? sortedParts.length;
  const allSelectedPartsReady = readyParts.length === totalSelectedParts;
  const allReadyQuestions = readyParts.flatMap((part) => part.questions);
  const answeredQuestionCount = allReadyQuestions.filter((question) => Boolean(userAnswers[question.questionId])).length;
  const correctAnswerCount = allReadyQuestions.filter(
    (question) => userAnswers[question.questionId] === question.correctAnswer,
  ).length;
  const isExamCompleted =
    allSelectedPartsReady &&
    allReadyQuestions.length > 0 &&
    answeredQuestionCount === allReadyQuestions.length;
  const lastPartNumber = sortedParts[sortedParts.length - 1]?.partNumber;
  const isSinglePartExam = totalSelectedParts <= 1;
  const isCurrentPartLast = Boolean(selectedPart && lastPartNumber && selectedPart.partNumber === lastPartNumber);
  const shouldShowExamScore = testDetail?.isRealExamMode
    ? isExamSubmitted
    : isExamCompleted;
  const shouldRevealExamResults = !testDetail?.isRealExamMode || shouldShowExamScore;
  const shouldStopCountdown = Boolean(testDetail?.isRealExamMode && shouldShowExamScore);
  const scorePercent =
    allReadyQuestions.length > 0 ? Math.round((correctAnswerCount / allReadyQuestions.length) * 100) : 0;
  const displayedCorrectAnswers = examSubmissionResult?.correctAnswers ?? correctAnswerCount;
  const displayedTotalQuestions = examSubmissionResult?.totalQuestions ?? allReadyQuestions.length;
  const displayedScorePercent = examSubmissionResult?.score ?? scorePercent;

  const stopActiveAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (!testDetail) {
      return;
    }

    setTimeLeft(Math.max(1, testDetail.estimatedMinutes) * 60);
    setIsExamSubmitted(false);
    setExamSubmissionResult(null);
  }, [testDetail?.testId]);

  useEffect(() => {
    if (!selectedPart) {
      return;
    }

    if (selectedPart.status !== "ready") {
      const firstReady = readyParts[0];
      if (firstReady) {
        setSelectedPartNumber(firstReady.partNumber);
      }
      return;
    }

    if (currentQuestionIndex > Math.max(0, selectedPart.questions.length - 1)) {
      setCurrentQuestionIndex(0);
    }
  }, [selectedPart, readyParts, currentQuestionIndex]);

  useEffect(() => {
    if (showInstructions || shouldStopCountdown) {
      return;
    }

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
  }, [showInstructions, shouldStopCountdown]);

  useEffect(() => {
    stopActiveAudio();
  }, [currentQuestion?.questionId, stopActiveAudio]);

  useEffect(() => {
    return () => {
      stopActiveAudio();
    };
  }, [stopActiveAudio]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const normalizeOptionDisplay = (content: string) => {
    return content.trim().replace(/^[A-D][\.\):\-]\s*/i, "").trim();
  };

  const getPartHeadingTitle = (partNumber: number, partTitle: string) => {
    const normalized = partTitle.replace(/^Part\s*\d+\s*[-:]\s*/i, "").trim();
    return normalized ? `Part ${partNumber} - ${normalized}` : `Part ${partNumber}`;
  };

  const buildPart2FallbackSpeechText = (
    prompt: string,
    options: Array<{ label: string; content: string }>,
  ) => {
    const normalizedPrompt = prompt.trim();
    const optionScript = options
      .slice(0, 3)
      .map((option) => `${option.label}. ${normalizeOptionDisplay(option.content)}.`)
      .join(" ");

    return [normalizedPrompt, optionScript].filter(Boolean).join(" ");
  };

  const getFallbackSpeechText = () => {
    if (!selectedPart || !currentQuestion) {
      return "";
    }

    if (selectedPart.partNumber === 2) {
      return buildPart2FallbackSpeechText(currentQuestion.prompt, currentQuestion.options);
    }

    return currentQuestion.audioText || currentQuestion.prompt;
  };

  const speakFallback = (text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }

    stopActiveAudio();

    if (!("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const getIncompletePartNumbers = useCallback(() => {
    return sortedParts
      .filter((part) => {
        if (part.status !== "ready" || part.questions.length === 0) {
          return true;
        }

        return part.questions.some((question) => !userAnswers[question.questionId]);
      })
      .map((part) => part.partNumber);
  }, [sortedParts, userAnswers]);

  const submitCurrentPart = () => {
    if (!selectedPart || !canSubmitCurrentPart) {
      return;
    }

    setSubmittedParts((prev) => ({ ...prev, [selectedPart.partNumber]: true }));

    const currentPartIndex = sortedParts.findIndex((part) => part.partNumber === selectedPart.partNumber);
    const nextPart = currentPartIndex >= 0 ? sortedParts[currentPartIndex + 1] : undefined;
    if (nextPart) {
      stopActiveAudio();
      setSelectedPartNumber(nextPart.partNumber);
      setCurrentQuestionIndex(0);
    }
  };

  const submitExam = async () => {
    if (!selectedPart || !canSubmitCurrentPart) {
      return;
    }

    if (!allSelectedPartsReady) {
      const pendingParts = sortedParts
        .filter((part) => part.status !== "ready" || part.questions.length === 0)
        .map((part) => `Part ${part.partNumber}`)
        .join(", ");

      toast({
        title: "Đề chưa sẵn sàng để nộp",
        description: pendingParts
          ? `${pendingParts} vẫn đang tạo. Vui lòng đợi hoàn tất rồi nộp đề.`
          : "Đề vẫn đang được tạo. Vui lòng thử lại sau ít phút.",
        variant: "destructive",
      });
      return;
    }

    const incompletePartNumbers = readyParts
      .filter((part) => part.questions.some((question) => !userAnswers[question.questionId]))
      .map((part) => part.partNumber)
      .filter((partNumber) => partNumber !== selectedPart.partNumber);

    if (incompletePartNumbers.length > 0) {
      const partLabel = incompletePartNumbers.map((partNumber) => `Part ${partNumber}`).join(", ");
      toast({
        title: "Chưa thể nộp đề",
        description: `${partLabel} chưa hoàn thành. Cần hoàn thành toàn bộ các part để nộp đề.`,
        variant: "destructive",
      });
      return;
    }

    if (!testId) {
      toast({
        title: "Lỗi nộp đề",
        description: "Không xác định được mã đề thi.",
        variant: "destructive",
      });
      return;
    }

    const answersPayload = allReadyQuestions
      .map((question) => {
        const selectedAnswer = userAnswers[question.questionId];
        if (!selectedAnswer) {
          return null;
        }

        const ownerPart = readyParts.find((part) =>
          part.questions.some((item) => item.questionId === question.questionId),
        );

        if (!ownerPart) {
          return null;
        }

        return {
          questionId: question.questionId,
          partNumber: ownerPart.partNumber,
          questionNumber: question.questionNumber,
          selectedAnswer,
        };
      })
      .filter((item): item is { questionId: string; partNumber: number; questionNumber: number; selectedAnswer: string } => item !== null);

    const estimatedSeconds = Math.max(0, testDetail.estimatedMinutes * 60);
    const elapsedSeconds = Math.max(0, estimatedSeconds - timeLeft);
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    try {
      setIsSubmittingExam(true);

      const response = await testExamService.submit(testId, {
        Answers: answersPayload,
        CompletedAt: new Date().toISOString(),
        DurationMinutes: durationMinutes,
      });

      if (!response.success) {
        throw new Error(response.message || "Nộp đề thất bại");
      }

      setSubmittedParts((prev) => ({ ...prev, [selectedPart.partNumber]: true }));
      setIsExamSubmitted(true);
      setExamSubmissionResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể nộp đề lúc này.";
      toast({
        title: "Nộp đề thất bại",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExam(false);
    }
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

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => {
                stopActiveAudio();
                navigate("/test-list");
              }}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-lg font-semibold">TOEIC {testDetail.generation.totalParts} Part</div>
            <div className="bg-destructive text-white px-4 py-2 rounded-lg font-mono">
              {formatTime(timeLeft)}
            </div>
          </div>

          <Card className="p-6 md:p-12 bg-white dark:bg-gray-800">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{testDetail.title}</h1>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              <p>
                <strong>Chủ đề:</strong> {testDetail.topic}
              </p>
              <p>
                <strong>Trạng thái tạo đề:</strong> {testDetail.generation.message}
              </p>
              <p>
                <strong>Thời gian tạo đề:</strong> {formatCreatedAtDisplay(testDetail.createdAt)}
              </p>
              <p>
                Bạn có thể bắt đầu làm ngay khi part đầu tiên sẵn sàng. Trong lúc làm bài, hệ thống sẽ tự động tạo tiếp các part còn lại theo thứ tự.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {sortedParts.map((part) => (
                <Badge key={part.partNumber} variant={part.status === "ready" ? "default" : "secondary"}>
                  Part {part.partNumber}: {part.status === "ready" ? "Sẵn sàng" : part.status === "pending" ? "Đang tạo" : "Lỗi"}
                </Badge>
              ))}
            </div>
          </Card>

          <Button
            size="lg"
            className="w-full mt-8 text-lg py-6"
            disabled={readyParts.length === 0}
            onClick={() => setShowInstructions(false)}
          >
            {readyParts.length > 0 ? "BẮT ĐẦU THI" : "ĐANG CHUẨN BỊ PART 1..."}
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
              onClick={() => {
                stopActiveAudio();
                navigate("/test-list");
              }}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-lg font-semibold">
              {selectedPart ? `Part ${selectedPart.partNumber}` : "TOEIC"}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {testDetail.status === "generating" && (
              <Badge variant="secondary" className="hidden md:inline-flex gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {testDetail.generation.message}
              </Badge>
            )}
            <div className="bg-destructive text-white px-3 md:px-4 py-2 rounded-lg font-mono font-semibold text-sm md:text-base">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            <Card className="p-4 bg-white dark:bg-gray-800">
              <div className="flex flex-wrap gap-2">
                {sortedParts.map((part) => {
                  const isCurrent = part.partNumber === selectedPart?.partNumber;
                  const tone =
                    part.status === "ready"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : part.status === "pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";
                  return (
                    <button
                      key={part.partNumber}
                      type="button"
                      onClick={() => {
                        stopActiveAudio();
                        setSelectedPartNumber(part.partNumber);
                        setCurrentQuestionIndex(0);
                      }}
                      className={`px-3 py-2 rounded-md border text-sm transition-colors ${tone} ${isCurrent ? "ring-2 ring-primary" : ""}`}
                    >
                      Part {part.partNumber}
                    </button>
                  );
                })}
              </div>
            </Card>

            {!selectedPart || selectedPart.status !== "ready" || !currentQuestion ? (
              <Card className="p-6 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <h2 className="text-xl font-semibold">Part này đang được tạo</h2>
                </div>
                <p className="text-muted-foreground">
                  Bạn có thể chuyển sang part đã sẵn sàng để làm trước. Hệ thống đang tạo tuần tự từ Part 1 đến Part 7.
                </p>
              </Card>
            ) : (
              <Card className="p-6 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold">
                    {getPartHeadingTitle(selectedPart.partNumber, selectedPart.partTitle)}
                  </h2>
                  <Badge variant="outline" className="gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    Câu {currentQuestionIndex + 1}/{totalQuestionsInPart}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{selectedPart.description}</p>

                {selectedPart.isListening && (
                  <div className="mb-5 p-4 rounded-lg border bg-accent/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Headphones className="w-4 h-4" />
                      <p className="font-medium">Âm thanh câu hỏi</p>
                    </div>
                    {(currentQuestion.audioUrl || selectedPart.audioUrl) && (
                      <audio
                        controls
                        className="w-full"
                        key={`${currentQuestion.questionId}-${currentQuestion.audioUrl || selectedPart.audioUrl}`}
                        ref={(element) => {
                          audioElementRef.current = element;
                        }}
                        onError={() =>
                          setAudioErrors((prev) => ({
                            ...prev,
                            [currentQuestion.questionId]: true,
                          }))
                        }
                      >
                        <source src={currentQuestion.audioUrl || selectedPart.audioUrl} />
                      </audio>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => speakFallback(getFallbackSpeechText())}
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Phát giọng đọc
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => speakFallback(currentQuestion.prompt)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Đọc lại nội dung câu hỏi
                      </Button>
                    </div>
                    {audioErrors[currentQuestion.questionId] && (
                      <p className="text-xs text-amber-700 mt-2">
                        Nhấn vào nút Phát giọng đọc để nghe dữ liệu âm thanh.
                      </p>
                    )}
                  </div>
                )}

                {isPart2 && !shouldRevealExamResults ? (
                  <p className="text-sm text-muted-foreground">
                    Part 2: Nghe câu hỏi/câu nói trong audio và chọn đáp án A, B hoặc C.
                  </p>
                ) : (
                  <p className="text-lg leading-relaxed">{currentQuestion.prompt}</p>
                )}
              </Card>
            )}

            {/* Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  stopActiveAudio();
                  navigate("/");
                }}
                className="flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Trang chủ
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  stopActiveAudio();
                  setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1));
                }}
                disabled={!selectedPart || selectedPart.status !== "ready" || currentQuestionIndex === 0}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Câu trước
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  stopActiveAudio();
                  setCurrentQuestionIndex(Math.min(totalQuestionsInPart - 1, currentQuestionIndex + 1));
                }}
                disabled={
                  !selectedPart ||
                  selectedPart.status !== "ready" ||
                  currentQuestionIndex >= totalQuestionsInPart - 1 ||
                  !currentQuestionAnswered
                }
                className="flex-shrink-0"
              >
                Câu sau
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>

              {selectedPart && selectedPart.status === "ready" && testDetail.isRealExamMode && (
                isCurrentPartLast || isSinglePartExam ? (
                  <Button onClick={submitExam} disabled={!canSubmitCurrentPart || isSubmittingExam || !allSelectedPartsReady} className="flex-shrink-0">
                    {isSubmittingExam ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {isSubmittingExam ? "Đang nộp đề..." : "Nộp đề"}
                  </Button>
                ) : (
                  <Button onClick={submitCurrentPart} disabled={!canSubmitCurrentPart} className="flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Nộp Part {selectedPart.partNumber}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Right Side - Answer Selection */}
          <div>
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold mb-6">Chọn đáp án</h3>

              {shouldShowExamScore && (
                <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Bạn đã hoàn thành toàn bộ đề.</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">
                    Điểm: {displayedCorrectAnswers}/{displayedTotalQuestions}
                  </p>
                  <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90">Tỷ lệ đúng: {displayedScorePercent}%</p>
                </div>
              )}

              {!selectedPart || selectedPart.status !== "ready" || !currentQuestion ? (
                <div className="text-sm text-muted-foreground">Hãy chọn một part đã sẵn sàng để làm bài.</div>
              ) : (
                <>
                  <RadioGroup
                    value={userAnswers[currentQuestion.questionId] || ""}
                    onValueChange={(value) => {
                      setUserAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.questionId]: value,
                      }));
                    }}
                    className="space-y-4"
                  >
                    {currentQuestion.options.map((option) => {
                      const isSelected = userAnswers[currentQuestion.questionId] === option.label;
                      const isCorrect = currentQuestion.correctAnswer === option.label;
                      const shouldShowResult = shouldRevealExamResults;

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
                          key={option.label}
                          className={`flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors ${borderColor} ${bgColor}`}
                        >
                          <RadioGroupItem value={option.label} id={`option-${currentQuestion.questionId}-${option.label}`} />
                          <Label
                            htmlFor={`option-${currentQuestion.questionId}-${option.label}`}
                            className="text-base font-medium cursor-pointer flex-1"
                          >
                            <span className="mr-2 text-lg">{option.label}</span>
                            {(!isPart2 || shouldRevealExamResults) && normalizeOptionDisplay(option.content)}
                          </Label>
                          {shouldShowResult && isCorrect && (
                            <span className="text-green-600 dark:text-green-400 font-semibold text-xs">✓ Đúng</span>
                          )}
                          {shouldShowResult && isSelected && !isCorrect && (
                            <span className="text-red-600 dark:text-red-400 font-semibold text-xs">✗ Sai</span>
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {shouldRevealExamResults && (
                    <div className="mt-6 p-4 bg-accent/30 rounded-lg border-l-4 border-primary">
                      <h4 className="font-semibold mb-2 text-primary">Giải thích đáp án</h4>
                      <div className="text-sm whitespace-pre-line text-muted-foreground">
                        {currentQuestion.explanation}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 text-xs text-muted-foreground">
                {isFetching && "Đang cập nhật tiến trình tạo đề..."}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestExam;
