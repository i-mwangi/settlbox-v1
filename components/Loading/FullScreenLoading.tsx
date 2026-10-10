import React from "react";

export default function FullScreenLoading() {
  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="absolute left-0 top-0 h-4 w-full overflow-hidden">
        <div className="loading-progress h-full w-1/3 bg-[#066EFF]" />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet="/logo/settlbox-icon.svg" />
          <img src="/logo/loading.gif" alt="Loading Settlbox" width={192} height={192} />
        </picture>
      </div>
      <style jsx>{`
        .loading-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-progress {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
