import React, { useState, useEffect } from 'react';
import { GraduationCap, ArrowLeft, Clock, ArrowRight, Sparkles, ChevronDown, ChevronUp, Bot, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthContext';
import {
  exerciseService,
  ExerciseGenerationParams,
  ExerciseSet,
  Question,
  AssignmentType
} from '@/services/exerciseService';

// Suggested topics
const suggestedTopics = [
  "Colors around me",
  "Animals I see",
  "Places nearby",
  "Clothes I wear",
  "Family members",
  "ManChester United"
];

// Question type options
interface QuestionTypeOption {
  value: AssignmentType;
  label: string;
  description: string;
}

const questionTypeOptions: QuestionTypeOption[] = [
  {
    value: AssignmentType.MostSuitableWord,
    label: "Most Suitable Word",
    description: "Chọn từ thích hợp nhất"
  },
  {
    value: AssignmentType.VerbConjugation,
    label: "Verb Conjugation",
    description: "Chia động từ"
  },
  {
    value: AssignmentType.ConditionalSentences,
    label: "Conditional Sentences",
    description: "Câu điều kiện"
  },
  {
    value: AssignmentType.IndirectSpeech,
    label: "Indirect Speech",
    description: "Câu gián tiếp"
  },
  {
    value: AssignmentType.FillTheBlank,
    label: "Sentence Completion",
    description: "Điền vào chỗ trống"
  },
  {
    value: AssignmentType.ReadingComprehension,
    label: "Reading Comprehension",
    description: "Đọc hiểu văn bản"
  },
  {
    value: AssignmentType.Grammar,
    label: "Grammar",
    description: "Ngữ pháp"
  },
  {
    value: AssignmentType.Collocations,
    label: "Collocation",
    description: "Phối hợp từ"
  },
  {
    value: AssignmentType.SynonymAndAntonym,
    label: "Synonym/Antonym",
    description: "Từ đồng nghĩa/trái nghĩa"
  },
  {
    value: AssignmentType.Vocabulary,
    label: "Vocabulary",
    description: "Từ vựng"
  },
  {
    value: AssignmentType.ErrorIdentification,
    label: "Error Identification",
    description: "Xác định lỗi sai"
  },
  {
    value: AssignmentType.WordFormation,
    label: "Word Formation",
    description: "Chuyển đổi từ loại"
  },
  {
    value: AssignmentType.PassiveVoice,
    label: "Passive Voice",
    description: "Câu bị động"
  },
  {
    value: AssignmentType.RelativeClauses,
    label: "Relative Clauses",
    description: "Mệnh đề quan hệ"
  },
  {
    value: AssignmentType.ComparisonSentences,
    label: "Comparison Sentences",
    description: "Câu so sánh"
  },
  {
    value: AssignmentType.Inversion,
    label: "Inversion",
    description: "Câu đảo ngữ"
  },
  {
    value: AssignmentType.Articles,
    label: "Articles",
    description: "Mạo từ"
  },
  {
    value: AssignmentType.Prepositions,
    label: "Prepositions",
    description: "Giới từ"
  },
  {
    value: AssignmentType.Idioms,
    label: "Idioms",
    description: "Thành ngữ"
  },
  {
    value: AssignmentType.SentenceTransformation,
    label: "Sentence Transformation",
    description: "Câu đồng nghĩa"
  },
  {
    value: AssignmentType.PronunciationAndStress,
    label: "Pronunciation & Stress",
    description: "Trọng âm và phát âm"
  },
  {
    value: AssignmentType.ClozeTest,
    label: "Cloze Test",
    description: "Đọc điền từ"
  },
  {
    value: AssignmentType.SentenceCombination,
    label: "Sentence Combination",
    description: "Nối câu"
  },
  {
    value: AssignmentType.MatchingHeadings,
    label: "Matching Headings",
    description: "Chọn tiêu đề phù hợp"
  },
  {
    value: AssignmentType.DialogueCompletion,
    label: "Dialogue Completion",
    description: "Hoàn thành đoạn hội thoại"
  },
  {
    value: AssignmentType.SentenceOrdering,
    label: "Sentence Ordering",
    description: "Sắp xếp câu"
  },
  {
    value: AssignmentType.WordMeaningInContext,
    label: "Word Meaning in Context",
    description: "Tìm nghĩa của từ trong ngữ cảnh"
  }
];

// Question Types Selector Component
const QuestionTypesSelector: React.FC<{
  selectedTypes: AssignmentType[];
  onChange: (types: AssignmentType[]) => void;
}> = ({ selectedTypes, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const toggleQuestionType = (type: AssignmentType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <button
          type="button"
          className="flex justify-between items-center w-full p-3 text-left border rounded-md bg-background dark:bg-card border-border"
          onClick={toggleDropdown}
        >
          <span className="text-foreground">
            {selectedTypes.length > 0
              ? selectedTypes.map((type) => questionTypeOptions.find((opt) => opt.value === type)?.label).join(', ')
              : 'Chọn dạng câu hỏi'}
          </span>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 border rounded-md shadow-lg bg-background dark:bg-card border-border">
            {questionTypeOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 p-3 hover:bg-accent dark:hover:bg-accent/20 cursor-pointer ${selectedTypes.includes(option.value) ? 'bg-accent/50 dark:bg-accent/10' : ''}`}
                onClick={() => toggleQuestionType(option.value)}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {option.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {selectedTypes.includes(option.value) && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Exercises: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showExercise, setShowExercise] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [topic, setTopic] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [exerciseSet, setExerciseSet] = useState<ExerciseSet | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    feedback: string;
  } | null>(null);

  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<AssignmentType[]>([]);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'xai'>('openai');

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showExercise && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSubmitExercise();
    }
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExercise, timeLeft]);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
  };

  const goToNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1] || null);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1] || null);
    }
  };

  const handleCreateExercise = async () => {
    if (!topic.trim()) {
      toast({
        title: 'Vui lòng nhập chủ đề',
        description: 'Chủ đề không được để trống',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      const params: ExerciseGenerationParams = {
        Topic: topic.trim(),
        AssignmentTypes: selectedQuestionTypes,
        EnglishLevel: 1,
        TotalQuestions: totalQuestions
      };

      const result = await exerciseService.generateExercise(params, aiProvider);

      console.log('RECEIVED RESPONSE:');
      console.log(JSON.stringify(result, null, 2));

      if (result && result.Questions && Array.isArray(result.Questions)) {
        setExerciseSet(result);
        setTotalQuestions(result.Questions.length);
        setCurrentQuestion(1);
        setShowExercise(true);
        setTimeLeft(600); // Reset timer
        setSubmissionResult(null);
        setAnswers({}); // Reset answers
        
        // Tự động lưu bài tập vào database
        try {
          const saveRequest = {
            title: `${result.Topic} - AI Generated`,
            topic: result.Topic,
            questions: result.Questions,
            level: 'A1', // Có thể thay đổi theo level thực tế
            type: selectedQuestionTypes.length > 1 ? 'mixed' : 'single',
            category: result.Topic,
            estimatedMinutes: Math.ceil(result.Questions.length * 1.5),
            timeLimit: 600,
            description: `AI-generated exercise with ${result.Questions.length} questions`,
            createdBy: user?.userId || 1 // Sử dụng user ID hiện tại
          };
          
          console.log('💾 Saving exercise to database...');
          console.log('📊 Save request:', JSON.stringify(saveRequest, null, 2));
          const saveResult = await exerciseService.saveExercise(saveRequest);
          
          if (saveResult.success) {
            console.log('✅ Exercise saved with ID:', saveResult.exerciseId);
          }
        } catch (saveError) {
          console.error('⚠️ Failed to save exercise:', saveError);
          // Không show error toast vì vẫn có thể làm bài
        }
        
        toast({
          title: 'Đã tạo bài tập',
          description: 'Bài tập đã được tạo thành công',
          variant: 'default'
        });
      } else {
        console.error('Invalid exercise data structure:', result);
        throw new Error('Invalid exercise data received');
      }

    } catch (err) {
      console.error('Error creating exercise:', err);
      toast({
        title: 'Không thể tạo bài tập',
        description: 'Vui lòng thử lại sau',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExercise = async () => {
    if (!exerciseSet) return;

    try {
      setIsLoading(true);

      console.log('SUBMISSION DATA:');
      console.log('Exercise Set:', JSON.stringify(exerciseSet, null, 2));
      console.log('User Answers:', JSON.stringify(answers, null, 2));

      const result = await exerciseService.submitAnswers(exerciseSet, answers);

      console.log('SUBMISSION RESULT:');
      console.log(JSON.stringify(result, null, 2));

      setSubmissionResult(result);
      setIsLoading(false);
      setShowExercise(false);
      toast({
        title: 'Đã nộp bài',
        description: 'Bài tập đã được nộp thành công',
        variant: 'default'
      });
    } catch (err) {
      console.error('Error submitting exercise:', err);
      toast({
        title: 'Không thể nộp bài',
        description: 'Vui lòng thử lại sau',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  // Progress percentage calculation
  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  // Current question data
  const question = exerciseSet?.Questions?.[currentQuestion - 1] || {
    Question: "Đang tải câu hỏi...",
    Options: [],
    ExplanationInVietnamese: ""
  };

  // Render submission result
  if (submissionResult) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-soft">
        <Header />
        <main className="flex-1 container max-w-screen-md mx-auto py-8 px-4">
          <div className="bg-card dark:bg-card rounded-xl shadow-md p-8 text-center">
            <h2 className="text-3xl font-bold mb-6 text-foreground">
              Kết Quả Bài Tập
            </h2>

            <div className="bg-accent dark:bg-accent/20 rounded-xl p-6 mb-6">
              <p className="text-xl font-semibold text-foreground">
                Điểm số: {submissionResult.score}%
              </p>
              <p className="text-muted-foreground mt-2">
                {submissionResult.correctAnswers} / {submissionResult.totalQuestions} câu
              </p>
            </div>

            <div className="space-y-4">
              {exerciseSet?.Questions.map((q, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${q.Options[q.RightOptionIndex] === answers[index + 1]
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                >
                  <p className="font-medium mb-2 text-foreground">{q.Question}</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Bạn chọn: <span className="font-medium text-foreground">{answers[index + 1] || 'Chưa trả lời'}</span>
                  </p>
                  <div className="space-y-2 text-left">
                    <div className="rounded-md border border-green-200 dark:border-green-800 bg-green-100/60 dark:bg-green-950/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300 mb-1">
                        Đáp án đúng
                      </p>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {q.Options[q.RightOptionIndex]}
                      </p>
                    </div>

                    {q.ExplanationInVietnamese?.trim() ? (
                      <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-950/40 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
                          Mẹo
                        </p>
                        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                          {q.ExplanationInVietnamese}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-6 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={() => {
                setSubmissionResult(null);
              }}
            >
              Quay lại tạo bài tập mới
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Main component return
  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Header />
      <main className="flex-1 container max-w-screen-md mx-auto py-8 px-4 animate-fade-in">
        {!showExercise ? (
          // Exercise creation form
          <>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>

            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-engace-pink rounded-2xl flex items-center justify-center">
                <GraduationCap size={48} color="white" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-center mb-2 text-foreground">BÀI TẬP</h1>
            <p className="text-center text-muted-foreground mb-4 max-w-2xl mx-auto">
              Thiết lập bài tập phù hợp với nhu cầu học tập của bạn với các chủ đề và dạng bài tập đa dạng.
            </p>

            {/* AI Provider Selector */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                <button
                  onClick={() => setAiProvider('gemini')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    aiProvider === 'gemini'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🤖 Gemini
                </button>
                <button
                  onClick={() => setAiProvider('openai')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    aiProvider === 'openai'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ✨ ChatGPT
                </button>
                <button
                  onClick={() => setAiProvider('xai')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    aiProvider === 'xai'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🧠 Grok
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="mb-4">
                <Label htmlFor="topic" className="text-foreground mb-2 block">Nhập chủ đề bài tập...</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Nhập chủ đề bài tập..."
                  className="text-lg py-6"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <Sparkles size={16} className="text-muted-foreground mr-2" />
                  <Label className="text-foreground font-medium">Chủ đề gợi ý</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map((suggestedTopic, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="bg-background hover:bg-accent"
                      onClick={() => setTopic(suggestedTopic)}
                    >
                      {suggestedTopic}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-foreground mb-2 block">Loại câu hỏi</Label>
                <QuestionTypesSelector
                  selectedTypes={selectedQuestionTypes}
                  onChange={setSelectedQuestionTypes}
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="questionCount" className="text-foreground mb-2 block">Số lượng câu hỏi</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={5}
                  max={20}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(parseInt(e.target.value) || 10)}
                />
              </div>

              <Button
                className="w-full py-6 text-lg font-semibold"
                onClick={handleCreateExercise}
                disabled={isLoading}
              >
                {isLoading ? 'Đang tạo bài tập...' : 'Tạo bài tập'}
              </Button>
            </div>
          </>
        ) : (
          // Exercise questions
          <div className="bg-card rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setShowExercise(false)}
              >
                <ArrowLeft className="mr-2" size={16} />
                Quay lại
              </Button>
              <div className="flex items-center text-muted-foreground">
                <Clock size={16} className="mr-1" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="mb-6">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>Câu {currentQuestion}/{totalQuestions}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
            </div>

            <Card className="p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-foreground">{question.Question}</h3>
              <div className="space-y-3">
                {Array.isArray(question.Options) && question.Options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedAnswer === option
                      ? 'bg-accent border-primary dark:bg-accent/30 dark:border-primary'
                      : 'hover:bg-accent/50 dark:hover:bg-accent/20'
                      }`}
                    onClick={() => handleSelectAnswer(option)}
                  >
                    <p className="text-foreground">{option}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestion === 1}
              >
                <ArrowLeft className="mr-2" size={16} />
                Câu trước
              </Button>

              {currentQuestion < totalQuestions ? (
                <Button onClick={goToNextQuestion}>
                  Câu tiếp
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSubmitExercise}
                >
                  Nộp bài
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Exercises;
