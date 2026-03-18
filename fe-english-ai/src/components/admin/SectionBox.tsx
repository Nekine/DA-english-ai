import React from "react";

interface SectionBoxProps {
  className?: string;
  children: React.ReactNode;
}

export const SectionBox = ({ className = "", children }: SectionBoxProps) => {
  return (
    <div className={`p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {children}
    </div>
  );
};