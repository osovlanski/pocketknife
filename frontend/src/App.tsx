import React, { useState, useEffect } from 'react';
import { Mail, Briefcase, Plane, BookOpen, Wrench } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import GmailAgent from './components/GmailAgent';
import JobSearchPanel from './components/JobSearchPanel';
import JobListings from './components/JobListings';
import TravelSearchPanel from './components/TravelSearchPanel';
import FlightResults from './components/FlightResults';
import HotelResults from './components/HotelResults';
import TripPlanner from './components/TripPlanner';
import LearningAgent from './components/LearningAgent';
import { searchTravel, type TravelSearchResponse } from './services/travelApi';
import type { TravelSearchQuery } from './types/travel';

const App = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'jobs' | 'travel' | 'learning'>('email');
  const [jobs, setJobs] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [liveMatches, setLiveMatches] = useState<number>(0);
  
  // Travel state
  const [travelResults, setTravelResults] = useState<TravelSearchResponse | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Listen for real-time job matches
    newSocket.on('job-match', (data: any) => {
      console.log('🎯 Real-time job match:', data.job);
      
      // Add job to the list immediately
      setJobs(prevJobs => {
        // Check if job already exists
        const exists = prevJobs.some(j => j.id === data.job.id);
        if (exists) return prevJobs;
        
        // Add new job and sort by match score
        const updatedJobs = [...prevJobs, data.job];
        return updatedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      });
      
      setLiveMatches(prev => prev + 1);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleCVUploaded = (data: any) => {
    console.log('CV uploaded:', data);
  };

  const handleJobSearch = async (location?: string, remoteOnly?: boolean, filters?: any) => {
    try {
      // Clear previous jobs and reset live matches counter
      setJobs([]);
      setLiveMatches(0);
      
      const response = await fetch('http://localhost:5000/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, remoteOnly, ...filters })
      });
      const data = await response.json();
      
      // Set all jobs at the end (this will include jobs below 75% threshold)
      // Jobs above 75% were already added via socket
      setJobs(data.jobs || []);
      
      // Show summary if available
      if (data.summary) {
        console.log('Job Search Summary:\n', data.summary);
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      alert('Error searching for jobs');
    }
  };

  const handleTravelSearch = async (query: TravelSearchQuery) => {
    try {
      setTravelLoading(true);
      setTravelError(null);
      setTravelResults(null);
      
      console.log('🔍 Searching travel options...', query);
      const results = await searchTravel(query);
      
      console.log('✅ Travel results:', results);
      setTravelResults(results);
      
      // Show notification
      if (socket) {
        socket.emit('log', {
          type: 'info',
          message: `Found ${results.flights.length} flights and ${results.hotels.length} hotels`
        });
      }
    } catch (error: any) {
      console.error('❌ Travel search error:', error);
      setTravelError(error.message || 'Failed to search travel options');
      alert('Error searching travel: ' + (error.message || 'Unknown error'));
    } finally {
      setTravelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/50 border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Pocketknife
            </h1>
            <span className="text-slate-400 text-sm ml-2">Multi-Agent AI Platform</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                activeTab === 'email'
                  ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-b-2 border-blue-400 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-5 h-5" />
              Email Agent
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                activeTab === 'jobs'
                  ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-b-2 border-purple-400 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              Job Search
              {jobs.length > 0 && (
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {jobs.length}
                </span>
              )}
              {liveMatches > 0 && activeTab !== 'jobs' && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                  +{liveMatches}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('travel')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                activeTab === 'travel'
                  ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-b-2 border-green-400 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plane className="w-5 h-5" />
              Travel Deals
              {travelResults && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {travelResults.flights.length + travelResults.hotels.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                activeTab === 'learning'
                  ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-b-2 border-amber-400 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Learning
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'email' && <GmailAgent />}
        
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🤖 AI Job Search Agent
              </h1>
              <p className="text-slate-300">Upload your CV and let AI find the perfect job matches</p>
            </div>

            <JobSearchPanel
              onCVUploaded={handleCVUploaded}
              onSearch={handleJobSearch}
            />

            {jobs.length > 0 && (
              <JobListings jobs={jobs} />
            )}
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                ✈️ AI Travel Deals Agent
              </h1>
              <p className="text-slate-300">Find the best flight and hotel deals with AI-powered trip planning</p>
            </div>

            <TravelSearchPanel 
              onSearch={handleTravelSearch} 
              loading={travelLoading} 
            />

            {travelError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400">❌ {travelError}</p>
              </div>
            )}

            {travelResults && (
              <>
                {travelResults.flights.length > 0 && (
                  <FlightResults flights={travelResults.flights} />
                )}

                {travelResults.hotels.length > 0 && (
                  <HotelResults hotels={travelResults.hotels} />
                )}

                {travelResults.tripPlan && (
                  <TripPlanner plan={travelResults.tripPlan} />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'learning' && <LearningAgent />}
      </div>
    </div>
  );
};

export default App;
