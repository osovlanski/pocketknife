import React, { useState } from 'react';
import { Plane, Calendar, Users, DollarSign, CalendarRange, TrendingDown } from 'lucide-react';

interface TravelSearchPanelProps {
  onSearch: (query: TravelSearchQuery) => void;
  loading: boolean;
}

export interface TravelSearchQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  budgetMax?: number;
  directFlights?: boolean;
  generatePlan?: boolean;
  // NEW: Flexible date search
  flexibleDates?: boolean;
  dateFlexibilityDays?: number;
  tripDuration?: number;
}

const TravelSearchPanel: React.FC<TravelSearchPanelProps> = ({ onSearch, loading }) => {
  const [query, setQuery] = useState<TravelSearchQuery>({
    origin: 'TLV',
    destination: 'BCN',
    departureDate: '',
    returnDate: '',
    adults: 2,
    children: 0,
    travelClass: 'ECONOMY',
    budgetMax: undefined,
    directFlights: false,
    generatePlan: true,
    flexibleDates: false,
    dateFlexibilityDays: 7,
    tripDuration: 7
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.departureDate) {
      alert('Please select a departure date');
      return;
    }
    onSearch(query);
  };

  const popularDestinations = [
    { code: 'BCN', name: 'Barcelona', flag: '🇪🇸' },
    { code: 'PAR', name: 'Paris', flag: '🇫🇷' },
    { code: 'ROM', name: 'Rome', flag: '🇮🇹' },
    { code: 'LON', name: 'London', flag: '🇬🇧' },
    { code: 'ATH', name: 'Athens', flag: '🇬🇷' },
    { code: 'IST', name: 'Istanbul', flag: '🇹🇷' },
    { code: 'DXB', name: 'Dubai', flag: '🇦🇪' },
    { code: 'NYC', name: 'New York', flag: '🇺🇸' }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-3 rounded-lg">
            <Plane className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">✈️ Travel Search</h2>
            <p className="text-sm text-slate-400">Find flights, hotels, and AI-powered trip plans</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Origin & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">From (Origin)</label>
            <input
              type="text"
              value={query.origin}
              onChange={(e) => setQuery({ ...query, origin: e.target.value.toUpperCase() })}
              placeholder="TLV"
              maxLength={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">3-letter airport code (e.g., TLV for Tel Aviv)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To (Destination)</label>
            <input
              type="text"
              value={query.destination}
              onChange={(e) => setQuery({ ...query, destination: e.target.value.toUpperCase() })}
              placeholder="BCN"
              maxLength={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {popularDestinations.map(dest => (
                <button
                  key={dest.code}
                  type="button"
                  onClick={() => setQuery({ ...query, destination: dest.code })}
                  className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10"
                >
                  {dest.flag} {dest.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dates - Enhanced with Flexible Search Option */}
        <div className="space-y-3">
          {/* Flexible Dates Toggle */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={query.flexibleDates || false}
                onChange={(e) => setQuery({ ...query, flexibleDates: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium">Flexible Dates - Find Best Deals!</div>
                  <div className="text-xs text-slate-400">Search multiple dates to find cheapest flights</div>
                </div>
              </div>
            </label>
          </div>

          {!query.flexibleDates ? (
            /* Standard Date Selection */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Departure Date
                </label>
                <input
                  type="date"
                  value={query.departureDate}
                  onChange={(e) => setQuery({ ...query, departureDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Return Date (Optional)
                </label>
                <input
                  type="date"
                  value={query.returnDate || ''}
                  onChange={(e) => setQuery({ ...query, returnDate: e.target.value })}
                  min={query.departureDate || new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty for one-way trip</p>
              </div>
            </div>
          ) : (
            /* Flexible Date Search Options */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date Range</label>
                <input
                  type="date"
                  value={query.departureDate}
                  onChange={(e) => setQuery({ ...query, departureDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Earliest departure</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Flexibility (Days)</label>
                <select
                  value={query.dateFlexibilityDays || 7}
                  onChange={(e) => setQuery({ ...query, dateFlexibilityDays: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">±3 days</option>
                  <option value="7">±7 days (week)</option>
                  <option value="14">±14 days (2 weeks)</option>
                  <option value="30">±30 days (month)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Search range</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trip Duration</label>
                <select
                  value={query.tripDuration || 7}
                  onChange={(e) => setQuery({ ...query, tripDuration: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">3 days (weekend)</option>
                  <option value="5">5 days</option>
                  <option value="7">1 week</option>
                  <option value="10">10 days</option>
                  <option value="14">2 weeks</option>
                  <option value="21">3 weeks</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">How long?</p>
              </div>

              <div className="md:col-span-3 flex items-center gap-2 text-sm bg-blue-500/10 p-3 rounded border border-blue-500/30">
                <TrendingDown className="w-5 h-5 text-blue-400" />
                <span>
                  Will search {(query.dateFlexibilityDays || 7) * 2} different dates to find the best deals!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Passengers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Adults
            </label>
            <input
              type="number"
              value={query.adults}
              onChange={(e) => setQuery({ ...query, adults: parseInt(e.target.value) || 1 })}
              min="1"
              max="9"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Children</label>
            <input
              type="number"
              value={query.children || 0}
              onChange={(e) => setQuery({ ...query, children: parseInt(e.target.value) || 0 })}
              min="0"
              max="9"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Travel Class</label>
            <select
              value={query.travelClass}
              onChange={(e) => setQuery({ ...query, travelClass: e.target.value as any })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First Class</option>
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Max Budget (USD)
                </label>
                <input
                  type="number"
                  value={query.budgetMax || ''}
                  onChange={(e) => setQuery({ ...query, budgetMax: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 2000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty for no budget limit</p>
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.directFlights || false}
                    onChange={(e) => setQuery({ ...query, directFlights: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  <span className="text-sm">Direct flights only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.generatePlan || false}
                    onChange={(e) => setQuery({ ...query, generatePlan: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  <span className="text-sm">🤖 Generate AI trip plan</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
            loading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Searching travel options...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plane className="w-5 h-5" />
              Search Flights & Hotels
            </span>
          )}
        </button>
      </form>

      {/* Info Banner */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-300">
          💡 <strong>Free tier:</strong> Powered by Amadeus API (2,000 searches/month free)
        </p>
      </div>
    </div>
  );
};

export default TravelSearchPanel;
