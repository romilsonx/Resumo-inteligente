import React from 'react';

interface SummaryCardProps {
  title: string;
  content: string;
  icon: React.ReactNode; // Allow passing an icon component
  colorClass: string; // Pass TailwindCSS classes for color
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, content, icon, colorClass }) => {
  return (
    <div className={`bg-white dark:bg-gray-800/50 p-5 rounded-xl shadow-md border-t-4 ${colorClass}`}>
      <div className="flex items-center mb-3">
        <div className="mr-3">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
      </div>
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
};

export default SummaryCard;
