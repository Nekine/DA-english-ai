// 📝 READING EXERCISE CARD - Interactive TOEIC exercise interface
// ✅ READY FOR GIT: Hoàn thành giao diện làm bài với timer và scoring
// 🎯 TODO BACKEND: Tích hợp API để lưu kết quả và cập nhật progress
// 🎮 Features: Multiple choice, timer, scoring, result feedback, progress tracking
// 📊 TOEIC Format: Supports Parts 5, 6, 7 với authentic question types

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useReadingExercises } from "@/hooks/useReadingExercises";
import type { ReadingExercise } from "@/services/databaseStatsService";
import { ArrowLeft, Bot, CheckCircle2, Clock, User, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ReadingExerciseCardProps {
  exercise: ReadingExercise;
  onBack: () => void;
}

const MAX_ATTEMPT_SECONDS = 10 * 60;

const resolveTimeLimitSeconds = (timeLimit?: number): number => {
  const parsed = Number(timeLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return MAX_ATTEMPT_SECONDS;
  }

  return Math.min(MAX_ATTEMPT_SECONDS, Math.round(parsed));
};

const ReadingExerciseCard = ({ exercise, onBack }: ReadingExerciseCardProps) => {
  const { submitResult } = useReadingExercises();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(resolveTimeLimitSeconds(exercise.timeLimit));
  const attemptStartedAtRef = useRef<string>(new Date().toISOString());
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    attemptStartedAtRef.current = new Date().toISOString();
    hasAutoSubmittedRef.current = false;
    setTimeLeft(resolveTimeLimitSeconds(exercise.timeLimit));
  }, [exercise.exerciseId]);

  useEffect(() => {
    if (isSubmitted || hasAutoSubmittedRef.current) {
      return;
    }

    if (timeLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isSubmitted, timeLeft]);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const normalizeQuestionText = (text: string | undefined): string => {
    const raw = String(text ?? "").trim();
    if (!raw) {
      return "Question text not available";
    }

    // Remove duplicated leading numbering like "1. ...", "Question 1: ...", "Câu 1: ..."
    const cleaned = raw.replace(/^(?:question|cau|câu)?\s*\d+\s*[\.)\]:-]\s*/i, "").trim();
    return cleaned || raw;
  };

  const normalizeOptionText = (text: string | undefined): string => {
    const raw = String(text ?? "").trim();
    if (!raw) {
      return "";
    }

    // Avoid showing "A. A. ..." when AI already prefixes option labels.
    const cleaned = raw.replace(/^[A-D]\s*[\.)\]:-]\s*/i, "").trim();
    return cleaned || raw;
  };

  const handleSubmit = () => {
    const questions = exercise.questions ?? [];
    let correctCount = 0;
    const answerArray: number[] = [];

    questions.forEach((question, index) => {
      const userAnswer = answers[index] ?? -1;
      answerArray.push(userAnswer);
      if (userAnswer === (question.correctAnswer ?? -1)) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setIsSubmitted(true);

    // Use exerciseId instead of id when submitting
    submitResult(exercise.exerciseId, answerArray, {
      startedAt: attemptStartedAtRef.current,
      timeSpentSeconds: Math.max(
        1,
        Math.round((Date.now() - new Date(attemptStartedAtRef.current).getTime()) / 1000),
      ),
    });
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(resolveTimeLimitSeconds(exercise.timeLimit));
    attemptStartedAtRef.current = new Date().toISOString();
    hasAutoSubmittedRef.current = false;
  };

  useEffect(() => {
    if (isSubmitted || hasAutoSubmittedRef.current || timeLeft > 0) {
      return;
    }

    hasAutoSubmittedRef.current = true;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitted]);

  const questions = exercise.questions ?? [];
  const allQuestionsAnswered = questions.length > 0 && questions.every(
    (_, index) => answers[index] !== undefined
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{exercise.name}</h2>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{exercise.type}</Badge>
              <Badge
                variant={
                  exercise.level === "Beginner"
                    ? "default"
                    : exercise.level === "Intermediate"
                    ? "secondary"
                    : "destructive"
                }
              >
                {exercise.level}
              </Badge>
              {/* AI vs Admin Badge */}
              {exercise.sourceType === 'ai' ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                  <Bot className="h-4 w-4 mr-1" />
                  AI Generated
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <User className="h-4 w-4 mr-1" />
                  Admin Created
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              timeLeft <= 60
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="text-xs">Thời gian còn lại</span>
            <span className="font-semibold tabular-nums">{formatCountdown(timeLeft)}</span>
          </div>

          {isSubmitted && (
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {score}/{questions.length}
              </div>
              <p className="text-sm text-muted-foreground">
                {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}% Correct
              </p>
            </div>
          )}
        </div>
      </div>

      <Card className="p-6 mb-6 bg-gradient-subtle">
        <h3 className="font-semibold text-lg mb-4">Reading Passage</h3>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {exercise.content}
        </div>
      </Card>

      <div className="space-y-6">
        {questions.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">No questions available for this exercise.</p>
          </Card>
        ) : (
          questions.map((question, questionIndex) => {
          const isCorrect = isSubmitted && answers[questionIndex] === (question.correctAnswer ?? -1);
          const isIncorrect = isSubmitted && answers[questionIndex] !== (question.correctAnswer ?? -1);
          const displayQuestionText = normalizeQuestionText(question.question);

          return (
            <Card
              key={questionIndex}
              className={`p-6 ${
                isSubmitted
                  ? isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="font-semibold text-lg">{questionIndex + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium mb-4">{displayQuestionText}</p>
                  <RadioGroup
                    value={answers[questionIndex]?.toString()}
                    onValueChange={(value) =>
                      !isSubmitted && setAnswers({ ...answers, [questionIndex]: parseInt(value) })
                    }
                    disabled={isSubmitted}
                  >
                    {(question.options ?? []).map((option, optionIndex) => {
                      const isThisCorrect = optionIndex === (question.correctAnswer ?? -1);
                      const isSelected = answers[questionIndex] === optionIndex;

                      return (
                        <div
                          key={optionIndex}
                          className={`flex items-center space-x-2 p-3 rounded-lg mb-2 ${
                            isSubmitted
                              ? isThisCorrect
                                ? "bg-green-100 dark:bg-green-900/30"
                                : isSelected
                                ? "bg-red-100 dark:bg-red-900/30"
                                : ""
                              : "hover:bg-accent"
                          }`}
                        >
                          <RadioGroupItem value={optionIndex.toString()} id={`${questionIndex}-${optionIndex}`} />
                          <Label
                            htmlFor={`${questionIndex}-${optionIndex}`}
                            className="flex-1 cursor-pointer"
                          >
                            {String.fromCharCode(65 + optionIndex)}. {normalizeOptionText(option)}
                          </Label>
                          {isSubmitted && isThisCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {isSubmitted && isSelected && !isThisCorrect && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {isSubmitted && question.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
          })
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            size="lg"
            className="w-full sm:w-auto"
          >
            Submit Answers
          </Button>
        ) : (
          <Button onClick={handleReset} variant="outline" size="lg" className="w-full sm:w-auto">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReadingExerciseCard;
