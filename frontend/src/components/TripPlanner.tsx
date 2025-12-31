import React, { useState } from 'react';
import { Calendar, Clock, MapPin, DollarSign, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { TripPlan } from '../types/travel';

interface TripPlannerProps {
  plan: TripPlan;
}

const TripPlanner: React.FC<TripPlannerProps> = ({ plan }) => {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          🤖 AI Trip Plan
        </h3>
        <button
          onClick={() => {
            if (expandedDays.size === plan.itinerary.length) {
              setExpandedDays(new Set());
            } else {
              setExpandedDays(new Set(plan.itinerary.map((_, idx) => idx + 1)));
            }
          }}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {expandedDays.size === plan.itinerary.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Overview */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Trip Overview
        </h4>
        <p className="text-slate-300 leading-relaxed">{plan.overview}</p>
      </div>

      {/* Budget Breakdown */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Estimated Budget
        </h4>
        <div className="text-4xl font-bold text-green-400 mb-4">
          ${plan.estimatedBudget.total.toFixed(0)} {plan.estimatedBudget.currency}
        </div>
        <p className="text-sm text-slate-400">
          Includes flights, hotels, activities, meals, and local transport
        </p>
      </div>

      {/* Day-by-Day Itinerary */}
      <div className="space-y-3">
        <h4 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Daily Itinerary
        </h4>

        {plan.itinerary.map((day) => {
          const isExpanded = expandedDays.has(day.day);
          const date = new Date(day.date);
          const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });

          return (
            <div
              key={day.day}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden"
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.day)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg font-bold">
                    Day {day.day}
                  </div>
                  <div>
                    <div className="font-semibold text-left">{formattedDate}</div>
                    <div className="text-sm text-slate-400 text-left">
                      {day.activities.length} activities planned
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Activities */}
              {isExpanded && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  {day.activities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-sm font-mono">
                          {activity.time}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold mb-1">{activity.title}</h5>
                        <p className="text-sm text-slate-400">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {plan.recommendations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Tips */}
          {plan.recommendations.localTips && plan.recommendations.localTips.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                💡 Local Tips
              </h4>
              <ul className="space-y-2">
                {plan.recommendations.localTips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Packing List */}
          {plan.recommendations.thingsToPack && plan.recommendations.thingsToPack.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                🎒 Things to Pack
              </h4>
              <ul className="space-y-2">
                {plan.recommendations.thingsToPack.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Export Options */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            const text = `TRIP PLAN\n\n${plan.overview}\n\nBudget: $${plan.estimatedBudget.total}\n\n${plan.itinerary.map(day => `Day ${day.day}:\n${day.activities.map(a => `${a.time} - ${a.title}\n${a.description}`).join('\n\n')}`).join('\n\n')}`;
            navigator.clipboard.writeText(text);
            alert('Trip plan copied to clipboard!');
          }}
          className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded-lg font-semibold transition-colors"
        >
          📋 Copy to Clipboard
        </button>
        <button
          onClick={() => {
            const dataStr = JSON.stringify(plan, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = 'trip-plan.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
          }}
          className="flex-1 bg-purple-500 hover:bg-purple-600 px-4 py-3 rounded-lg font-semibold transition-colors"
        >
          💾 Download JSON
        </button>
      </div>
    </div>
  );
};

export default TripPlanner;
