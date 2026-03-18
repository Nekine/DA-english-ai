import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  MessageSquare, 
  Lightbulb, 
  Send, 
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import writingExerciseService, { WritingExercise, SentenceQuestion } from '@/services/writingExerciseService';

const WritingPractice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [exercise, setExercise] = useState<WritingExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  
  // AI provider state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  
  // Essay mode state
  const [essayContent, setEssayContent] = useState('');
  
  // Sentence mode state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showHints, setShowHints] = useState<boolean[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (id) {
      loadExercise(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timerActive, timeLeft]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (!timerActive && timeLeft === 0 && !submitted) {
      setTimeout(() => {
        handleSubmit();
      }, 100);
    }
  }, [timerActive, timeLeft, submitted]);

  const loadExercise = async (exerciseId: number) => {
    try {
      setLoading(true);
      const data = await writingExerciseService.getWritingExerciseById(exerciseId);
      setExercise(data);
      
      if (data.type === 'writing_sentence') {
        const parsedQuestions = writingExerciseService.parseSentenceQuestions(data.questionsJson);
        setQuestions(parsedQuestions);
        setAnswers(new Array(parsedQuestions.length).fill(''));
        setShowHints(new Array(parsedQuestions.length).fill(false));
        setResults(new Array(parsedQuestions.length).fill(false));
      }
      
      // Start timer
      const timeInSeconds = (data.timeLimit || 30) * 60;
      setTimeLeft(timeInSeconds);
      setTimerActive(true);
    } catch (error) {
      console.error('Error loading exercise:', error);
      toast.error('Không thể tải bài tập');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    if (exercise?.type === 'writing_sentence') {
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = value;
      setAnswers(newAnswers);
    } else {
      setEssayContent(value);
    }
  };

  const toggleHint = () => {
    const newShowHints = [...showHints];
    newShowHints[currentQuestion] = !newShowHints[currentQuestion];
    setShowHints(newShowHints);
  };

  const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\.+$/g, '').replace(/\s+/g, ' ');
    return normalize(userAnswer) === normalize(correctAnswer);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setTimerActive(false);
    
    if (exercise?.type === 'writing_sentence') {
      // Check all answers
      const newResults = answers.map((answer, index) => 
        checkAnswer(answer, questions[index].correctAnswer)
      );
      setResults(newResults);
      setSubmitted(true);
      
      const correctCount = newResults.filter(r => r).length;
      const score = Math.round((correctCount / questions.length) * 100);
      
      // Show toast after state updates
      setTimeout(() => {
        toast.success(`Hoàn thành! Điểm số: ${score}/100 (${correctCount}/${questions.length} câu đúng)`);
      }, 100);
      
      // TODO: Save to database via API
      // await exerciseService.submitCompletion(exercise.id, answers, score);
    } else {
      // Essay submission
      if (!essayContent.trim()) {
        setTimeout(() => {
          toast.error('Vui lòng nhập nội dung bài viết');
        }, 100);
        return;
      }
      
      setSubmitted(true);
      
      // Show toast after state updates
      setTimeout(() => {
        toast.success('Đã nộp bài viết thành công! Giáo viên sẽ chấm điểm sau.');
      }, 100);
      
      // TODO: Save to database
      // await exerciseService.submitEssay(exercise.id, essayContent);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>Không tìm thấy bài tập</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={!submitted && timerActive}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant={exercise.level ? 'default' : 'secondary'}>
              {exercise.level || 'All levels'}
            </Badge>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5" />
              <span className={timeLeft < 300 ? 'text-red-600' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              {exercise.type === 'writing_essay' ? (
                <FileText className="w-6 h-6 text-green-600" />
              ) : (
                <MessageSquare className="w-6 h-6 text-orange-600" />
              )}
              <div>
                <CardTitle className="text-2xl">{exercise.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Chủ đề: {exercise.category || 'Tổng hợp'}
                </p>
              </div>
            </div>
          </CardHeader>
          {exercise.description && (
            <CardContent>
              <p className="text-muted-foreground">{exercise.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Essay Mode */}
        {exercise.type === 'writing_essay' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Viết bài của bạn:
                </label>
                <Textarea
                  value={essayContent}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Bắt đầu viết bài của bạn tại đây..."
                  className="min-h-[400px] text-base leading-relaxed"
                  disabled={submitted}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Số từ: {essayContent.trim().split(/\s+/).filter(w => w).length}
                </p>
              </div>

              {!submitted ? (
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  size="lg"
                  disabled={!essayContent.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Nộp bài
                </Button>
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Đã nộp bài thành công! Giáo viên sẽ chấm điểm và gửi phản hồi sau.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sentence Mode */}
        {exercise.type === 'writing_sentence' && questions.length > 0 && (
          <div className="space-y-6">
            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Câu {currentQuestion + 1} / {questions.length}</span>
                    <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
                  </div>
                  <Progress value={((currentQuestion + 1) / questions.length) * 100} />
                </div>
              </CardContent>
            </Card>

            {/* Current Question */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge>Câu {currentQuestion + 1}</Badge>
                  {submitted && (
                    results[currentQuestion] ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Dịch câu sau sang tiếng Anh:
                  </label>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                      {questions[currentQuestion].vietnamesePrompt}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Câu trả lời của bạn:
                  </label>
                  <Input
                    value={answers[currentQuestion]}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Nhập câu trả lời tiếng Anh..."
                    className="text-base"
                    disabled={submitted}
                  />
                </div>

                {/* Hints */}
                {!submitted && (
                  <Button
                    variant="outline"
                    onClick={toggleHint}
                    className="w-full"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {showHints[currentQuestion] ? 'Ẩn gợi ý' : 'Xem gợi ý'}
                  </Button>
                )}

                {showHints[currentQuestion] && (
                  <div className="grid grid-cols-2 gap-4">
                    {questions[currentQuestion].vocabularyHint && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                          Từ vựng:
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {questions[currentQuestion].vocabularyHint}
                        </p>
                      </div>
                    )}
                    {questions[currentQuestion].grammarHint && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                          Ngữ pháp:
                        </p>
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          {questions[currentQuestion].grammarHint}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show correct answer after submission */}
                {submitted && !results[currentQuestion] && (
                  <Alert className="bg-red-50 border-red-200">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <p className="font-medium mb-1">Đáp án đúng:</p>
                      <p className="text-sm">{questions[currentQuestion].correctAnswer}</p>
                    </AlertDescription>
                  </Alert>
                )}

                {submitted && results[currentQuestion] && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Chính xác! Câu trả lời của bạn đúng.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestion === 0 || submitted}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Câu trước
                  </Button>

                  {currentQuestion < questions.length - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={submitted}
                    >
                      Câu sau
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : !submitted ? (
                    <Button 
                      onClick={handleSubmit}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Nộp bài
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(-1)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Hoàn thành
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary after submission */}
            {submitted && (
              <>
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                        Kết quả bài làm
                      </h3>
                      <div className="flex items-center justify-center gap-8 text-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <span className="font-semibold">{results.filter(r => r).length} đúng</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-6 h-6 text-red-600" />
                          <span className="font-semibold">{results.filter(r => !r).length} sai</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        Điểm: {Math.round((results.filter(r => r).length / questions.length) * 100)}/100
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Results */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chi tiết từng câu</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questions.map((question, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          results[index] 
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {results[index] ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Câu {index + 1}</Badge>
                              <span className={`text-xs font-semibold ${
                                results[index] ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                              }`}>
                                {results[index] ? 'Đúng' : 'Sai'}
                              </span>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Đề bài:
                              </p>
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {question.vietnamesePrompt}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Câu trả lời của bạn:
                              </p>
                              <p className={`text-sm font-medium ${
                                results[index] 
                                  ? 'text-green-700 dark:text-green-300' 
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {answers[index] || '(Không trả lời)'}
                              </p>
                            </div>

                            {!results[index] && (
                              <div className="pt-2 border-t border-red-200 dark:border-red-800">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Đáp án đúng:
                                </p>
                                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                  {question.correctAnswer}
                                </p>
                              </div>
                            )}

                            {(question.vocabularyHint || question.grammarHint) && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                  Gợi ý:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {question.vocabularyHint && (
                                    <div className="text-xs">
                                      <span className="font-medium">Từ vựng: </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {question.vocabularyHint}
                                      </span>
                                    </div>
                                  )}
                                  {question.grammarHint && (
                                    <div className="text-xs">
                                      <span className="font-medium">Ngữ pháp: </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {question.grammarHint}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Button
                  onClick={() => navigate(-1)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  Hoàn thành
                </Button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WritingPractice;
