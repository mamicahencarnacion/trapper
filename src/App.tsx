import React, { useState, useEffect } from 'react';
import { Compass, Palmtree, MapPin, Share2, Sparkles, Filter, ChevronRight, HelpCircle, AlertTriangle, Calendar } from 'lucide-react';
import WorldMap from './components/WorldMap';
import StatsSection from './components/StatsSection';
import Dashboard from './components/Dashboard';
import CountryModal from './components/CountryModal';
import TravelTimeline from './components/TravelTimeline';
import { CountryTrack, CountryCategory } from './types';

// Preloaded mock data on first load to showcase the PWA's rich layouts
const DEFAULT_PRESETS: CountryTrack[] = [];

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
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'PHP'>('PHP');
  const [activeTab, setActiveTab] = useState<'map' | 'timeline'>('map');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Initialize tracks and currency from localStorage or default presets
  useEffect(() => {
    const cachedCurrency = localStorage.getItem('world_travel_currency');
    if (cachedCurrency === 'USD' || cachedCurrency === 'GBP' || cachedCurrency === 'PHP') {
      setCurrency(cachedCurrency);
    } else {
      setCurrency('PHP');
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

  // Delete a specific stay/log inside a country track
  const handleDeleteLog = (countryCode: string, logId: string) => {
    const track = tracks.find(t => t.countryCode === countryCode);
    if (!track) return;
    const nextLogs = (track.logs || []).filter(l => l.id !== logId);
    if (nextLogs.length === 0) {
      handleDeleteCountryTrack(countryCode);
    } else {
      const updatedTrack: CountryTrack = {
        ...track,
        logs: nextLogs,
        category: nextLogs[0].category
      };
      handleSaveCountryTrack(updatedTrack);
    }
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

            {tracks.length > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                {showClearConfirm ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-150 rounded-xl p-1 px-2.5">
                    <span className="text-[9px] font-bold text-red-750 uppercase tracking-widest pl-1">Confirm Reset All?</span>
                    <button
                      type="button"
                      onClick={() => {
                        saveTracks([]);
                        setShowClearConfirm(false);
                      }}
                      className="bg-red-605 hover:bg-red-700 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 bg-red-50 hover:bg-red-100 text-red-750 border border-red-150 rounded-xl transition-all cursor-pointer"
                  >
                    Clear All Pins
                  </button>
                )}
              </>
            )}
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

        {/* Tab Switcher Navigation */}
        <div 
          id="travel-app-tabs" 
          className="flex items-center justify-center p-1 bg-slate-100 rounded-2xl max-w-sm mx-auto shadow-3xs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'map' ? 'text-indigo-600 animate-spin-slow' : 'text-slate-400'}`} />
            Interactive Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'timeline' ? 'text-indigo-650' : 'text-slate-400'}`} />
            Travel Timeline
          </button>
        </div>

        {activeTab === 'map' ? (
          <>
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
          </>
        ) : (
          <section id="travel-timeline-section" className="space-y-6">
            <TravelTimeline 
              tracks={tracks}
              onEditCountry={handleOpenEditCountry}
              onDeleteCountry={handleDeleteCountryTrack}
              onDeleteLog={handleDeleteLog}
              currency={currency}
            />
          </section>
        )}

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
