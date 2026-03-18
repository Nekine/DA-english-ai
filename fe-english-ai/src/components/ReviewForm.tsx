import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface ReviewFormProps {
  onSubmit: (data: { userLevel: string; requirement: string; content: string }) => void;
  isLoading: boolean;
}

export const ReviewForm = ({ onSubmit, isLoading }: ReviewFormProps) => {
  const [userLevel, setUserLevel] = useState("Basic");
  const [requirement, setRequirement] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requirement.trim()) {
      toast.error("Vui lòng nhập đề bài");
      return;
    }

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung bài viết");
      return;
    }

    if (wordCount < 30) {
      toast.error("Bài viết phải dài tối thiểu 30 từ");
      return;
    }

    if (wordCount > 500) {
      toast.error("Bài viết không được dài hơn 500 từ");
      return;
    }

    onSubmit({ userLevel, requirement, content });
  };

  return (
    <Card className="p-6 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="level" className="text-sm font-medium">
            Trình độ của bạn
          </Label>
          <Select value={userLevel} onValueChange={setUserLevel}>
            <SelectTrigger id="level" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Basic">Cơ bản (A1-A2)</SelectItem>
              <SelectItem value="Intermediate">Trung cấp (B1-B2)</SelectItem>
              <SelectItem value="Advanced">Nâng cao (C1-C2)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requirement" className="text-sm font-medium">
            Đề bài
          </Label>
          <Textarea
            id="requirement"
            placeholder="Nhập đề bài hoặc yêu cầu bạn cần viết..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="min-h-[100px] bg-background resize-none"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className="text-sm font-medium">
              Nội dung bài viết của bạn
            </Label>
            <span className={`text-xs ${wordCount < 30 || wordCount > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {wordCount} từ
            </span>
          </div>
          <Textarea
            id="content"
            placeholder="Nhập nội dung bài viết của bạn ở đây..."
            value={content}
            onChange={handleContentChange}
            className="min-h-[300px] bg-background resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Bài viết phải có từ 30-500 từ
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-primary hover:shadow-hover transition-all duration-300 font-medium"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Nộp bài
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
