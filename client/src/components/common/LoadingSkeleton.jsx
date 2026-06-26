import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Unified Loading Skeleton Component
 * Provides consistent loading states across the app
 */

// Base skeleton with shimmer animation
export const Skeleton = ({ className }) => (
  <div 
    className={twMerge(
      "animate-pulse bg-zinc-800/50 rounded-lg",
      className
    )} 
  />
);

// Text line skeleton
export const SkeletonText = ({ lines = 1, className }) => (
  <div className={twMerge("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={clsx(
          "h-4",
          i === lines - 1 && lines > 1 && "w-3/4" // Last line shorter
        )} 
      />
    ))}
  </div>
);

// Card skeleton for dashboard
export const SkeletonCard = ({ className }) => (
  <div className={twMerge(
    "bg-zinc-900/50 border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4",
    className
  )}>
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

// Assignment list item skeleton
export const SkeletonAssignment = ({ className }) => (
  <div className={twMerge(
    "bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-3",
    className
  )}>
    <div className="flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="w-20 h-8 rounded-lg shrink-0" />
    </div>
  </div>
);

// Full page loading skeleton for Dashboard
export const DashboardSkeleton = () => (
  <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 px-2 sm:px-0">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
        <Skeleton className="h-4 sm:h-5 w-40 sm:w-48" />
      </div>
      <Skeleton className="w-full sm:w-24 h-10 rounded-xl" />
    </div>
    
    {/* Stats skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    
    {/* Filter bar skeleton */}
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <Skeleton className="h-10 w-24 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
    
    {/* Assignment list skeleton */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonAssignment key={i} />
      ))}
    </div>
  </div>
);

// Workspace loading skeleton
export const WorkspaceSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-4rem)] p-4">
    {/* Sidebar skeleton */}
    <div className="w-full lg:w-64 shrink-0 space-y-4">
      <Skeleton className="h-40 rounded-xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
    
    {/* Main content skeleton */}
    <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <SkeletonText lines={6} />
        <Skeleton className="h-40 rounded-xl" />
        <SkeletonText lines={4} />
      </div>
    </div>
  </div>
);

// Profile page skeleton
export const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto mt-6 px-4 space-y-6">
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600/10 p-8 border-b border-white/5">
        <div className="flex items-center gap-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export default {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAssignment,
  DashboardSkeleton,
  WorkspaceSkeleton,
  ProfileSkeleton,
};
