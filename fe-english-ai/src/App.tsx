import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index.tsx";
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
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/callback" element={<Auth0Callback />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/dictionary" element={<Dictionary />} />
                <Route path="/dictionary-result" element={<DictionaryResult />} />
                <Route path="/exercises" element={<Exercises />} />

                {/* Writing routes */}
                <Route path="/writing-mode" element={<WritingMode />} />
                <Route path="/writing" element={<Writing />} />
                <Route path="/listening" element={<Listening />} />
                <Route path="/speaking" element={<Speaking />} />
                <Route path="/sentence-writing" element={<SentenceWriting />} />
                <Route path="/sentence-practice" element={<SentencePractice />} />

                <Route path="/chat" element={<Chat />} />
                <Route path="/test-stats" element={<TestStatistics />} />

                <Route path="/progress" element={<Progress />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/reading-exercises" element={<ReadingExercises />} />

                {/* TOEIC Test routes */}
                <Route path="/test-list" element={<TestList />} />
                <Route path="/test-config" element={<TestConfiguration />} />
                <Route path="/test-config/:testId" element={<TestConfiguration />} />
                <Route path="/test-exam/:testId" element={<TestExam />} />

                {/* Checkout */}
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/pricing" element={<Pricing />} />
              </Route>

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