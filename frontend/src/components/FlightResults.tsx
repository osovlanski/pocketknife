import React from 'react';
import { Plane, Clock, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import type { FlightResult } from '../types/travel';

interface FlightResultsProps {
  flights: FlightResult[];
}

const FlightResults: React.FC<FlightResultsProps> = ({ flights }) => {
  if (flights.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
        <Plane className="w-16 h-16 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400">No flights found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    const hours = match[1] || '0';
    const minutes = match[2] || '0';
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDealBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 90) return { text: 'Excellent Deal', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    if (score >= 75) return { text: 'Good Deal', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (score >= 60) return { text: 'Fair Price', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    return { text: 'Higher Price', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Plane className="w-5 h-5" />
          Flights ({flights.length})
        </h3>
        <p className="text-sm text-slate-400">Sorted by best deals</p>
      </div>

      {flights.map((flight, index) => {
        const dealBadge = getDealBadge(flight.dealScore);
        const outbound = flight.outbound;
        const inbound = flight.inbound;
        
        // Get first and last segments for departure/arrival times
        const outboundDeparture = outbound.segments[0].departure;
        const outboundArrival = outbound.segments[outbound.segments.length - 1].arrival;
        const outboundAirline = outbound.segments[0].airline;

        return (
          <div
            key={flight.id}
            className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all hover:scale-[1.01] ${
              flight.dealScore && flight.dealScore >= 85
                ? 'border-green-500/30'
                : 'border-white/20'
            }`}
          >
            {/* Price & Deal Score */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-blue-400">
                  ${flight.price.total.toFixed(0)}
                </div>
                <div className="text-sm text-slate-400">
                  <div>${flight.price.perPerson.toFixed(0)}/person</div>
                  <div className="text-xs">{flight.price.currency}</div>
                </div>
              </div>
              
              {dealBadge && (
                <div className={`px-3 py-1 rounded-full text-sm font-bold border ${dealBadge.color}`}>
                  {flight.dealScore}% - {dealBadge.text}
                </div>
              )}
            </div>

            {/* Outbound Flight */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Plane className="w-4 h-4" />
                <span>Outbound • {formatDate(outboundDeparture.time)}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Departure */}
                <div>
                  <div className="text-2xl font-bold">{formatTime(outboundDeparture.time)}</div>
                  <div className="text-slate-400">{outboundDeparture.airport}</div>
                </div>

                {/* Duration & Stops */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="h-px bg-white/30 flex-1"></div>
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div className="h-px bg-white/30 flex-1"></div>
                  </div>
                  <div className="text-sm text-slate-400">{formatDuration(outbound.duration)}</div>
                  <div className="text-xs text-slate-500">
                    {outbound.stops === 0 ? 'Direct' : `${outbound.stops} stop${outbound.stops > 1 ? 's' : ''}`}
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-right md:text-left">
                  <div className="text-2xl font-bold">{formatTime(outboundArrival.time)}</div>
                  <div className="text-slate-400">{outboundArrival.airport}</div>
                </div>
              </div>

              {/* Return Flight */}
              {inbound && (
                <>
                  <div className="border-t border-white/10 my-4"></div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <Plane className="w-4 h-4 rotate-180" />
                    <span>Return • {formatDate(inbound.segments[0].departure.time)}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <div className="text-2xl font-bold">{formatTime(inbound.segments[0].departure.time)}</div>
                      <div className="text-slate-400">{inbound.segments[0].departure.airport}</div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="h-px bg-white/30 flex-1"></div>
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div className="h-px bg-white/30 flex-1"></div>
                      </div>
                      <div className="text-sm text-slate-400">{formatDuration(inbound.duration)}</div>
                      <div className="text-xs text-slate-500">
                        {inbound.stops === 0 ? 'Direct' : `${inbound.stops} stop${inbound.stops > 1 ? 's' : ''}`}
                      </div>
                    </div>

                    <div className="text-right md:text-left">
                      <div className="text-2xl font-bold">{formatTime(inbound.segments[inbound.segments.length - 1].arrival.time)}</div>
                      <div className="text-slate-400">{inbound.segments[inbound.segments.length - 1].arrival.airport}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>✈️ {flight.validatingAirline}</span>
                {outboundAirline && <span>Operated by {outboundAirline}</span>}
              </div>
              
              <button
                onClick={() => window.open(`https://www.google.com/flights?q=${outboundDeparture.airport}+to+${outboundArrival.airport}`, '_blank')}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FlightResults;
