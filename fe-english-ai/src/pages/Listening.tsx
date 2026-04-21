import { useEffect, useMemo, useRef, useState } from 'react';
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
import { listeningService, ListeningAnswerPayload, ListeningExerciseParams, ListeningExerciseResult, ListeningGenre, ListeningGradeResult, AiModel, ListeningExerciseSummary } from '@/services/listeningService';
import { useToast } from '@/hooks/use-toast';
import { AudioLines, BookOpen, Clock, Ear, History, Loader2, Music, Play, RefreshCcw, Sparkles, Square, Trophy, Volume2, ArrowLeft, Headphones } from 'lucide-react';

const DEFAULT_QUESTION_COUNT = 5;
const HISTORY_PAGE_SIZE = 6;
const MAX_ATTEMPT_SECONDS = 10 * 60;

const AI_MODEL_OPTIONS = [
  {
    value: AiModel.GeminiFlashLite,
    label: 'Gemini',
    description: 'Tốc độ phản hồi nhanh, chi phí tối ưu.'
  },
  {
    value: AiModel.Gpt5Preview,
    label: 'ChatGPT',
    description: 'Độ chính xác cao, script sáng tạo hơn.'
  },
  {
    value: AiModel.Grok42,
    label: 'Grok',
    description: 'Khả năng suy luận mạnh, phù hợp tạo script đa dạng.'
  }
];

const Listening = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [genres, setGenres] = useState<Record<number, string>>({});
  const [englishLevels, setEnglishLevels] = useState<Record<number, string>>({});
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('3');
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<AiModel>(AiModel.Gpt5Preview);
  const [isLoading, setIsLoading] = useState(false);
  const [exercise, setExercise] = useState<ListeningExerciseResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [gradeResult, setGradeResult] = useState<ListeningGradeResult | null>(null);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeAudioSegment, setActiveAudioSegment] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(MAX_ATTEMPT_SECONDS);
  const attemptStartedAtRef = useRef<string>(new Date().toISOString());
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const userStoppedSpeechRef = useRef<boolean>(false);
  const [recentExercises, setRecentExercises] = useState<ListeningExerciseSummary[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const currentAiModelMeta = useMemo(
    () => AI_MODEL_OPTIONS.find(option => option.value === selectedAiModel),
    [selectedAiModel]
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );
  const totalHistoryPages = useMemo(
    () => Math.max(1, Math.ceil(recentExercises.length / HISTORY_PAGE_SIZE)),
    [recentExercises.length]
  );
  const pagedRecentExercises = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return recentExercises.slice(start, start + HISTORY_PAGE_SIZE);
  }, [historyPage, recentExercises]);
  const playbackSegments = useMemo(() => {
    if (!exercise) {
      return [] as string[];
    }

    const segments = Array.isArray(exercise.AudioSegments)
      ? exercise.AudioSegments.filter((segment) => typeof segment === 'string' && segment.trim().length > 0)
      : [];

    if (segments.length > 0) {
      return segments;
    }

    return exercise.AudioContent ? [exercise.AudioContent] : [];
  }, [exercise]);

  const formatTimestamp = (value: string) => dateTimeFormatter.format(new Date(value));
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetAttemptTimer = () => {
    attemptStartedAtRef.current = new Date().toISOString();
    hasAutoSubmittedRef.current = false;
    setTimeLeft(MAX_ATTEMPT_SECONDS);
  };

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  useEffect(() => {
    setActiveAudioSegment(0);
  }, [exercise?.ExerciseId]);

  useEffect(() => {
    if (activeAudioSegment >= playbackSegments.length) {
      setActiveAudioSegment(0);
    }
  }, [activeAudioSegment, playbackSegments.length]);

  useEffect(() => {
    if (!exercise || gradeResult || isLoading || hasAutoSubmittedRef.current) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exercise?.ExerciseId, gradeResult, isLoading]);

  const loadRecentExercises = async () => {
    try {
      setIsHistoryLoading(true);
      const data = await listeningService.getRecentExercises(25);
      setRecentExercises(data);
      setHistoryPage(1);
    } catch (error) {
      console.error('Failed to load listening history', error);
      toast({
        title: 'Không thể tải lịch sử',
        description: 'Vui lòng thử lại sau vài phút.',
        variant: 'destructive'
      });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleHistoryButtonClick = () => {
    const nextState = !isHistoryOpen;
    setIsHistoryOpen(nextState);
    if (nextState) {
      setHistoryPage(1);
      void loadRecentExercises();
    }
  };

  const handleRefreshHistory = () => {
    if (isHistoryLoading) {
      return;
    }

    if (!isHistoryOpen) {
      setIsHistoryOpen(true);
    }

    void loadRecentExercises();
  };

  const handleOpenRecentExercise = async (exerciseId: string) => {
    try {
      setIsLoading(true);
      const result = await listeningService.getExerciseById(exerciseId);
      setExercise(result);
      setActiveAudioSegment(0);
      setAnswers({});
      setGradeResult(null);
      setShowTranscript(false);
      resetAttemptTimer();
      stopTranscriptReading();
      setIsHistoryOpen(false);
      toast({
        title: 'Đã mở bài nghe đã tạo',
        description: 'Bạn có thể làm lại bài này ngay bây giờ.'
      });
    } catch (error) {
      console.error('Failed to open listening exercise', error);
      toast({
        title: 'Không thể mở bài nghe',
        description: 'Bài có thể không còn khả dụng.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [genreData, levelData] = await Promise.all([
          listeningService.getGenres(),
          listeningService.getEnglishLevels()
        ]);

        setGenres(genreData);
        setEnglishLevels(levelData);
        const defaultGenre = Object.keys(genreData)[0] ?? '';
        setSelectedGenre(defaultGenre);
        if (levelData['3']) {
          setSelectedLevel('3');
        } else {
          const firstLevel = Object.keys(levelData)[0];
          if (firstLevel) {
            setSelectedLevel(firstLevel);
          }
        }
      } catch (error) {
        console.error('Failed to load listening metadata', error);
        toast({
          title: 'Không thể tải dữ liệu',
          description: 'Vui lòng thử tải lại trang hoặc kiểm tra kết nối.',
          variant: 'destructive'
        });
      }
    };

    loadMetadata();

    // Cleanup: stop speech when component unmounts
    return () => {
      userStoppedSpeechRef.current = true;
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    };
  }, [toast]);

  const stopTranscriptReading = () => {
    userStoppedSpeechRef.current = true;
    window.speechSynthesis.cancel();
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
  };

  const handleAudioSegmentEnded = () => {
    if (playbackSegments.length <= 1) {
      return;
    }

    if (activeAudioSegment >= playbackSegments.length - 1) {
      return;
    }

    const nextSegment = activeAudioSegment + 1;
    setActiveAudioSegment(nextSegment);

    window.setTimeout(() => {
      const playPromise = audioElementRef.current?.play();
      if (playPromise) {
        void playPromise.catch(() => {
          // Ignore autoplay restrictions after segment switch.
        });
      }
    }, 0);
  };

  const handleGenerateExercise = async () => {
    if (!selectedGenre) {
      toast({
        title: 'Vui lòng chọn thể loại',
        description: 'Bạn cần chọn một thể loại trước khi tạo bài nghe.',
        variant: 'destructive'
      });
      return;
    }

    const params: ListeningExerciseParams = {
      Genre: Number(selectedGenre) as ListeningGenre,
      EnglishLevel: Number(selectedLevel),
      TotalQuestions: questionCount,
      CustomTopic: customTopic.trim() || undefined,
      AiModel: selectedAiModel
    };

    try {
      setIsLoading(true);
      const result = await listeningService.generateExercise(params);
      setExercise(result);
      setActiveAudioSegment(0);
      setAnswers({});
      setGradeResult(null);
      setShowTranscript(false);
      resetAttemptTimer();
      stopTranscriptReading();
      toast({
        title: 'Đã tạo bài nghe thành công',
        description: 'Hãy lắng nghe và trả lời các câu hỏi bên dưới.'
      });
    } catch (error: unknown) {
      console.error('Failed to generate listening exercise', error);
      
      // Extract error message from response
      let errorMessage = 'Vui lòng thử lại trong giây lát.';
      let errorTitle = 'Không thể tạo bài nghe';
      
      // Try to get backend error message
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data && typeof error.response.data.message === 'string') {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error && error.message.includes('429')) {
        errorTitle = 'Vượt quá giới hạn API';
        errorMessage = 'API đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau 1-2 phút hoặc chọn mô hình AI khác (Gemini 2.0 Flash Lite).';
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
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

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleGrade = async (isAutoSubmit = false) => {
    if (!exercise) {
      return;
    }

    const payload: ListeningAnswerPayload[] = Object.entries(answers).map(([index, option]) => ({
      QuestionIndex: Number(index),
      SelectedOptionIndex: option
    }));

    try {
      setIsLoading(true);
      const result = await listeningService.gradeExercise(exercise.ExerciseId, payload, {
        startedAt: attemptStartedAtRef.current,
        timeSpentSeconds: Math.max(
          1,
          Math.round((Date.now() - new Date(attemptStartedAtRef.current).getTime()) / 1000),
        ),
      });
      setGradeResult(result);
    } catch (error) {
      console.error('Failed to grade listening answers', error);
      toast({
        title: isAutoSubmit ? 'Tự nộp bài chưa thành công' : 'Không thể chấm điểm',
        description: 'Vui lòng thử lại sau.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!exercise || gradeResult || isLoading || hasAutoSubmittedRef.current || timeLeft > 0) {
      return;
    }

    hasAutoSubmittedRef.current = true;
    toast({
      title: 'Đã hết 10 phút',
      description: 'Hệ thống đang tự nộp bài nghe của bạn.'
    });
    void handleGrade(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.ExerciseId, gradeResult, isLoading, timeLeft]);

  const handleRetryQuestions = () => {
    setAnswers({});
    setGradeResult(null);
    resetAttemptTimer();
  };

  const handleReadTranscript = () => {
    if (!exercise?.Transcript) {
      return;
    }

    if (isSpeaking) {
      stopTranscriptReading();
    } else {
      // Start reading
      userStoppedSpeechRef.current = true;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(exercise.Transcript);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for better comprehension
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      userStoppedSpeechRef.current = false;
      currentUtteranceRef.current = utterance;

      utterance.onend = () => {
        if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
        }
        setIsSpeaking(false);
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
        }

        setIsSpeaking(false);

        const cancelledByUser =
          userStoppedSpeechRef.current || event.error === 'canceled' || event.error === 'interrupted';

        if (cancelledByUser) {
          userStoppedSpeechRef.current = false;
          return;
        }

        toast({
          title: 'Không thể đọc văn bản',
          description: 'Trình duyệt của bạn có thể không hỗ trợ tính năng này.',
          variant: 'destructive'
        });
      };

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const scoreBadgeTone = useMemo(() => {
    if (!gradeResult) {
      return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }

    if (gradeResult.Score >= 85) {
      return 'bg-emerald-500 text-white';
    }
    if (gradeResult.Score >= 60) {
      return 'bg-blue-500 text-white';
    }
    return 'bg-rose-500 text-white';
  }, [gradeResult]);

  const getFeedbackTone = (isCorrect: boolean) =>
    isCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-400 bg-rose-50 dark:bg-rose-900/30';

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
            <Headphones className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LUYỆN NGHE TIẾNG ANH
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tạo bài nghe cá nhân hóa với trí tuệ nhân tạo, lắng nghe nội dung tự nhiên và luyện tập qua các câu hỏi trắc nghiệm kèm giải thích tiếng Việt.
          </p>
        </section>

        <Card className="p-6 shadow-md dark:shadow-none dark:bg-gray-900/60">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Thể loại bài nghe</Label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn thể loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(genres).map(([value, label]) => (
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
                    <SelectValue placeholder="Chọn mô hình AI" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentAiModelMeta?.description}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Số câu hỏi</Label>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value) || DEFAULT_QUESTION_COUNT)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">Chủ đề tùy chỉnh (không bắt buộc)</Label>
                <Input
                  placeholder="Ví dụ: Khám phá Paris vào mùa xuân"
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value)}
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                <Volume2 className="h-4 w-4" />
                Tạo audio thực tế
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200">
                <Music className="h-4 w-4" />
                Script 180-260 từ tự nhiên
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <BookOpen className="h-4 w-4" />
                Giải thích tiếng Việt
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
                <Sparkles className="h-4 w-4" />
                {currentAiModelMeta ? `AI: ${currentAiModelMeta.label}` : 'Chọn mô hình AI'}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleHistoryButtonClick}
                disabled={isHistoryLoading}
                className="min-w-[220px]"
              >
                {isHistoryLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <History className="mr-2 h-4 w-4" />
                )}
                {isHistoryOpen ? 'Ẩn lịch sử đã tạo' : 'Xem lịch sử đã tạo'}
              </Button>
              <Button onClick={handleGenerateExercise} disabled={isLoading} className="min-w-[220px]">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo bài nghe...
                  </>
                ) : (
                  <>
                    <AudioLines className="mr-2 h-4 w-4" />
                    Tạo bài nghe mới
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {isHistoryOpen && (
          <Card className="p-6 shadow-md dark:shadow-none dark:bg-gray-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Lịch sử bài nghe gần đây</p>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Các bài đã tạo được lưu lại để bạn có thể mở lại chấm điểm hoặc nghe lại bất kỳ lúc nào.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-100">
                  {recentExercises.length} bài khả dụng
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshHistory}
                  disabled={isHistoryLoading}
                  className="gap-2"
                >
                  <RefreshCcw className={`h-4 w-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
                  Tải lại
                </Button>
              </div>
            </div>

            <ScrollArea className="mt-6 max-h-[360px] pr-2">
              {isHistoryLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải lịch sử...
                </div>
              ) : recentExercises.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-muted-foreground dark:border-gray-800">
                  Chưa có bài nghe nào trong bộ nhớ. Hãy tạo một bài mới để bắt đầu.
                </div>
              ) : (
                <div className="space-y-4">
                  {pagedRecentExercises.map((item) => {
                    const englishLevelLabel = englishLevels[String(item.EnglishLevel)] ?? `Level ${item.EnglishLevel}`;
                    return (
                      <button
                        type="button"
                        key={item.ExerciseId}
                        className="w-full rounded-2xl border border-rose-100/80 bg-white/80 p-4 text-left shadow-sm transition hover:border-rose-300 dark:border-gray-800 dark:bg-gray-900/40"
                        onClick={() => void handleOpenRecentExercise(item.ExerciseId)}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{item.Title}</p>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              Tạo lúc {formatTimestamp(item.CreatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-rose-200 text-rose-500 dark:border-rose-400 dark:text-rose-100">
                              {item.Genre}
                            </Badge>
                            <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-500 dark:text-slate-100">
                              {englishLevelLabel}
                            </Badge>
                            <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-400 dark:text-emerald-100">
                              {item.TotalQuestions} câu hỏi
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-gray-400">
                          <span className="text-muted-foreground dark:text-gray-400">ID: {item.ExerciseId}</span>
                        </div>
                      </button>
                    );
                  })}

                  {recentExercises.length > HISTORY_PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={historyPage === 1}
                      >
                        Trang trước
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Trang {historyPage}/{totalHistoryPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                        disabled={historyPage === totalHistoryPages}
                      >
                        Trang sau
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        )}

        {exercise && (
          <section className="space-y-6">
            <Card className="p-6 dark:bg-gray-900/50">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{exercise.Title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="border-rose-400 text-rose-500 dark:border-rose-300 dark:text-rose-200">
                      {exercise.Genre}
                    </Badge>
                    <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-500 dark:text-slate-200">
                      {englishLevels[String(exercise.EnglishLevel)] ?? `Level ${exercise.EnglishLevel}`}
                    </Badge>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                        timeLeft <= 60
                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'
                          : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Thời gian còn lại</span>
                      <span className="font-semibold tabular-nums">{formatCountdown(timeLeft)}</span>
                    </div>
                  </div>
                </div>
                {playbackSegments.length > 0 && (
                  <div className="w-full space-y-2 md:w-64">
                    <audio
                      key={`${exercise.ExerciseId}-${activeAudioSegment}`}
                      ref={audioElementRef}
                      controls
                      onEnded={handleAudioSegmentEnded}
                      className="w-full rounded-lg bg-gray-100 p-2 dark:bg-gray-800"
                    >
                      <source src={playbackSegments[activeAudioSegment]} type="audio/mp3" />
                      Trình duyệt của bạn không hỗ trợ phát audio.
                    </audio>

                    {playbackSegments.length > 1 && (
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveAudioSegment((prev) => Math.max(0, prev - 1))}
                          disabled={activeAudioSegment === 0}
                        >
                          Đoạn trước
                        </Button>
                        <span>
                          Đoạn {activeAudioSegment + 1}/{playbackSegments.length}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveAudioSegment((prev) => Math.min(playbackSegments.length - 1, prev + 1))}
                          disabled={activeAudioSegment >= playbackSegments.length - 1}
                        >
                          Đoạn sau
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTranscript(prev => !prev)}
                >
                  {showTranscript ? 'Ẩn transcript' : 'Hiện transcript'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleReadTranscript}
                  className="gap-2"
                >
                  {isSpeaking ? (
                    <>
                      <Square className="h-4 w-4" />
                      Dừng đọc
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Đọc văn bản
                    </>
                  )}
                </Button>

                <span className="text-xs text-muted-foreground">
                  Sử dụng giọng đọc của trình duyệt
                </span>
              </div>

              {showTranscript && (
                <ScrollArea className="mt-4 h-56 rounded-md border border-dashed border-rose-200 p-4 text-left text-sm leading-relaxed text-gray-700 dark:border-rose-900/40 dark:text-gray-300">
                  {exercise.Transcript}
                </ScrollArea>
              )}
            </Card>

            <Card className="p-6 space-y-6 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Câu hỏi trắc nghiệm</h3>
                {gradeResult && (
                  <Badge className={`${scoreBadgeTone} px-3 py-1 text-sm`}>Điểm: {gradeResult.Score.toFixed(2)}%</Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-6">
                {exercise.Questions.map((question, index) => {
                  const selectedOption = answers[index];
                  const gradeFeedback = gradeResult?.Questions.find((item) => item.QuestionIndex === index);

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border transition-colors ${gradeFeedback ? getFeedbackTone(gradeFeedback.IsCorrect) : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60'}`}
                    >
                      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-rose-500 dark:text-rose-300">Câu hỏi {index + 1}</p>
                            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{question.Question}</p>
                          </div>
                          {gradeFeedback && (
                            <Badge variant="outline" className={gradeFeedback.IsCorrect ? 'border-emerald-400 text-emerald-500 dark:border-emerald-300 dark:text-emerald-100' : 'border-rose-400 text-rose-500 dark:border-rose-300 dark:text-rose-100'}>
                              {gradeFeedback.IsCorrect ? 'Chính xác' : 'Sai'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 px-5 py-4">
                        {question.Options.map((option, optionIndex) => {
                          const isSelected = selectedOption === optionIndex;
                          const isCorrectOption = gradeFeedback?.RightOptionIndex === optionIndex;
                          const optionTone = gradeFeedback
                            ? isCorrectOption
                              ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-300 dark:bg-emerald-900/40'
                              : isSelected
                                ? 'border-rose-400 bg-rose-50 dark:border-rose-300 dark:bg-rose-900/30'
                                : 'border-gray-200 dark:border-gray-800'
                            : isSelected
                              ? 'border-blue-400 bg-blue-50 dark:border-blue-300 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-800';

                          return (
                            <button
                              type="button"
                              key={optionIndex}
                              className={`w-full rounded-lg border px-4 py-3 text-left transition ${optionTone}`}
                              onClick={() => handleSelectAnswer(index, optionIndex)}
                              disabled={!!gradeResult || timeLeft === 0 || isLoading}
                            >
                              <span className="font-medium text-gray-900 dark:text-gray-100">{String.fromCharCode(65 + optionIndex)}.</span>
                              <span className="ml-3 text-gray-700 dark:text-gray-300">{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {gradeFeedback && (
                        <div className="border-t border-dashed border-rose-200 bg-rose-50/60 px-5 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                          <span className="font-semibold">Giải thích: </span>
                          {gradeFeedback.ExplanationInVietnamese}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
                {gradeResult ? (
                  <Button variant="outline" onClick={handleRetryQuestions}>
                    Làm lại câu hỏi
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Hãy đảm bảo bạn đã nghe kỹ trước khi nộp bài.
                  </p>
                )}

                <Button
                  className="min-w-[220px]"
                  onClick={() => void handleGrade()}
                  disabled={isLoading || !!gradeResult || timeLeft === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang chấm bài...
                    </>
                  ) : (
                    <>
                      <Trophy className="mr-2 h-4 w-4" />
                      Nộp bài và xem kết quả
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};

export default Listening;
