import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { speakingService, SpeakingExerciseParams, SpeakingExerciseResult, SpeakingAnalysisResult, SpeakingTopic, AiModel } from '@/services/speakingService';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2, MessageSquare, Trophy, Volume2, Sparkles, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const AI_MODEL_OPTIONS = [
  {
    value: AiModel.GeminiFlashLite,
    label: 'Gemini 2.0 Flash Lite',
    description: 'Cân bằng tốc độ/chi phí cho việc tạo đề bài và phân tích.'
  },
  {
    value: AiModel.Gpt5Preview,
    label: 'GPT 5.1 Preview',
    description: 'Độ sáng tạo và đánh giá sâu hơn (beta).'
  }
];

const Speaking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topics, setTopics] = useState<Record<number, string>>({});
  const [englishLevels, setEnglishLevels] = useState<Record<number, string>>({});
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('3');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<AiModel>(AiModel.GeminiFlashLite);
  const [isLoading, setIsLoading] = useState(false);
  const [exercise, setExercise] = useState<SpeakingExerciseResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SpeakingAnalysisResult | null>(null);
  const [exerciseAiModel, setExerciseAiModel] = useState<AiModel | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAiModelMeta = useMemo(
    () => AI_MODEL_OPTIONS.find(option => option.value === selectedAiModel),
    [selectedAiModel]
  );
  const exerciseAiModelMeta = useMemo(
    () => (exerciseAiModel !== null ? AI_MODEL_OPTIONS.find(option => option.value === exerciseAiModel) : null),
    [exerciseAiModel]
  );

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [topicData, levelData] = await Promise.all([
          speakingService.getTopics(),
          speakingService.getEnglishLevels()
        ]);

        setTopics(topicData);
        setEnglishLevels(levelData);
        const defaultTopic = Object.keys(topicData)[0] ?? '';
        setSelectedTopic(defaultTopic);
        if (levelData['3']) {
          setSelectedLevel('3');
        }
      } catch (error) {
        console.error('Failed to load speaking metadata', error);
        toast({
          title: 'Không thể tải dữ liệu',
          description: 'Vui lòng thử tải lại trang.',
          variant: 'destructive'
        });
      }
    };

    loadMetadata();
  }, [toast]);

  const handleGenerateExercise = async () => {
    if (!selectedTopic) {
      toast({
        title: 'Vui lòng chọn chủ đề',
        variant: 'destructive'
      });
      return;
    }

    const params: SpeakingExerciseParams = {
      Topic: Number(selectedTopic) as SpeakingTopic,
      EnglishLevel: Number(selectedLevel),
      CustomTopic: customTopic.trim() || undefined,
      AiModel: selectedAiModel
    };

    try {
      setIsLoading(true);
      const result = await speakingService.generateExercise(params);
      setExercise(result);
      setExerciseAiModel(selectedAiModel);
      setAudioBlob(null);
      setAnalysisResult(null);
      toast({
        title: 'Đã tạo bài tập thành công',
        description: 'Hãy đọc đoạn văn và ghi âm giọng nói của bạn.'
      });
    } catch (error: unknown) {
      console.error('Failed to generate speaking exercise', error);
      let errorMessage = 'Vui lòng thử lại sau.';
      let errorTitle = 'Không thể tạo bài tập';
      
      // Try to get backend error message
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string }; status?: number } };
        if (responseError.response?.data?.message) {
          errorMessage = responseError.response.data.message;
        } else if (responseError.response?.status === 429) {
          errorTitle = 'Vượt quá giới hạn API';
          errorMessage = 'API đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau 1-2 phút hoặc chọn mô hình AI khác.';
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        const messageError = error as { message: string };
        if (messageError.message?.includes('429')) {
          errorTitle = 'Vượt quá giới hạn API';
          errorMessage = 'API đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau 1-2 phút hoặc chọn mô hình AI khác.';
        } else {
          errorMessage = messageError.message;
        }
      }
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: 'Đang ghi âm...',
        description: 'Hãy nói rõ ràng vào micro.'
      });
    } catch (error) {
      console.error('Failed to start recording', error);
      toast({
        title: 'Không thể ghi âm',
        description: 'Vui lòng kiểm tra quyền truy cập micro.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: 'Đã dừng ghi âm',
        description: 'Bạn có thể phân tích giọng nói bây giờ.'
      });
    }
  };

  const handleAnalyze = async () => {
    if (!exercise || !audioBlob) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        try {
          const aiModelForAnalysis = exerciseAiModel ?? selectedAiModel;
          const result = await speakingService.analyzeSpeech({
            ExerciseId: exercise.ExerciseId,
            AudioData: base64Audio,
            AiModel: aiModelForAnalysis
          });
          
          setAnalysisResult(result);
          toast({
            title: 'Đã phân tích xong',
            description: `Điểm tổng thể: ${result.OverallScore.toFixed(1)}/100`
          });
        } catch (error: unknown) {
          console.error('Failed to analyze speech', error);
          let errorMessage = 'Vui lòng thử lại sau.';
          if (error && typeof error === 'object' && 'response' in error) {
            const responseError = error as { response?: { status?: number } };
            if (responseError.response?.status === 429) {
              errorMessage = 'API đã vượt quá giới hạn. Vui lòng thử lại sau 1 phút.';
            }
          }
          if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = (error as { message: string }).message;
          }
          toast({
            title: 'Không thể phân tích',
            description: errorMessage,
            variant: 'destructive'
          });
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error) {
      console.error('Failed to process audio', error);
      toast({
        title: 'Lỗi xử lý audio',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-blue-500 text-white';
    if (score >= 50) return 'bg-yellow-500 text-white';
    return 'bg-rose-500 text-white';
  };

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

        <section className="text-center space-y-4 py-8 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-soft mb-4">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LUYỆN NÓI TIẾNG ANH
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tạo bài tập nói cá nhân hóa, ghi âm giọng nói của bạn và nhận phân tích chi tiết về phát âm, ngữ pháp, từ vựng và độ trôi chảy.
          </p>
        </section>

        <Card className="p-6 shadow-md dark:shadow-none dark:bg-gray-900/60">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Chủ đề</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chủ đề" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(topics).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Cấp độ tiếng Anh</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cấp độ" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(englishLevels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Mô hình AI</Label>
                <Select value={String(selectedAiModel)} onValueChange={(value) => setSelectedAiModel(Number(value) as AiModel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mô hình" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODEL_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{currentAiModelMeta?.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Chủ đề tùy chỉnh (không bắt buộc)</Label>
                <Input
                  placeholder="Ví dụ: Kể về kỳ nghỉ hè của bạn"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Mô hình AI: {currentAiModelMeta?.label}</span>
            </div>

            <Button onClick={handleGenerateExercise} disabled={isLoading} className="min-w-[220px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo bài tập...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Tạo bài tập mới
                </>
              )}
            </Button>
          </div>
        </Card>

        {exercise && (
          <section className="space-y-6">
            <Card className="p-6 dark:bg-gray-900/50">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{exercise.Title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-blue-400 text-blue-600 dark:border-blue-300 dark:text-blue-200">
                      {topics[Number(selectedTopic)]}
                    </Badge>
                    {exerciseAiModelMeta && (
                      <Badge variant="outline" className="border-amber-400 text-amber-600 dark:border-amber-300 dark:text-amber-200">
                        AI: {exerciseAiModelMeta.label}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Đoạn văn cần nói:</p>
                      <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">{exercise.Prompt}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">Gợi ý:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{exercise.Hint}</p>
                    </div>
                  </div>
                </div>

                {exercise.SampleAudio && (
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <audio controls className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <source src={exercise.SampleAudio} type="audio/mp3" />
                    </audio>
                  </div>
                )}

                <Separator />

                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-muted-foreground">Nhấn nút bên dưới để bắt đầu ghi âm giọng nói của bạn</p>
                  
                  <div className="flex gap-3">
                    {!isRecording ? (
                      <Button
                        size="lg"
                        onClick={startRecording}
                        disabled={!!audioBlob || isLoading}
                        className="gap-2"
                      >
                        <Mic className="h-5 w-5" />
                        Bắt đầu ghi âm
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={stopRecording}
                        className="gap-2 animate-pulse"
                      >
                        <MicOff className="h-5 w-5" />
                        Dừng ghi âm
                      </Button>
                    )}

                    {audioBlob && !isRecording && (
                      <Button
                        size="lg"
                        onClick={handleAnalyze}
                        disabled={isLoading || !!analysisResult}
                        className="gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Đang phân tích...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-5 w-5" />
                            Phân tích giọng nói
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {audioBlob && (
                    <div className="w-full max-w-md">
                      <audio controls className="w-full rounded-lg bg-gray-100 dark:bg-gray-800">
                        <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {analysisResult && (
              <Card className="p-6 space-y-6 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Kết quả phân tích</h3>
                  <Badge className={`${getScoreBadge(analysisResult.OverallScore)} px-3 py-1 text-sm`}>
                    {analysisResult.OverallScore.toFixed(1)}/100
                  </Badge>
                </div>

                <Separator />

                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Văn bản nhận dạng:</p>
                  <p className="text-base text-gray-900 dark:text-gray-100 italic">"{analysisResult.TranscribedText}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Phát âm</span>
                      <span className={`font-semibold ${getScoreColor(analysisResult.PronunciationScore)}`}>
                        {analysisResult.PronunciationScore.toFixed(1)}
                      </span>
                    </div>
                    <Progress value={analysisResult.PronunciationScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Ngữ pháp</span>
                      <span className={`font-semibold ${getScoreColor(analysisResult.GrammarScore)}`}>
                        {analysisResult.GrammarScore.toFixed(1)}
                      </span>
                    </div>
                    <Progress value={analysisResult.GrammarScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Từ vựng</span>
                      <span className={`font-semibold ${getScoreColor(analysisResult.VocabularyScore)}`}>
                        {analysisResult.VocabularyScore.toFixed(1)}
                      </span>
                    </div>
                    <Progress value={analysisResult.VocabularyScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Độ trôi chảy</span>
                      <span className={`font-semibold ${getScoreColor(analysisResult.FluencyScore)}`}>
                        {analysisResult.FluencyScore.toFixed(1)}
                      </span>
                    </div>
                    <Progress value={analysisResult.FluencyScore} className="h-2" />
                  </div>
                </div>

                {analysisResult.GrammarErrors.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Lỗi phát hiện:</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-3 pr-4">
                        {analysisResult.GrammarErrors.map((error, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="border-rose-400 text-rose-600 dark:border-rose-300 dark:text-rose-200 mt-1">
                                {error.ErrorType}
                              </Badge>
                              <div className="flex-1 space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold text-rose-700 dark:text-rose-300">Lỗi: </span>
                                  <span className="text-gray-900 dark:text-gray-100">{error.ErrorText}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Sửa: </span>
                                  <span className="text-gray-900 dark:text-gray-100">{error.Correction}</span>
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {error.ExplanationInVietnamese}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">Nhận xét chung:</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{analysisResult.OverallFeedback}</p>
                </div>

                {analysisResult.Suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Gợi ý cải thiện:</h4>
                    <ul className="space-y-2">
                      {analysisResult.Suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAudioBlob(null);
                      setAnalysisResult(null);
                    }}
                  >
                    Ghi âm lại
                  </Button>
                </div>
              </Card>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Speaking;
