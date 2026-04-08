import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from '@/components/Navbar';
import { useAuth } from '@/components/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Sparkles, Loader2, History, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { sentenceWritingApi } from "@/lib/api";

const CREATED_EXERCISES_PAGE_SIZE = 6;

const SentenceWriting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [createdExercises, setCreatedExercises] = useState<Array<{
    exerciseId: number;
    title: string;
    topic: string;
    level: string;
    totalItems: number;
    createdAt: string;
  }>>([]);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'xai'>('openai');
  const [topicMode, setTopicMode] = useState<"suggested" | "custom">("suggested");
  const [formData, setFormData] = useState({
    topic: "travel", // Mặc định chọn Du lịch
    customTopic: "",
    level: "Intermediate",
    sentenceCount: "5",
    writingStyle: "Communicative" // Mặc định là Giao tiếp
  });

  const suggestedTopics = [
    { value: "travel", label: "Du lịch" },
    { value: "food", label: "Ẩm thực" },
    { value: "technology", label: "Công nghệ" },
    { value: "health", label: "Sức khỏe" },
    { value: "education", label: "Giáo dục" },
    { value: "work", label: "Công việc" },
    { value: "hobby", label: "Sở thích" },
    { value: "family", label: "Gia đình" }
  ];

  const englishLevels = [
    { value: "Basic", label: "Cơ bản (A1-A2)" },
    { value: "Intermediate", label: "Trung cấp (B1-B2)" },
    { value: "Advanced", label: "Nâng cao (C1-C2)" }
  ];

  const handleGenerate = async () => {
    const finalTopic = topicMode === "suggested" 
      ? suggestedTopics.find(t => t.value === formData.topic)?.label || ""
      : formData.customTopic.trim();

    if (!finalTopic) {
      toast.error("Vui lòng chọn hoặc nhập chủ đề!");
      return;
    }

    setIsGenerating(true);
    
    try {
      const data = await sentenceWritingApi.generateSentences({
        topic: finalTopic,
        level: formData.level,
        sentenceCount: parseInt(formData.sentenceCount),
        writingStyle: formData.writingStyle
      }, aiProvider);
      
      // Validate data before navigate
      if (!data || !data.Sentences || data.Sentences.length === 0) {
        console.error("❌ Invalid data structure");
        throw new Error("Dữ liệu trả về không hợp lệ. Vui lòng kiểm tra backend.");
      }
      
      // Normalize to lowercase for frontend consistency
      const normalizedData = {
        sentences: data.Sentences.map(s => ({
          id: s.Id,
          vietnamese: s.Vietnamese,
          correctAnswer: s.CorrectAnswer || "",
          suggestion: s.Suggestion ? {
            vocabulary: s.Suggestion.Vocabulary.map(v => ({
              word: v.Word,
              meaning: v.Meaning
            })),
            structure: s.Suggestion.Structure
          } : undefined
        }))
      };
      
      toast.success("Đã tạo bài luyện viết thành công!");
      let savedExerciseId: number | null = null;
      
      // Tự động lưu bài sentence writing vào database
      try {
        const saveRequest = {
          title: `${finalTopic} - Sentence Writing`,
          topic: finalTopic,
          sentences: normalizedData.sentences,
          level: formData.level,
          category: finalTopic,
          estimatedMinutes: Math.ceil(normalizedData.sentences.length * 3),
          timeLimit: 900,
          description: `AI-generated sentence writing with ${normalizedData.sentences.length} sentences`,
          createdBy: user?.userId || 1
        };

        const saveResponse = await sentenceWritingApi.saveSentenceWriting(saveRequest);
        savedExerciseId = saveResponse.exerciseId ?? null;
        
      } catch (saveError) {
        console.error('⚠️ Failed to save sentence writing:', saveError);
        // Không show error toast vì vẫn có thể làm bài
      }
      
      // Navigate to practice page with generated data
      navigate("/sentence-practice", {
        state: {
          generatedData: normalizedData,
          topic: finalTopic,
          level: formData.level,
          exerciseId: savedExerciseId,
        }
      });
    } catch (error: unknown) {
      console.error("Error generating sentences:", error);
      
      // Xử lý trường hợp backend busy
      const busyError = error as { isBusyError?: boolean; message?: string };
      if (busyError.isBusyError) {
        toast.warning("DALTK đang bận, vui lòng thử lại sau 3 phút");
        setIsGenerating(false);
        return;
      }
      
      // Xử lý lỗi khác
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Có lỗi xảy ra khi tạo bài luyện. Vui lòng thử lại!");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const loadCreatedExercises = async () => {
    try {
      setIsHistoryLoading(true);
      const items = await sentenceWritingApi.getCreatedExercises(25);
      setCreatedExercises(items);
      setHistoryPage(1);
    } catch (error) {
      console.error('Failed to load sentence-writing history', error);
      toast.error('Không thể tải danh sách bài đã tạo.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleHistoryButtonClick = () => {
    const nextState = !isHistoryOpen;
    setIsHistoryOpen(nextState);
    if (nextState) {
      setHistoryPage(1);
      void loadCreatedExercises();
    }
  };

  const handleOpenCreatedExercise = async (exerciseId: number) => {
    try {
      setIsHistoryLoading(true);
      const detail = await sentenceWritingApi.getCreatedExerciseDetail(exerciseId);

      const normalizedData = {
        sentences: detail.sentences.map((sentence) => ({
          id: sentence.id,
          vietnamese: sentence.vietnamese,
          correctAnswer: sentence.correctAnswer,
          ...(sentence.suggestion
            ? {
                suggestion: {
                  vocabulary: Array.isArray(sentence.suggestion.vocabulary)
                    ? sentence.suggestion.vocabulary.map((vocab) => ({
                        word: vocab.word,
                        meaning: vocab.meaning,
                      }))
                    : [],
                  structure: sentence.suggestion.structure ?? '',
                },
              }
            : {}),
        })),
      };

      navigate('/sentence-practice', {
        state: {
          generatedData: normalizedData,
          topic: detail.topic,
          level: detail.level,
          exerciseId: detail.exerciseId,
        },
      });
    } catch (error) {
      console.error('Failed to open sentence-writing exercise', error);
      toast.error('Không thể mở bài tập đã tạo.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const totalHistoryPages = Math.max(1, Math.ceil(createdExercises.length / CREATED_EXERCISES_PAGE_SIZE));
  const effectiveHistoryPage = Math.min(historyPage, totalHistoryPages);
  const pagedCreatedExercises = createdExercises.slice(
    (effectiveHistoryPage - 1) * CREATED_EXERCISES_PAGE_SIZE,
    effectiveHistoryPage * CREATED_EXERCISES_PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/writing-mode")}
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
            LUYỆN VIẾT CÂU
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Các câu tiếng Việt theo chủ đề, bạn dịch sang tiếng Anh và nhận feedback
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          <Button
            variant={aiProvider === 'gemini' ? 'default' : 'outline'}
            onClick={() => setAiProvider('gemini')}
            className="transition-all"
          >
            🤖 Gemini
          </Button>
          <Button
            variant={aiProvider === 'openai' ? 'default' : 'outline'}
            onClick={() => setAiProvider('openai')}
            className="transition-all"
          >
            ✨ ChatGPT
          </Button>
          <Button
            variant={aiProvider === 'xai' ? 'default' : 'outline'}
            onClick={() => setAiProvider('xai')}
            className="transition-all"
          >
            🧠 Grok
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tạo bài luyện mới</CardTitle>
            <CardDescription>
              Chọn chủ đề, độ khó và số lượng câu để bắt đầu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-4">
              <Label>Chủ đề luyện tập *</Label>
              <RadioGroup value={topicMode} onValueChange={(value) => setTopicMode(value as "suggested" | "custom")} disabled={isGenerating}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suggested" id="suggested" />
                  <Label htmlFor="suggested" className="font-normal cursor-pointer">Chọn từ gợi ý</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">Tự nhập chủ đề</Label>
                </div>
              </RadioGroup>

              {topicMode === "suggested" ? (
                <Select
                  value={formData.topic}
                  onValueChange={(value) => setFormData({ ...formData, topic: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chủ đề..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedTopics.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Ví dụ: Môi trường, Thể thao, Điện ảnh..."
                  value={formData.customTopic}
                  onChange={(e) => setFormData({ ...formData, customTopic: e.target.value })}
                  disabled={isGenerating}
                />
              )}
              <p className="text-sm text-muted-foreground">
                Các câu liên quan đến chủ đề này
              </p>
            </div>

            {/* Writing Style Selection */}
            <div className="space-y-4">
              <Label>Dạng bài viết *</Label>
              <RadioGroup 
                value={formData.writingStyle} 
                onValueChange={(value) => setFormData({ ...formData, writingStyle: value })} 
                disabled={isGenerating}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Communicative" id="communicative" />
                  <Label htmlFor="communicative" className="font-normal cursor-pointer">
                    <span className="font-semibold">🗣️ Giao tiếp</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Academic" id="academic" />
                  <Label htmlFor="academic" className="font-normal cursor-pointer">
                    <span className="font-semibold">📚 Học thuật</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
              <Label htmlFor="level">Trình độ tiếng Anh *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                disabled={isGenerating}
              >
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {englishLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sentence Count */}
            <div className="space-y-2">
              <Label htmlFor="sentenceCount">Số lượng câu</Label>
              <Select
                value={formData.sentenceCount}
                onValueChange={(value) => setFormData({ ...formData, sentenceCount: value })}
                disabled={isGenerating}
              >
                <SelectTrigger id="sentenceCount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 câu</SelectItem>
                  <SelectItem value="10">10 câu</SelectItem>
                  <SelectItem value="15">15 câu</SelectItem>
                  <SelectItem value="20">20 câu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo bài luyện...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Tạo bài luyện
                </>
              )}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleHistoryButtonClick}
              disabled={isGenerating || isHistoryLoading}
            >
              {isHistoryLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <History className="w-4 h-4 mr-2" />
              )}
              {isHistoryOpen ? 'Ẩn các bài tập đã tạo' : 'Các bài tập đã tạo'}
            </Button>

            {isHistoryOpen && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Lịch sử bài viết theo câu</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadCreatedExercises()}
                    disabled={isHistoryLoading}
                  >
                    <RefreshCcw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {isHistoryLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải lịch sử...</p>
                ) : createdExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có bài tập đã lưu.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {pagedCreatedExercises.map((item) => (
                      <button
                        type="button"
                        key={item.exerciseId}
                        onClick={() => void handleOpenCreatedExercise(item.exerciseId)}
                        className="w-full rounded-md border p-3 text-left hover:bg-accent/40"
                      >
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Chủ đề: {item.topic} • {item.totalItems} câu • {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </button>
                    ))}

                    {createdExercises.length > CREATED_EXERCISES_PAGE_SIZE && (
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                          disabled={effectiveHistoryPage === 1}
                        >
                          Trang trước
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Trang {effectiveHistoryPage}/{totalHistoryPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                          disabled={effectiveHistoryPage === totalHistoryPages}
                        >
                          Trang sau
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                💡 Cách thức hoạt động:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Các câu tiếng Việt theo chủ đề và độ khó</li>
                <li>• Bạn dịch từng câu sang tiếng Anh</li>
                <li>• Nhận đánh giá và gợi ý cải thiện ngay lập tức</li>
                <li>• Có gợi ý từ vựng và cấu trúc nếu gặp khó khăn</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SentenceWriting;
