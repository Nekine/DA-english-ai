import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Check, 
  X, 
  ChevronRight, 
  RotateCcw, 
  Lightbulb,
  Sparkles,
  Send,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface SentenceData {
  id: number;
  vietnamese: string;
  correctAnswer: string;
  suggestion?: {
    vocabulary: Array<{ word: string; meaning: string }>;
    structure: string;
  };
}

interface UserAnswer {
  sentenceId: number;
  vietnamese: string;
  userTranslation: string;
}

interface SentenceReview {
  sentenceId: number;
  vietnamese: string;
  userAnswer: string;
  score: number;
  correctAnswer: string;
  vocabulary: string;
  grammarPoints: string;
  errorExplanation: string;
  isCorrect: boolean;
}


const SentencePractice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { generatedData, topic, level } = location.state || {};
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTranslation, setUserTranslation] = useState("");
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<SentenceReview[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Data đã được normalize ở SentenceWriting.tsx, dùng trực tiếp
  const sentences: SentenceData[] = generatedData?.sentences || [];
  
  const currentSentence = sentences[currentIndex];
  const totalSentences = sentences.length;
  const isLastSentence = currentIndex === totalSentences - 1;
  const answeredCount = userAnswers.length;
  
  // Scroll to top when changing sentence
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);
  
  // Load saved answer when changing sentence
  useEffect(() => {
    if (currentSentence) {
      const savedAnswer = userAnswers.find(a => a.sentenceId === currentSentence.id);
      setUserTranslation(savedAnswer?.userTranslation || "");
      setShowSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Early return after all hooks
  if (!generatedData || sentences.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md shadow-soft">
          <X className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Không tìm thấy đề bài</h2>
          <p className="text-muted-foreground mb-4">
            Vui lòng tạo bài luyện mới để bắt đầu.
          </p>
          <Button onClick={() => navigate("/sentence-writing")}>
            Tạo bài luyện mới
          </Button>
        </Card>
      </div>
    );
  }

  const handleNextSentence = () => {
    if (!userTranslation.trim()) {
      toast.error("Vui lòng nhập bản dịch trước khi chuyển câu!");
      return;
    }

    // Validate minimum word count
    const wordCount = userTranslation.trim().split(/\s+/).length;
    if (wordCount < 3) {
      toast.error(`Câu trả lời phải có ít nhất 3 từ (hiện tại: ${wordCount} từ)`);
      return;
    }

    // Save current answer
    const newAnswer: UserAnswer = {
      sentenceId: currentSentence.id,
      vietnamese: currentSentence.vietnamese,
      userTranslation: userTranslation.trim()
    };
    
    setUserAnswers(prev => {
      const filtered = prev.filter(a => a.sentenceId !== currentSentence.id);
      return [...filtered, newAnswer];
    });

    // Move to next sentence
    if (currentIndex < totalSentences - 1) {
      setCurrentIndex(currentIndex + 1);
      toast.success("Đã lưu câu trả lời!");
    }
  };

  // Text normalization helper - compare ignoring case and trailing period
  const normalizeText = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/\.+$/g, '') // Remove trailing periods only
      .replace(/\s+/g, ' '); // Normalize whitespace
  };

  const handleSubmitAll = async () => {
    if (!userTranslation.trim()) {
      toast.error("Vui lòng nhập bản dịch cho câu cuối cùng!");
      return;
    }

    // Validate minimum word count for last answer
    const wordCount = userTranslation.trim().split(/\s+/).length;
    if (wordCount < 3) {
      toast.error(`Câu cuối cùng phải có ít nhất 3 từ (hiện tại: ${wordCount} từ)`);
      return;
    }

    // Save last answer
    const lastAnswer: UserAnswer = {
      sentenceId: currentSentence.id,
      vietnamese: currentSentence.vietnamese,
      userTranslation: userTranslation.trim()
    };
    
    const allAnswers = [...userAnswers.filter(a => a.sentenceId !== currentSentence.id), lastAnswer];
    
    if (allAnswers.length !== totalSentences) {
      toast.error("Vui lòng hoàn thành tất cả các câu trước khi nộp bài!");
      return;
    }
    
    setUserAnswers(allAnswers);
    setIsSubmitting(true);
    
    console.log("📤 Submitting all answers:", allAnswers);
    console.log("🎯 Topic:", topic, "Level:", level);
    
    try {
      // Compare user answers with correct answers (no AI needed!)
      console.log("🔍 Comparing user answers with correct answers...");
      
      const reviewResults: SentenceReview[] = allAnswers.map((answer, index) => {
        const sentence = sentences.find(s => s.id === answer.sentenceId);
        
        if (!sentence) {
          console.error(`❌ Sentence not found for ID ${answer.sentenceId}`);
          return {
            sentenceId: answer.sentenceId,
            vietnamese: answer.vietnamese,
            userAnswer: answer.userTranslation,
            score: 0,
            correctAnswer: "",
            vocabulary: "",
            grammarPoints: "",
            errorExplanation: "Không tìm thấy câu hỏi.",
            isCorrect: false
          } as SentenceReview;
        }

        const normalizedUserAnswer = normalizeText(answer.userTranslation);
        const normalizedCorrectAnswer = normalizeText(sentence.correctAnswer);
        
        const isMatch = normalizedUserAnswer === normalizedCorrectAnswer && normalizedCorrectAnswer !== '';
        
        console.log(`📝 Sentence ${index + 1}/${allAnswers.length}:`);
        console.log(`  Vietnamese: "${answer.vietnamese}"`);
        console.log(`  User original: "${answer.userTranslation}"`);
        console.log(`  User normalized: "${normalizedUserAnswer}"`);
        console.log(`  ⚠️ CRITICAL - sentence object:`, sentence);
        console.log(`  ⚠️ CRITICAL - sentence.correctAnswer:`, sentence.correctAnswer);
        console.log(`  ⚠️ CRITICAL - typeof sentence.correctAnswer:`, typeof sentence.correctAnswer);
        console.log(`  Correct original: "${sentence.correctAnswer}"`);
        console.log(`  Correct normalized: "${normalizedCorrectAnswer}"`);
        console.log(`  Match: ${isMatch ? '✅' : '❌'}`);
        
        // Create review result
        const correctAnswer = sentence.correctAnswer || "";
        console.log(`  ⚠️ Setting correctAnswer: "${correctAnswer}" (length: ${correctAnswer.length})`);
        
        return {
          sentenceId: answer.sentenceId,
          vietnamese: answer.vietnamese,
          userAnswer: answer.userTranslation,
          score: isMatch ? 10 : 5, // 10 for correct, 5 for wrong (still good effort)
          correctAnswer: correctAnswer,
          vocabulary: sentence.suggestion?.vocabulary.map(v => `${v.word}: ${v.meaning}`).join('; ') || "",
          grammarPoints: sentence.suggestion?.structure || "",
          errorExplanation: isMatch ? "" : "Câu trả lời chưa chính xác. Hãy so sánh với đáp án đúng và học từ vựng, ngữ pháp bên dưới.",
          isCorrect: isMatch
        } as SentenceReview;
      });

      const correctCount = reviewResults.filter(r => r.isCorrect).length;
      const wrongCount = reviewResults.length - correctCount;
      
      console.log(`✅ Comparison complete: ${correctCount} correct, ${wrongCount} wrong`);
      console.log("✅ Review results:", reviewResults);
      
      if (!reviewResults || reviewResults.length === 0) {
        console.error("❌ No review results!");
        toast.error("Không nhận được kết quả chấm bài!");
        return;
      }
      
      const validReviews = reviewResults.filter(r => r && r.sentenceId);
      console.log("✅ Valid reviews count:", validReviews.length);
      
      if (validReviews.length !== reviewResults.length) {
        console.warn("⚠️ Some reviews are invalid!");
      }
      
      setReviews(reviewResults);
      setIsCompleted(true);
      
      const finalCorrectCount = reviewResults.filter(r => r.isCorrect).length;
      
      console.log("📊 Final stats:", { correctCount: finalCorrectCount, total: reviewResults.length });
      
      toast.success(`Hoàn thành! ${finalCorrectCount}/${reviewResults.length} câu đúng`);
      
      // Scroll to top to see results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("❌ Error getting reviews:", error);
      
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
        toast.error(`Không thể chấm bài: ${error.message}`);
      } else {
        toast.error("Không thể chấm bài. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRewrite = () => {
    setUserTranslation("");
  };
  
  const handleRetry = () => {
    setUserAnswers([]);
    setReviews([]);
    setIsCompleted(false);
    setCurrentIndex(0);
    setUserTranslation("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If completed, show results
  console.log("🔍 Render check - isCompleted:", isCompleted, "reviews.length:", reviews.length);
  
  if (isCompleted && reviews.length > 0) {
    console.log("✅ Rendering results page");
    console.log("✅ Reviews with correctAnswer:", reviews.map(r => ({ 
      id: r.sentenceId, 
      correctAnswer: r.correctAnswer,
      hasCorrectAnswer: !!r.correctAnswer 
    })));
    const correctCount = reviews.filter(r => r.isCorrect).length;
    
    console.log("📊 Results page stats:", { correctCount, totalReviews: reviews.length });
    
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/sentence-writing")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </div>

          {/* Results Summary */}
          <Card className="shadow-soft mb-6">
            <CardHeader className="bg-gradient-primary text-primary-foreground">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Kết quả tổng hợp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center pb-6 border-b">
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Số câu đúng</p>
                    <p className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {correctCount}/{totalSentences}
                    </p>
                  </div>
                </div>
                <Badge variant={correctCount === totalSentences ? "default" : "secondary"} className="text-base px-4 py-1">
                  {correctCount === totalSentences ? "✓ Hoàn hảo!" : correctCount >= totalSentences * 0.7 ? "Tốt lắm!" : "Cần cải thiện"}
                </Badge>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Làm lại
                </Button>
                <Button onClick={() => navigate("/sentence-writing")} className="flex-1">
                  Tạo bài mới
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Notice */}
          <Card className="shadow-soft mb-6 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    ✨ Kết quả chấm nhanh bởi AI
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Đây là kết quả đánh giá tự động do AI thực hiện, mang tính chất <strong>tham khảo</strong> và có thể chưa hoàn toàn chính xác. 
                    Kết quả chấm chi tiết và chính thức sẽ được <strong>cô giáo trực tiếp đánh giá</strong> và gửi đến bạn trong <strong>vài giờ tới</strong>. 
                    Cảm ơn bạn đã kiên nhẫn chờ đợi! 📝✨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Reviews */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">📋 Chi tiết từng câu</h3>
            
            {reviews.map((review, index) => {
              const sentence = sentences.find(s => s.id === review.sentenceId);
              
              return (
                <Card key={review.sentenceId} className="shadow-soft">
                  <CardHeader className={review.isCorrect ? "bg-green-50 dark:bg-green-950/30" : "bg-orange-50 dark:bg-orange-950/30"}>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {review.isCorrect ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                        Câu {index + 1}
                      </span>
                      <Badge variant={review.isCorrect ? "default" : "destructive"}>
                        {review.isCorrect ? "Đúng" : "Sai"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Vietnamese Sentence */}
                    <div className="p-3 bg-accent rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">🇻🇳 Câu tiếng Việt:</p>
                      <p className="font-medium">{review.vietnamese}</p>
                    </div>

                    {/* User Answer */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-muted-foreground mb-1">✍️ Câu trả lời của bạn:</p>
                      <p className="font-medium">{review.userAnswer}</p>
                    </div>

                    {/* Correct Answer - only show when wrong */}
                    {!review.isCorrect && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                          ✅ Đáp án đúng:
                        </p>
                        <p className="font-medium">
                          {review.correctAnswer || sentence?.correctAnswer || "(Không có đáp án)"}
                        </p>
                      </div>
                    )}

                    {/* Vocabulary - from suggestion */}
                    {sentence?.suggestion?.vocabulary && sentence.suggestion.vocabulary.length > 0 && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">📚 Từ vựng:</p>
                        <div className="space-y-2">
                          {sentence.suggestion.vocabulary.map((vocab, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{vocab.word}</span>: {vocab.meaning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grammar Points */}
                    {sentence?.suggestion?.structure && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">📝 Ngữ pháp:</p>
                        <div className="text-sm">
                          {sentence.suggestion.structure}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/sentence-writing")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="text-sm">
              Chủ đề: <span className="font-semibold ml-1">{topic}</span>
            </Badge>
            <Badge variant="outline" className="text-sm">
              Trình độ: <span className="font-semibold ml-1">{level}</span>
            </Badge>
            <Badge variant="outline" className="text-sm bg-primary/10">
              Đã trả lời: <span className="font-semibold ml-1">{answeredCount}/{totalSentences}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Sentences and Input */}
          <div className="space-y-6">
            {/* Current Sentence Card */}
            <Card className="shadow-soft">
              <CardHeader className="bg-gradient-primary text-primary-foreground">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Câu cần dịch
                  </span>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground">
                    Câu {currentIndex + 1}/{totalSentences}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-4 bg-accent rounded-lg border-2 border-primary/20">
                  <p className="text-lg font-medium">
                    {currentSentence.vietnamese}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Translation Input */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>✍️ Bản dịch của bạn</span>
                  {currentSentence.suggestion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Gợi ý
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Nhập bản dịch tiếng Anh của bạn tại đây..."
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  className="min-h-[120px] text-base"
                  disabled={isSubmitting}
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRewrite}
                    disabled={isSubmitting || !userTranslation}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Xóa
                  </Button>
                  {isLastSentence ? (
                    <Button
                      onClick={handleSubmitAll}
                      disabled={isSubmitting || !userTranslation.trim()}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Đang chấm bài...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Nộp bài
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextSentence}
                      disabled={isSubmitting || !userTranslation.trim()}
                      className="flex-1"
                    >
                      Câu tiếp theo
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress List */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>📋 Danh sách câu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {sentences.map((sentence, index) => {
                    const hasAnswer = userAnswers.some(a => a.sentenceId === sentence.id);
                    
                    return (
                      <div
                        key={sentence.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent ${
                          index === currentIndex
                            ? 'bg-primary/10 border-primary'
                            : hasAnswer
                            ? 'bg-accent border-border'
                            : 'bg-background border-border opacity-40'
                        }`}
                        onClick={() => setCurrentIndex(index)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Câu {index + 1}</span>
                          {hasAnswer && <Check className="w-4 h-4 text-green-600" />}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sentence.vietnamese}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Suggestions */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            {showSuggestions && currentSentence.suggestion ? (
              <Card className="shadow-soft bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Gợi ý từ vựng & cấu trúc
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vocabulary */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">
                      📚 Từ vựng
                    </h4>
                    <div className="space-y-2">
                      {currentSentence.suggestion.vocabulary.map((vocab, index) => (
                        <div key={index} className="p-2 bg-background rounded border">
                          <p className="font-medium text-sm">{vocab.word}</p>
                          <p className="text-xs text-muted-foreground">{vocab.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Structure */}
                  <div className="p-3 bg-background rounded border">
                    <h4 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">
                      🔧 Cấu trúc câu
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {currentSentence.suggestion.structure}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-soft bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">Làm bài luyện tập</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Hãy dịch từng câu tiếng Việt sang tiếng Anh. Sau khi hoàn thành tất cả các câu, bạn sẽ nhận được điểm và đánh giá chi tiết.
                    </p>
                    <div className="space-y-2">
                      <div className="p-3 bg-background rounded border text-left">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          💡 <strong>Mẹo:</strong> Click "Gợi ý" nếu bạn gặp khó khăn với từ vựng hoặc cấu trúc câu.
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded border text-left">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          ✅ <strong>Cách làm:</strong> Sau mỗi câu nhấn "Câu tiếp theo", câu cuối cùng nhấn "Nộp bài" để nhận kết quả.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SentencePractice;
