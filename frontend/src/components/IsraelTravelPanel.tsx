/**
 * Israel Travel Panel Component
 * 
 * Provides domestic Israel travel recommendations with AI-powered suggestions,
 * curated destinations, hiking trails, and beaches.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Search,
  Mountain,
  Waves,
  Sun,
  Utensils,
  Heart,
  Clock,
  Car,
  Wallet,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Filter,
  RefreshCw,
  Star,
  Compass,
  TreePine,
  Building2,
  Navigation,
  Send,
  Map as MapIcon,
  ExternalLink
} from 'lucide-react';
import {
  searchIsraelDestinations,
  searchIsraelAI,
  getIsraelDestinations,
  getIsraelTrails,
  getIsraelBeaches,
  IsraelDestination,
  IsraelHikingTrail,
  IsraelBeach,
  IsraelTravelSuggestion,
  IsraelRegion,
  IsraelActivityType,
  TripDuration,
  BudgetLevel
} from '../services/travelApi';

interface IsraelTravelPanelProps {
  onClose?: () => void;
}

const IsraelTravelPanel: React.FC<IsraelTravelPanelProps> = ({ onClose }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'explore' | 'ai' | 'trails' | 'beaches'>('explore');
  
  // Explore tab state
  const [destinations, setDestinations] = useState<IsraelDestination[]>([]);
  const [suggestions, setSuggestions] = useState<IsraelTravelSuggestion[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<IsraelDestination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState<IsraelRegion | 'all'>('all');
  const [selectedActivity, setSelectedActivity] = useState<IsraelActivityType | 'all'>('all');
  const [selectedDuration, setSelectedDuration] = useState<TripDuration | 'all'>('all');
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel>('moderate');
  
  // AI search state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<IsraelTravelSuggestion[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // Trails and beaches state
  const [trails, setTrails] = useState<IsraelHikingTrail[]>([]);
  const [beaches, setBeaches] = useState<IsraelBeach[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<IsraelHikingTrail | null>(null);
  const [selectedBeach, setSelectedBeach] = useState<IsraelBeach | null>(null);

  // Region data with icons and colors
  const regions: { id: IsraelRegion | 'all'; name: string; icon: string; color: string }[] = [
    { id: 'all', name: 'All Regions', icon: '🇮🇱', color: 'bg-blue-500' },
    { id: 'north', name: 'North (Galilee)', icon: '🌲', color: 'bg-green-500' },
    { id: 'center', name: 'Center (Tel Aviv)', icon: '🏙️', color: 'bg-purple-500' },
    { id: 'jerusalem', name: 'Jerusalem', icon: '🕌', color: 'bg-amber-500' },
    { id: 'dead_sea', name: 'Dead Sea', icon: '🧂', color: 'bg-cyan-500' },
    { id: 'negev', name: 'Negev Desert', icon: '🏜️', color: 'bg-orange-500' },
    { id: 'eilat', name: 'Eilat (Red Sea)', icon: '🐠', color: 'bg-red-500' }
  ];

  // Activity types
  const activities: { id: IsraelActivityType | 'all'; name: string; icon: string }[] = [
    { id: 'all', name: 'All Activities', icon: '✨' },
    { id: 'beaches', name: 'Beaches', icon: '🏖️' },
    { id: 'hiking', name: 'Hiking', icon: '🥾' },
    { id: 'historical', name: 'Historical', icon: '🏛️' },
    { id: 'religious', name: 'Religious Sites', icon: '🕍' },
    { id: 'nature', name: 'Nature', icon: '🌿' },
    { id: 'food_wine', name: 'Food & Wine', icon: '🍷' },
    { id: 'wellness', name: 'Wellness', icon: '💆' },
    { id: 'adventure', name: 'Adventure', icon: '🧗' },
    { id: 'family', name: 'Family', icon: '👨‍👩‍👧' },
    { id: 'nightlife', name: 'Nightlife', icon: '🎉' },
    { id: 'art_culture', name: 'Art & Culture', icon: '🎨' }
  ];

  // Sample AI prompts
  const samplePrompts = [
    'Romantic weekend getaway with good wine and nature',
    'Family day trip with kids near Tel Aviv',
    'Adventure hiking in the desert with stargazing',
    'Religious pilgrimage to Jerusalem holy sites',
    'Beach vacation with water sports in Eilat',
    'Quiet spa retreat at the Dead Sea'
  ];

  // Load destinations
  const loadDestinations = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const params: any = {};
      if (selectedRegion !== 'all') params.region = selectedRegion;
      if (selectedActivity !== 'all') params.activity = selectedActivity;
      if (selectedDuration !== 'all') params.duration = selectedDuration;
      params.budget = selectedBudget;

      const data = await getIsraelDestinations(params);
      setDestinations(data.destinations);
    } catch (error) {
      console.error('Failed to load destinations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion, selectedActivity, selectedDuration, selectedBudget]);

  // Load trails
  const loadTrails = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedRegion !== 'all') params.region = selectedRegion;
      
      const data = await getIsraelTrails(params);
      setTrails(data.trails);
    } catch (error) {
      console.error('Failed to load trails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion]);

  // Load beaches
  const loadBeaches = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedRegion !== 'all') params.region = selectedRegion;
      
      const data = await getIsraelBeaches(params);
      setBeaches(data.beaches);
    } catch (error) {
      console.error('Failed to load beaches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion]);

  // Handle AI search
  const handleAISearch = async () => {
    if (!aiPrompt.trim()) return;
    
    try {
      setIsAiSearching(true);
      setAiSuggestions([]);
      setAiSummary('');
      
      const filters: any = {};
      if (selectedRegion !== 'all') filters.regions = [selectedRegion];
      if (selectedActivity !== 'all') filters.activityTypes = [selectedActivity];
      if (selectedBudget) filters.budget = selectedBudget;
      
      const data = await searchIsraelAI(aiPrompt, filters);
      setAiSuggestions(data.suggestions);
      if (data.aiSummary) setAiSummary(data.aiSummary);
    } catch (error) {
      console.error('AI search failed:', error);
    } finally {
      setIsAiSearching(false);
    }
  };

  // Load initial data based on tab
  useEffect(() => {
    if (activeTab === 'explore') {
      loadDestinations();
    } else if (activeTab === 'trails') {
      loadTrails();
    } else if (activeTab === 'beaches') {
      loadBeaches();
    }
  }, [activeTab, loadDestinations, loadTrails, loadBeaches]);

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'moderate': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'challenging': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'expert': return 'text-red-400 bg-red-500/20 border-red-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  // Get budget color
  const getBudgetColor = (budget: BudgetLevel) => {
    switch (budget) {
      case 'budget': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'luxury': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 via-white/10 to-blue-500/20 rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇮🇱</span>
            <div>
              <h2 className="text-2xl font-bold">Israel Travel</h2>
              <p className="text-sm text-slate-400">Discover domestic destinations, trails, and beaches</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'explore', icon: <Compass className="w-4 h-4" />, label: 'Explore' },
            { id: 'ai', icon: <Sparkles className="w-4 h-4" />, label: 'AI Planner' },
            { id: 'trails', icon: <Mountain className="w-4 h-4" />, label: 'Hiking Trails' },
            { id: 'beaches', icon: <Waves className="w-4 h-4" />, label: 'Beaches' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {activeTab !== 'ai' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Filters:</span>
            </div>

            {/* Region filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as any)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
              ))}
            </select>

            {activeTab === 'explore' && (
              <>
                {/* Activity filter */}
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>

                {/* Duration filter */}
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="all">Any Duration</option>
                  <option value="day_trip">🌅 Day Trip</option>
                  <option value="weekend">🏕️ Weekend</option>
                  <option value="extended">📅 Extended</option>
                </select>

                {/* Budget filter */}
                <select
                  value={selectedBudget}
                  onChange={(e) => setSelectedBudget(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="budget">💚 Budget</option>
                  <option value="moderate">💛 Moderate</option>
                  <option value="luxury">💜 Luxury</option>
                </select>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Planner Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-semibold">AI Travel Planner</span>
            </div>
            
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                placeholder="Describe your ideal trip in Israel..."
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleAISearch}
                disabled={isAiSearching || !aiPrompt.trim()}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {isAiSearching ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isAiSearching ? 'Planning...' : 'Plan'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400">Try:</span>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(prompt)}
                  className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded-full border border-white/10 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-sm text-purple-200">{aiSummary}</p>
            </div>
          )}

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{suggestion.destination.name}</h3>
                      <p className="text-xs text-slate-400">{suggestion.destination.nameHebrew}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-purple-500/20 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 text-purple-400" />
                      <span className="text-xs font-semibold">{suggestion.matchScore}%</span>
                    </div>
                  </div>
                  
                  {suggestion.aiRecommendation && (
                    <p className="text-sm text-slate-300 mb-3">{suggestion.aiRecommendation}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {suggestion.destination.highlights.slice(0, 4).map((h, i) => (
                      <span key={i} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Car className="w-4 h-4" />
                      <span>{suggestion.destination.drivingTime}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getBudgetColor(selectedBudget)}`}>
                      <Wallet className="w-4 h-4" />
                      <span>₪{suggestion.estimatedTotalCost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explore Tab */}
      {activeTab === 'explore' && (
        <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[500px]">
          {/* Destinations List */}
          <div className="w-80 flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-sm">
                {isLoading ? 'Loading...' : `${destinations.length} Destinations`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : destinations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No destinations found</p>
                </div>
              ) : (
                destinations.map(dest => (
                  <button
                    key={dest.id}
                    onClick={() => setSelectedDestination(dest)}
                    className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      selectedDestination?.id === dest.id ? 'bg-blue-500/20 border-l-2 border-l-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{regions.find(r => r.id === dest.region)?.icon}</span>
                      <span className="font-medium truncate">{dest.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{dest.drivingTime} from Tel Aviv</span>
                      <span>•</span>
                      <span className={getBudgetColor(selectedBudget)}>
                        ₪{dest.estimatedCost[selectedBudget]}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Destination Details */}
          {selectedDestination ? (
            <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
              <div className="bg-white/5 px-4 py-4 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedDestination.name}</h3>
                    <p className="text-slate-400">{selectedDestination.nameHebrew}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedDestination.coordinates.latitude},${selectedDestination.coordinates.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Open Map
                  </a>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-slate-200">{selectedDestination.description}</p>

                {/* Quick Info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <Car className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <div className="text-sm font-semibold">{selectedDestination.drivingTime}</div>
                    <div className="text-xs text-slate-500">from Tel Aviv</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <MapPin className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <div className="text-sm font-semibold">{selectedDestination.distanceFromTelAviv} km</div>
                    <div className="text-xs text-slate-500">distance</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <Wallet className={`w-5 h-5 mx-auto mb-1 ${getBudgetColor(selectedBudget)}`} />
                    <div className="text-sm font-semibold">₪{selectedDestination.estimatedCost[selectedBudget]}</div>
                    <div className="text-xs text-slate-500">{selectedBudget} budget</div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Highlights
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDestination.highlights.map((h, i) => (
                      <span key={i} className="text-xs bg-amber-500/20 border border-amber-500/50 px-2 py-1 rounded-full text-amber-300">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Best For */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Best For
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDestination.bestFor.map(activity => {
                      const a = activities.find(act => act.id === activity);
                      return (
                        <span key={activity} className="text-xs bg-pink-500/20 border border-pink-500/50 px-2 py-1 rounded-full text-pink-300">
                          {a?.icon} {a?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Best Seasons */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    Best Seasons
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDestination.bestSeasons.map((s, i) => (
                      <span key={i} className="text-xs bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded-full text-yellow-300 capitalize">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white/5 rounded-xl border border-white/20">
              <div className="text-center text-slate-500">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a destination</p>
                <p className="text-sm">to view details and plan your trip</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trails Tab */}
      {activeTab === 'trails' && (
        <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[500px]">
          {/* Trails List */}
          <div className="w-80 flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-sm">
                {isLoading ? 'Loading...' : `${trails.length} Trails`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {trails.map(trail => (
                <button
                  key={trail.id}
                  onClick={() => setSelectedTrail(trail)}
                  className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedTrail?.id === trail.id ? 'bg-green-500/20 border-l-2 border-l-green-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mountain className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-sm truncate">{trail.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getDifficultyColor(trail.difficulty)}`}>
                      {trail.difficulty}
                    </span>
                    <span className="text-xs text-slate-400">{trail.length} km</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">{trail.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trail Details */}
          {selectedTrail ? (
            <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-y-auto p-4">
              <h3 className="text-2xl font-bold mb-1">{selectedTrail.name}</h3>
              <p className="text-slate-400 mb-4">{selectedTrail.nameHebrew}</p>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className={`text-sm font-semibold ${getDifficultyColor(selectedTrail.difficulty).split(' ')[0]}`}>
                    {selectedTrail.difficulty}
                  </span>
                  <div className="text-xs text-slate-500">difficulty</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className="text-sm font-semibold">{selectedTrail.length} km</span>
                  <div className="text-xs text-slate-500">length</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className="text-sm font-semibold">{selectedTrail.duration}</span>
                  <div className="text-xs text-slate-500">duration</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className="text-sm font-semibold">+{selectedTrail.elevation.gain}m</span>
                  <div className="text-xs text-slate-500">elevation</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Highlights</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrail.highlights.map((h, i) => (
                      <span key={i} className="text-xs bg-green-500/20 px-2 py-1 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Tips</h4>
                  <ul className="space-y-1">
                    {selectedTrail.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2 text-amber-300">Required Gear</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrail.requiredGear.map((gear, i) => (
                      <span key={i} className="text-xs bg-amber-500/20 border border-amber-500/50 px-2 py-1 rounded-full text-amber-200">
                        {gear}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white/5 rounded-xl border border-white/20">
              <div className="text-center text-slate-500">
                <Mountain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a trail</p>
                <p className="text-sm">to view details and plan your hike</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Beaches Tab */}
      {activeTab === 'beaches' && (
        <div className="flex gap-4 h-[calc(100vh-400px)] min-h-[500px]">
          {/* Beaches List */}
          <div className="w-80 flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-sm">
                {isLoading ? 'Loading...' : `${beaches.length} Beaches`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {beaches.map(beach => (
                <button
                  key={beach.id}
                  onClick={() => setSelectedBeach(beach)}
                  className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedBeach?.id === beach.id ? 'bg-cyan-500/20 border-l-2 border-l-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-sm truncate">{beach.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{beach.city}</span>
                    <span>•</span>
                    <span className={beach.freeEntry ? 'text-green-400' : 'text-amber-400'}>
                      {beach.freeEntry ? 'Free' : `₪${beach.entryFee}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Beach Details */}
          {selectedBeach ? (
            <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-y-auto p-4">
              <h3 className="text-2xl font-bold mb-1">{selectedBeach.name}</h3>
              <p className="text-slate-400 mb-4">{selectedBeach.nameHebrew} • {selectedBeach.city}</p>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className="text-cyan-400 capitalize">{selectedBeach.type.replace('_', ' ')}</span>
                  <div className="text-xs text-slate-500">type</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className={selectedBeach.freeEntry ? 'text-green-400' : 'text-amber-400'}>
                    {selectedBeach.freeEntry ? 'Free' : `₪${selectedBeach.entryFee}`}
                  </span>
                  <div className="text-xs text-slate-500">entry</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className={selectedBeach.lifeguard ? 'text-green-400' : 'text-red-400'}>
                    {selectedBeach.lifeguard ? 'Yes' : 'No'}
                  </span>
                  <div className="text-xs text-slate-500">lifeguard</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <span className={selectedBeach.familyFriendly ? 'text-green-400' : 'text-slate-400'}>
                    {selectedBeach.familyFriendly ? 'Yes' : 'No'}
                  </span>
                  <div className="text-xs text-slate-500">family</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Facilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBeach.facilities.map((f, i) => (
                      <span key={i} className="text-xs bg-cyan-500/20 px-2 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>

                {selectedBeach.waterSports.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2">Water Sports</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBeach.waterSports.map((s, i) => (
                        <span key={i} className="text-xs bg-blue-500/20 px-2 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBeach.parking && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2">Parking</h4>
                    <p className="text-sm text-slate-300">
                      {selectedBeach.parkingFee ? `₪${selectedBeach.parkingFee} per day` : 'Free parking available'}
                    </p>
                  </div>
                )}

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedBeach.coordinates.latitude},${selectedBeach.coordinates.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                  Navigate to Beach
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white/5 rounded-xl border border-white/20">
              <div className="text-center text-slate-500">
                <Waves className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a beach</p>
                <p className="text-sm">to view details and facilities</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IsraelTravelPanel;



