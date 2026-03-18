import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminReadingExercisesManager } from '@/components/admin/AdminReadingExercisesManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReadingExercises } from '@/hooks/useReadingExercises';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Plus, Minus, Save, Eye, Download, Clock, Users, Folder, Settings, X, CheckCircle, LucideIcon, MessageSquare } from 'lucide-react';
import { SectionBox } from '@/components/admin/SectionBox';
import { FileRow } from '@/components/admin/FileRow';
import { adminUploadService } from '@/services/adminUploadService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';
import writingExerciseService, { CreateWritingExerciseRequest, SentenceQuestion, WritingExercise } from '@/services/writingExerciseService';
import { success } from '@/hooks/use-toast';

const UploadPage = () => {
  const [testType, setTestType] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('');
  const [questions, setQuestions] = useState([{ id: 1, question: '', options: ['', '', '', ''], correct: 0 }]);
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: 'TOEIC_Part1_Audio.mp3', size: '2.4MB', date: '2024-03-10' },
    { name: 'Reading_Questions.pdf', size: '1.8MB', date: '2024-03-09' }
  ]);

  // Writing exercise states
  const [writingDialogOpen, setWritingDialogOpen] = useState(false);
  const [writingType, setWritingType] = useState<'writing_sentence'>('writing_sentence');
  const [writingTitle, setWritingTitle] = useState('');
  const [writingTopic, setWritingTopic] = useState('');
  const [writingTimeLimit, setWritingTimeLimit] = useState(30);
  const [writingDescription, setWritingDescription] = useState('');
  const [writingLevel, setWritingLevel] = useState('A1');
  const [writingQuestions, setWritingQuestions] = useState<SentenceQuestion[]>([]);
  const [exercises, setExercises] = useState<WritingExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);

  // File upload states
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File[]}>({});
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  // NEW: 2-Step Process States
  const [createdExerciseId, setCreatedExerciseId] = useState<number | null>(null);
  const [step1Complete, setStep1Complete] = useState(false);
  const [isCreatingPassage, setIsCreatingPassage] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  // uploadMethod removed - only text input now

  
  // Exercise creation states
  const [exerciseTitle, setExerciseTitle] = useState('');
  const [exerciseLevel, setExerciseLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [exercisePartType, setExercisePartType] = useState<'Part 5' | 'Part 6' | 'Part 7'>('Part 6');
  const [exerciseDescription, setExerciseDescription] = useState('');
  
  // NEW: Part 7 - 2 passages
  const [passage1, setPassage1] = useState('');
  const [passage2, setPassage2] = useState('');
  const [isDualPassage, setIsDualPassage] = useState(false);
  // uploadMethod removed - always use text input
  const uploadMethod: 'text' | 'file' = 'text';

  // Helper function for estimated minutes
  const getEstimatedMinutes = (partType: string): number => {
    switch (partType) {
      case 'Part 5': return 15;
      case 'Part 6': return 20; 
      case 'Part 7': return 30;
      default: return 20;
    }
  };

  const testTypes = [
    { id: 'toeic-full', label: 'TOEIC Full Test', icon: '📝', description: 'Đề thi TOEIC đầy đủ (Listening + Reading)' },
    { id: 'listening', label: 'Listening Test', icon: '🎧', description: 'Bài test kỹ năng nghe' },
    { id: 'reading', label: 'Reading Test', icon: '📖', description: 'Bài test kỹ năng đọc' },
    { id: 'speaking', label: 'Speaking Test', icon: '🗣️', description: 'Bài test kỹ năng nói' },
    { id: 'writing', label: 'Writing Test', icon: '✍️', description: 'Bài test kỹ năng viết' },
    { id: 'vocabulary', label: 'Vocabulary Test', icon: '📚', description: 'Bài test từ vựng' },
    { id: 'grammar', label: 'Grammar Test', icon: '📋', description: 'Bài test ngữ pháp' }
  ];

  // File upload handlers
  const handleFileSelect = (uploadType: string, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(prev => ({
      ...prev,
      [uploadType]: fileArray
    }));

    // Simulate upload progress
    setUploadProgress(prev => ({ ...prev, [uploadType]: 0 }));
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[uploadType] || 0;
        if (currentProgress >= 100) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [uploadType]: currentProgress + 10 };
      });
    }, 200);
  };

  const { toast: toastFunc } = useToast();
  const success = (title: string, description: string) => toastFunc({ title, description, variant: 'default' });
  const error = (title: string, description: string) => toastFunc({ title, description, variant: 'destructive' });
  const { exercises: readingExercises, isLoading: isLoadingReading, refreshExercises } = useReadingExercises();


  // handleUploadFile removed - only text input now
  // no-op stub kept for legacy JSX references (upload UI removed)
  const handleUploadFile = (file: File) => {
    // upload file functionality has been removed - keep stub to avoid TSX compile errors
    console.debug('handleUploadFile called but upload is disabled', file?.name);
  };

  // NEW: Step 1 - Create Passage
  const handleCreatePassage = async () => {
    // Validate basic info
    if (!exerciseTitle.trim()) {
      console.error('Thiếu thông tin', 'Vui lòng nhập tiêu đề');
      return;
    }

    // Validate passage content based on type
    let finalContent = '';
    if (exercisePartType === 'Part 7' && isDualPassage) {
      if (!passage1.trim() || !passage2.trim()) {
        error('Thiếu thông tin', 'Vui lòng nhập đầy đủ 2 đoạn văn cho Part 7');
        return;
      }
      finalContent = `[PASSAGE 1]\n${passage1}\n\n[PASSAGE 2]\n${passage2}`;
    } else {
      if (!exerciseDescription.trim()) {
        console.error('Thiếu thông tin', 'Vui lòng nhập nội dung đoạn văn');
        return;
      }
      finalContent = exerciseDescription;
    }

    setIsCreatingPassage(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://localhost:5000'}/api/ReadingExercise/create-passage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: exerciseTitle,
          content: finalContent,
          partType: exercisePartType,
          level: exerciseLevel,
          createdBy: 'Admin'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create passage' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const exerciseId = result.exerciseId;
      
      setCreatedExerciseId(exerciseId);
      setStep1Complete(true);
      
      success('✅ Bước 1 hoàn thành!', `Đoạn văn đã được tạo với ID: ${exerciseId}. Bây giờ hãy thêm câu hỏi!`);
      
      // Auto-generate questions template based on Part Type
      const questionCount = exercisePartType === 'Part 6' ? 4 : 5;
      const newQuestions = Array.from({ length: questionCount }, (_, i) => ({
        id: i + 1,
        question: exercisePartType === 'Part 6' 
          ? `Question ${i + 1} (chọn từ phù hợp cho chỗ trống ${i + 1})`
          : `Question ${i + 1}`,
        options: ['', '', '', ''],
        correct: 0
      }));
      setQuestions(newQuestions);

    } catch (err: unknown) {
      console.error('Create passage failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      console.error('❌ Tạo đoạn văn thất bại', errorMessage);
    } finally {
      setIsCreatingPassage(false);
    }
  };

  // NEW: Step 2 - Add Questions
  const handleAddQuestions = async () => {
    if (!createdExerciseId) {
      console.error('Chưa có Exercise ID', 'Vui lòng hoàn thành bước 1 trước');
      return;
    }

    // Validate questions
    const hasEmptyQuestions = questions.some(q => !q.question.trim() || q.options.some(opt => !opt.trim()));
    if (hasEmptyQuestions) {
      console.error('Câu hỏi chưa đầy đủ', 'Vui lòng điền đầy đủ tất cả câu hỏi và đáp án');
      return;
    }

    setIsAddingQuestions(true);
    try {
      const questionsPayload = questions.map((q, index) => ({
        questionText: q.question,
        optionA: q.options[0],
        optionB: q.options[1],
        optionC: q.options[2],
        optionD: q.options[3],
        correctAnswer: q.correct,
        explanation: `Explanation for question ${index + 1}`,
        orderNumber: index + 1
      }));

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://localhost:5000'}/api/ReadingExercise/${createdExerciseId}/add-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questionsPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add questions' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      success('🎉 Hoàn thành!', `Bài tập đã được tạo thành công với ${questions.length} câu hỏi! Exercise đã được activate.`);
      
      // Refresh exercises list
      refreshExercises();
      
      // Reset form
      setExerciseTitle('');
      setExerciseDescription('');
      setPassage1('');
      setPassage2('');
      setIsDualPassage(false);
      setQuestions([{ id: 1, question: '', options: ['', '', '', ''], correct: 0 }]);
      setCreatedExerciseId(null);
      setStep1Complete(false);

    } catch (err: unknown) {
      console.error('Add questions failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      console.error('❌ Thêm câu hỏi thất bại', errorMessage);
    } finally {
      setIsAddingQuestions(false);
    }
  };
  

  const handleFileRemove = (uploadType: string, fileIndex: number) => {
    setSelectedFiles(prev => ({
      ...prev,
      [uploadType]: prev[uploadType]?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load writing exercises
  React.useEffect(() => {
    if (selectedTestType === 'writing') {
      loadWritingExercises();
    }
  }, [selectedTestType]);

  const loadWritingExercises = async () => {
    try {
      setLoadingExercises(true);
      const data = await writingExerciseService.getWritingExercises();
      // Only show writing_sentence exercises
      const sentenceExercises = data.filter(ex => ex.type === 'writing_sentence');
      setExercises(sentenceExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Không thể tải danh sách bài tập');
    } finally {
      setLoadingExercises(false);
    }
  };

  // Create Reading Exercise from uploaded content
  const createReadingExerciseFromUpload = async () => {
    if (!exerciseTitle.trim()) {
      error('Tên bài test không được để trống', 'Vui lòng nhập tên bài test.');
      return;
    }

    if (questions.length === 0 || !questions[0].question.trim()) {
      error('Cần ít nhất 1 câu hỏi', 'Vui lòng tạo ít nhất một câu hỏi cho bài test.');
      return;
    }

    try {
      // Determine test type based on selected test type
      let exerciseType: 'Part 5' | 'Part 6' | 'Part 7' = 'Part 7';
      if (selectedTestType === 'grammar' || selectedTestType === 'vocabulary') {
        exerciseType = 'Part 5';
      } else if (selectedTestType === 'reading') {
        exerciseType = 'Part 7';
      }

      // Create content from questions
      const content = questions.map((q, index) => {
        const optionsText = q.options.map((opt, optIdx) => 
          `${String.fromCharCode(65 + optIdx)}) ${opt}`
        ).join('\n');
        
        return `${index + 1}. ${q.question}\n${optionsText}\nCorrect Answer: ${String.fromCharCode(65 + q.correct)}`;
      }).join('\n\n');

      // Create exercise using admin upload service (now async)
      const exercise = await adminUploadService.createExerciseFromUpload(
        exerciseTitle,
        `${exerciseDescription}\n\n${content}`,
        exerciseLevel,
        exerciseType,
        'Admin Manual Input'
      );

      success('Bài test đã được tạo!', `Bài test "${exercise.name}" đã được lưu thành công vào database và sẽ xuất hiện trong trang Reading Exercises.`);
      
      // Refresh Reading Exercises data
      refreshExercises();
      
      // Reset form
      setExerciseTitle('');
      setExerciseDescription('');
      setQuestions([{ id: 1, question: '', options: ['', '', '', ''], correct: 0 }]);
      
    } catch (err) {
      console.error('Error creating reading exercise:', err);
      console.error('Không thể tạo bài test', 'Có lỗi xảy ra khi tạo bài test. Vui lòng thử lại.');
    }
  };

  // Writing exercise functions
  const openWritingDialog = (type: 'writing_sentence', exercise?: WritingExercise) => {
    if (exercise && exercise.type === 'writing_sentence') {
      // Edit mode - only for writing_sentence
      setEditingExerciseId(exercise.id);
      setWritingType('writing_sentence');
      setWritingTitle(exercise.title);
      setWritingTopic(exercise.category || '');
      setWritingTimeLimit(exercise.timeLimit || 30);
      setWritingDescription(exercise.description || '');
      setWritingLevel(exercise.level || 'A1');
      
      const parsedQuestions = JSON.parse(exercise.questionsJson || '[]');
      setWritingQuestions(parsedQuestions);
    } else {
      // Create mode
      setEditingExerciseId(null);
      setWritingType('writing_sentence');
      setWritingTitle('');
      setWritingTopic('');
      setWritingTimeLimit(30);
      setWritingDescription('');
      setWritingLevel('A1');
      
      const emptyQuestions: SentenceQuestion[] = Array.from({ length: 5 }, (_, i) => ({
        questionOrder: i + 1,
        vietnamesePrompt: '',
        correctAnswer: '',
        vocabularyHint: '',
        grammarHint: ''
      }));
      setWritingQuestions(emptyQuestions);
    }
    
    setWritingDialogOpen(true);
  };

  const updateWritingQuestion = (index: number, field: keyof SentenceQuestion, value: string) => {
    const newQuestions = [...writingQuestions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setWritingQuestions(newQuestions);
  };

  const handleDeleteExercise = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
    
    try {
      await writingExerciseService.deleteWritingExercise(id);
      toast.success('Xóa bài tập thành công!');
      loadWritingExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Có lỗi xảy ra khi xóa bài tập');
    }
  };

  const handleWritingSubmit = async () => {
    if (!writingTitle.trim()) {
      toast.error('Vui lòng nhập tên bài test');
      return;
    }

    if (!writingTopic.trim()) {
      toast.error('Vui lòng nhập chủ đề');
      return;
    }

    if (writingType === 'writing_sentence') {
      const invalidQuestion = writingQuestions.find(q => 
        !q.vietnamesePrompt.trim() || !q.correctAnswer.trim()
      );
      if (invalidQuestion) {
        toast.error('Vui lòng nhập đầy đủ đề bài và đáp án cho tất cả câu hỏi');
        return;
      }
    }

    try {
      const requestData: CreateWritingExerciseRequest = {
        title: writingTitle,
        content: writingDescription,
        type: writingType,
        category: writingTopic,
        timeLimit: writingTimeLimit,
        estimatedMinutes: writingTimeLimit,
        description: writingDescription,
        level: writingLevel,
        questionsJson: writingType === 'writing_sentence' 
          ? JSON.stringify(writingQuestions)
          : '[]',
        correctAnswersJson: writingType === 'writing_sentence'
          ? JSON.stringify(writingQuestions.map(q => q.correctAnswer))
          : '[]'
      };

      if (editingExerciseId) {
        await writingExerciseService.updateWritingExercise(editingExerciseId, requestData);
        toast.success('Cập nhật bài tập thành công!');
      } else {
        await writingExerciseService.createWritingExercise(requestData);
        toast.success('Tạo bài tập thành công!');
      }
      
      setWritingDialogOpen(false);
      loadWritingExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error('Có lỗi xảy ra khi lưu bài tập');
    }
  };

  // Create file upload component
  const FileUploadArea = ({ 
    uploadType, 
    title, 
    description, 
    acceptedTypes, 
    maxSize, 
    icon: Icon,
    borderColor = "border-gray-300",
    iconColor = "text-gray-400",
    required = false
  }: {
    uploadType: string;
    title: string;
    description: string;
    acceptedTypes: string;
    maxSize: string;
    icon: LucideIcon;
    borderColor?: string;
    iconColor?: string;
    required?: boolean;
  }) => {
    const files = selectedFiles[uploadType] || [];
    const progress = uploadProgress[uploadType];
    const isUploading = progress !== undefined && progress < 100;
    const isCompleted = progress === 100;

    return (
      <SectionBox>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Icon className="mr-2 h-5 w-5" />
          {title}
          <Badge variant={required ? "secondary" : "outline"} className="ml-2">
            {required ? "Required" : "Optional"}
          </Badge>
        </h3>
        
        <div className="space-y-3">
          <div 
            className={`border-2 border-dashed ${borderColor} rounded-lg p-6 text-center transition-colors hover:bg-gray-50 cursor-pointer`}
            onClick={() => fileInputRefs.current[uploadType]?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
              handleFileSelect(uploadType, e.dataTransfer.files);
            }}
          >
            <input
              ref={(ref) => fileInputRefs.current[uploadType] = ref}
              type="file"
              multiple
              accept={acceptedTypes}
              onChange={(e) => handleFileSelect(uploadType, e.target.files)}
              className="hidden"
            />
            
            {isCompleted ? (
              <CheckCircle className={`mx-auto h-12 w-12 text-green-500`} />
            ) : (
              <Icon className={`mx-auto h-12 w-12 ${iconColor}`} />
            )}
            
            <p className="mt-2 text-sm text-gray-600">
              {isCompleted ? 'Upload thành công!' : description}
            </p>
            <p className="text-xs text-gray-500 mt-1">{acceptedTypes} (tối đa {maxSize})</p>
            
            {isUploading && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{progress}% hoàn thành</p>
              </div>
            )}
          </div>

          {/* Display selected files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">File đã chọn:</h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileRemove(uploadType, index);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionBox>
    );
  };

  const addQuestion = () => {
    const newId = Math.max(...questions.map(q => q.id), 0) + 1; // Generate incremental ID
    const newQuestion = { 
      id: newId,
      question: '', 
      options: ['', '', '', ''], 
      correct: 0 
    };
    setQuestions([newQuestion, ...questions]); // Add to beginning of array
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, field: string, value: string | number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateQuestionOption = (id: number, optionIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) } : q
    ));
  };

  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
        : q
    ));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Upload Tests</h1>
        <p className="text-muted-foreground">
          Upload files cho từng part của TOEIC và quản lý đề thi của bạn
        </p>
      </div>

      {/* Header với statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tổng đề thi</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">86</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+12 tuần này</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">File đã tải lên</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">324</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">2.8GB dung lượng</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Đang xử lý</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ước tính 10 phút</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-600 dark:text-gray-300">Tạo bài test</TabsTrigger>
          <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-600 dark:text-gray-300">Quản lý file</TabsTrigger>

        </TabsList>

        <TabsContent value="upload" className="space-y-4">

          {/* Test Type Selection */}
          <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Chọn loại bài test</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">Chọn loại bài test bạn muốn tạo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {testTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      selectedTestType === type.id 
                        ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                    onClick={() => setSelectedTestType(type.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedTestType === 'reading' && (
            <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Reading Test</span>
                  Tạo bài tập Part 6/7 - Quy trình 2 bước (Nhập text)
                </CardTitle>
                <CardDescription>
                  <strong>Bước 1:</strong> Nhập đoạn văn → <strong>Bước 2:</strong> Thêm câu hỏi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Enter Text */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-green-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                    <h3 className="text-lg font-semibold">
                      Bước 1: Nhập đoạn văn Reading
                    </h3>
                    <Badge variant="secondary">Part 6 & 7</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="readingTitle">Tiêu đề bài tập</Label>
                      <Input 
                        id="readingTitle" 
                        placeholder="VD: Company Meeting Notice"
                        value={exerciseTitle}
                        onChange={(e) => setExerciseTitle(e.target.value)}
                        className="border-2"
                        disabled={step1Complete}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="readingPartType">Part Type</Label>
                        <Select 
                          value={exercisePartType} 
                          onValueChange={(value: 'Part 5' | 'Part 6' | 'Part 7') => setExercisePartType(value)}
                          disabled={step1Complete}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Chọn Part" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Part 6">Part 6 - Text Completion (4 câu)</SelectItem>
                            <SelectItem value="Part 7">Part 7 - Reading Comprehension (5-10 câu)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="readingLevel">Độ khó</Label>
                        <Select 
                          value={exerciseLevel} 
                          onValueChange={(value: 'Beginner' | 'Intermediate' | 'Advanced') => setExerciseLevel(value)}
                          disabled={step1Complete}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Chọn độ khó" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner (Cơ bản)</SelectItem>
                            <SelectItem value="Intermediate">Intermediate (Trung bình)</SelectItem>
                            <SelectItem value="Advanced">Advanced (Nâng cao)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="readingDescription">Mô tả (optional)</Label>
                      <Textarea 
                        id="readingDescription" 
                        placeholder="Mô tả ngắn về bài tập..."
                        value={exerciseDescription}
                        onChange={(e) => setExerciseDescription(e.target.value)}
                        rows={2}
                        disabled={step1Complete}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="readingPassage1">
                        Đoạn văn {exercisePartType === 'Part 7' && isDualPassage ? '1' : ''}
                      </Label>
                      <Textarea 
                        id="readingPassage1"
                        placeholder="Nhập nội dung đoạn văn tiếng Anh..."
                        value={passage1}
                        onChange={(e) => setPassage1(e.target.value)}
                        rows={10}
                        className="font-mono text-sm border-2"
                        disabled={step1Complete}
                      />
                      <p className="text-sm text-muted-foreground">{passage1.length} ký tự</p>
                    </div>

                    {exercisePartType === 'Part 7' && (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox"
                          id="dualPassage"
                          checked={isDualPassage}
                          onChange={(e) => setIsDualPassage(e.target.checked)}
                          className="rounded"
                          disabled={step1Complete}
                        />
                        <Label htmlFor="dualPassage" className="cursor-pointer">
                          Sử dụng 2 đoạn văn (Double passage)
                        </Label>
                      </div>
                    )}

                    {exercisePartType === 'Part 7' && isDualPassage && (
                      <div className="space-y-2">
                        <Label htmlFor="readingPassage2">Đoạn văn 2</Label>
                        <Textarea 
                          id="readingPassage2"
                          placeholder="Nhập nội dung đoạn văn thứ 2..."
                          value={passage2}
                          onChange={(e) => setPassage2(e.target.value)}
                          rows={10}
                          className="font-mono text-sm border-2"
                          disabled={step1Complete}
                        />
                        <p className="text-sm text-muted-foreground">{passage2.length} ký tự</p>
                      </div>
                    )}

                    {!step1Complete && (
                      <Button 
                        onClick={handleCreatePassage} 
                        disabled={!exerciseTitle || !passage1 || isCreatingPassage}
                        className="w-full"
                        size="lg"
                      >
                        {isCreatingPassage ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu đoạn văn...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Lưu đoạn văn và chuyển sang Bước 2
                          </>
                        )}
                      </Button>
                    )}

                    {step1Complete && createdExerciseId && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 border-2 border-green-300 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          ✅ Đoạn văn đã được lưu! Exercise ID: {createdExerciseId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Add Questions - Only shown after step 1 complete */}
                {step1Complete && createdExerciseId && (
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                      <h3 className="text-lg font-semibold">
                        Bước 2: Thêm câu hỏi
                      </h3>
                      <Badge variant="secondary">{questions.length} câu</Badge>
                    </div>

                    <div className="space-y-4">
                      {questions.map((q, index) => (
                        <div key={q.id} className="p-4 border-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Câu {index + 1}</h4>
                            {questions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(q.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label>Câu hỏi</Label>
                              <Textarea
                                placeholder="Nhập câu hỏi..."
                                value={q.question}
                                onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                rows={2}
                              />
                            </div>

                            <div className="grid gap-2">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Badge variant={q.correct === optIndex ? 'default' : 'outline'}>
                                    {String.fromCharCode(65 + optIndex)}
                                  </Badge>
                                  <Input
                                    placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                                    value={opt}
                                    onChange={(e) => updateQuestionOption(q.id, optIndex, e.target.value)}
                                  />
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={q.correct === optIndex}
                                    onChange={() => updateQuestion(q.id, 'correct', optIndex)}
                                    className="w-4 h-4"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={addQuestion}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm câu hỏi
                      </Button>

                      <Button
                        onClick={handleAddQuestions}
                        disabled={isAddingQuestions}
                        className="w-full"
                        size="lg"
                      >
                        {isAddingQuestions ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu câu hỏi...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Hoàn thành và Activate Exercise
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Exercise list - Display created reading exercises */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Danh sách bài tập đã tạo</h3>
                  {isLoadingReading ? (
                    <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                  ) : readingExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Chưa có bài tập nào</div>
                  ) : (
                    <div className="space-y-3">
                      {readingExercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{exercise.name}</h4>
                                {exercise.level && (
                                  <Badge variant="outline" className="text-xs">{exercise.level}</Badge>
                                )}
                                {exercise.type && (
                                  <Badge variant="secondary" className="text-xs">{exercise.type}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {exercise.sourceType === 'ai' ? '🤖 AI Generated' : '📝 Manual'} • {exercise.questions?.length || 0} câu hỏi
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Add edit functionality
                                toast.info('Tính năng sửa đang phát triển');
                              }}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // TODO: Add delete functionality
                                if (window.confirm(`Bạn có chắc muốn xóa bài tập "${exercise.name}"?`)) {
                                  toast.info('Tính năng xóa đang phát triển');
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTestType === 'writing' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Writing Test - Quản lý bài tập viết câu</CardTitle>
                <CardDescription>Tạo và quản lý bài tập viết theo câu cho học viên</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create button */}
                <div>
                  <Button onClick={() => openWritingDialog('writing_sentence')} className="w-full h-24 flex-col gap-2">
                    <MessageSquare className="w-8 h-8" />
                    <span className="text-base font-medium">Tạo bài viết câu</span>
                    <span className="text-xs opacity-80">Sentence translation</span>
                  </Button>
                </div>

                {/* Exercise list */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Danh sách bài tập đã tạo</h3>
                  {loadingExercises ? (
                    <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                  ) : exercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Chưa có bài tập nào</div>
                  ) : (
                    <div className="space-y-3">
                      {exercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center gap-3 flex-1">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{exercise.title}</h4>
                                {exercise.level && (
                                  <Badge variant="outline" className="text-xs">{exercise.level}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {exercise.category} • {exercise.timeLimit} phút
                                {exercise.type === 'writing_sentence' && (
                                  <> • {JSON.parse(exercise.questionsJson || '[]').length} câu</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openWritingDialog('writing_sentence', exercise)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExercise(exercise.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTestType === 'vocabulary' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Vocabulary Test - Upload Files</CardTitle>
                <CardDescription>Upload danh sách từ vựng và câu hỏi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FileUploadArea
                      uploadType="vocabulary-list"
                      title="📚 Vocabulary List"
                      description="Kéo thả file từ vựng hoặc click để chọn"
                      acceptedTypes=".csv,.json,.xlsx"
                      maxSize="5MB"
                      icon={FileText}
                      borderColor="border-blue-300"
                      iconColor="text-blue-400"
                      required={true}
                    />

                    <FileUploadArea
                      uploadType="vocabulary-audio"
                      title="🎧 Audio Pronunciation"
                      description="Kéo thả file phát âm hoặc click để chọn"
                      acceptedTypes=".zip,audio/*"
                      maxSize="100MB"
                      icon={Upload}
                      borderColor="border-green-300"
                      iconColor="text-green-400"
                      required={false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTestType === 'grammar' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Grammar Test - Upload Files</CardTitle>
                <CardDescription>Upload câu hỏi và bài tập ngữ pháp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FileUploadArea
                      uploadType="grammar-questions"
                      title="📋 Grammar Questions"
                      description="Kéo thả file câu hỏi hoặc click để chọn"
                      acceptedTypes=".json,.csv,.pdf"
                      maxSize="10MB"
                      icon={FileText}
                      borderColor="border-indigo-300"
                      iconColor="text-indigo-400"
                      required={true}
                    />

                    <FileUploadArea
                      uploadType="grammar-rules"
                      title="💡 Grammar Rules"
                      description="Kéo thả file quy tắc hoặc click để chọn"
                      acceptedTypes=".pdf,.docx"
                      maxSize="5MB"
                      icon={FileText}
                      borderColor="border-yellow-300"
                      iconColor="text-yellow-400"
                      required={false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reading" className="space-y-4">
          <AdminReadingExercisesManager />
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tạo đề thi thủ công</CardTitle>
                  <CardDescription>Tạo câu hỏi và đáp án trực tiếp trên hệ thống</CardDescription>
                </div>
                <Button onClick={addQuestion} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm câu hỏi
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="space-y-4 p-4 border rounded-xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium flex items-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-2">
                          Câu {q.id}
                        </span>
                      </Label>
                      {questions.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeQuestion(q.id)}
                          className="text-red-600 hover:text-red-700 rounded-xl"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Nhập câu hỏi..."
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                        className="rounded-xl"
                      />
                      
                      <div className="grid gap-2 md:grid-cols-2">
                        {q.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <span className="text-sm font-medium w-6">{String.fromCharCode(65 + optIndex)})</span>
                            <Input
                              placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                              value={option}
                              onChange={(e) => updateQuestionOption(q.id, optIndex, e.target.value)}
                              className="rounded-xl flex-1"
                            />
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correct === optIndex}
                              onChange={() => updateQuestion(q.id, 'correct', optIndex)}
                              className="w-4 h-4"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tạo đề thi thủ công</CardTitle>
                  <CardDescription>Tạo câu hỏi và đáp án trực tiếp trên hệ thống</CardDescription>
                </div>
                <Button onClick={addQuestion} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm câu hỏi
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {questions.map((q) => (
                  <SectionBox key={q.id} className="space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium flex items-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-2">
                          Câu {q.id}
                        </span>
                        {q.id === Math.max(...questions.map(qu => qu.id)) && questions.length > 1 && (
                          <Badge variant="secondary" className="ml-2 text-xs">Mới nhất</Badge>
                        )}
                      </Label>
                      {questions.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeQuestion(q.id)}
                          className="text-red-600 hover:text-red-700 rounded-xl"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <Textarea
                      placeholder="Nhập câu hỏi..."
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                    />
                    
                    <div className="grid gap-2 md:grid-cols-2">
                      {q.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correct === optIndex}
                            onChange={() => updateQuestion(q.id, 'correct', optIndex)}
                            className="text-primary"
                          />
                          <Input
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                            value={option}
                            onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </SectionBox>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Quản lý file đã tải lên</CardTitle>
              <CardDescription>Xem và quản lý tất cả file đã tải lên hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filter và Search */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input placeholder="Tìm kiếm file..." />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả file</SelectItem>
                      <SelectItem value="audio">File âm thanh</SelectItem>
                      <SelectItem value="document">Tài liệu</SelectItem>
                      <SelectItem value="image">Hình ảnh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Files List */}
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <FileRow
                      key={index}
                      fileName={file.name}
                      fileSize={file.size}
                      uploadDate={file.date}
                      onDelete={() => {
                        setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
                      }}
                      onDownload={() => {
                        // Handle download
                      }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Writing Exercise Dialog */}
      <Dialog open={writingDialogOpen} onOpenChange={setWritingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExerciseId ? 'Chỉnh sửa' : 'Tạo'} bài viết câu
            </DialogTitle>
            <DialogDescription>
              Học viên sẽ dịch câu tiếng Việt sang tiếng Anh
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tên bài test *</Label>
                <Input
                  value={writingTitle}
                  onChange={(e) => setWritingTitle(e.target.value)}
                  placeholder="VD: Bài viết về gia đình"
                />
              </div>
              <div>
                <Label>Chủ đề *</Label>
                <Input
                  value={writingTopic}
                  onChange={(e) => setWritingTopic(e.target.value)}
                  placeholder="VD: Family"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thời gian (phút) *</Label>
                <Input
                  type="number"
                  min={5}
                  value={writingTimeLimit}
                  onChange={(e) => setWritingTimeLimit(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Level</Label>
                <Select value={writingLevel} onValueChange={setWritingLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="C1">C1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={writingDescription}
                onChange={(e) => setWritingDescription(e.target.value)}
                placeholder="Mô tả bài tập..."
                rows={3}
              />
            </div>

            {writingType === 'writing_sentence' && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Danh sách câu hỏi (5 câu):</h4>
                {writingQuestions.map((q, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <Label className="font-semibold">Câu {index + 1}</Label>
                      <div>
                        <Label className="text-xs">Đề bài (tiếng Việt) *</Label>
                        <Input
                          value={q.vietnamesePrompt}
                          onChange={(e) => updateWritingQuestion(index, 'vietnamesePrompt', e.target.value)}
                          placeholder="VD: Tôi yêu gia đình"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Đáp án (tiếng Anh) *</Label>
                        <Input
                          value={q.correctAnswer}
                          onChange={(e) => updateWritingQuestion(index, 'correctAnswer', e.target.value)}
                          placeholder="VD: I love my family"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Gợi ý từ vựng</Label>
                          <Input
                            value={q.vocabularyHint || ''}
                            onChange={(e) => updateWritingQuestion(index, 'vocabularyHint', e.target.value)}
                            placeholder="love, family"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Gợi ý ngữ pháp</Label>
                          <Input
                            value={q.grammarHint || ''}
                            onChange={(e) => updateWritingQuestion(index, 'grammarHint', e.target.value)}
                            placeholder="Present simple"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWritingDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleWritingSubmit}>
              {editingExerciseId ? 'Cập nhật' : 'Tạo bài tập'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadPage;