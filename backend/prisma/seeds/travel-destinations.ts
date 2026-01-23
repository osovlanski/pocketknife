/**
 * Seed script for TravelDestination table
 * Migrates hardcoded Israel destinations, trails, and beaches from israelTravelService.ts
 */

import { PrismaClient } from '@prisma/client';

interface DestinationData {
  slug: string;
  name: string;
  nameHe?: string;
  type: string;
  subType?: string;
  region: string;
  description: string;
  activities: string[];
  amenities: string[];
  bestSeason?: string;
  bestMonths?: number[];
  difficulty?: string;
  distance?: number;
  duration?: number;
  rating?: number;
  isFeatured: boolean;
  priority: number;
  coordinates?: { lat: number; lng: number };
}

const ISRAEL_DESTINATIONS: DestinationData[] = [
  // NORTH
  {
    slug: 'tzfat',
    name: 'Tzfat (Safed)',
    nameHe: 'צפת',
    type: 'destination',
    region: 'north',
    description: 'Mystical city in the Galilee mountains, known for Kabbalah, art galleries, and ancient synagogues.',
    activities: ['religious', 'art_culture', 'historical'],
    amenities: ['restaurants', 'hotels', 'parking'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 9, 10, 11],
    rating: 4.5,
    isFeatured: true,
    priority: 10,
    coordinates: { lat: 32.9646, lng: 35.4960 }
  },
  {
    slug: 'rosh-hanikra',
    name: 'Rosh HaNikra',
    nameHe: 'ראש הנקרה',
    type: 'destination',
    region: 'north',
    description: 'Stunning white chalk cliffs and sea grottoes at the Lebanese border.',
    activities: ['nature', 'family', 'hiking'],
    amenities: ['cable_car', 'restaurant', 'parking'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    rating: 4.7,
    isFeatured: true,
    priority: 15,
    coordinates: { lat: 33.0858, lng: 35.1039 }
  },
  {
    slug: 'acre',
    name: 'Acre (Akko)',
    nameHe: 'עכו',
    type: 'destination',
    region: 'north',
    description: 'UNESCO World Heritage old city with Crusader fortress, Ottoman architecture, and famous hummus.',
    activities: ['historical', 'food_wine', 'art_culture'],
    amenities: ['restaurants', 'hotels', 'parking', 'beach'],
    bestSeason: 'fall',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.6,
    isFeatured: true,
    priority: 12,
    coordinates: { lat: 32.9269, lng: 35.0676 }
  },
  {
    slug: 'golan-heights',
    name: 'Golan Heights',
    nameHe: 'רמת הגולן',
    type: 'destination',
    region: 'north',
    description: 'Volcanic plateau with nature reserves, wineries, and historical sites.',
    activities: ['nature', 'hiking', 'food_wine', 'adventure'],
    amenities: ['wineries', 'restaurants', 'cabins', 'parking'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 9, 10, 11, 12],
    rating: 4.8,
    isFeatured: true,
    priority: 8,
    coordinates: { lat: 33.0025, lng: 35.7500 }
  },
  {
    slug: 'tiberias',
    name: 'Tiberias',
    nameHe: 'טבריה',
    type: 'destination',
    region: 'north',
    description: 'Ancient city on the Sea of Galilee with hot springs and religious significance.',
    activities: ['wellness', 'religious', 'beaches', 'family'],
    amenities: ['hot_springs', 'hotels', 'restaurants', 'beach'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 9, 10, 11],
    rating: 4.3,
    isFeatured: false,
    priority: 20,
    coordinates: { lat: 32.7959, lng: 35.5300 }
  },
  {
    slug: 'haifa',
    name: 'Haifa',
    nameHe: 'חיפה',
    type: 'destination',
    region: 'north',
    description: 'Port city with the stunning Bahai Gardens, coexistence, and mountain-sea views.',
    activities: ['art_culture', 'food_wine', 'historical', 'nature'],
    amenities: ['hotels', 'restaurants', 'museums', 'beach', 'parking'],
    bestSeason: 'fall',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.5,
    isFeatured: true,
    priority: 10,
    coordinates: { lat: 32.7940, lng: 34.9896 }
  },

  // CENTER
  {
    slug: 'tel-aviv',
    name: 'Tel Aviv',
    nameHe: 'תל אביב',
    type: 'destination',
    region: 'center',
    description: 'The vibrant, non-stop city with beaches, nightlife, food scene, and Bauhaus architecture.',
    activities: ['beaches', 'nightlife', 'food_wine', 'art_culture'],
    amenities: ['hotels', 'restaurants', 'nightclubs', 'beach', 'museums'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 6, 9, 10, 11],
    rating: 4.7,
    isFeatured: true,
    priority: 1,
    coordinates: { lat: 32.0853, lng: 34.7818 }
  },
  {
    slug: 'jaffa',
    name: 'Jaffa',
    nameHe: 'יפו',
    type: 'destination',
    region: 'center',
    description: 'Ancient port city with flea market, galleries, and incredible seafood.',
    activities: ['historical', 'food_wine', 'art_culture', 'nightlife'],
    amenities: ['restaurants', 'galleries', 'market', 'beach'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 6, 9, 10, 11],
    rating: 4.6,
    isFeatured: true,
    priority: 5,
    coordinates: { lat: 32.0515, lng: 34.7510 }
  },
  {
    slug: 'caesarea',
    name: 'Caesarea',
    nameHe: 'קיסריה',
    type: 'destination',
    region: 'center',
    description: 'Roman ruins by the sea with an ancient amphitheater and aqueduct.',
    activities: ['historical', 'beaches', 'family'],
    amenities: ['museum', 'restaurant', 'beach', 'parking'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 6, 9, 10],
    rating: 4.5,
    isFeatured: false,
    priority: 18,
    coordinates: { lat: 32.5000, lng: 34.8917 }
  },

  // JERUSALEM
  {
    slug: 'jerusalem',
    name: 'Jerusalem',
    nameHe: 'ירושלים',
    type: 'destination',
    region: 'jerusalem',
    description: 'The holy city with the Western Wall, Old City, and thousands of years of history.',
    activities: ['religious', 'historical', 'food_wine', 'art_culture'],
    amenities: ['hotels', 'restaurants', 'museums', 'markets'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.9,
    isFeatured: true,
    priority: 2,
    coordinates: { lat: 31.7683, lng: 35.2137 }
  },
  {
    slug: 'ein-karem',
    name: 'Ein Karem',
    nameHe: 'עין כרם',
    type: 'destination',
    region: 'jerusalem',
    description: 'Picturesque village in Jerusalem with churches, artists, and charming cafes.',
    activities: ['art_culture', 'religious', 'food_wine'],
    amenities: ['cafes', 'galleries', 'churches'],
    bestSeason: 'spring',
    bestMonths: [3, 4, 5, 9, 10, 11],
    rating: 4.4,
    isFeatured: false,
    priority: 25,
    coordinates: { lat: 31.7658, lng: 35.1617 }
  },

  // DEAD SEA
  {
    slug: 'dead-sea',
    name: 'Dead Sea',
    nameHe: 'ים המלח',
    type: 'destination',
    region: 'dead_sea',
    description: 'The lowest place on Earth with mineral-rich waters and mud treatments.',
    activities: ['wellness', 'nature', 'beaches', 'family'],
    amenities: ['spa', 'hotels', 'beach', 'mud_station'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.7,
    isFeatured: true,
    priority: 3,
    coordinates: { lat: 31.5000, lng: 35.4167 }
  },
  {
    slug: 'masada',
    name: 'Masada',
    nameHe: 'מצדה',
    type: 'destination',
    region: 'dead_sea',
    description: 'UNESCO World Heritage fortress with dramatic sunrise views and ancient history.',
    activities: ['historical', 'hiking', 'adventure'],
    amenities: ['cable_car', 'museum', 'restaurant', 'parking'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.8,
    isFeatured: true,
    priority: 4,
    coordinates: { lat: 31.3156, lng: 35.3539 }
  },
  {
    slug: 'ein-gedi',
    name: 'Ein Gedi',
    nameHe: 'עין גדי',
    type: 'destination',
    region: 'dead_sea',
    description: 'Desert oasis with waterfalls, ibex, and lush vegetation by the Dead Sea.',
    activities: ['hiking', 'nature', 'family'],
    amenities: ['nature_reserve', 'botanical_garden', 'spa', 'parking'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.6,
    isFeatured: true,
    priority: 7,
    coordinates: { lat: 31.4667, lng: 35.3833 }
  },

  // NEGEV
  {
    slug: 'mitzpe-ramon',
    name: 'Mitzpe Ramon',
    nameHe: 'מצפה רמון',
    type: 'destination',
    region: 'negev',
    description: 'Desert town on the edge of the Ramon Crater with stargazing and adventure.',
    activities: ['nature', 'hiking', 'adventure', 'wellness'],
    amenities: ['hotels', 'restaurants', 'visitor_center', 'stargazing'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 9, 10, 11, 12, 1, 2],
    rating: 4.7,
    isFeatured: true,
    priority: 6,
    coordinates: { lat: 30.6100, lng: 34.8017 }
  },

  // EILAT
  {
    slug: 'eilat',
    name: 'Eilat',
    nameHe: 'אילת',
    type: 'destination',
    region: 'eilat',
    description: 'Red Sea resort city with coral reefs, diving, and year-round sunshine.',
    activities: ['beaches', 'adventure', 'family', 'wellness'],
    amenities: ['hotels', 'restaurants', 'diving', 'beach', 'aquarium'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 10, 11, 12, 1, 2],
    rating: 4.5,
    isFeatured: true,
    priority: 9,
    coordinates: { lat: 29.5581, lng: 34.9482 }
  },
  {
    slug: 'timna-park',
    name: 'Timna Park',
    nameHe: 'פארק תמנע',
    type: 'destination',
    region: 'eilat',
    description: 'Ancient copper mines with stunning rock formations and desert activities.',
    activities: ['nature', 'hiking', 'family', 'historical'],
    amenities: ['visitor_center', 'camping', 'restaurant', 'parking'],
    bestSeason: 'winter',
    bestMonths: [3, 4, 5, 10, 11, 12, 1, 2],
    rating: 4.6,
    isFeatured: false,
    priority: 16,
    coordinates: { lat: 29.7833, lng: 34.9667 }
  }
];

const HIKING_TRAILS: DestinationData[] = [
  {
    slug: 'nahal-david-trail',
    name: 'Nahal David Trail',
    nameHe: 'נחל דוד',
    type: 'hiking_trail',
    region: 'dead_sea',
    description: 'Easy trail to David Waterfall with natural pools and ibex sightings.',
    activities: ['hiking', 'nature', 'family'],
    amenities: ['restrooms', 'parking'],
    difficulty: 'easy',
    distance: 2.5,
    duration: 90,
    rating: 4.5,
    isFeatured: true,
    priority: 10,
    coordinates: { lat: 31.4667, lng: 35.3833 }
  },
  {
    slug: 'masada-snake-path',
    name: 'Masada Snake Path',
    nameHe: 'שביל הנחש מצדה',
    type: 'hiking_trail',
    region: 'dead_sea',
    description: 'Challenging sunrise hike to ancient fortress with Dead Sea panorama.',
    activities: ['hiking', 'historical', 'adventure'],
    amenities: ['cable_car', 'parking'],
    difficulty: 'challenging',
    distance: 3.5,
    duration: 90,
    rating: 4.8,
    isFeatured: true,
    priority: 5,
    coordinates: { lat: 31.3156, lng: 35.3539 }
  },
  {
    slug: 'carpentry-trail',
    name: 'The Carpentry Trail',
    nameHe: 'שביל הנגרייה',
    type: 'hiking_trail',
    region: 'negev',
    description: 'Easy trail with unique prismatic rock formations in the Ramon Crater.',
    activities: ['hiking', 'nature'],
    amenities: ['parking'],
    difficulty: 'easy',
    distance: 1.5,
    duration: 60,
    rating: 4.6,
    isFeatured: false,
    priority: 20,
    coordinates: { lat: 30.5800, lng: 34.8200 }
  },
  {
    slug: 'gamla-waterfall-trail',
    name: 'Gamla Waterfall Trail',
    nameHe: 'מפל גמלא',
    type: 'hiking_trail',
    region: 'north',
    description: 'Moderate trail to the highest waterfall in Israel with vulture sightings.',
    activities: ['hiking', 'nature', 'birdwatching'],
    amenities: ['visitor_center', 'parking'],
    difficulty: 'moderate',
    distance: 4,
    duration: 150,
    rating: 4.7,
    isFeatured: true,
    priority: 12,
    coordinates: { lat: 32.9000, lng: 35.7500 }
  }
];

const BEACHES: DestinationData[] = [
  {
    slug: 'gordon-beach',
    name: 'Gordon Beach',
    nameHe: 'חוף גורדון',
    type: 'beach',
    subType: 'mediterranean',
    region: 'center',
    description: 'Popular Tel Aviv beach with full facilities and beach bars.',
    activities: ['swimming', 'volleyball', 'relaxation'],
    amenities: ['showers', 'restrooms', 'beach_bar', 'chairs', 'umbrellas'],
    rating: 4.4,
    isFeatured: true,
    priority: 10,
    coordinates: { lat: 32.0825, lng: 34.7680 }
  },
  {
    slug: 'coral-beach-eilat',
    name: 'Coral Beach Nature Reserve',
    nameHe: 'שמורת חוף האלמוגים',
    type: 'beach',
    subType: 'red_sea',
    region: 'eilat',
    description: 'Protected coral reef beach with amazing snorkeling.',
    activities: ['snorkeling', 'diving', 'nature'],
    amenities: ['snorkel_rental', 'showers', 'restaurant'],
    rating: 4.8,
    isFeatured: true,
    priority: 5,
    coordinates: { lat: 29.5050, lng: 34.9170 }
  },
  {
    slug: 'ein-bokek-beach',
    name: 'Ein Bokek Beach',
    nameHe: 'חוף עין בוקק',
    type: 'beach',
    subType: 'dead_sea',
    region: 'dead_sea',
    description: 'Free public beach at the Dead Sea with mud station.',
    activities: ['floating', 'mud_treatment', 'relaxation'],
    amenities: ['showers', 'mud_station', 'sun_beds'],
    rating: 4.5,
    isFeatured: true,
    priority: 8,
    coordinates: { lat: 31.2000, lng: 35.3600 }
  }
];

export async function seedTravelDestinations(prisma: PrismaClient): Promise<number> {
  let count = 0;
  const allDestinations = [...ISRAEL_DESTINATIONS, ...HIKING_TRAILS, ...BEACHES];

  for (const dest of allDestinations) {
    try {
      await (prisma as any).travelDestination.upsert({
        where: { slug: dest.slug },
        update: {
          name: dest.name,
          nameHe: dest.nameHe,
          type: dest.type,
          subType: dest.subType,
          region: dest.region,
          description: dest.description,
          activities: dest.activities,
          amenities: dest.amenities,
          bestSeason: dest.bestSeason,
          bestMonths: dest.bestMonths,
          difficulty: dest.difficulty,
          distance: dest.distance,
          duration: dest.duration,
          rating: dest.rating,
          isFeatured: dest.isFeatured,
          priority: dest.priority,
          coordinates: dest.coordinates,
          isActive: true
        },
        create: {
          slug: dest.slug,
          name: dest.name,
          nameHe: dest.nameHe,
          type: dest.type,
          subType: dest.subType,
          region: dest.region,
          description: dest.description,
          activities: dest.activities,
          amenities: dest.amenities,
          bestSeason: dest.bestSeason,
          bestMonths: dest.bestMonths,
          difficulty: dest.difficulty,
          distance: dest.distance,
          duration: dest.duration,
          rating: dest.rating,
          isFeatured: dest.isFeatured,
          priority: dest.priority,
          coordinates: dest.coordinates,
          isActive: true
        }
      });
      count++;
    } catch (error) {
      console.warn(`Failed to seed travel destination ${dest.name}:`, error);
    }
  }

  return count;
}
