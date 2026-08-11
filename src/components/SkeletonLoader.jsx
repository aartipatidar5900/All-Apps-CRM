export const StoreDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-10 w-full animate-pulse">
      {/* Top Header Skeleton */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        {/* Left Column Skeleton */}
        <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded-md mb-4" />
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="space-y-1.5">
              <div className="h-3 w-20 bg-slate-200 rounded-md" />
              <div className="h-5 w-40 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>

        {/* Right Column Skeleton */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="h-5 w-36 bg-slate-200 rounded-md" />
            <div className="h-4 w-20 bg-slate-200 rounded-md" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-4 items-center">
                <div className="h-8 w-16 bg-slate-200 rounded-md" />
                <div className="w-4 h-4 rounded-full bg-slate-200" />
                <div className="flex-1 h-16 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Discounts Table Skeleton */}
      <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="h-5 w-44 bg-slate-200 rounded-md" />
          <div className="h-4 w-20 bg-slate-200 rounded-md" />
        </div>
        <div className="space-y-2">
          <div className="h-10 w-full bg-slate-200 rounded-lg" />
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-12 w-full bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs w-full animate-pulse">
      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="h-10 w-full sm:w-80 bg-slate-200 rounded-xl" />
        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex bg-slate-100 px-4 py-3.5 border-b border-slate-200 gap-4">
          <div className="h-4 w-1/4 bg-slate-300 rounded-md" />
          <div className="h-4 w-1/6 bg-slate-300 rounded-md" />
          <div className="h-4 w-1/5 bg-slate-300 rounded-md" />
          <div className="h-4 w-1/5 bg-slate-300 rounded-md" />
          <div className="h-4 w-1/8 bg-slate-300 rounded-md" />
        </div>

        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div key={row} className="flex px-4 py-4 border-b border-slate-100 last:border-0 gap-4 items-center">
            <div className="w-1/4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200" />
              <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            </div>
            <div className="w-1/6">
              <div className="h-5 w-20 bg-slate-200 rounded-md" />
            </div>
            <div className="w-1/5">
              <div className="h-4 w-12 bg-slate-200 rounded-md" />
            </div>
            <div className="w-1/5">
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
            </div>
            <div className="w-1/8 flex justify-end">
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center mt-6">
        <div className="h-4 w-44 bg-slate-200 rounded-md" />
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
};
