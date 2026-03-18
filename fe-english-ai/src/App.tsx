import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index";
import Dictionary from "./pages/Dictionary";
import DictionaryResult from "./pages/DictionaryResult";
import Exercises from "./pages/Exercises";
import Writing from "./pages/Writing";
import Listening from "./pages/Listening";
import Speaking from "./pages/Speaking";
import WritingMode from "./pages/WritingMode";
import Leaderboard from "./pages/Leaderboard"
import Progress from "./pages/Progress";
import ReadingExercises from "./pages/ReadingExercises";
import SentenceWriting from "./pages/SentenceWriting";
import SentencePractice from "./pages/SentencePractice";
import WritingSentenceLibrary from "./pages/WritingSentenceLibrary";
import WritingPractice from "./pages/WritingPractice";
import TeacherReviews from "./pages/TeacherReviews";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import TestList from "./pages/TestList";
import TestConfiguration from "./pages/TestConfiguration";
import TestExam from "./pages/TestExam";

import LoginAlt from "./pages/LoginAlt";
import Register from "./pages/Register";
import Auth0Callback from "./pages/Auth0Callback";
import ProtectedRoute from "./components/ProtectedRoute"; // Nhập ProtectedRoute
import Checkout from "./pages/Checkout";
import Pricing from "./pages/Pricing";

// Admin imports
import AdminLayout from "./layouts/admin/AdminLayout.tsx";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import ContentManagement from "./pages/admin/ContentManagement";
import AdminSettings from "./pages/admin/Settings";
import TestsPage from "./pages/admin/TestsPage";
import UploadPage from "./pages/admin/UploadPage";
import AccountPage from "./pages/admin/AccountPage";
import ProfilePage from "./pages/admin/ProfilePage";
import RevenuePage from "./pages/admin/Revenue";
import AIReviewPage from "./pages/admin/AIReview";
import TestStatistics from "./pages/TestStatistics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Route mặc định - trang landing public */}
              <Route path="/" element={<Index />} />

              {/* Public routes - không cần đăng nhập */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/callback" element={<Auth0Callback />} />
              <Route path="/pricing" element={<Pricing />} />

              {/* Protected routes - cần đăng nhập */}
              <Route path="/index" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/dictionary" element={
                <ProtectedRoute>
                  <Dictionary />
                </ProtectedRoute>
              } />
              <Route path="/dictionary-result" element={
                <ProtectedRoute>
                  <DictionaryResult />
                </ProtectedRoute>
              } />
              <Route path="/exercises" element={
                <ProtectedRoute>
                  <Exercises />
                </ProtectedRoute>
              } />
              
              {/* Writing routes - cần đăng nhập */}
              <Route path="/writing-mode" element={
                <ProtectedRoute>
                  <WritingMode />
                </ProtectedRoute>
              } />
              <Route path="/writing" element={
                <ProtectedRoute>
                  <Writing />
                </ProtectedRoute>
              } />
              <Route path="/listening" element={
                <ProtectedRoute>
                  <Listening />
                </ProtectedRoute>
              } />
              <Route path="/speaking" element={
                <ProtectedRoute>
                  <Speaking />
                </ProtectedRoute>
              } />
              <Route path="/sentence-writing" element={
                <ProtectedRoute>
                  <SentenceWriting />
                </ProtectedRoute>
              } />
              <Route path="/sentence-practice" element={
                <ProtectedRoute>
                  <SentencePractice />
                </ProtectedRoute>
              } />
              <Route path="/writing-sentence-library" element={
                <ProtectedRoute>
                  <WritingSentenceLibrary />
                </ProtectedRoute>
              } />
              <Route path="/writing-practice/:id" element={
                <ProtectedRoute>
                  <WritingPractice />
                </ProtectedRoute>
              } />
              
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/teacher-reviews" element={
                <ProtectedRoute>
                  <TeacherReviews />
                </ProtectedRoute>
              } />
              <Route path="/test-stats" element={
                <ProtectedRoute>
                  <TestStatistics />
                </ProtectedRoute>
              } />

              <Route path="/progress" element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              } />
              <Route path="/reading-exercises" element={
                <ProtectedRoute>
                  <ReadingExercises />
                </ProtectedRoute>
              } />
              
              {/* TOEIC Test routes - cần đăng nhập */}
              <Route path="/test-list" element={
                <ProtectedRoute>
                  <TestList />
                </ProtectedRoute>
              } />
              <Route path="/test-config/:testId" element={
                <ProtectedRoute>
                  <TestConfiguration />
                </ProtectedRoute>
              } />
              <Route path="/test-exam/:testId" element={
                <ProtectedRoute>
                  <TestExam />
                </ProtectedRoute>
              } />
              
              {/* Checkout - cần đăng nhập */}
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="revenue" element={<RevenuePage />} />
                <Route path="ai-review" element={<AIReviewPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="content" element={<ContentManagement />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Route cho trang không tìm thấy */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;