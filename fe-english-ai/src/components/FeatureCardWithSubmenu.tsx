import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SubItem {
  name: string;
  path: string;
}

interface FeatureCardWithSubmenuProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  delay?: number;
  subItems: SubItem[];
}

const FeatureCardWithSubmenu: React.FC<FeatureCardWithSubmenuProps> = ({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  delay = 0,
  subItems,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay * 0.2 }}
      className="feature-card"
    >
      <div className="group h-full rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 hover:scale-[1.02] hover:border-slate-300 dark:hover:border-slate-600">
        <div className="flex flex-col h-full">
          <div className={cn("p-3 w-14 h-14 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110", bgColor)}>
            <Icon className={cn("w-8 h-8 transition-all duration-300", color)} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{description}</p>
          
          {/* Dropdown container with relative positioning */}
          <div className="mt-auto relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700",
                "text-white shadow-md hover:shadow-lg"
              )}
            >
              <span>Chọn loại bài tập</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown menu with absolute positioning */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="py-2">
                    {subItems.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "block px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          "hover:bg-slate-100 dark:hover:bg-slate-700/50",
                          "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100",
                          "hover:pl-5"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn("w-1.5 h-1.5 rounded-full", color.replace('text-', 'bg-'))} />
                          {subItem.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeatureCardWithSubmenu;
