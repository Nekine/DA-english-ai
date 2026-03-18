// 📚 READING EXERCISES PAGE - Hệ thống bài tập đọc hiểu TOEIC với AI
// ✅ READY FOR GIT: Hoàn thành cấu trúc TOEIC (Parts 5, 6, 7) với 7 bài tập đầy đủ
// 🤖 TODO BACKEND: Tích hợp Gemini AI service qua .NET API để tạo bài tự động  
// 📊 Features: TOEIC format, difficulty filtering, AI generation, admin upload
// 🎯 Mock Data: 7 complete exercises covering all parts & difficulty levels

import ReadingExerciseCard from "@/components/ReadingExerciseCard";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReadingExercises } from "@/hooks/useReadingExercises";
import { Database, Sparkles, ArrowLeft, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Level = 'Beginner' | 'Intermediate' | 'Advanced';
type Type = 'Part 5' | 'Part 6' | 'Part 7';

const ReadingExercises = () => {
  const navigate = useNavigate();
  const { exercises, isLoading, generateExercise, isGenerating } = useReadingExercises();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<Level>("Intermediate");
  const [type, setType] = useState<Type>("Part 7");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Filter and sort exercises: AI-generated first, then by creation date
  const filteredExercises = exercises
    .filter((exercise) => {
      const levelMatch = filterLevel === "all" || exercise.level === filterLevel;
      const sourceMatch = filterSource === "all" || exercise.sourceType === filterSource;
      return levelMatch && sourceMatch;
    })
    .sort((a, b) => {
      // Sort by sourceType first (ai before manual)
      if (a.sourceType === 'ai' && b.sourceType !== 'ai') return -1;
      if (a.sourceType !== 'ai' && b.sourceType === 'ai') return 1;
      
      // Then sort by creation date (newest first)
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const handleGenerate = () => {
    if (!topic.trim()) return;
    // 🤖 TẠO BÀI BẰNG AI: Gọi hook useReadingExercises để tạo bài tập với AI (Gemini hoặc OpenAI)
    // Luồng: Frontend -> useReadingExercises hook -> API call -> Backend controller -> AI service -> Database
    generateExercise({ topic, level, type, provider });
    setTopic("");
    setShowGenerator(false);
  };

  if (selectedExercise) {
    // DEBUG: Log all exercises to see their IDs
    console.log('🎯 All exercises:', exercises.map(ex => ({ 
      name: ex.name, 
      id: ex.id, 
      exerciseId: ex.exerciseId 
    })));
    console.log('🎯 Looking for selectedExercise:', selectedExercise);
    
    // Find exercise by exerciseId (primary key) instead of id
    const exercise = exercises.find((ex) => String(ex.exerciseId) === selectedExercise);
    
    console.log('🎯 Found exercise:', exercise ? { 
      name: exercise.name, 
      id: exercise.id, 
      exerciseId: exercise.exerciseId 
    } : 'NOT FOUND');
    
    if (!exercise) return null;

    return (
      <ReadingExerciseCard
        exercise={exercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Back Button + Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>

        {/* Centered Icon + Title */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 shadow-lg">
            <BookOpen className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Bài Tập Đọc Hiểu
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Luyện tập đọc hiểu theo chuẩn TOEIC với các bài tập Parts 5, 6, 7 và tạo bài tự động bằng AI
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Chọn bài tập của bạn
            </h2>
            <p className="text-muted-foreground">
              Luyện tập với các bài đã có hoặc tạo bài mới với AI
            </p>
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Admin Upload</SelectItem>
              <SelectItem value="ai">AI Generated</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowGenerator(!showGenerator)} variant="default">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </div>
      </div>

      {showGenerator && (
        <Card className="p-6 bg-gradient-pink border-2">
          {/* 🤖 FORM TẠO BÀI BẰNG AI: Form tạo bài tập với Gemini AI */}
          {/* Input: topic, level, type -> Output: Bài tập TOEIC với questions JSON */}
          <h3 className="font-semibold text-lg mb-4">
            <Sparkles className="h-5 w-5 inline mr-2" />
            Generate New Exercise with AI
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose between Gemini or OpenAI to generate a personalized TOEIC exercise based on your input.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Topic (e.g., business meeting, travel, etc.)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="col-span-1 md:col-span-2 lg:col-span-1"
            />
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as Type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Part 5">Part 5 - Grammar</SelectItem>
                <SelectItem value="Part 6">Part 6 - Text Completion</SelectItem>
                <SelectItem value="Part 7">Part 7 - Reading Comprehension</SelectItem>
              </SelectContent>
            </Select>
            <Select value={provider} onValueChange={(v) => setProvider(v as "gemini" | "openai")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">🤖 Gemini</SelectItem>
                <SelectItem value="openai">✨ OpenAI GPT</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} className="w-full">
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Exercise
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading exercises...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise, index) => (
              <Card
                key={exercise.exerciseId || `exercise-${index}`}
                className="p-6 cursor-pointer hover:shadow-elegant transition-all hover:-translate-y-1"
                onClick={() => {
                  console.log('🖱️ Clicked exercise:', { 
                    name: exercise.name, 
                    id: exercise.id, 
                    exerciseId: exercise.exerciseId 
                  });
                  setSelectedExercise(String(exercise.exerciseId));
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">{exercise.name || 'Untitled Exercise'}</h3>
                    <div className="flex items-center gap-1">
                      {exercise.sourceType === 'ai' ? (
                        <>
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs text-primary font-medium">AI Generated</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 text-secondary flex-shrink-0" />
                          <span className="text-xs text-secondary font-medium">Admin Upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{exercise.type || 'Unknown'}</Badge>
                    <Badge
                      variant={
                        exercise.level === "Beginner"
                          ? "default"
                          : exercise.level === "Intermediate"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {exercise.level || 'Unknown'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {exercise.questions?.length || 0} questions
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {exercise.content ? exercise.content.substring(0, 150) : 'No content available'}...
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Không tìm thấy bài tập nào. Hãy thử điều chỉnh bộ lọc hoặc tạo bài mới với AI.
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
};

export default ReadingExercises;
