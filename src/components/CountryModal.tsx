import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, MapPin, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, 
  DollarSign, Clock, ListTodo, AlertCircle, Sparkles, Check, ChevronRight, ChevronsUpDown, Info, Edit, ArrowLeft, Heart, Award, Eye
} from 'lucide-react';
import { CountryTrack, CountryCategory, DayItinerary, ItineraryEntry, TravelLog } from '../types';
import { formatCurrency, CurrencyType } from '../lib/currency';

interface CountryModalProps {
  countryCode: string;
  countryName: string;
  existingTrack: CountryTrack | null;
  onSave: (track: CountryTrack) => void;
  onDelete: (countryCode: string) => void;
  onClose: () => void;
  currency?: CurrencyType;
}

const CATEGORY_PRIORITY: Record<string, number> = {
  'favorite': 1,
  'lived': 2,
  'visited': 3,
  'planned': 4,
  'want to visit': 5,
};

function getPrimaryCategory(logsList: TravelLog[]): CountryCategory {
  if (!logsList || logsList.length === 0) return 'visited';
  const sorted = [...logsList].sort((a, b) => {
    const pA = CATEGORY_PRIORITY[a.category] ?? 99;
    const pB = CATEGORY_PRIORITY[b.category] ?? 99;
    return pA - pB;
  });
  return sorted[0].category;
}

export default function CountryModal({
  countryCode,
  countryName,
  existingTrack,
  onSave,
  onDelete,
  onClose,
  currency = 'USD'
}: CountryModalProps) {
  
  // List of all logs in local state
  const [logs, setLogs] = useState<TravelLog[]>([]);
  
  // Active log editing tracker.
  // null = showing the Logs List View (Hub mode)
  // 'new' = adding a new log entry
  // any string = editing that specific TravelLog's unique ID
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Form Field Sub-States (for the active log being added/edited)
  const [category, setCategory] = useState<CountryCategory>('visited');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isStillLiving, setIsStillLiving] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [generalNotes, setGeneralNotes] = useState('');

  // Itinerary detail Form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemCategory, setItemCategory] = useState<ItineraryEntry['category']>('activity');
  const [itemTitle, setItemTitle] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemLinkInput, setItemLinkInput] = useState('');
  const [itemLinks, setItemLinks] = useState<string[]>([]);
  const [itemPhotoInput, setItemPhotoInput] = useState('');
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);

  // Map tracks to logs state on mount/update
  useEffect(() => {
    if (existingTrack) {
      if (existingTrack.logs && existingTrack.logs.length > 0) {
        setLogs(existingTrack.logs);
        setEditingLogId(null); // default to list hub
      } else {
        // Legacy track migration fallback
        const legacyLog: TravelLog = {
          id: `legacy-${Date.now()}`,
          category: existingTrack.category,
          startDate: existingTrack.startDate,
          endDate: existingTrack.endDate,
          cities: existingTrack.cities,
          plannedStartDate: existingTrack.plannedStartDate,
          plannedEndDate: existingTrack.plannedEndDate,
          itinerary: existingTrack.itinerary,
          notes: ''
        };
        setLogs([legacyLog]);
        setEditingLogId(null);
      }
    } else {
      // Unpinned country - immediately open creator mode!
      setLogs([]);
      openNewLogForm();
    }
  }, [existingTrack, countryCode]);

  useEffect(() => {
    if (days.length > 0 && activeDayIdx >= days.length) {
      setActiveDayIdx(0);
    }
  }, [days, activeDayIdx]);

  // Generate itinerary days dynamically for standard dates
  useEffect(() => {
    if (!plannedStartDate) {
      if (days.length === 0) {
        setDays([{ dayNumber: 1, entries: [] }]);
      }
      return;
    }

    const start = new Date(plannedStartDate);
    const end = plannedEndDate ? new Date(plannedEndDate) : new Date(plannedStartDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const updatedDays: DayItinerary[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + (d - 1));
      const formattedDate = currentDate.toISOString().split('T')[0];

      const existingDay = days.find(di => di.dayNumber === d);
      updatedDays.push({
        dayNumber: d,
        date: formattedDate,
        entries: existingDay ? existingDay.entries : []
      });
    }

    setDays(updatedDays);
  }, [plannedStartDate, plannedEndDate]);

  // Transition helper to load log fields into edit controllers
  const loadLogIntoForm = (log: TravelLog) => {
    setCategory(log.category);
    setStartDate(log.startDate || '');
    setEndDate(log.endDate || '');
    setIsStillLiving(log.category === 'lived' && !log.endDate);
    setCities(log.cities || []);
    setPlannedStartDate(log.plannedStartDate || '');
    setPlannedEndDate(log.plannedEndDate || '');
    setDays(log.itinerary || []);
    setGeneralNotes(log.notes || '');
    setActiveDayIdx(0);
    setShowItemForm(false);
    resetItemForm();
    setEditingLogId(log.id);
  };

  const openNewLogForm = () => {
    setCategory('visited');
    setStartDate('');
    setEndDate('');
    setIsStillLiving(false);
    setCities([]);
    setPlannedStartDate('');
    setPlannedEndDate('');
    setDays([{ dayNumber: 1, entries: [] }]);
    setGeneralNotes('');
    setActiveDayIdx(0);
    setShowItemForm(false);
    resetItemForm();
    setEditingLogId('new');
  };

  const resetItemForm = () => {
    setItemTitle('');
    setItemTime('');
    setItemNotes('');
    setItemPrice('');
    setItemLinkInput('');
    setItemLinks([]);
    setItemPhotoInput('');
    setItemPhotos([]);
  };

  const handleAddCity = () => {
    const trimmed = cityInput.trim();
    if (trimmed && !cities.includes(trimmed)) {
      setCities([...cities, trimmed]);
    }
    setCityInput('');
  };

  const handleAddCityOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCity();
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };

  // Itinerary Item Form details
  const handleAddLinkInForm = () => {
    const trimmed = itemLinkInput.trim();
    if (trimmed && !itemLinks.includes(trimmed)) {
      setItemLinks([...itemLinks, trimmed]);
    }
    setItemLinkInput('');
  };

  const handleRemoveLinkInForm = (link: string) => {
    setItemLinks(itemLinks.filter(l => l !== link));
  };

  const handlePhotoUploadInForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setItemPhotos([...itemPhotos, base64]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddPhotoUrlInForm = () => {
    const trimmed = itemPhotoInput.trim();
    if (trimmed && !itemPhotos.includes(trimmed)) {
      setItemPhotos([...itemPhotos, trimmed]);
    }
    setItemPhotoInput('');
  };

  const handleRemovePhotoInForm = (photo: string) => {
    setItemPhotos(itemPhotos.filter(p => p !== photo));
  };

  const handleSaveItineraryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    const newEntry: ItineraryEntry = {
      id: Math.random().toString(36).substring(2, 9),
      category: itemCategory,
      title: itemTitle.trim(),
      time: itemTime || undefined,
      notes: itemNotes.trim() || undefined,
      price: itemPrice ? parseFloat(itemPrice) : undefined,
      links: itemLinks.length > 0 ? itemLinks : undefined,
      photos: itemPhotos.length > 0 ? itemPhotos : undefined
    };

    setDays(prevDays => {
      return prevDays.map((dayItem, dIdx) => {
        if (dIdx === activeDayIdx) {
          return {
            ...dayItem,
            entries: [...dayItem.entries, newEntry]
          };
        }
        return dayItem;
      });
    });

    setShowItemForm(false);
    resetItemForm();
  };

  const handleRemoveItineraryItem = (dayNumber: number, entryId: string) => {
    setDays(prevDays => {
      return prevDays.map(dayItem => {
        if (dayItem.dayNumber === dayNumber) {
          return {
            ...dayItem,
            entries: dayItem.entries.filter(ent => ent.id !== entryId)
          };
        }
        return dayItem;
      });
    });
  };

  // Delete specific log and instantly sync to App state
  const handleDeleteLogItem = (logId: string) => {
    if (window.confirm("Are you sure you want to delete this trip log?")) {
      const nextLogs = logs.filter(l => l.id !== logId);
      setLogs(nextLogs);
      
      if (nextLogs.length === 0) {
        // If no logs left, delete/unpin the country completely from dashboard
        onDelete(countryCode);
        onClose();
      } else {
        const prim = getPrimaryCategory(nextLogs);
        onSave({
          id: countryCode,
          countryCode,
          countryName,
          category: prim,
          logs: nextLogs
        });
      }
    }
  };

  // Save/Commit active Log Form changes back to the list
  const handleCommitLogForm = () => {
    const updatedLog: TravelLog = {
      id: editingLogId === 'new' ? `log-${Date.now()}` : editingLogId!,
      category,
      startDate: (category === 'visited' || category === 'lived') ? startDate : undefined,
      endDate: (category === 'visited' || category === 'lived') ? (isStillLiving ? undefined : endDate) : undefined,
      cities: (category === 'visited' || category === 'lived' || category === 'planned') ? cities : undefined,
      plannedStartDate: category === 'planned' ? plannedStartDate : undefined,
      plannedEndDate: category === 'planned' ? plannedEndDate : undefined,
      itinerary: category === 'planned' ? days : undefined,
      notes: generalNotes.trim() || undefined
    };

    let nextLogs: TravelLog[];
    if (editingLogId === 'new') {
      nextLogs = [...logs, updatedLog];
    } else {
      nextLogs = logs.map(l => l.id === editingLogId ? updatedLog : l);
    }

    setLogs(nextLogs);
    setEditingLogId(null); // return to lists

    // Persist this track state update instantly to App
    const primaryCat = getPrimaryCategory(nextLogs);
    onSave({
      id: countryCode, 
      countryCode,
      countryName,
      category: primaryCat,
      logs: nextLogs
    });
  };

  const getLogBudget = (log: TravelLog) => {
    if (log.category !== 'planned' || !log.itinerary) return 0;
    return log.itinerary.reduce((sum, day) => {
      return sum + day.entries.reduce((dSum, item) => dSum + (item.price || 0), 0);
    }, 0);
  };

  const getSubcategoryStyle = (cat: CountryCategory) => {
    switch (cat) {
      case 'lived': return 'bg-emerald-50 text-emerald-800 border-emerald-150';
      case 'visited': return 'bg-indigo-50 text-indigo-800 border-indigo-150';
      case 'planned': return 'bg-amber-50 text-amber-800 border-amber-150';
      case 'want to visit': return 'bg-rose-50 text-rose-800 border-rose-150';
      case 'favorite': return 'bg-red-50 text-red-800 border-red-150';
    }
  };

  return (
    <div id="country-modal-drawer" className="fixed inset-0 z-50 flex items-center justify-end font-sans overflow-hidden">
      
      {/* Dark backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Floating Panel Slide-in Sheet */}
      <div 
        className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col items-stretch outline-none z-10 overflow-hidden"
      >
        
        {/* Header Ribbon */}
        <header className="px-6 py-5 border-b border-slate-100 shrink-0 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6.5 h-6.5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold font-mono text-[10px] text-indigo-700 select-none">
                {countryCode}
              </span>
              <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                {countryName} Journal Logs
              </h2>
            </div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
              <span>World Registry Database</span>
              <span>•</span>
              <span className="text-slate-500 font-sans normal-case font-bold bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded-md">
                Currency: {currency}
              </span>
            </p>
          </div>

          <button 
            id="close-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 transition-all rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Dynamic Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: Logs List Hub (showing all registered trips) */}
            {editingLogId === null && (
              <motion.div
                key="list-hub"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-400">
                    Stay & Travel Milestones ({logs.length})
                  </h3>
                  
                  <button
                    onClick={openNewLogForm}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl cursor-pointer shadow-sm hover:shadow active:scale-97 transition-all leading-none border-t border-indigo-500"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record New Visited / Stay
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-150 rounded-2xl py-12 px-6 text-center text-slate-450 flex flex-col items-center justify-center gap-1.5 bg-slate-50/20">
                    <Info className="w-6.5 h-6.5 text-slate-300" />
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">No Travel Records cataloged</h4>
                    <p className="text-xs max-w-sm font-sans">You haven't tracked stays or plans for {countryName} yet. Tap 'Record New Stay' above to add coordinates details.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {logs.map((log, index) => {
                      const budget = getLogBudget(log);
                      return (
                        <div 
                          key={log.id} 
                          className="border border-slate-150 rounded-2xl bg-white p-4.5 space-y-3 hover:border-slate-300 transition-all shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] uppercase font-mono font-black border border-slate-20o bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">
                                  Stay #{index + 1}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${getSubcategoryStyle(log.category)}`}>
                                  {log.category === 'lived' ? 'Lived Here' : 
                                   log.category === 'visited' ? 'Visited' : 
                                   log.category === 'planned' ? 'Planned trip' : 
                                   log.category === 'want to visit' ? 'Want to Visit' : 'Favorite'}
                                </span>
                              </div>
                              
                              <p className="text-[10px] text-slate-550 font-semibold mt-1">
                                {(log.category === 'visited' || log.category === 'lived') && log.startDate && (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Timeline: {log.startDate} &rarr; {log.endDate || 'Present'}
                                  </span>
                                )}
                                {log.category === 'planned' && log.plannedStartDate && (
                                  <span className="flex items-center gap-1.5 text-indigo-700">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    Upcoming Planned: {log.plannedStartDate} &rarr; {log.plannedEndDate || 'Once finished'}
                                  </span>
                                )}
                                {(log.category === 'want to visit' || log.category === 'favorite') && (
                                  <span className="text-slate-400 italic">Wishlist Pin</span>
                                )}
                              </p>
                            </div>

                            {/* Option actions on logs */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => loadLogIntoForm(log)}
                                className="p-1.5 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Edit Stay Log"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteLogItem(log.id)}
                                className="p-1.5 hover:bg-red-50 hover:border-red-200 text-slate-350 hover:text-red-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Delete Stay Log"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Cities list tag summary */}
                          {log.cities && log.cities.length > 0 && (
                            <div>
                              <span className="text-[8.5px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                                Cities Stayed
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {log.cities.map((city, cIdx) => (
                                  <span key={cIdx} className="px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-150 font-bold text-slate-600 rounded">
                                    📍 {city}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom Notes */}
                          {log.notes && (
                            <p className="text-xs italic text-slate-500 bg-slate-50 border border-slate-150/50 p-2.5 rounded-xl whitespace-pre-line leading-relaxed">
                              "{log.notes}"
                            </p>
                          )}

                          {/* Plan Budgets details */}
                          {log.category === 'planned' && budget > 0 && (
                            <div className="flex justify-end pt-1">
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5">
                                Log Budget: {formatCurrency(budget, currency)}
                              </span>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Critical unpin/delete country completely */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-4">
                  <p className="text-[10px] text-slate-400 font-bold max-w-xs uppercase tracking-wide leading-normal">
                    This unpins {countryName} from your travel coordinates and clears all associated travel logs from storage.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you absolutely sure you want to stop tracking ${countryName} entirely? This will irreversibly erase all registered stay logs and budget timelines.`)) {
                        onDelete(countryCode);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-red-650 font-bold border border-red-250 py-2.5 px-4 bg-red-50 hover:bg-red-100/70 hover:border-red-350 rounded-xl cursor-pointer transition-all shrink-0 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Unpin Country Completely
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: Log Editor Sub-View (Adding/editing single Visit/stay) */}
            {editingLogId !== null && (
              <motion.div
                key="edit-form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                {/* Back Link Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // If adding new log to an empty track AND canceling out, close modal altogether
                      if (editingLogId === 'new' && logs.length === 0) {
                        onClose();
                      } else {
                        setEditingLogId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer py-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Return to Travel Logs list
                  </button>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900">
                    {editingLogId === 'new' ? '+ Record Stay Milestone' : 'Update Milestone Details'}
                  </h3>
                </div>

                {/* Milestone category selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Milestone Status</label>
                  <div className="grid grid-cols-5 gap-1.5 bg-slate-50 border border-slate-150 p-1 rounded-2xl">
                    {(['visited', 'lived', 'planned', 'want to visit', 'favorite'] as CountryCategory[]).map((cat) => {
                      const isActive = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`py-2 text-[10px] font-black tracking-wide rounded-xl uppercase transition-all whitespace-nowrap cursor-pointer ${
                            isActive 
                              ? 'bg-slate-950 text-white shadow-sm' 
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          {cat === 'lived' ? 'Lived' : 
                          cat === 'visited' ? 'Visited' : 
                          cat === 'planned' ? 'Planned' : 
                          cat === 'want to visit' ? 'Want' : 'Loved'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VISITED & LIVED Timeline forms */}
                {(category === 'visited' || category === 'lived') && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-slate-600 block">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10.5px] font-bold text-slate-600 block">End Date</label>
                        {category === 'lived' && (
                          <label className="flex items-center gap-1 text-[9px] text-emerald-800 font-bold select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isStillLiving}
                              onChange={(e) => setIsStillLiving(e.target.checked)}
                              className="accent-emerald-700 w-3 h-3 cursor-pointer"
                            />
                            Currently Lived Here
                          </label>
                        )}
                      </div>
                      <input
                        type="date"
                        value={endDate}
                        disabled={category === 'lived' && isStillLiving}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* PLANNED Trip Timeline Form */}
                {category === 'planned' && (
                  <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/80">
                    <div className="flex items-center gap-2 text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150/60 p-2.5 rounded-xl mb-1 leading-normal">
                      <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                      <span>Specifying planned travels automatically generates Day timeline buckets for scheduling detailed stops.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">Trip Start Date</label>
                        <input
                          type="date"
                          value={plannedStartDate}
                          onChange={(e) => setPlannedStartDate(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">Trip End Date (Optional)</label>
                        <input
                          type="date"
                          value={plannedEndDate}
                          onChange={(e) => setPlannedEndDate(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cities visited/stay tag component (Only visited, lived, and planned) */}
                {(category === 'visited' || category === 'lived' || category === 'planned') && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Stops & Cities Tagging</label>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={cityInput}
                          onChange={(e) => setCityInput(e.target.value)}
                          onKeyDown={handleAddCityOnKeyDown}
                          placeholder="e.g. Kyoto, London, Barcelona..."
                          className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddCity}
                        className="bg-slate-900 text-white rounded-xl px-4 py-2 text-xs font-extrabold hover:bg-slate-800 transition-all cursor-pointer leading-none flex items-center justify-center border-t border-slate-700"
                      >
                        Add Tag
                      </button>
                    </div>

                    {cities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150/75">
                        {cities.map((city) => (
                          <div 
                            key={city}
                            className="bg-white border border-slate-200 text-slate-850 px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 select-none"
                          >
                            <span>📍 {city}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCity(city)}
                              className="text-slate-400 hover:text-red-650 cursor-pointer p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Standard journal musings Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Journal entries & general Notes</label>
                  <textarea
                    rows={3}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Write anything from favorite food spots to flight details or general wish-list reasons here..."
                    className="w-full text-xs border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-300 focus:bg-white focus:outline-none rounded-2xl p-4.5 font-bold text-slate-800 placeholder-slate-400 transition-all focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Day scheduler components panel if PLANNED travel selected */}
                {category === 'planned' && days.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                      Itinerary Planner Stops Scheduler
                    </label>

                    {/* Horizontal slider tab selector for day columns */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrolled-mini shrink-0">
                      {days.map((day, idx) => (
                        <button
                          key={day.dayNumber}
                          type="button"
                          onClick={() => {
                            setActiveDayIdx(idx);
                            setShowItemForm(false);
                          }}
                          className={`shrink-0 border py-2 px-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                            activeDayIdx === idx
                              ? 'bg-indigo-950 text-white border-transparent'
                              : 'bg-slate-50 text-slate-600 border-slate-150 hover:bg-slate-200/50'
                          }`}
                        >
                          Day {day.dayNumber}
                          {day.date && (
                            <span className="block text-[8.5px] font-medium text-slate-400 leading-none mt-0.5">
                              {day.date.split('-').slice(1).join('/')}
                            </span>
                          )}
                        </button>
                      ))}

                      {/* Instant Add and Delete Days fallback */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = days.length + 1;
                          setDays([...days, { dayNumber: nextNum, entries: [] }]);
                          setActiveDayIdx(nextNum - 1);
                        }}
                        className="shrink-0 p-2.5 bg-slate-100 border border-slate-250 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                        title="Add Extra Planning Day"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      
                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Do you want to strip out the last planning Day? This deletes any stop entries contained inside.")) {
                              setDays(days.slice(0, -1));
                              setActiveDayIdx(0);
                            }
                          }}
                          className="shrink-0 p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer"
                          title="Delete Last Planning Day"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-650" />
                        </button>
                      )}
                    </div>

                    {/* Active Day detailed list panel card */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 md:p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-black text-slate-800">
                          Scheduled Stops for Day {activeDayIdx + 1}
                          {days[activeDayIdx]?.date && (
                            <span className="text-slate-400 font-sans font-medium hover:underline text-[10px] ml-2 block sm:inline">
                              (Date: {days[activeDayIdx].date})
                            </span>
                          )}
                        </span>

                        {!showItemForm && (
                          <button
                            type="button"
                            onClick={() => setShowItemForm(true)}
                            className="bg-white hover:bg-slate-900 hover:text-white border border-slate-250 py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer shadow-2xs"
                          >
                            + Add Stop / Event
                          </button>
                        )}
                      </div>

                      {/* ADD STOP DRAWER MODAL FORM inside list item */}
                      {showItemForm && (
                        <form onSubmit={handleSaveItineraryItem} className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-[11px] uppercase font-black tracking-wider text-slate-450 Block leading-none">Add Plan Step details</span>
                            <button 
                              type="button"
                              onClick={() => {
                                setShowItemForm(false);
                                resetItemForm();
                              }}
                              className="text-slate-350 hover:text-slate-700 cursor-pointer leading-none"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-slate-400 block">Category</label>
                              <select
                                value={itemCategory}
                                onChange={(e) => setItemCategory(e.target.value as any)}
                                className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2 py-1.5 focus:outline-none"
                              >
                                <option value="activity">⛰️ Activity / Tour</option>
                                <option value="attraction">📸 Sightseeing / Attraction</option>
                                <option value="food">🍴 Dine / Food</option>
                                <option value="flight">✈️ Flight / Transit</option>
                                <option value="accommodation">🏨 Hotel / Stay</option>
                                <option value="tour">🚶 Walk / Guide</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-slate-400 block">Stop Title</label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="e.g. visit Kyoto Castle"
                                className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-slate-400 block">Time (Optional)</label>
                              <input
                                type="text"
                                value={itemTime}
                                onChange={(e) => setItemTime(e.target.value)}
                                placeholder="e.g. 09:30 AM or Evening"
                                className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-slate-400 block">Price ({currency})</label>
                              <input
                                type="number"
                                value={itemPrice}
                                min="0"
                                step="any"
                                onChange={(e) => setItemPrice(e.target.value)}
                                placeholder="Estimate price cost"
                                className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Stop description notes */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-400 block">Notes</label>
                            <input
                              type="text"
                              value={itemNotes}
                              onChange={(e) => setItemNotes(e.target.value)}
                              placeholder="e.g. Bring cameras, cash only, reserve spots..."
                              className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none"
                            />
                          </div>

                          {/* Link attachment adder */}
                          <div className="space-y-1 pt-1.5 border-t border-slate-50">
                            <label className="text-[9px] font-bold uppercase text-slate-450 block">Links / Bookings Attachments</label>
                            <div className="flex gap-1.5">
                              <input
                                type="url"
                                value={itemLinkInput}
                                onChange={(e) => setItemLinkInput(e.target.value)}
                                placeholder="Paste reservation, flight PDF links, map Pins..."
                                className="flex-1 border border-slate-200 rounded-lg text-[10px] px-2 py-1 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleAddLinkInForm}
                                className="bg-slate-100 border border-slate-250 hover:bg-slate-200 text-[10px] font-bold rounded-lg px-2.5"
                              >
                                Attach
                              </button>
                            </div>

                            {itemLinks.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {itemLinks.map((link) => (
                                  <div key={link} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-[9px] font-semibold text-indigo-700 rounded px-1.5 mr-1 mb-1">
                                    <span className="truncate max-w-32">{link.replace('https://', '').replace('http://', '')}</span>
                                    <button type="button" onClick={() => handleRemoveLinkInForm(link)} className="text-slate-400 hover:text-red-650 cursor-pointer">
                                      &times;
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Photo upload convert adder */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-455 block">Photos (Base64 uploads or URL Links)</label>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              {/* upload file */}
                              <label className="border border-dashed border-slate-300 hover:border-slate-500 rounded-lg px-2.5 py-1 flex items-center justify-center text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer select-none">
                                <ImageIcon className="w-3.5 h-3.5 mr-1 text-slate-450" />
                                Extract Photo file...
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUploadInForm}
                                  className="hidden"
                                />
                              </label>

                              {/* url link */}
                              <div className="flex gap-1">
                                <input
                                  type="url"
                                  value={itemPhotoInput}
                                  onChange={(e) => setItemPhotoInput(e.target.value)}
                                  placeholder="Or paste external image URL..."
                                  className="flex-1 border border-slate-200 rounded-lg text-[9px] px-2 py-1 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddPhotoUrlInForm}
                                  className="bg-slate-100 border border-slate-250 text-[10px] font-bold rounded-lg px-1.5"
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            {itemPhotos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {itemPhotos.map((img) => (
                                  <div key={img} className="relative w-12 h-12 aspect-square rounded border border-slate-250 overflow-hidden shrink-0 group">
                                    <img src={img} alt="Attach element" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemovePhotoInForm(img)} 
                                      className="absolute inset-0 bg-red-650/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg px-4.5 py-1.5 text-xs font-black shadow-xs hover:shadow active:scale-97 cursor-pointer border-t border-indigo-400"
                            >
                              Add Stop to Day {activeDayIdx + 1}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Display scheduled stops for selected day */}
                      <div className="space-y-2">
                        {(!days[activeDayIdx]?.entries || days[activeDayIdx].entries.length === 0) ? (
                          <div className="py-8 text-center text-slate-400 italic text-[11px] font-medium">
                            No planned stops logged for Day {activeDayIdx + 1} yet. Add sightseeing spots, flights, or hotels to build your schedule!
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {days[activeDayIdx].entries.map((item) => (
                              <div 
                                key={item.id} 
                                className="bg-white border border-slate-150 p-3.5 rounded-xl flex items-start gap-3 shadow-3xs hover:border-slate-300 transition-all select-none"
                              >
                                <div className="p-2 bg-slate-50 border border-slate-150 rounded-lg text-slate-800 shrink-0 font-bold">
                                  {item.category === 'food' ? '🍴' : 
                                   item.category === 'attraction' ? '📸' : 
                                   item.category === 'flight' ? '✈' : 
                                   item.category === 'accommodation' ? '🏨' : 
                                   item.category === 'tour' ? '🚶' : '⛰️'}
                                </div>

                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                      ({item.category})
                                    </span>
                                  </div>

                                  {item.notes && <p className="text-[10px] text-slate-550 italic leading-relaxed">"{item.notes}"</p>}

                                  {/* Sub details metrics */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {item.time && (
                                      <span className="text-[9px] text-slate-450 font-bold bg-slate-50 border border-slate-150 rounded px-1.5">
                                        ⏰ {item.time}
                                      </span>
                                    )}
                                    {item.price !== undefined && (
                                      <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5">
                                        {formatCurrency(item.price, currency)}
                                      </span>
                                    )}
                                    
                                    {/* Link and Photo counts indicators */}
                                    {item.links && (
                                      <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 font-bold">
                                        🔗 {item.links.length} Attached Links
                                      </span>
                                    )}
                                    {item.photos && (
                                      <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 font-bold">
                                        🖼️ {item.photos.length} Attached Photos
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItineraryItem(activeDayIdx + 1, item.id)}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-650 rounded-lg transition-all cursor-pointer"
                                  title="Delete Event Stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* Sub edit actions */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingLogId === 'new' && logs.length === 0) {
                        onClose();
                      } else {
                        setEditingLogId(null);
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer text-slate-650"
                  >
                    Cancel / Back
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitLogForm}
                    className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all border-t border-indigo-500 cursor-pointer"
                  >
                    Done & Save Stay Log
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
      
    </div>
  );
}
