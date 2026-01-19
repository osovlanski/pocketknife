import React, { useState } from 'react';
import { Plane, Calendar, Users, DollarSign, CalendarRange, TrendingDown } from 'lucide-react';
import VoiceInputButton from './common/VoiceInputButton';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();
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
      alert(t('travel.selectDepartureDate'));
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
            <h2 className="text-2xl font-bold">✈️ {t('travel.searchFlights')}</h2>
            <p className="text-sm text-slate-400">{t('travel.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showAdvanced ? t('travel.hideAdvanced') : t('travel.showAdvanced')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Origin & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('travel.origin')}</label>
            <div className="relative">
              <input
                type="text"
                value={query.origin}
                onChange={(e) => setQuery({ ...query, origin: e.target.value.toUpperCase() })}
                placeholder="TLV"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  onTranscript={(text) => setQuery({ ...query, origin: text.toUpperCase().substring(0, 3) })}
                  size="sm"
                  title={t('common.voiceInput')}
                  ariaLabel={t('common.voiceInput')}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t('travel.airportCodeHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('travel.destination')}</label>
            <div className="relative">
              <input
                type="text"
                value={query.destination}
                onChange={(e) => setQuery({ ...query, destination: e.target.value.toUpperCase() })}
                placeholder="BCN"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  onTranscript={(text) => setQuery({ ...query, destination: text.toUpperCase().substring(0, 3) })}
                  size="sm"
                  title={t('common.voiceInput')}
                  ariaLabel={t('common.voiceInput')}
                />
              </div>
            </div>
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
                  <div className="font-medium">{t('travel.flexibleDates')}</div>
                  <div className="text-xs text-slate-400">{t('travel.flexibleDatesHint')}</div>
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
                  {t('travel.departureDate')}
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
                  {t('travel.returnDate')}
                </label>
                <input
                  type="date"
                  value={query.returnDate || ''}
                  onChange={(e) => setQuery({ ...query, returnDate: e.target.value })}
                  min={query.departureDate || new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">{t('travel.returnDateHint')}</p>
              </div>
            </div>
          ) : (
            /* Flexible Date Search Options */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
              <div>
                <label className="block text-sm font-medium mb-2">{t('travel.startDateRange')}</label>
                <input
                  type="date"
                  value={query.departureDate}
                  onChange={(e) => setQuery({ ...query, departureDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">{t('travel.earliestDeparture')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('travel.flexibility')}</label>
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
                <p className="text-xs text-slate-500 mt-1">{t('travel.searchRange')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('travel.tripDuration')}</label>
                <select
                  value={query.tripDuration || 7}
                  onChange={(e) => setQuery({ ...query, tripDuration: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">{t('travel.weekend')}</option>
                  <option value="5">5 days</option>
                  <option value="7">{t('travel.oneWeek')}</option>
                  <option value="10">10 days</option>
                  <option value="14">{t('travel.twoWeeks')}</option>
                  <option value="21">{t('travel.threeWeeks')}</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">{t('travel.howLong')}</p>
              </div>

              <div className="md:col-span-3 flex items-center gap-2 text-sm bg-blue-500/10 p-3 rounded border border-blue-500/30">
                <TrendingDown className="w-5 h-5 text-blue-400" />
                <span>
                  {t('travel.willSearchDates', { count: (query.dateFlexibilityDays || 7) * 2 })}
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
              {t('travel.adults')}
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
            <label className="block text-sm font-medium mb-2">{t('travel.children')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('travel.travelClass')}</label>
            <select
              value={query.travelClass}
              onChange={(e) => setQuery({ ...query, travelClass: e.target.value as any })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ECONOMY">{t('travel.economy')}</option>
              <option value="PREMIUM_ECONOMY">{t('travel.premiumEconomy')}</option>
              <option value="BUSINESS">{t('travel.business')}</option>
              <option value="FIRST">{t('travel.firstClass')}</option>
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
                  {t('travel.maxBudget')}
                </label>
                <input
                  type="number"
                  value={query.budgetMax || ''}
                  onChange={(e) => setQuery({ ...query, budgetMax: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 2000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">{t('travel.noBudgetLimit')}</p>
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.directFlights || false}
                    onChange={(e) => setQuery({ ...query, directFlights: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  <span className="text-sm">{t('travel.directFlights')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.generatePlan || false}
                    onChange={(e) => setQuery({ ...query, generatePlan: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  <span className="text-sm">🤖 {t('travel.generatePlan')}</span>
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
              {t('travel.searchingTravel')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plane className="w-5 h-5" />
              {t('travel.searchFlights')}
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
