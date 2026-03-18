import { apiService } from './api';
import { AssignmentType } from './exerciseService';

// Helper function to get assignment type name
export const getAssignmentTypeName = (type: AssignmentType): string => {
  const typeNames: Record<AssignmentType, string> = {
    [AssignmentType.MostSuitableWord]: 'Most Suitable Word',
    [AssignmentType.VerbConjugation]: 'Verb Conjugation',
    [AssignmentType.ConditionalSentences]: 'Conditional Sentences',
    [AssignmentType.IndirectSpeech]: 'Indirect Speech',
    [AssignmentType.FillTheBlank]: 'Fill the Blank',
    [AssignmentType.ReadingComprehension]: 'Reading Comprehension',
    [AssignmentType.Grammar]: 'Grammar',
    [AssignmentType.Collocations]: 'Collocations',
    [AssignmentType.SynonymAndAntonym]: 'Synonym & Antonym',
    [AssignmentType.Vocabulary]: 'Vocabulary',
    [AssignmentType.ErrorIdentification]: 'Error Identification',
    [AssignmentType.WordFormation]: 'Word Formation',
    [AssignmentType.PassiveVoice]: 'Passive Voice',
    [AssignmentType.RelativeClauses]: 'Relative Clauses',
    [AssignmentType.ComparisonSentences]: 'Comparison Sentences',
    [AssignmentType.Inversion]: 'Inversion',
    [AssignmentType.Articles]: 'Articles',
    [AssignmentType.Prepositions]: 'Prepositions',
    [AssignmentType.Idioms]: 'Idioms',
    [AssignmentType.SentenceTransformation]: 'Sentence Transformation',
    [AssignmentType.PronunciationAndStress]: 'Pronunciation & Stress',
    [AssignmentType.ClozeTest]: 'Cloze Test',
    [AssignmentType.SentenceCombination]: 'Sentence Combination',
    [AssignmentType.MatchingHeadings]: 'Matching Headings',
    [AssignmentType.DialogueCompletion]: 'Dialogue Completion',
    [AssignmentType.SentenceOrdering]: 'Sentence Ordering',
    [AssignmentType.WordMeaningInContext]: 'Word Meaning in Context',
  };
  return typeNames[type] || 'Unknown Exercise';
};

// Helper function to generate sample activity data
export const generateSampleActivity = (id: number, daysAgo: number, assignmentType: AssignmentType, topic: string): Activity => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  const scores = [85, 88, 90, 92, 95, 78, 82];
  const durations = [15, 18, 20, 25, 30, 12, 22];
  const questionsTotals = [10, 12, 15, 20, 8, 18, 14];
  
  const score = scores[id % scores.length];
  const duration = durations[id % durations.length];
  const questionsTotal = questionsTotals[id % questionsTotals.length];
  const questionsCorrect = Math.floor((score / 100) * questionsTotal);
  
  return {
    id,
    date: date.toISOString().split('T')[0],
    type: getAssignmentTypeName(assignmentType),
    assignmentType,
    score,
    topic,
    duration,
    questionsTotal,
    questionsCorrect,
  };
};

// Types for stats and leaderboard data
export interface UserStats {
  userId: number;
  username: string;
  totalExercises: number;
  completedExercises: number;
  totalStudyTime: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  level: string;
  experiencePoints: number;
  nextLevelXP: number;
  lastActiveDate: string;
}

export interface Activity {
  id: number;
  date: string;
  type: string;
  assignmentType?: AssignmentType;
  score: number;
  topic: string;
  duration?: number; // in minutes
  questionsTotal?: number;
  questionsCorrect?: number;
}

export interface WeeklyProgress {
  day: string;
  exercises: number;
  time: number; // in minutes
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  totalScore: number;
  listening?: number;
  speaking?: number;
  reading?: number;
  writing?: number;
  exams: number;
  lastUpdate: string;
  avatar?: string;
}

export interface ProgressHistory {
  date: string;
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
}

// Mock data fallbacks
const mockUserStats: UserStats = {
  userId: 1,
  username: "englishlearner01",
  totalExercises: 145,
  completedExercises: 98,
  totalStudyTime: 3420,
  currentStreak: 7,
  longestStreak: 23,
  averageScore: 85,
  level: "Intermediate",
  experiencePoints: 2450,
  nextLevelXP: 3000,
  lastActiveDate: "2025-10-24T10:30:00Z",
};

// Enhanced mock activities using the helper function
const mockActivities: Activity[] = [
  generateSampleActivity(1, 0, AssignmentType.ReadingComprehension, 'TOEIC Part 7'),
  generateSampleActivity(2, 1, AssignmentType.Grammar, 'Present Perfect'),
  generateSampleActivity(3, 2, AssignmentType.Vocabulary, 'Business English'),
  generateSampleActivity(4, 3, AssignmentType.ReadingComprehension, 'TOEIC Part 6'),
  generateSampleActivity(5, 4, AssignmentType.DialogueCompletion, 'Daily Conversation'),
  generateSampleActivity(6, 5, AssignmentType.FillTheBlank, 'Conditional Sentences'),
  generateSampleActivity(7, 6, AssignmentType.ErrorIdentification, 'Common Mistakes'),
  generateSampleActivity(8, 7, AssignmentType.SynonymAndAntonym, 'Academic Vocabulary'),
];

// Function to sync exercise completion with stats
export const syncExerciseCompletion = (exerciseType: AssignmentType, score: number, topic: string, duration: number, questionsTotal: number, questionsCorrect: number) => {
  const newActivity: Activity = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    type: getAssignmentTypeName(exerciseType),
    assignmentType: exerciseType,
    score,
    topic,
    duration,
    questionsTotal,
    questionsCorrect,
  };
  
  // In a real app, this would update the backend
  mockActivities.unshift(newActivity);
  
  // Update user stats
  mockUserStats.completedExercises += 1;
  mockUserStats.totalStudyTime += duration;
  
  // Update streak logic
  const today = new Date().toISOString().split('T')[0];
  const lastActiveDate = new Date(mockUserStats.lastActiveDate).toISOString().split('T')[0];
  
  if (today !== lastActiveDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastActiveDate === yesterdayStr) {
      mockUserStats.currentStreak += 1;
    } else {
      mockUserStats.currentStreak = 1;
    }
    
    if (mockUserStats.currentStreak > mockUserStats.longestStreak) {
      mockUserStats.longestStreak = mockUserStats.currentStreak;
    }
  }
  
  mockUserStats.lastActiveDate = new Date().toISOString();
  
  // Recalculate average score
  const totalScore = mockActivities.reduce((sum, activity) => sum + activity.score, 0);
  mockUserStats.averageScore = Math.round(totalScore / mockActivities.length);
  
  return newActivity;
};

const mockWeeklyProgress: WeeklyProgress[] = [
  { day: 'Mon', exercises: 3, time: 45 },
  { day: 'Tue', exercises: 2, time: 30 },
  { day: 'Wed', exercises: 4, time: 60 },
  { day: 'Thu', exercises: 1, time: 20 },
  { day: 'Fri', exercises: 3, time: 50 },
  { day: 'Sat', exercises: 2, time: 35 },
  { day: 'Sun', exercises: 0, time: 0 },
];

const mockAchievements: Achievement[] = [
  { id: 1, name: "Week Warrior", description: "Complete exercises 7 days in a row", earned: true, earnedDate: "2025-10-20" },
  { id: 2, name: "Reading Master", description: "Complete 50 reading exercises", earned: true, earnedDate: "2025-10-15" },
  { id: 3, name: "Grammar Guru", description: "Score 90%+ on 10 grammar quizzes", earned: false },
  { id: 4, name: "Vocabulary Virtuoso", description: "Learn 500 new words", earned: false },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { 
    rank: 1, 
    userId: 101, 
    username: "NguyenVanA", 
    totalScore: 950, 
    listening: 480, 
    speaking: 195, 
    reading: 190, 
    writing: 85, 
    exams: 12, 
    lastUpdate: "2025-10-24T09:00:00Z",
    avatar: "👨‍🎓"
  },
  { 
    rank: 2, 
    userId: 102, 
    username: "TranThiB", 
    totalScore: 925, 
    listening: 470, 
    speaking: 185, 
    reading: 185, 
    writing: 85, 
    exams: 11, 
    lastUpdate: "2025-10-24T08:30:00Z",
    avatar: "👩‍💼"
  },
  { 
    rank: 3, 
    userId: 103, 
    username: "LeVanC", 
    totalScore: 890, 
    listening: 450, 
    speaking: 180, 
    reading: 175, 
    writing: 85, 
    exams: 10, 
    lastUpdate: "2025-10-23T20:15:00Z",
    avatar: "🧑‍💻"
  },
  { 
    rank: 4, 
    userId: 1, 
    username: "englishlearner01", 
    totalScore: 850, 
    listening: 420, 
    speaking: 170, 
    reading: 170, 
    writing: 90, 
    exams: 9, 
    lastUpdate: "2025-10-24T10:30:00Z",
    avatar: "📚"
  },
  { 
    rank: 5, 
    userId: 104, 
    username: "PhamThiD", 
    totalScore: 815, 
    listening: 410, 
    speaking: 165, 
    reading: 155, 
    writing: 85, 
    exams: 8, 
    lastUpdate: "2025-10-24T07:45:00Z",
    avatar: "🎯"
  },
  { rank: 2, userId: 102, username: "TranThiB", totalScore: 920, listening: 470, speaking: 185, reading: 185, writing: 80, exams: 10, lastUpdate: "2025-01-19" },
  { rank: 3, userId: 103, username: "LeVanC", totalScore: 890, listening: 450, speaking: 180, reading: 180, writing: 80, exams: 15, lastUpdate: "2025-01-18" },
  { rank: 4, userId: 104, username: "PhamThiD", totalScore: 870, listening: 445, speaking: 175, reading: 175, writing: 75, exams: 8, lastUpdate: "2025-01-17" },
  { rank: 5, userId: 105, username: "HoangVanE", totalScore: 850, listening: 440, speaking: 170, reading: 170, writing: 70, exams: 11, lastUpdate: "2025-01-16" },
];

const mockProgressHistory: ProgressHistory[] = [
  { date: "Week 1", total: 650, listening: 350, speaking: 150, reading: 100, writing: 50 },
  { date: "Week 2", total: 700, listening: 370, speaking: 160, reading: 110, writing: 60 },
  { date: "Week 3", total: 720, listening: 380, speaking: 170, reading: 110, writing: 60 },
  { date: "Week 4", total: 780, listening: 400, speaking: 180, reading: 130, writing: 70 },
  { date: "Week 5", total: 850, listening: 440, speaking: 200, reading: 140, writing: 70 },
];

export const statsService = {
  // Get user statistics - Updated to match backend endpoint
  getUserStats: async (userId: number): Promise<UserStats> => {
    try {
      const response = await apiService.get<UserStats>(`/api/progress/stats/${userId}`);
      return response;
    } catch (error) {
      console.log('Stats API not available, using mock data:', error);
      return mockUserStats;
    }
  },

  // Get recent activities - Updated to match backend endpoint
  getRecentActivities: async (userId: number, limit: number = 10): Promise<Activity[]> => {
    try {
      const response = await apiService.get<Activity[]>(`/api/progress/activities/${userId}?limit=${limit}`);
      return response;
    } catch (error) {
      console.log('Activities API not available, using mock data:', error);
      return mockActivities.slice(0, limit);
    }
  },

  // Get weekly progress - Updated to match backend endpoint
  getWeeklyProgress: async (userId: number): Promise<WeeklyProgress[]> => {
    try {
      const response = await apiService.get<WeeklyProgress[]>(`/api/progress/weekly/${userId}`);
      return response;
    } catch (error) {
      console.log('Weekly progress API not available, using mock data:', error);
      return mockWeeklyProgress;
    }
  },

  // Get achievements
  getAchievements: async (userId: number): Promise<Achievement[]> => {
    try {
      const response = await apiService.get<Achievement[]>(`/api/Users/${userId}/achievements`);
      return response;
    } catch (error) {
      console.log('Achievements API not available, using mock data:', error);
      return mockAchievements;
    }
  },

  // Get leaderboard with time filtering - Updated to match backend endpoint
  getLeaderboard: async (limit: number = 50, skillType?: string, timeFilter?: string): Promise<LeaderboardEntry[]> => {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (skillType) params.append('skill', skillType);
      if (timeFilter) params.append('timeFilter', timeFilter);
      
      const response = await apiService.get<LeaderboardEntry[]>(`/api/leaderboard?${params.toString()}`);
      return response;
    } catch (error) {
      console.log('Leaderboard API not available, using mock data:', error);
      
      // Apply time-based filtering to mock data
      let filteredData = [...mockLeaderboard];
      
      if (timeFilter && timeFilter !== 'all') {
        const now = new Date();
        filteredData = filteredData.map(user => {
          let scoreMultiplier = 1;
          
          switch (timeFilter) {
            case 'today':
              scoreMultiplier = 0.95 + Math.random() * 0.1; // ±5% variation
              break;
            case 'week':
              scoreMultiplier = 0.9 + Math.random() * 0.2; // ±10% variation
              break;
            case 'month':
              scoreMultiplier = 0.8 + Math.random() * 0.4; // ±20% variation
              break;
          }
          
          return {
            ...user,
            totalScore: Math.round(user.totalScore * scoreMultiplier),
            listening: user.listening ? Math.round(user.listening * scoreMultiplier) : undefined,
            speaking: user.speaking ? Math.round(user.speaking * scoreMultiplier) : undefined,
            reading: user.reading ? Math.round(user.reading * scoreMultiplier) : undefined,
            writing: user.writing ? Math.round(user.writing * scoreMultiplier) : undefined,
            lastUpdate: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
        }).sort((a, b) => b.totalScore - a.totalScore).map((user, index) => ({ ...user, rank: index + 1 }));
      }
      
      return filteredData.slice(0, limit);
    }
  },

  // Get progress history for charts
  getProgressHistory: async (userId: number, period: string = 'week'): Promise<ProgressHistory[]> => {
    try {
      const response = await apiService.get<ProgressHistory[]>(`/api/Users/${userId}/progress-history?period=${period}`);
      return response;
    } catch (error) {
      console.log('Progress history API not available, using mock data:', error);
      return mockProgressHistory;
    }
  },

  // Search users in leaderboard
  searchLeaderboard: async (query: string): Promise<LeaderboardEntry[]> => {
    try {
      const response = await apiService.get<LeaderboardEntry[]>(`/api/Leaderboard/search?q=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.log('Search API not available, using mock data:', error);
      // Filter mock data by username
      return mockLeaderboard.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase())
      );
    }
  },

  // Update user progress (when completing exercises)
  updateProgress: async (userId: number, activityData: Omit<Activity, 'id'>): Promise<void> => {
    try {
      await apiService.post(`/api/Users/${userId}/progress`, activityData);
    } catch (error) {
      console.log('Update progress API not available:', error);
      // In real app, this would be saved locally and synced later
    }
  }
};

// Export synchronized data for consistent access across components
export const getSynchronizedData = () => ({
  userStats: mockUserStats,
  activities: mockActivities,
  weeklyProgress: mockWeeklyProgress,
  achievements: mockAchievements,
  leaderboard: mockLeaderboard,
});

// Export function to reset mock data to initial state
export const resetMockData = () => {
  // Reset to initial state if needed for testing
  mockUserStats.completedExercises = 98;
  mockUserStats.totalStudyTime = 3420;
  mockUserStats.currentStreak = 7;
  mockUserStats.averageScore = 85;
  
  // Reset activities to original set
  mockActivities.splice(0, mockActivities.length, 
    ...Array.from({length: 8}, (_, i) => 
      generateSampleActivity(i + 1, i, Object.values(AssignmentType)[i % Object.values(AssignmentType).length] as AssignmentType, `Topic ${i + 1}`)
    )
  );
};

export default statsService;