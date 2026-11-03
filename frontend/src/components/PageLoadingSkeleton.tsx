import React from "react";

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-1" aria-busy="true" aria-label="Loading page content">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-[#E3EAE5] rounded-xl" />
          <div className="h-4 w-96 bg-[#EFF4F0] rounded-lg" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-24 bg-[#E3EAE5] rounded-xl" />
          <div className="h-8 w-32 bg-[#E3EAE5] rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="soft-card p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 bg-[#EFF4F0] rounded" />
              <div className="h-4 w-4 bg-[#E3EAE5] rounded-full" />
            </div>
            <div className="h-7 w-20 bg-[#E3EAE5] rounded-lg mt-2" />
            <div className="h-3 w-28 bg-[#EFF4F0] rounded" />
          </div>
        ))}
      </div>

      {/* Large Content / Chart Card Skeleton */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#E3EAE5]">
          <div className="h-5 w-48 bg-[#E3EAE5] rounded-lg" />
          <div className="h-4 w-24 bg-[#EFF4F0] rounded" />
        </div>
        <div className="h-64 w-full bg-[#F6F8F6] rounded-xl border border-[#EEF2EF] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#247653] border-t-transparent animate-spin" />
        </div>
      </div>

      {/* Table / Grid Rows Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="soft-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-[#E3EAE5] rounded" />
              <div className="h-4 w-12 bg-[#EFF4F0] rounded-full" />
            </div>
            <div className="h-16 w-full bg-[#F6F8F6] rounded-lg" />
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-[#EFF4F0] rounded" />
              <div className="h-3 w-20 bg-[#EFF4F0] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
