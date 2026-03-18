import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  gradient?: string;
  className?: string;
  delay?: number;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-white',
  badgeText,
  badgeVariant = 'secondary',
  gradient = 'from-blue-500 to-blue-600',
  className,
  delay = 0,
  trend,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('', className)}
    >
      <Card className={`p-6 bg-gradient-to-br ${gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white/90 text-sm">{title}</h3>
            </div>
          </div>
          {badgeText && (
            <Badge variant={badgeVariant} className="bg-white/20 text-white border-white/30">
              {badgeText}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {subtitle && (
            <p className="text-white/80 text-sm">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`text-xs px-2 py-1 rounded-full ${
                trend.isPositive !== false 
                  ? 'bg-green-500/20 text-green-100' 
                  : 'bg-red-500/20 text-red-100'
              }`}>
                {trend.isPositive !== false ? '+' : ''}{trend.value}%
              </div>
              <span className="text-white/70 text-xs">{trend.label}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Import variants from separate file for Fast Refresh compatibility
export { StatsCardVariants } from '@/lib/statsCardVariants';

// Mini version for smaller spaces
interface MiniStatsCardProps extends Omit<StatsCardProps, 'subtitle' | 'trend'> {
  compact?: boolean;
}

export const MiniStatsCard: React.FC<MiniStatsCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  badgeText,
  badgeVariant = 'secondary',
  className,
  delay = 0,
  compact = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={cn('', className)}
    >
      <Card className={`${compact ? 'p-3' : 'p-4'} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{title}</p>
            <p className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          {badgeText && (
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;