import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Inbox, Search, FileText, AlertCircle } from 'lucide-react';
import Button from './Button';

/**
 * Unified Empty State Component
 * Provides consistent empty states across the app
 */

const EmptyState = ({ 
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description = "No items to display.",
  action,
  actionLabel = "Get Started",
  variant = "default", // default, search, error
  className
}) => {
  const variants = {
    default: {
      iconBg: "bg-zinc-800/50",
      iconColor: "text-zinc-500",
    },
    search: {
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
    },
    error: {
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
    },
  };

  const { iconBg, iconColor } = variants[variant] || variants.default;

  return (
    <div className={twMerge(
      "flex flex-col items-center justify-center text-center py-12 sm:py-16 px-4",
      className
    )}>
      <div className={clsx(
        "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6",
        iconBg
      )}>
        <Icon size={32} className={clsx("sm:w-10 sm:h-10", iconColor)} />
      </div>
      
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm sm:text-base text-zinc-500 max-w-md mb-6">
        {description}
      </p>
      
      {action && (
        <Button onClick={action} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// Preset empty states for common use cases
export const NoAssignments = ({ onSync }) => (
  <EmptyState
    icon={FileText}
    title="No assignments found"
    description="Sync your Google Classroom to see your assignments here."
    action={onSync}
    actionLabel="Sync Now"
    variant="default"
  />
);

export const NoSearchResults = ({ query }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description={`We couldn't find any assignments matching "${query}". Try a different search term.`}
    variant="search"
  />
);

export const NoMaterials = () => (
  <EmptyState
    icon={FileText}
    title="No materials attached"
    description="This assignment doesn't have any PDF or document materials to analyze."
    variant="default"
  />
);

export const ErrorState = ({ message, onRetry }) => (
  <EmptyState
    icon={AlertCircle}
    title="Something went wrong"
    description={message || "An error occurred while loading content."}
    action={onRetry}
    actionLabel="Try Again"
    variant="error"
  />
);

export default EmptyState;
