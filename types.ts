export type CountryCategory = 'visited' | 'lived' | 'want to visit' | 'planned' | 'favorite';

export interface ItineraryEntry {
  id: string;
  category: 'food' | 'attraction' | 'tour' | 'activity' | 'flight' | 'accommodation';
  title: string;
  time?: string;
  notes?: string;
  price?: number; // Optional price for tracking total budget
  links?: string[]; // Optional links as attachments
  photos?: string[]; // Optional photos as base64 URLs or links
}

export interface DayItinerary {
  dayNumber: number; // Day 1, Day 2, etc.
  date?: string; // Optional calendar date for this day
  entries: ItineraryEntry[];
}

export interface TravelLog {
  id: string; // Unique ID for this log entry
  category: CountryCategory;
  startDate?: string;
  endDate?: string;
  cities?: string[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  itinerary?: DayItinerary[];
  notes?: string; // Specific notes or wishlist text for this log
}

export interface CountryTrack {
  id: string; // ISO numeric or A3 country code
  countryCode: string;
  countryName: string;
  category: CountryCategory; // Primary category representing the highest-state milestone
  logs?: TravelLog[]; // Support for multiple journeys/logs
  isLoved?: boolean; // heart toggle
  wantToVisit?: boolean; // want to visit toggle
  
  // Legacy support fallback properties
  startDate?: string;
  endDate?: string;
  cities?: string[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  itinerary?: DayItinerary[];
}

// Stats interface for dashboard summary
export interface TravelStats {
  visitedCount: number;
  livedCount: number;
  wantToVisitCount: number;
  plannedCount: number;
  favoriteCount: number;
  totalUniqueCountries: number;
  citiesTracked: number;
  totalPlannedBudget: number;
}

// ==========================================
// Trip Planner & Custom PWA Travel Modules
// ==========================================

export interface TripActivity {
  id: string;
  type: 'place' | 'flight' | 'train' | 'other';
  title: string;
  notes?: string;
  block: 'morning' | 'afternoon' | 'evening';
  time?: string; // e.g., "09:30" or empty
  origin?: string; // For flights/trains
  destination?: string; // For flights/trains
  travelTimeStart?: string; // For flights/trains, e.g., "11:00 AM" or date-time
  travelTimeEnd?: string; // For flights/trains, e.g., "02:15 PM" or date-time
}

export interface TripDay {
  dayNumber: number;
  date?: string; // e.g. "2026-08-01"
  activities: TripActivity[];
}

export interface VisaRequirement {
  id: string;
  countryCode: string; // ISO 3166-1 alpha-3 or custom
  countryName: string;
  requirement: string;
  completed: boolean;
  notes?: string;
}

export interface PackingItem {
  id: string;
  item: string;
  category?: string; // Clothing, Toiletries, Tech, Documents, etc.
  completed: boolean;
  quantity?: number;
}

export interface SouvenirItem {
  id: string;
  recipient: string; // "for who"
  souvenir: string; // "what souvenir"
  whereToBuy?: string; // "where to buy"
  price?: number; // Optional price (numerical)
  completed: boolean;
}

export interface BucketListItem {
  id: string;
  activity: string;
  place?: string; // place where to do the bucket list activity
  completed: boolean;
  notes?: string;
}

export interface Trip {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  countries: string[]; // List of country alpha3 or names
  itinerary: TripDay[];
  visas: VisaRequirement[];
  packingList: PackingItem[];
  souvenirs: SouvenirItem[];
  bucketList: BucketListItem[];
}

