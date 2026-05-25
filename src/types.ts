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
