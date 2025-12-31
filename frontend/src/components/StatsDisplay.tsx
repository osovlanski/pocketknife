import React from 'react';

interface StatsDisplayProps {
  processed: number;
  invoices: number;
  jobOffers: number;
  spam: number;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ processed, invoices, jobOffers, spam }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-2 text-blue-400 mb-2">
          <span className="text-sm">Processed</span>
        </div>
        <div className="text-3xl font-bold">{processed}</div>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <span className="text-sm">Invoices</span>
        </div>
        <div className="text-3xl font-bold">{invoices}</div>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-2 text-purple-400 mb-2">
          <span className="text-sm">Job Offers</span>
        </div>
        <div className="text-3xl font-bold">{jobOffers}</div>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <span className="text-sm">Spam</span>
        </div>
        <div className="text-3xl font-bold">{spam}</div>
      </div>
    </div>
  );
};

export default StatsDisplay;