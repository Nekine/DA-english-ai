
import React from 'react';
import Navbar from '@/components/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.22, 1, 0.36, 1] 
            }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="py-6 border-t border-border/40 dark:border-border/20">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EngBuddy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
