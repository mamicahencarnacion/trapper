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

export interface CountryTrack {
  id: string; // ISO numeric or A3 country code
  countryCode: string; // ISO A3 country code
  countryName: string;
  category: CountryCategory;
  
  // Visited / Lived details
  startDate?: string; // Stay start date
  endDate?: string; // Stay end date
  cities?: string[]; // Optional list of cities visited
  
  // Planned details
  plannedStartDate?: string;
  plannedEndDate?: string;
  itinerary?: DayItinerary[]; // Day-by-day itinerary
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
