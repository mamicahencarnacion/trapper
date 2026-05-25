import React, { useState, useMemo } from 'react';
import { 
  Award, Globe, Calendar, Heart, MapPin, Edit3, Trash2, Search, ArrowUpRight, 
  ChevronDown, ChevronUp, DollarSign, ExternalLink, ImageIcon, ListTodo 
} from 'lucide-react';
import { CountryTrack, CountryCategory } from '../types';
import { formatCurrency, CurrencyType } from '../lib/currency';

interface DashboardProps {
  tracks: CountryTrack[];
  onEditCountry: (countryCode: string) => void;
  onDeleteCountry: (countryCode: string) => void;
  currency?: CurrencyType;
}

export default function Dashboard({ tracks, onEditCountry, onDeleteCountry, currency = 'PHP' }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CountryCategory | 'all'>('all');
  const [expandedCountryId, setExpandedCountryId] = useState<string | null>(null);

  // Group or filter tracks
  const filteredTracks = useMemo(() => {
    let result = tracks;

    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.countryName.toLowerCase().includes(q) || t.countryCode.toLowerCase().includes(q)
      );
    }

    // Sort: favorites first, then lived, visited, planned, wants
    const priority: Record<CountryCategory, number> = {
      'favorite': 1,
      'lived': 2,
      'visited': 3,
      'planned': 4,
      'want to visit': 5,
    };

    return [...result].sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
  }, [tracks, searchQuery, filterCategory]);

  const toggleExpand = (id: string) => {
    setExpandedCountryId(expandedCountryId === id ? null : id);
  };

  const getCategoryTheme = (cat: CountryCategory) => {
    switch (cat) {
      case 'lived': return 'bg-emerald-50 text-emerald-800 border-emerald-150';
      case 'visited': return 'bg-indigo-50 text-indigo-800 border-indigo-150';
      case 'planned': return 'bg-amber-50 text-amber-800 border-amber-150';
      case 'want to visit': return 'bg-rose-50 text-rose-800 border-rose-150';
      case 'favorite': return 'bg-red-50 text-red-800 border-red-150';
    }
  };

  const getCategoryLabel = (cat: CountryCategory) => {
    switch (cat) {
      case 'lived': return 'Lived Here';
      case 'visited': return 'Visited';
      case 'planned': return 'Planned Travel';
      case 'want to visit': return 'Want to Visit';
      case 'favorite': return 'Favorite Location';
    }
  };

  const getItineraryIcon = (cat: string) => {
    switch (cat) {
      case 'food': return '🍴';
      case 'attraction': return '📸';
      case 'tour': return '🚶';
      case 'activity': return '⛰️';
      case 'flight': return '✈️';
      case 'accommodation': return '🏨';
      default: return '📍';
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      {/* Search and Filters Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 id="dashboard-title" className="text-xl font-bold tracking-tight text-slate-900">
            Personalized Travel Dashboard
          </h2>
          <p className="text-xs text-slate-500 font-sans tracking-wide mt-1">
            Browse and manage pinned global coordinates, stay histories, cities visited, and upcoming itineraries.
          </p>
        </div>

        {/* Dashboard query filter decks */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="dashboard-search-input"
              type="text"
              placeholder="Search pinned list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Filtering category selectors */}
          <select
            id="dashboard-category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">Show All Categories</option>
            <option value="lived">Lived Here</option>
            <option value="visited">Visited</option>
            <option value="planned">Planned Travel</option>
            <option value="want to visit">Want to Visit</option>
            <option value="favorite">Favorite Location</option>
          </select>
        </div>
      </div>

      {/* Pins Listings */}
      {filteredTracks.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Globe className="w-8 h-8 text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">No matching country tracks</h3>
          <p className="text-xs max-w-sm mx-auto">
            Try resetting your search query or tap countries directly on the world map above to populate your dashboard!
          </p>
        </div>
      ) : (
        <div id="dashboard-items-list" className="space-y-3.5">
          {filteredTracks.map((entry) => {
            const isExpanded = expandedCountryId === entry.id;
            
            // Calculate total itinerary costs across ALL planned logs inside this track
            const budgetTotal = (entry.logs || []).reduce((sum, log) => {
              if (log.category !== 'planned' || !log.itinerary) return sum;
              return sum + log.itinerary.reduce((daySum, day) => {
                return daySum + day.entries.reduce((entSum, ent) => entSum + (ent.price || 0), 0);
              }, 0);
            }, 0);

            // Collect unique cities visited across all logs in this track
            const uniqueCitiesTracked = Array.from(
              new Set(
                (entry.logs || []).flatMap(log => log.cities || [])
                  .map(c => c.trim())
                  .filter(Boolean)
              )
            );

            // Count planned, visited, and other log types for simple indicators
            const logsCount = entry.logs?.length || 0;

            return (
              <div 
                key={entry.id}
                id={`dashboard-card-${entry.countryCode}`}
                className={`border border-slate-150/70 rounded-2xl overflow-hidden transition-all ${
                  isExpanded ? 'bg-slate-50/20 ring-1 ring-slate-100 shadow-sm' : 'bg-white hover:border-slate-300'
                }`}
              >
                {/* Collapsed top bar */}
                <div 
                  onClick={() => toggleExpand(entry.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Country Code Roundel */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/50 flex flex-col items-center justify-center font-bold font-mono text-slate-800 shrink-0 select-none">
                      <span className="text-xs leading-none">{entry.countryCode}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{entry.countryName}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryTheme(entry.category)}`}>
                          {getCategoryLabel(entry.category)}
                        </span>
                      </div>

                      {/* Detail overview subtitles based on logs aggregate */}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-400 font-sans">
                        <span className="flex items-center gap-1 font-extrabold text-indigo-700 bg-indigo-50/60 px-1.5 py-0.5 border border-indigo-100 rounded-md">
                          🗂️ {logsCount} {logsCount === 1 ? 'Travel Log' : 'Travel Logs'}
                        </span>
                        
                        {uniqueCitiesTracked.length > 0 && (
                          <span className="flex items-center gap-0.5 text-slate-505 font-medium">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {uniqueCitiesTracked.length} Unique Cities
                          </span>
                        )}
                        
                        {budgetTotal > 0 && (
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded-md">
                            Total Planned Budget: {formatCurrency(budgetTotal, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions right panel */}
                  <div className="flex items-center gap-3 ml-12 sm:ml-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      id={`edit-btn-${entry.countryCode}`}
                      onClick={() => onEditCountry(entry.countryCode)}
                      className="p-1.5 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-650 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                      title="Manage Travel Logs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      id={`delete-btn-${entry.countryCode}`}
                      onClick={() => onDeleteCountry(entry.countryCode)}
                      className="p-1.5 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-350 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Unpin Country"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" onClick={() => toggleExpand(entry.id)} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" onClick={() => toggleExpand(entry.id)} />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-3 border-t border-slate-100 bg-slate-50/30 text-slate-605">
                    
                    <div className="space-y-4">
                      <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 block border-b border-slate-100 pb-1">
                        History & Schedules Breakdown
                      </div>
                      
                      {(entry.logs || []).map((log, index) => {
                        const logBudgetTotal = log.category === 'planned' && log.itinerary
                          ? log.itinerary.reduce((sum, day) => {
                              return sum + day.entries.reduce((daySum, item) => daySum + (item.price || 0), 0);
                            }, 0)
                          : 0;

                        return (
                          <div 
                            key={log.id} 
                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 relative overflow-hidden"
                          >
                            {/* Header row of specific travel log */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] uppercase font-mono font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  Entry #{index + 1}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${getCategoryTheme(log.category)}`}>
                                  {getCategoryLabel(log.category)}
                                </span>
                              </div>
                              
                              <div className="text-[10px] text-slate-550 font-semibold font-sans">
                                {(log.category === 'visited' || log.category === 'lived') && log.startDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {log.startDate} &rarr; {log.endDate || 'Present'}
                                  </span>
                                )}
                                {log.category === 'planned' && log.plannedStartDate && (
                                  <span className="flex items-center gap-1 text-indigo-700">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    Planned: {log.plannedStartDate} &rarr; {log.plannedEndDate || 'Once finished'}
                                  </span>
                                )}
                                {(log.category === 'want to visit' || log.category === 'favorite') && (
                                  <span className="text-slate-400 italic">Wishlist Spot</span>
                                )}
                              </div>
                            </div>

                            {/* Cities listed in this specific log entry */}
                            {log.cities && log.cities.length > 0 && (
                              <div>
                                <span className="text-[8.5px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                                  Cities Visited
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {log.cities.map((city, cIdx) => (
                                    <span 
                                      key={cIdx}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-50 text-slate-700 rounded-md border border-slate-150"
                                    >
                                      📍 {city}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Journal notes for this log */}
                            {log.notes && (
                              <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                <span className="text-[8.5px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                                  Notes & Musings
                                </span>
                                <p className="text-slate-700 italic leading-relaxed whitespace-pre-line">
                                  "{log.notes}"
                                </p>
                              </div>
                            )}

                            {/* Planned Daily schedule */}
                            {log.category === 'planned' && log.itinerary && log.itinerary.length > 0 && (
                              <div className="space-y-2 pt-1 border-t border-slate-50">
                                <span className="text-[8.5px] uppercase font-bold tracking-widest text-slate-400 block">
                                  Day-by-Day Travel Itineraries
                                </span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {log.itinerary.map((day) => (
                                    <div key={day.dayNumber} className="bg-slate-100/30 border border-slate-150 rounded-xl p-3 space-y-2">
                                      <div className="flex items-center justify-between border-b border-slate-150/50 pb-1">
                                        <span className="text-[10px] font-bold text-slate-800">
                                          Day {day.dayNumber}
                                        </span>
                                        {day.date && (
                                          <span className="text-[9px] text-slate-400 font-medium">
                                            {day.date}
                                          </span>
                                        )}
                                      </div>

                                      {day.entries.length === 0 ? (
                                        <p className="text-[9px] text-slate-400 italic py-1">No planned stops for this day.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {day.entries.map((activity) => (
                                            <div key={activity.id} className="text-[11px] border-l-2 border-indigo-200 pl-2 py-0.5 flex flex-col justify-start">
                                              <span className="font-semibold text-slate-900 leading-tight">
                                                {getItineraryIcon(activity.category)} {activity.title}
                                              </span>
                                              {activity.notes && (
                                                <p className="text-[9px] text-slate-500 italic mt-0.5">
                                                  {activity.notes}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                {activity.time && (
                                                  <span className="text-[8px] text-slate-400 bg-white px-1.5 py-0.1 rounded border border-slate-150">
                                                    ⏰ {activity.time}
                                                  </span>
                                                )}
                                                {activity.price !== undefined && (
                                                  <span className="text-[8px] bg-emerald-50 text-emerald-800 font-extrabold px-1.5 py-0.1 rounded border border-emerald-100">
                                                    {formatCurrency(activity.price, currency)}
                                                  </span>
                                                )}
                                                
                                                {/* Attachments */}
                                                {activity.links && activity.links.map((link, lIdx) => (
                                                  <a 
                                                    key={lIdx} 
                                                    href={link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-indigo-600 hover:underline bg-indigo-50 border border-indigo-100 rounded px-1"
                                                  >
                                                    Link <ExternalLink className="w-1.5 h-1.5 shrink-0" />
                                                  </a>
                                                ))}
                                              </div>
                                              
                                              {activity.photos && activity.photos.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1.5 overflow-x-auto">
                                                  {activity.photos.map((ph, pIdx) => (
                                                    <a 
                                                      key={pIdx} 
                                                      href={ph} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="w-8 h-8 rounded border border-slate-205 overflow-hidden block shrink-0 cursor-pointer"
                                                    >
                                                      <img src={ph} alt="Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </a>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Log Sum Budget Flag */}
                            {log.category === 'planned' && logBudgetTotal > 0 && (
                              <div className="flex items-center justify-end">
                                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50/50 border border-emerald-110/60 rounded-lg px-2.5 py-1">
                                  Log Budget: {formatCurrency(logBudgetTotal, currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
