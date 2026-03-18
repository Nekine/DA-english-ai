// StatsCard variants configuration
export const StatsCardVariants = {
  primary: {
    gradient: 'from-blue-500 to-blue-600',
    iconColor: 'text-white',
  },
  secondary: {
    gradient: 'from-purple-500 to-purple-600',
    iconColor: 'text-white',
  },
  success: {
    gradient: 'from-green-500 to-green-600',
    iconColor: 'text-white',
  },
  warning: {
    gradient: 'from-yellow-500 to-yellow-600',
    iconColor: 'text-white',
  },
  danger: {
    gradient: 'from-red-500 to-red-600',
    iconColor: 'text-white',
  },
  info: {
    gradient: 'from-cyan-500 to-cyan-600',
    iconColor: 'text-white',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    iconColor: 'text-white',
  },
  pink: {
    gradient: 'from-pink-500 to-pink-600',
    iconColor: 'text-white',
  },
  indigo: {
    gradient: 'from-indigo-500 to-indigo-600',
    iconColor: 'text-white',
  },
} as const;

export type StatsCardVariant = keyof typeof StatsCardVariants;