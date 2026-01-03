import React, { useState } from 'react';
import { Mountain, Calendar, Users, MapPin, Snowflake, Plane, Hotel, Star, TrendingUp, Square, ExternalLink, Utensils, Camera, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { searchSkiDeals, stopSkiSearch, type SkiDeal, type SkiSearchQuery } from '../services/travelApi';

interface SkiDealsPanelProps {
  onDealsFound?: (deals: SkiDeal[]) => void;
}

const SkiDealsPanel: React.FC<SkiDealsPanelProps> = ({ onDealsFound }) => {
  const [query, setQuery] = useState<SkiSearchQuery>({
    origin: 'TLV',
    departureDate: '',
    returnDate: '',
    passengers: { adults: 2, children: 0 },
    preferences: {
      skillLevel: 'intermediate',
      priceLevel: 'mid',
      preferredCountries: []
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<SkiDeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());

  const toggleDealExpanded = (resortId: string) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      if (next.has(resortId)) {
        next.delete(resortId);
      } else {
        next.add(resortId);
      }
      return next;
    });
  };

  // Generate tour suggestions based on resort
  const getTourSuggestions = (deal: SkiDeal) => {
    const suggestions = {
      accommodations: [
        { name: `${deal.resort.name} Ski Resort Hotel`, type: 'hotel', rating: 4.5 },
        { name: `Alpine Lodge ${deal.resort.region}`, type: 'hotel', rating: 4.2 },
        { name: `Mountain View Chalet`, type: 'chalet', rating: 4.8 },
      ],
      restaurants: [
        { name: `La Fondue ${deal.resort.name}`, type: 'fondue', rating: 4.6 },
        { name: `Alpine Grill & Bar`, type: 'grill', rating: 4.3 },
        { name: `Après-Ski Lounge`, type: 'bar', rating: 4.4 },
      ],
      attractions: [
        { name: `${deal.resort.name} Ski School`, type: 'skiing' },
        { name: `Scenic Mountain Gondola`, type: 'sightseeing' },
        { name: `${deal.resort.region} Spa & Wellness`, type: 'spa' },
        { name: `Ice Skating Rink`, type: 'activity' },
      ],
      shopping: [
        { name: `Ski Equipment Rental`, type: 'rental' },
        { name: `${deal.resort.name} Gift Shop`, type: 'souvenirs' },
        { name: `Local Artisan Market`, type: 'market' },
      ]
    };
    return suggestions;
  };

  // Generate booking links
  const getBookingLinks = (deal: SkiDeal) => ({
    flights: `https://www.skyscanner.com/transport/flights/${query.origin}/${deal.resort.nearestAirport || 'GVA'}/${query.departureDate}/`,
    hotels: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(deal.resort.name + ' ' + deal.resort.country)}`,
    skiPass: `https://www.google.com/search?q=${encodeURIComponent(deal.resort.name + ' ski pass prices')}`,
    resort: `https://www.google.com/search?q=${encodeURIComponent(deal.resort.name + ' official website')}`,
  });

  const europeanCountries = [
    'France', 'Austria', 'Switzerland', 'Italy', 'Germany'
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.departureDate) {
      alert('Please select a departure date');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDeals([]);
      
      const result = await searchSkiDeals(query);
      setDeals(result.deals);
      onDealsFound?.(result.deals);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    await stopSkiSearch();
    setLoading(false);
  };

  const toggleCountry = (country: string) => {
    const current = query.preferences?.preferredCountries || [];
    const updated = current.includes(country)
      ? current.filter(c => c !== country)
      : [...current, country];
    setQuery({
      ...query,
      preferences: { ...query.preferences, preferredCountries: updated }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 120) return 'text-green-400';
    if (score >= 100) return 'text-blue-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 120) return 'bg-green-500/20 border-green-500/50';
    if (score >= 100) return 'bg-blue-500/20 border-blue-500/50';
    if (score >= 80) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-orange-500/20 border-orange-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Search Panel */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-xl p-6 border border-cyan-500/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-cyan-500/20 p-3 rounded-lg">
            <Mountain className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">⛷️ Ski Deals Finder</h2>
            <p className="text-sm text-slate-400">Find the best ski trip deals across European resorts</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Origin & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                From (Airport Code)
              </label>
              <input
                type="text"
                value={query.origin}
                onChange={(e) => setQuery({ ...query, origin: e.target.value.toUpperCase() })}
                placeholder="TLV"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Return Date
              </label>
              <input
                type="date"
                value={query.returnDate || ''}
                onChange={(e) => setQuery({ ...query, returnDate: e.target.value })}
                min={query.departureDate || new Date().toISOString().split('T')[0]}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
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
                value={query.passengers?.adults || 2}
                onChange={(e) => setQuery({
                  ...query,
                  passengers: { ...query.passengers, adults: parseInt(e.target.value) || 1 }
                })}
                min="1"
                max="9"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Skill Level</label>
              <select
                value={query.preferences?.skillLevel || 'intermediate'}
                onChange={(e) => setQuery({
                  ...query,
                  preferences: { ...query.preferences, skillLevel: e.target.value as any }
                })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🔵 Intermediate</option>
                <option value="advanced">⚫ Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price Level</label>
              <select
                value={query.preferences?.priceLevel || 'mid'}
                onChange={(e) => setQuery({
                  ...query,
                  preferences: { ...query.preferences, priceLevel: e.target.value as any }
                })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="budget">💰 Budget</option>
                <option value="mid">💎 Mid-Range</option>
                <option value="premium">👑 Premium</option>
              </select>
            </div>
          </div>

          {/* Country Preferences */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Preferred Countries (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {europeanCountries.map(country => (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggleCountry(country)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    query.preferences?.preferredCountries?.includes(country)
                      ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* Search/Stop Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-4 rounded-lg font-semibold text-lg transition-all ${
                loading
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching ski resorts...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Snowflake className="w-5 h-5" />
                  Find Ski Deals
                </span>
              )}
            </button>
            
            {loading && (
              <button
                type="button"
                onClick={handleStop}
                className="px-6 py-4 rounded-lg font-semibold bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 transition-colors"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {deals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-cyan-400" />
            Found {deals.length} Ski Deals
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deals.map((deal, idx) => (
              <div
                key={deal.resort.id}
                className={`rounded-xl border p-4 ${getScoreBg(deal.dealScore)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Mountain className="w-5 h-5 text-cyan-400" />
                      {deal.resort.name}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {deal.resort.region}, {deal.resort.country}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(deal.dealScore)}`}>
                      {deal.dealScore.toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-400">Deal Score</div>
                  </div>
                </div>

                {/* Resort Info */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-cyan-400 font-bold">{deal.resort.slopes.total}</div>
                    <div className="text-[10px] text-slate-400">Slopes (km)</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-cyan-400 font-bold">{deal.resort.lifts}</div>
                    <div className="text-[10px] text-slate-400">Lifts</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-cyan-400 font-bold">{deal.resort.altitude.peak}m</div>
                    <div className="text-[10px] text-slate-400">Peak Alt.</div>
                  </div>
                </div>

                {/* Slope Breakdown */}
                <div className="flex gap-1 mb-4">
                  <div 
                    className="h-2 bg-green-500 rounded-l" 
                    style={{ width: `${(deal.resort.slopes.beginner / deal.resort.slopes.total) * 100}%` }}
                    title={`Beginner: ${deal.resort.slopes.beginner}km`}
                  />
                  <div 
                    className="h-2 bg-blue-500" 
                    style={{ width: `${(deal.resort.slopes.intermediate / deal.resort.slopes.total) * 100}%` }}
                    title={`Intermediate: ${deal.resort.slopes.intermediate}km`}
                  />
                  <div 
                    className="h-2 bg-black rounded-r" 
                    style={{ width: `${(deal.resort.slopes.advanced / deal.resort.slopes.total) * 100}%` }}
                    title={`Advanced: ${deal.resort.slopes.advanced}km`}
                  />
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Plane className="w-4 h-4 text-blue-400" />
                      <span>{deal.flights.length} flights</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hotel className="w-4 h-4 text-green-400" />
                      <span>{deal.hotels.length} hotels</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">
                      ${deal.totalEstimate.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-400">Est. Total</div>
                  </div>
                </div>

                {/* Quick Booking Links */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                  {(() => {
                    const links = getBookingLinks(deal);
                    return (
                      <>
                        <a
                          href={links.flights}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 py-2 rounded-lg text-xs transition-colors"
                        >
                          <Plane className="w-3 h-3" />
                          Book Flights
                        </a>
                        <a
                          href={links.hotels}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 py-2 rounded-lg text-xs transition-colors"
                        >
                          <Hotel className="w-3 h-3" />
                          Book Hotel
                        </a>
                        <a
                          href={links.resort}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 py-2 rounded-lg text-xs transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Resort Info
                        </a>
                      </>
                    );
                  })()}
                </div>

                {/* Expand/Collapse Tour Suggestions */}
                <button
                  onClick={() => toggleDealExpanded(deal.resort.id)}
                  className="w-full flex items-center justify-center gap-2 mt-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {expandedDeals.has(deal.resort.id) ? (
                    <><ChevronUp className="w-4 h-4" /> Hide Tour Suggestions</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show Tour Suggestions</>
                  )}
                </button>

                {/* Tour Suggestions Panel */}
                {expandedDeals.has(deal.resort.id) && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-4">
                    {(() => {
                      const suggestions = getTourSuggestions(deal);
                      return (
                        <>
                          {/* Accommodations */}
                          <div>
                            <h5 className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2">
                              <Hotel className="w-4 h-4" />
                              Recommended Accommodations
                            </h5>
                            <div className="space-y-1">
                              {suggestions.accommodations.map((acc, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                                  <span>{acc.name}</span>
                                  <div className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-xs">{acc.rating}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Restaurants */}
                          <div>
                            <h5 className="text-sm font-semibold text-orange-300 mb-2 flex items-center gap-2">
                              <Utensils className="w-4 h-4" />
                              Dining & Après-Ski
                            </h5>
                            <div className="space-y-1">
                              {suggestions.restaurants.map((rest, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                                  <span>{rest.name}</span>
                                  <div className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-xs">{rest.rating}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Attractions */}
                          <div>
                            <h5 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                              <Camera className="w-4 h-4" />
                              Activities & Attractions
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.attractions.map((attr, i) => (
                                <span key={i} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs">
                                  {attr.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Shopping */}
                          <div>
                            <h5 className="text-sm font-semibold text-pink-300 mb-2 flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4" />
                              Shopping & Services
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.shopping.map((shop, i) => (
                                <span key={i} className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-xs">
                                  {shop.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkiDealsPanel;

