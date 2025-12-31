import React from 'react';
import { Hotel, Star, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import type { HotelResult } from '../types/travel';

interface HotelResultsProps {
  hotels: HotelResult[];
}

const HotelResults: React.FC<HotelResultsProps> = ({ hotels }) => {
  if (hotels.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
        <Hotel className="w-16 h-16 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400">No hotels found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  const getDealBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 90) return { text: 'Excellent Deal', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    if (score >= 75) return { text: 'Good Deal', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (score >= 60) return { text: 'Fair Price', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    return { text: 'Higher Price', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Hotel className="w-5 h-5" />
          Hotels ({hotels.length})
        </h3>
        <p className="text-sm text-slate-400">Sorted by best deals</p>
      </div>

      {hotels.map((hotel) => {
        const dealBadge = getDealBadge(hotel.dealScore);
        const nights = hotel.checkIn && hotel.checkOut 
          ? Math.ceil((new Date(hotel.checkOut).getTime() - new Date(hotel.checkIn).getTime()) / (1000 * 60 * 60 * 24))
          : 1;

        return (
          <div
            key={hotel.id}
            className={`bg-white/10 backdrop-blur-lg rounded-xl border transition-all hover:scale-[1.01] overflow-hidden ${
              hotel.dealScore && hotel.dealScore >= 85
                ? 'border-green-500/30'
                : 'border-white/20'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* Hotel Image */}
              <div className="relative h-48 md:h-auto bg-slate-800">
                {hotel.images && hotel.images.length > 0 ? (
                  <img
                    src={hotel.images[0]}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://via.placeholder.com/400x300/1e293b/64748b?text=${encodeURIComponent(hotel.name)}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Hotel className="w-16 h-16 text-slate-600" />
                  </div>
                )}
                
                {/* Rating Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                  {renderStars(hotel.rating)}
                </div>

                {/* Deal Badge */}
                {dealBadge && (
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${dealBadge.color}`}>
                    {hotel.dealScore}%
                  </div>
                )}
              </div>

              {/* Hotel Info */}
              <div className="md:col-span-2 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold mb-2">{hotel.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{hotel.location.city}, {hotel.location.country}</span>
                    </div>
                    {hotel.location.address && (
                      <p className="text-xs text-slate-500">{hotel.location.address}</p>
                    )}
                  </div>
                </div>

                {/* Reviews */}
                {hotel.reviewScore && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-500 px-2 py-1 rounded font-bold text-sm">
                      {hotel.reviewScore.toFixed(1)}
                    </div>
                    <span className="text-sm text-slate-400">
                      {hotel.reviewCount ? `${hotel.reviewCount} reviews` : 'Rated'}
                    </span>
                  </div>
                )}

                {/* Amenities */}
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.slice(0, 6).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="bg-white/5 px-2 py-1 rounded text-xs text-slate-400"
                        >
                          {amenity}
                        </span>
                      ))}
                      {hotel.amenities.length > 6 && (
                        <span className="bg-white/5 px-2 py-1 rounded text-xs text-slate-400">
                          +{hotel.amenities.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Price & Actions */}
                <div className="flex items-end justify-between border-t border-white/10 pt-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">
                      {nights} night{nights > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-blue-400">
                        ${hotel.price.total.toFixed(0)}
                      </span>
                      <span className="text-sm text-slate-400">
                        (${hotel.price.perNight.toFixed(0)}/night)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {hotel.price.taxesIncluded ? 'Taxes included' : 'Taxes not included'}
                    </div>
                  </div>

                  <button
                    onClick={() => window.open(hotel.bookingLink || `https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name)}`, '_blank')}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Hotel
                  </button>
                </div>

                {/* Cancellation Policy */}
                {hotel.cancellationPolicy && (
                  <div className="mt-3 text-xs text-slate-500 bg-white/5 p-2 rounded">
                    📋 {hotel.cancellationPolicy}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HotelResults;
