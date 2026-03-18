
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: string;
  bgColor: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  path,
  color,
  bgColor,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay * 0.2 }}
      className="feature-card h-full"
    >
      <Link
        to={path}
        className="group block h-full rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 hover:scale-[1.02] hover:border-slate-300 dark:hover:border-slate-600"
      >
        <div className="flex flex-col h-full">
          <div className={cn("p-3 w-14 h-14 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110", bgColor)}>
            <Icon className={cn("w-8 h-8 transition-all duration-300", color)} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm flex-grow leading-relaxed">{description}</p>
          <div className="mt-6 flex items-center text-sm font-medium transition-all duration-300 group-hover:translate-x-1">
            <span className={cn(color)}>Khám phá</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("ml-1 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1", color)}
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default FeatureCard;
