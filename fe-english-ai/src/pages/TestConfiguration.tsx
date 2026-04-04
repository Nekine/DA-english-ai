import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Navbar";
import { useCreateTestExam } from "@/hooks/useCreateTestExam";
import { useTestSuggestedTopics } from "@/hooks/useTestSuggestedTopics";
import { useToast } from "@/hooks/use-toast";

const TOEIC_PARTS = [
  { partNumber: 1, label: "Part 1 - Short Descriptions (No Images)" },
  { partNumber: 2, label: "Part 2 - Question-Response" },
  { partNumber: 3, label: "Part 3 - Conversations" },
  { partNumber: 4, label: "Part 4 - Short Talks" },
  { partNumber: 5, label: "Part 5 - Incomplete Sentences" },
  { partNumber: 6, label: "Part 6 - Text Completion" },
  { partNumber: 7, label: "Part 7 - Reading Comprehension" },
];

const TestConfiguration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createExamMutation = useCreateTestExam();
  const { data: suggestedTopics = [], isLoading: isLoadingTopics } = useTestSuggestedTopics();

  const [customTopic, setCustomTopic] = useState("");
  const [selectedSuggestedTopic, setSelectedSuggestedTopic] = useState("");
  const [isRealExamMode, setIsRealExamMode] = useState(true);
  const [isFullTest, setIsFullTest] = useState(true);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);

  const finalTopic = useMemo(() => customTopic.trim() || selectedSuggestedTopic, [customTopic, selectedSuggestedTopic]);

  const handleCreateExam = async () => {
    try {
      const created = await createExamMutation.mutateAsync({
        Topic: customTopic.trim() || undefined,
        SuggestedTopic: !customTopic.trim() ? selectedSuggestedTopic || undefined : undefined,
        IsRealExamMode: isRealExamMode,
        IsFullTest: isFullTest,
        SelectedParts: !isFullTest ? selectedParts : undefined,
      });

      const firstPartNumber = isFullTest
        ? 1
        : (selectedParts.slice().sort((a, b) => a - b)[0] ?? 1);

      toast({
        title: "Đã tạo đề thành công",
        description: `Part ${firstPartNumber} đã sẵn sàng, bạn có thể vào thi ngay.`,
      });

      navigate(`/test-exam/${created.testId}`);
    } catch (error) {
      toast({
        title: "Không thể tạo đề",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau ít phút.",
        variant: "destructive",
      });
    }
  };

  const isSubmitDisabled =
    createExamMutation.isPending ||
    (!finalTopic && suggestedTopics.length > 0) ||
    (!isFullTest && selectedParts.length === 0);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/test-list")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card className="p-8 mb-6 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                Tạo đề TOEIC 7 Part
              </h1>
              <p className="text-muted-foreground">
                Tạo xong Part 1 là vào làm ngay, Part 2-7 sẽ tự động sinh tiếp theo thứ tự.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="custom-topic">Nhập chủ đề riêng</Label>
              <Input
                id="custom-topic"
                placeholder="Ví dụ: Đàm phán hợp đồng vận chuyển"
                value={customTopic}
                onChange={(event) => setCustomTopic(event.target.value)}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Nếu bạn nhập chủ đề riêng, hệ thống sẽ ưu tiên dùng nội dung này.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Hoặc chọn từ chủ đề gợi ý</Label>
              <Select
                value={selectedSuggestedTopic}
                onValueChange={setSelectedSuggestedTopic}
                disabled={isLoadingTopics || suggestedTopics.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTopics ? "Đang tải chủ đề..." : "Chọn chủ đề gợi ý"} />
                </SelectTrigger>
                <SelectContent>
                  {suggestedTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Combobox này chỉ dùng khi bạn để trống ô nhập chủ đề riêng.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
              <div className="flex-1">
                <span className="font-medium block">Bật chế độ thi thật</span>
                <span className="text-xs text-muted-foreground">
                  {isRealExamMode ? "Không hiện đáp án và giải thích ngay lập tức" : "Hiển thị đáp án và giải thích sau mỗi câu"}
                </span>
              </div>
              <Switch 
                checked={isRealExamMode} 
                onCheckedChange={setIsRealExamMode}
              />
            </div>

            <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium block">Làm toàn bộ 7 Part</span>
                  <span className="text-xs text-muted-foreground">
                    Tắt mục này nếu bạn muốn chọn part cụ thể để luyện.
                  </span>
                </div>
                <Switch
                  checked={isFullTest}
                  onCheckedChange={setIsFullTest}
                />
              </div>

              {!isFullTest && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <p className="text-sm font-medium">Chọn part muốn làm</p>
                  <div className="grid grid-cols-1 gap-2">
                    {TOEIC_PARTS.map((part) => {
                      const checked = selectedParts.includes(part.partNumber);
                      return (
                        <label
                          key={part.partNumber}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/60 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              if (nextChecked) {
                                setSelectedParts((prev) => Array.from(new Set([...prev, part.partNumber])));
                              } else {
                                setSelectedParts((prev) => prev.filter((item) => item !== part.partNumber));
                              }
                            }}
                          />
                          <span className="text-sm">{part.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="font-medium">Tiến trình tạo đề thông minh</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Sau khi bấm tạo, bạn sẽ vào làm part đầu tiên trong danh sách đã chọn. Các part còn lại sẽ được tạo tuần tự trong lúc bạn làm bài.
              </p>
            </div>
          </div>
        </Card>

        <Button
          size="lg"
          className="w-full text-lg py-6"
          onClick={handleCreateExam}
          disabled={isSubmitDisabled}
        >
          {createExamMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang tạo Part ...
            </>
          ) : (
            "TẠO ĐỀ VÀ BẮT ĐẦU"
          )}
        </Button>
      </main>
    </div>
  );
};

export default TestConfiguration;
