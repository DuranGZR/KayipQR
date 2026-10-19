import React from "react";
import clsx from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={clsx(
        "skeleton-shimmer rounded-xl bg-ink/5 border border-ink/5",
        className
      )}
      {...props}
    />
  );
};

export const ItemCardSkeleton = () => {
  return (
    <div className="relative bg-paper-card p-4 sm:p-5 rounded-2xl border-[1.5px] border-ink/15 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="w-28 h-4 rounded-md" />
            <Skeleton className="w-16 h-3 rounded-md" />
          </div>
        </div>
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>

      <div className="py-2 flex items-center justify-center">
        <Skeleton className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl" />
      </div>

      <div className="pt-2 border-t border-ink/10 flex items-center justify-between">
        <Skeleton className="w-20 h-3 rounded-md" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const MessageListSkeleton = () => {
  return (
    <div className="divide-y divide-ink/10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3.5 flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-10 h-3 rounded" />
            </div>
            <Skeleton className="w-36 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
