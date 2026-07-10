import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, MapPin, Edit3, Search, Clock, Info, ExternalLink, 
  ChevronDown, ChevronUp, ArrowUpDown, Tag, Compass, ListTodo, Landmark,
  Trash2, PinOff
} from 'lucide-react';
import { CountryTrack, CountryCategory, TravelLog } from '../types';
import { formatCurrency, CurrencyType } from '../lib/currency';

interface TravelTimelineProps {
  tracks: CountryTrack[];
  onEditCountry: (countryCode: string) => void;
  onDeleteCountry: (countryCode: string) => void;
  onDeleteLog: (countryCode: string, logId: string) => void;
  currency?: CurrencyType;
}

interface FlattenedLog extends TravelLog {
  countryCode: string;
  countryName: string;
  primaryCategory: CountryCategory;
}

export default function TravelTimeline({ 
  tracks, 
  onEditCountry, 
  onDeleteCountry,
  onDeleteLog,
  currency = 'PHP' 
}: TravelTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CountryCategory | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedItineraries, setExpandedItineraries] = useState<Record<string, boolean>>({});
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmUnpinCode, setConfirmUnpinCode] = useState<string | null>(null);

  // Helper to parse "YYYY-MM-DD" safely without offset issues
  const parseLocalDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const res = new Date(y, m, d);
      return isNaN(res.getTime()) ? null : res;
    }
    const res = new Date(dateStr);
    return isNaN(res.getTime()) ? null : res;
  };

  // Extract all logs across all tracked countries
  const allLogs = useMemo(() => {
    const list: FlattenedLog[] = [];
    tracks.forEach(track => {
      if (track.logs && track.logs.length > 0) {
        track.logs.forEach(log => {
          list.push({
            ...log,
            countryCode: track.countryCode,
            countryName: track.countryName,
            primaryCategory: track.category
          });
        });
      }
    });
    return list;
  }, [tracks]);

  // Filter and sort logs
  const processedLogs = useMemo(() => {
    let result = [...allLogs];

    // 1. Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(log => log.category === categoryFilter);
    }

    // 2. Filter by Search Query (Country name, code, cities, or journal notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => {
        const matchesCountry = log.countryName.toLowerCase().includes(q) || log.countryCode.toLowerCase().includes(q);
        const matchesCities = log.cities?.some(c => c.toLowerCase().includes(q)) || false;
        const matchesNotes = log.notes?.toLowerCase().includes(q) || false;
        return matchesCountry || matchesCities || matchesNotes;
      });
    }

    // 3. Sort chronologically
    result.sort((a, b) => {
      // Determine comparison dates
      const dateA = a.category === 'planned' ? parseLocalDate(a.plannedStartDate) : parseLocalDate(a.startDate);
      const dateB = b.category === 'planned' ? parseLocalDate(b.plannedStartDate) : parseLocalDate(b.startDate);

      // Handle items with no dates (wishlist or favorites with no timeline dates)
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Put undated logs at the end
      if (!dateB) return -1;

      const diff = dateA.getTime() - dateB.getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

    return result;
  }, [allLogs, categoryFilter, searchQuery, sortOrder]);

  const toggleItineraryExpand = (logId: string) => {
    setExpandedItineraries(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getCategoryBadgeClass = (category: CountryCategory) => {
    switch (category) {
      case 'lived': return 'bg-emerald-50 text-emerald-800 border-emerald-150';
      case 'visited': return 'bg-indigo-50 text-indigo-800 border-indigo-150';
      case 'planned': return 'bg-amber-50 text-amber-800 border-amber-150';
      case 'want to visit': return 'bg-rose-50 text-rose-800 border-rose-150';
      case 'favorite': return 'bg-red-50 text-red-800 border-red-150';
    }
  };

  const getCategoryLabel = (category: CountryCategory) => {
    switch (category) {
      case 'lived': return 'Lived Here';
      case 'visited': return 'Visited';
      case 'planned': return 'Upcoming Stay';
      case 'want to visit': return 'Wishlist Spot';
      case 'favorite': return 'Favorite Location';
    }
  };

  const getCategoryDotColor = (category: CountryCategory) => {
    switch (category) {
      case 'lived': return 'bg-emerald-500 ring-emerald-200';
      case 'visited': return 'bg-indigo-500 ring-indigo-200';
      case 'planned': return 'bg-amber-500 ring-amber-200';
      case 'want to visit': return 'bg-rose-500 ring-rose-200';
      case 'favorite': return 'bg-red-500 ring-red-200';
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

  const getLogBudget = (log: TravelLog) => {
    if (!log.itinerary) return 0;
    return log.itinerary.reduce((sum, day) => {
      return sum + day.entries.reduce((daySum, item) => daySum + (item.price || 0), 0);
    }, 0);
  };

  // Helper to format dates for users beautifully: Aug 10, 2026
  const formatUserDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div id="timeline-tab-panel" className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="w-5.5 h-5.5 text-indigo-650" />
            Vertical Travel Timeline Journal
          </h2>
          <p className="text-xs text-slate-500 font-sans tracking-wide mt-1">
            Chronological log feed of all registered stays, plans, and historic memories.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar inside timeline */}
          <div className="relative shrink-0 w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stays & cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Category Logs</option>
            <option value="lived">Lived Here</option>
            <option value="visited">Visited</option>
            <option value="planned">Planned Travel</option>
            <option value="want to visit">Wishlist Spot</option>
            <option value="favorite">Favorite Location</option>
          </select>

          {/* Sort direction toggles */}
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl cursor-pointer transition-colors"
            title={sortOrder === 'newest' ? 'Showing Newest Stays First' : 'Showing Oldest Stays First'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortOrder} First</span>
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {processedLogs.length === 0 ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Compass className="w-10 h-10 text-slate-300 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-700">No travel logs found</h3>
          <p className="text-xs max-w-sm mx-auto text-slate-500">
            {searchQuery || categoryFilter !== 'all' 
              ? 'Try widening your filters or search query to find your registered stayed logs.'
              : 'Tap any country on the world map above and add travel records (visits, stays or itineraries) to kickstart your travel ledger timeline!'}
          </p>
        </div>
      ) : (
        <div className="relative pl-4 md:pl-8 border-l border-slate-150 py-2 space-y-10 max-w-5xl mx-auto w-full">
          {processedLogs.map((log, index) => {
            const hasItinerary = log.category === 'planned' && log.itinerary && log.itinerary.length > 0;
            const isItExpanded = !!expandedItineraries[log.id];
            const logBudget = getLogBudget(log);

            // Establish formatted dates
            let dateInterval = '';
            let rawSortDate = '';
            if (log.category === 'visited' || log.category === 'lived') {
              if (log.startDate) {
                dateInterval = `${formatUserDate(log.startDate)} ${log.endDate ? `to ${formatUserDate(log.endDate)}` : 'to Present'}`;
                rawSortDate = log.startDate;
              } else {
                dateInterval = 'No dates registered';
              }
            } else if (log.category === 'planned') {
              if (log.plannedStartDate) {
                dateInterval = `Scheduled: ${formatUserDate(log.plannedStartDate)}${log.plannedEndDate ? ` – ${formatUserDate(log.plannedEndDate)}` : ''}`;
                rawSortDate = log.plannedStartDate;
              } else {
                dateInterval = 'Planned (Undated)';
              }
            } else {
              dateInterval = 'Wishlisted Destination';
            }

            return (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                className="relative group"
              >
                {/* Timeline Dot Indicator */}
                <div className="absolute -left-[21px] md:-left-[37px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ring-4 ${getCategoryDotColor(log.category)}`} />
                </div>

                {/* Main Card */}
                <div className="bg-white border border-slate-150 hover:border-slate-300 rounded-2xl shadow-3xs hover:shadow-2xs transition-all duration-200 overflow-hidden">
                  
                  {/* Top Heading Anchor bar */}
                  <div className="bg-slate-50/50 px-4 md:px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Country code icon badge */}
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold font-mono text-[11px] flex items-center justify-center shrink-0 shadow-3xs select-none">
                        {log.countryCode}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {log.countryName}
                        </h4>
                        
                        {/* Dates indicator */}
                        {dateInterval && (
                          <div className="text-[10px] text-slate-500 font-semibold font-mono flex items-center gap-1 mt-0.5 leading-none">
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {dateInterval}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Categorization indicator badge & action edit button */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(log.category)}`}>
                        {getCategoryLabel(log.category)}
                      </span>
                      
                      {/* Edit context shortcut */}
                      <button
                        onClick={() => onEditCountry(log.countryCode)}
                        className="p-1.5 px-2.5 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-indigo-700 bg-white hover:bg-slate-50 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit Stay Details"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-500" />
                        <span>Edit</span>
                      </button>

                      {/* Delete this specific stay log */}
                      {confirmDeleteLogId === log.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg p-1 px-2 shrink-0">
                          <span className="text-[9px] font-extrabold text-red-800">Confirm delete?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteLog(log.countryCode, log.id);
                              setConfirmDeleteLogId(null);
                            }}
                            className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteLogId(null)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 font-extrabold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLogId(log.id)}
                          className="p-1.5 px-2.5 border border-red-150 hover:border-red-300 rounded-lg text-red-600 hover:text-red-750 bg-red-50/20 hover:bg-red-50 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Delete Stay Log"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete Log</span>
                        </button>
                      )}

                      {/* Unpin entire country from maps */}
                      {confirmUnpinCode === log.countryCode ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1 px-2 shrink-0">
                          <span className="text-[9px] font-extrabold text-slate-700">Unpin tracker?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCountry(log.countryCode);
                              setConfirmUnpinCode(null);
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnpinCode(null)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 font-extrabold text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmUnpinCode(log.countryCode)}
                          className="p-1.5 px-2.5 border border-slate-200 hover:border-red-300 rounded-lg text-slate-550 hover:text-red-700 bg-white hover:bg-red-50/20 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Unpin Country Track"
                        >
                          <PinOff className="w-3.5 h-3.5 text-slate-450" />
                          <span>Unpin Country</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-4 md:p-5 space-y-4">
                    
                    {/* Cities visited list info */}
                    {log.cities && log.cities.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">
                          Cities Visited
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {log.cities.map((city, cIdx) => (
                            <span 
                              key={cIdx}
                              className="px-2.5 py-0.5 text-[10.5px] font-bold bg-indigo-50/30 text-slate-700 rounded-lg border border-indigo-100 flex items-center gap-1"
                            >
                              <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Journal Notes */}
                    {log.notes ? (
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                        <span className="text-[8.5px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                          Log Notes & Memoirs
                        </span>
                        <p className="text-slate-700 italic leading-relaxed whitespace-pre-line">
                          "{log.notes}"
                        </p>
                      </div>
                    ) : (
                      (!log.cities || log.cities.length === 0) && !hasItinerary && (
                        <p className="text-xs text-slate-400 italic">No notes or cities recorded for this logged stay.</p>
                      )
                    )}

                    {/* Planned Schedule / Trip Itineraries collapsed widgets */}
                    {hasItinerary && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleItineraryExpand(log.id)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-700 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            <ListTodo className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{isItExpanded ? 'Hide Trip Schedule' : 'View Planned Itinerary Scheduling'}</span>
                            {isItExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                          </button>

                          {logBudget > 0 && (
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-110/60 rounded-md px-2 py-0.5 font-mono">
                              Est. Cost: {formatCurrency(logBudget, currency)}
                            </span>
                          )}
                        </div>

                        {/* Expandable Daily Itinerary schedule logs */}
                        <AnimatePresence initial={false}>
                          {isItExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3">
                                {log.itinerary!.map((day) => (
                                  <div key={day.dayNumber} className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-150/50 pb-1.5">
                                      <span className="text-[10.5px] font-black text-slate-800">
                                        Day {day.dayNumber}
                                      </span>
                                      {day.date && (
                                        <span className="text-[9px] font-mono text-slate-400 font-semibold">
                                          {formatUserDate(day.date)}
                                        </span>
                                      )}
                                    </div>

                                    {day.entries.length === 0 ? (
                                      <p className="text-[9px] text-slate-400 italic py-1">No schedules mapped for this day.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {day.entries.map((activity) => (
                                          <div key={activity.id} className="text-[11px] border-l-2 border-indigo-300 pl-2.5 py-0.5 flex flex-col justify-start">
                                            <span className="font-bold text-slate-900 leading-snug">
                                              {getItineraryIcon(activity.category)} {activity.title}
                                            </span>
                                            {activity.notes && (
                                              <p className="text-[9.5px] text-slate-500 italic mt-0.5">
                                                {activity.notes}
                                              </p>
                                            )}
                                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                              {activity.time && (
                                                <span className="text-[7.5px] font-semibold text-slate-400 bg-white px-1.5 py-0.1 rounded border border-slate-150">
                                                  ⏰ {activity.time}
                                                </span>
                                              )}
                                              {activity.price !== undefined && (
                                                <span className="text-[7.5px] bg-emerald-50 text-emerald-800 font-black px-1.5 py-0.1 rounded border border-emerald-100">
                                                  {formatCurrency(activity.price, currency)}
                                                </span>
                                              )}
                                              {activity.links && activity.links.map((link, lIdx) => (
                                                <a 
                                                  key={lIdx} 
                                                  href={link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="inline-flex items-center gap-0.5 text-[7.5px] font-bold text-indigo-600 hover:underline bg-indigo-50 border border-indigo-100 rounded px-1"
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
                                                    <img src={ph} alt="Itinerary Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
