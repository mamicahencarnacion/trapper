import React, { useState, useEffect } from 'react';
import { Compass, Palmtree, MapPin, Share2, Sparkles, Filter, ChevronRight, HelpCircle, AlertTriangle } from 'lucide-react';
import WorldMap from './components/WorldMap';
import StatsSection from './components/StatsSection';
import Dashboard from './components/Dashboard';
import CountryModal from './components/CountryModal';
import { CountryTrack, CountryCategory } from './types';

// Preloaded mock data on first load to showcase the PWA's rich layouts
const DEFAULT_PRESETS: CountryTrack[] = [
  {
    id: 'FRA',
    countryCode: 'FRA',
    countryName: 'France',
    category: 'planned',
    plannedStartDate: '2026-08-10',
    plannedEndDate: '2026-08-12',
    cities: ['Paris', 'Nice'],
    itinerary: [
      {
        dayNumber: 1,
        date: '2026-08-10',
        entries: [
          {
            id: 'fr-p-1',
            category: 'flight',
            title: 'Fly into Charles de Gaulle Airport',
            time: '08:45',
            notes: 'Terminal 2E, check luggage tags.',
            price: 680,
            links: ['https://www.parisaeroport.fr']
          },
          {
            id: 'fr-p-2',
            category: 'accommodation',
            title: 'Check-in at Hotel Lutetia',
            time: '14:00',
            notes: 'Beautiful classic hotel in Saint-Germain-des-Prés.',
            price: 320,
            links: ['https://www.hotellutetia.com']
          },
          {
            id: 'fr-p-3',
            category: 'food',
            title: 'Gourmet Dinner at Le Procope',
            time: '20:00',
            notes: 'Pariss oldest cafe. Try the coq au vin.',
            price: 90
          }
        ]
      },
      {
        dayNumber: 2,
        date: '2026-08-11',
        entries: [
          {
            id: 'fr-p-4',
            category: 'attraction',
            title: 'Louvre Museum Tour & Mona Lisa',
            time: '10:00',
            notes: 'Pre-booked timed tickets. Entrance via Richelieu.',
            price: 22,
            links: ['https://www.louvre.fr']
          },
          {
            id: 'fr-p-5',
            category: 'activity',
            title: 'Seine River Cruise at Sunset',
            time: '18:30',
            notes: 'Boat leaves from under the Eiffel Tower.',
            price: 15
          }
        ]
      },
      {
        dayNumber: 3,
        date: '2026-08-12',
        entries: [
          {
            id: 'fr-p-6',
            category: 'tour',
            title: 'Eiffel Tower Summit Lift Access',
            time: '09:00',
            notes: 'Get there 30 mins early for security.',
            price: 29
          }
        ]
      }
    ]
  },
  {
    id: 'JPN',
    countryCode: 'JPN',
    countryName: 'Japan',
    category: 'visited',
    startDate: '2024-04-01',
    endDate: '2024-04-12',
    cities: ['Tokyo', 'Kyoto', 'Osaka', 'Nara'],
  },
  {
    id: 'ITA',
    countryCode: 'ITA',
    countryName: 'Italy',
    category: 'favorite',
    cities: ['Rome', 'Florence', 'Venice', 'Amalfi'],
  },
  {
    id: 'ISL',
    countryCode: 'ISL',
    countryName: 'Iceland',
    category: 'want to visit',
    cities: ['Reykjavik'],
  }
];

// Migrate layout properties for multiple logs support
const migrateCountryTracks = (raw: CountryTrack[]): CountryTrack[] => {
  return raw.map(t => {
    if (t.logs && t.logs.length > 0) {
      return t;
    }
    // Otherwise migrate old root fields into a legacy log
    const legacyLog = {
      id: `legacy-${t.countryCode}-${Date.now()}`,
      category: t.category,
      startDate: t.startDate,
      endDate: t.endDate,
      cities: t.cities,
      plannedStartDate: t.plannedStartDate,
      plannedEndDate: t.plannedEndDate,
      itinerary: t.itinerary,
      notes: ''
    };
    return {
      ...t,
      logs: [legacyLog]
    };
  });
};

export default function App() {
  const [tracks, setTracks] = useState<CountryTrack[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [showDataWarning, setShowDataWarning] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'PHP'>('USD');

  // Initialize tracks and currency from localStorage or default presets
  useEffect(() => {
    const cachedCurrency = localStorage.getItem('world_travel_currency');
    if (cachedCurrency === 'USD' || cachedCurrency === 'GBP' || cachedCurrency === 'PHP') {
      setCurrency(cachedCurrency);
    }

    const cached = localStorage.getItem('world_travel_tracks');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setTracks(migrateCountryTracks(parsed));
      } catch (e) {
        console.error('Failed parsing cached tracks:', e);
        setTracks(migrateCountryTracks(DEFAULT_PRESETS));
      }
    } else {
      setTracks(migrateCountryTracks(DEFAULT_PRESETS));
    }

    const todayDate = new Date().toDateString();
    const isDismissedToday = localStorage.getItem('clear_data_prompt_dismissed') === todayDate;
    if (!isDismissedToday) {
      setShowDataWarning(true);
    }
  }, []);

  // Save tracks to localStorage on update
  const saveTracks = (updatedTracks: CountryTrack[]) => {
    setTracks(updatedTracks);
    localStorage.setItem('world_travel_tracks', JSON.stringify(updatedTracks));
  };

  const handleCurrencyChange = (newCurrency: 'USD' | 'GBP' | 'PHP') => {
    setCurrency(newCurrency);
    localStorage.setItem('world_travel_currency', newCurrency);
  };

  const handleDismissPromptToday = () => {
    const todayDate = new Date().toDateString();
    localStorage.setItem('clear_data_prompt_dismissed', todayDate);
    setShowDataWarning(false);
  };

  // Add/Update specific country settings
  const handleSaveCountryTrack = (savedTrack: CountryTrack) => {
    const exists = tracks.some(t => t.countryCode === savedTrack.countryCode);
    let next: CountryTrack[];
    
    if (exists) {
      next = tracks.map(t => t.countryCode === savedTrack.countryCode ? savedTrack : t);
    } else {
      next = [...tracks, savedTrack];
    }
    
    saveTracks(next);
  };

  // Delete/Unpin specific track
  const handleDeleteCountryTrack = (code: string) => {
    const next = tracks.filter(t => t.countryCode !== code);
    saveTracks(next);
  };

  // Open modal/drawer for editing
  const handleOpenEditCountry = (code: string) => {
    const found = tracks.find(t => t.countryCode === code);
    if (found) {
      setSelectedCountry({ code: found.countryCode, name: found.countryName });
    }
  };

  // Find existing config for detail modal lookup
  const currentExistingTrack = selectedCountry 
    ? tracks.find(t => t.countryCode === selectedCountry.code) || null 
    : null;


  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white pb-16">
      
      {/* Prime Decorative Sticky Navigation Banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs/10 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-md shadow-slate-900/10">
              <Compass className="w-5.5 h-5.5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                Travel Map & Planner
                <span className="text-[9px] uppercase font-bold tracking-widest bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  PWA
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                Dynamic visual geography journal & upcoming itinerary budgets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
              {tracks.length} Pinned Countries
            </span>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            
            {/* Currency Selector setting */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs font-semibold">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest pl-1">Currency:</span>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as any)}
                className="bg-white border border-slate-150 rounded-lg text-[11px] font-bold text-slate-800 px-2 py-1 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PHP">PHP (₱)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <button
              onClick={() => {
                // Clear state helper to reset presets
                if (window.confirm('Would you like to reset maps back to default showcase data? This will overwrite your changes.')) {
                  saveTracks(migrateCountryTracks(DEFAULT_PRESETS));
                }
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all text-slate-700 cursor-pointer"
            >
              Reset Showcase
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        
        {/* Daily Browser Data Clear Warning Banner */}
        {showDataWarning && (
          <div 
            id="browser-data-warning"
            className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex gap-3">
              <div className="p-2.5 bg-amber-100/90 rounded-xl text-amber-800 self-start md:self-center">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  Local Storage Disclaimer
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  This planner works entirely within your browser's local cache. 
                  <span className="font-bold text-amber-900 block mt-0.5 sm:inline sm:mt-0"> If you clear all browser cookies or cache, your custom travel itineraries, world map pins, and statistics will be permanently deleted.</span>
                </p>
              </div>
            </div>
            
            <button
              id="dismiss-warning-btn"
              onClick={handleDismissPromptToday}
              className="text-[10px] uppercase font-extrabold tracking-wider bg-amber-950 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl transition-all border border-transparent self-end md:self-center whitespace-nowrap cursor-pointer hover:shadow-md active:scale-97"
            >
              Do not show this again today
            </button>
          </div>
        )}

        {/* Row 1: Interactive World Map */}
        <section aria-labelledby="world-map-title">
          <WorldMap 
            tracks={tracks}
            selectedCountryCode={selectedCountry?.code || null}
            onSelectCountry={(code, name) => setSelectedCountry({ code, name })}
          />
        </section>

        {/* Row 2: Comprehensive visual numeric stats counters */}
        <section id="travel-footprint-statistics">
          <StatsSection tracks={tracks} currency={currency} />
        </section>

        {/* Row 3: Dashboard feeds and lists of pinned countries */}
        <section id="travel-details-feeds">
          <Dashboard 
            tracks={tracks}
            onEditCountry={handleOpenEditCountry}
            onDeleteCountry={handleDeleteCountryTrack}
            currency={currency}
          />
        </section>

      </main>

      {/* Slide-out modal drawer panels */}
      {selectedCountry && (
        <CountryModal 
          countryCode={selectedCountry.code}
          countryName={selectedCountry.name}
          existingTrack={currentExistingTrack}
          onSave={handleSaveCountryTrack}
          onDelete={handleDeleteCountryTrack}
          onClose={() => setSelectedCountry(null)}
          currency={currency}
        />
      )}

      {/* Standard App Footer */}
      <footer className="text-center text-[10px] text-slate-400 font-medium max-w-7xl mx-auto px-6 pt-4 border-t border-slate-100 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>Travel Map Tracker & Planner • Visual PWA database hosted securely inside browser cache.</p>
        <p className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-300" />
          Offline-ready standard application state synchronization.
        </p>
      </footer>

    </div>
  );
}
