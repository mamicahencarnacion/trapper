import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, MapPin, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, 
  DollarSign, Clock, ListTodo, AlertCircle, Sparkles, Check, ChevronRight, ChevronsUpDown, Info
} from 'lucide-react';
import { CountryTrack, CountryCategory, DayItinerary, ItineraryEntry } from '../types';

interface CountryModalProps {
  countryCode: string;
  countryName: string;
  existingTrack: CountryTrack | null;
  onSave: (track: CountryTrack) => void;
  onDelete: (countryCode: string) => void;
  onClose: () => void;
}

export default function CountryModal({
  countryCode,
  countryName,
  existingTrack,
  onSave,
  onDelete,
  onClose
}: CountryModalProps) {
  // Category Selection
  const [category, setCategory] = useState<CountryCategory>('visited');
  
  // Visited & Lived States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isStillLiving, setIsStillLiving] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  // Planned States
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0); // Which day is currently selected to view/edit itinerary

  // Editor states for creating a NEW itinerary entry
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

  // Notes/General Wishlist for favorites/want to visit
  const [generalNotes, setGeneralNotes] = useState('');

  // Hydrate form states with existingTrack when opened/updated
  useEffect(() => {
    if (existingTrack) {
      setCategory(existingTrack.category);
      setStartDate(existingTrack.startDate || '');
      setEndDate(existingTrack.endDate || '');
      setIsStillLiving(existingTrack.category === 'lived' && !existingTrack.endDate);
      setCities(existingTrack.cities || []);
      setPlannedStartDate(existingTrack.plannedStartDate || '');
      setPlannedEndDate(existingTrack.plannedEndDate || '');
      setDays(existingTrack.itinerary || []);
    } else {
      // Default resetting
      setCategory('visited');
      setStartDate('');
      setEndDate('');
      setIsStillLiving(false);
      setCities([]);
      setPlannedStartDate('');
      setPlannedEndDate('');
      setDays([]);
      setActiveDayIdx(0);
    }
    // Dismiss active sub-forms from previous countries
    setShowItemForm(false);
    resetItemForm();
  }, [existingTrack, countryCode]);

  // Handle active day index auto alignment when itinerary is modified
  useEffect(() => {
    if (days.length > 0 && activeDayIdx >= days.length) {
      setActiveDayIdx(0);
    }
  }, [days, activeDayIdx]);

  // Calculate planned duration when start/end dates change
  useEffect(() => {
    if (!plannedStartDate) {
      // If no start date, let's keep at least 1 generic planning bucket (e.g. Day 1) if they request it, 
      // but otherwise reset to empty or single general bucket
      if (days.length === 0) {
        setDays([{ dayNumber: 1, entries: [] }]);
      }
      return;
    }

    const start = new Date(plannedStartDate);
    const end = plannedEndDate ? new Date(plannedEndDate) : new Date(plannedStartDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    // Calculate difference in calendar days
    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    // Rebuild or preserve existing entries for these days
    const updatedDays: DayItinerary[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + (d - 1));
      const formattedDate = currentDate.toISOString().split('T')[0];

      // Find if we already have entries logged for this day number in existing state
      const existingDay = days.find(di => di.dayNumber === d);
      updatedDays.push({
        dayNumber: d,
        date: formattedDate,
        entries: existingDay ? existingDay.entries : []
      });
    }

    setDays(updatedDays);
  }, [plannedStartDate, plannedEndDate]);

  // Reset new Itinerary Entry state inputs
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

  // Add City to array
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

  // Append temporary links/photos to active active item form
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

  // Paste base64 conversion or manual link
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
    // Reset file input target
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

  // Save specific Itinerary item inside active day object
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

  // Remove specific itinerary item reference
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

  // Compute Itinerary Specific Stats
  const selectedDayTotalBudget = useMemo(() => {
    const currentDay = days[activeDayIdx];
    if (!currentDay) return 0;
    return currentDay.entries.reduce((acc, current) => acc + (current.price || 0), 0);
  }, [days, activeDayIdx]);

  const itineraryTotalBudget = useMemo(() => {
    return days.reduce((acc, day) => {
      return acc + day.entries.reduce((dayAcc, entry) => dayAcc + (entry.price || 0), 0);
    }, 0);
  }, [days]);

  // Submit complete country status configuration
  const handleSaveCountrySettings = () => {
    const finalizedTrack: CountryTrack = {
      id: countryCode, 
      countryCode,
      countryName,
      category,
      
      // Visited & Lived dates preservation
      startDate: (category === 'visited' || category === 'lived') && startDate ? startDate : undefined,
      endDate: (category === 'lived' && isStillLiving) ? undefined : (category === 'visited' || category === 'lived') && endDate ? endDate : undefined,
      cities: cities.length > 0 ? cities : undefined,

      // Planned
      plannedStartDate: category === 'planned' && plannedStartDate ? plannedStartDate : undefined,
      plannedEndDate: category === 'planned' && plannedEndDate ? plannedEndDate : undefined,
      itinerary: category === 'planned' ? days : undefined
    };

    onSave(finalizedTrack);
    onClose();
  };

  // Form helper templates
  const categoryOptions: { val: CountryCategory; label: string; desc: string; color: string }[] = [
    { val: 'visited', label: 'Visited', desc: 'Landed, traveled or explored this region.', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
    { val: 'lived', label: 'Lived', desc: 'Resided for work, study or temporary base.', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
    { val: 'planned', label: 'Planned', desc: 'Upcoming scheduled trip / comprehensive itinerary.', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
    { val: 'want to visit', label: 'Want to Visit', desc: 'Ultimate travel bucket list destinations.', color: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
    { val: 'favorite', label: 'Favorite', desc: 'Special country closest to your heart.', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  ];

  const getItineraryIcon = (cat: ItineraryEntry['category']) => {
    switch (cat) {
      case 'food': return '🍴';
      case 'attraction': return '📸';
      case 'tour': return '🚶';
      case 'activity': return '⛰️';
      case 'flight': return '✈️';
      case 'accommodation': return '🏨';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-end md:justify-center bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
        
        {/* Click outside to close standard backdrop overlay */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal responsive slider panel container */}
        <motion.div
          id="country-details-panel"
          initial={{ x: '100%', opacity: 0.9 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative bg-white w-full md:max-w-xl xl:max-w-2xl h-full md:h-[92vh] md:rounded-3xl shadow-2xl flex flex-col items-stretch outline-none overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 md:p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">{countryName}</span>
                <span className="text-xs uppercase font-mono bg-slate-200/70 border border-slate-300 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                  {countryCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {existingTrack ? `Configuring pinned coordinates settings` : 'Add status to your personalized map tracker'}
              </p>
            </div>
            <button
              onClick={onClose}
              id="close-country-modal-btn"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scrollable Body */}
          <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-6">
            
            {/* 1. Category selector pill cards */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                Select Category Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categoryOptions.map((opt) => {
                  const isActive = category === opt.val;
                  return (
                    <button
                      key={opt.val}
                      id={`category-btn-${opt.val.replace(/ /g, '-')}`}
                      onClick={() => setCategory(opt.val)}
                      type="button"
                      className={`px-3.5 py-2.5 text-left rounded-xl border text-xs font-medium flex flex-col justify-between transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-slate-900 border-slate-950 text-white shadow-sm scale-[1.02]' 
                          : opt.color
                      }`}
                    >
                      <span className="font-semibold block">{isActive ? `✓ ${opt.label}` : opt.label}</span>
                      <span className={`text-[10px] block mt-1 leading-normal ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Toggle Visited / Lived Timeline options */}
            {(category === 'visited' || category === 'lived') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Stay Timelines</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-600">End Date</label>
                      {category === 'lived' && (
                        <label className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isStillLiving}
                            onChange={(e) => {
                              setIsStillLiving(e.target.checked);
                              if (e.target.checked) setEndDate('');
                            }}
                            className="rounded accent-emerald-600 cursor-pointer text-xs"
                          />
                          Still living here
                        </label>
                      )}
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      disabled={category === 'lived' && isStillLiving}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                        (category === 'loved' || (category === 'lived' && isStillLiving)) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Cities tracking (Optional for all, highly encouraged for visited/lived) */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Cities Explored (Optional)
                  </h3>
                </div>
                <span className="text-[10px] bg-slate-200/70 text-slate-600 font-bold px-1.5 py-0.5 rounded-full">
                  {cities.length}
                </span>
              </div>

              {/* Tag interface of added cities */}
              {cities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cities.map((city) => (
                    <span 
                      key={city}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-800 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      {city}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCity(city)}
                        className="text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag helper input row */}
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  placeholder="Type city name (e.g. Paris, Lyon) and press Enter"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={handleAddCityOnKeyDown}
                  className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCity}
                  className="px-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* 4. Planned 여행 Itinerary Editor Day Planner */}
            {category === 'planned' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Dates configuration */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-amber-150">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Travel Dates & Budget</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-amber-800">Departure Date</label>
                      <input
                        type="date"
                        value={plannedStartDate}
                        onChange={(e) => setPlannedStartDate(e.target.value)}
                        className="w-full text-xs p-2.5 border border-amber-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-amber-800">Return Date</label>
                      <input
                        type="date"
                        value={plannedEndDate}
                        onChange={(e) => setPlannedEndDate(e.target.value)}
                        className="w-full text-xs p-2.5 border border-amber-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-amber-900 border-t border-amber-150/70 pt-2.5 mt-1 font-semibold">
                    <span className="flex items-center gap-1 font-bold">
                      <Info className="w-3.5 h-3.5 inline text-amber-700" />
                      Plan Duration: {days.length} Day(s)
                    </span>
                    <span className="text-indigo-900 text-sm font-extrabold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                      Itinerary Budget: ${itineraryTotalBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Day navigation tabs */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Choose Schedule Day
                  </span>
                  
                  {/* Horizontally scrolling list of days */}
                  <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                    {days.map((day, idx) => {
                      const isActive = activeDayIdx === idx;
                      return (
                        <button
                          key={day.dayNumber}
                          type="button"
                          onClick={() => setActiveDayIdx(idx)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-slate-950 border-slate-950 text-white' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Day {day.dayNumber}
                          {day.date && (
                            <span className={`block text-[8px] font-normal mt-0.5 ${isActive ? 'text-slate-350' : 'text-slate-400'}`}>
                              {day.date.substring(5)} {/* MM-DD */}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active day's logs and creation */}
                {days[activeDayIdx] && (
                  <div className="bg-slate-50 border border-slate-150/70 rounded-2xl p-4 md:p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          Day {days[activeDayIdx].dayNumber} Activities
                        </h4>
                        {days[activeDayIdx].date && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{days[activeDayIdx].date}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowItemForm(!showItemForm)}
                        className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Event
                      </button>
                    </div>

                    {/* New Event Collapsible Form */}
                    {showItemForm && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onSubmit={handleSaveItineraryItem}
                        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs"
                      >
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center justify-between">
                          <span>Log New Activity</span>
                          <button 
                            type="button" 
                            onClick={() => setShowItemForm(false)}
                            className="text-slate-400 hover:text-slate-600 text-[10px]"
                          >
                            Cancel
                          </button>
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Title */}
                          <div className="space-y-0.5 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Activity Title *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Flight to Tokyo, Sushi Dinner, Louvre Museum..."
                              value={itemTitle}
                              onChange={(e) => setItemTitle(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>

                          {/* Category */}
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Category</label>
                            <select
                              value={itemCategory}
                              onChange={(e) => setItemCategory(e.target.value as any)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="activity">⛺ Activity</option>
                              <option value="attraction">📸 Attraction</option>
                              <option value="food">🍴 Food / Dining</option>
                              <option value="tour">🚶 Tour</option>
                              <option value="flight">✈️ Flight / Transit</option>
                              <option value="accommodation">🏨 Hotel / Accommodation</option>
                            </select>
                          </div>

                          {/* Time */}
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Est. Time</label>
                            <input
                              type="time"
                              value={itemTime}
                              onChange={(e) => setItemTime(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>

                          {/* Price */}
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Price / Cost (USD)</label>
                            <div className="relative">
                              <DollarSign className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="space-y-0.5 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Notes & Directions</label>
                            <textarea
                              rows={2}
                              placeholder="Booking details, meeting spot guidance, things to pack..."
                              value={itemNotes}
                              onChange={(e) => setItemNotes(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>

                          {/* Links Array attachments */}
                          <div className="space-y-0.5 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Attach Links (Google Maps, Airbnb etc)</label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder="https://example.com/reservation"
                                value={itemLinkInput}
                                onChange={(e) => setItemLinkInput(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                              <button
                                type="button"
                                onClick={handleAddLinkInForm}
                                className="px-3 bg-slate-900 text-white text-xs rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-800"
                              >
                                Add
                              </button>
                            </div>
                            {itemLinks.length > 0 && (
                              <div className="flex flex-col gap-1 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {itemLinks.map(l => (
                                  <div key={l} className="flex items-center justify-between text-xs text-indigo-600 truncate break-all">
                                    <span className="truncate flex items-center gap-1 font-semibold">
                                      <LinkIcon className="w-3 h-3 text-slate-400" />
                                      {l}
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveLinkInForm(l)}
                                      className="text-red-500 text-[10px] hover:underline px-1 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Photo URL & Base64 upload */}
                          <div className="space-y-1 sm:col-span-2 border-t border-slate-100 pt-3">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block pb-1">
                              Attach Photos (Files / Paste Web URLs)
                            </label>
                            
                            {/* Two options: Drag file or paste link */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Option A: file selection */}
                              <div className="relative border border-dashed border-slate-200 rounded-lg p-2.5 hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col items-center justify-center text-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUploadInForm}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <ImageIcon className="w-4 h-4 text-slate-400 mb-1" />
                                <span className="text-[10px] font-medium text-slate-600 block">Upload Local Photo</span>
                              </div>

                              {/* Option B: input url */}
                              <div className="flex flex-col gap-1.5 justify-end">
                                <div className="flex gap-1">
                                  <input
                                    type="url"
                                    placeholder="Or paste web image link"
                                    value={itemPhotoInput}
                                    onChange={(e) => setItemPhotoInput(e.target.value)}
                                    className="w-full text-[11px] p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddPhotoUrlInForm}
                                    className="px-2.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] rounded-lg cursor-pointer hover:bg-slate-200 font-semibold"
                                  >
                                    Embed
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Render uploaded list in form */}
                            {itemPhotos.length > 0 && (
                              <div className="grid grid-cols-4 gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-150">
                                {itemPhotos.map((p, idx) => (
                                  <div key={idx} className="relative aspect-video rounded border border-slate-200 overflow-hidden group">
                                    <img src={p} alt="itinerary preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePhotoInForm(p)}
                                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                        <button
                          type="submit"
                          className="w-full text-xs font-bold uppercase tracking-wider py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Confirm & Save Event
                        </button>
                      </motion.form>
                    )}

                    {/* Rendering of Daily Activities list */}
                    {days[activeDayIdx].entries.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                        <ListTodo className="w-6 h-6 text-slate-300" />
                        <p className="text-xs font-medium">Empty itinerary logs for today.</p>
                        <p className="text-[10px]">Create an event using the "Add Event" trigger above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {days[activeDayIdx].entries.map((entry) => (
                          <div 
                            key={entry.id}
                            className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 shadow-xs relative"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-2.5">
                                <span className="text-base shrink-0 bg-slate-100 p-1 rounded-md">
                                  {getItineraryIcon(entry.category)}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">{entry.title}</span>
                                    <span className="text-[10px] uppercase font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md font-bold">
                                      {entry.category}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-3.5 text-[10px] text-slate-500 font-sans tracking-wide mt-1">
                                    {entry.time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {entry.time}
                                      </span>
                                    )}
                                    {entry.price !== undefined && (
                                      <span className="flex items-center gap-0.5 font-bold text-slate-800">
                                        <DollarSign className="w-3.5 h-3.5 text-slate-400 inline" />
                                        {entry.price} USD
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItineraryItem(days[activeDayIdx].dayNumber, entry.id)}
                                className="p-1 text-slate-350 hover:text-red-500 rounded hover:bg-slate-50 transition-colors cursor-pointer absolute right-2.5 top-2.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Optional Notes */}
                            {entry.notes && (
                              <p className="text-[11px] text-slate-500 leading-normal bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                "{entry.notes}"
                              </p>
                            )}

                            {/* Render links in item */}
                            {entry.links && entry.links.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {entry.links.map(l => (
                                  <a
                                    key={l}
                                    href={l}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 transition-colors text-[10px] font-bold text-indigo-800 rounded-md truncate max-w-[200px]"
                                  >
                                    <LinkIcon className="w-3 h-3 shrink-0" />
                                    Booking Link
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Render photos attached to entry */}
                            {entry.photos && entry.photos.length > 0 && (
                              <div className="grid grid-cols-4 gap-1.5 mt-1">
                                {entry.photos.map((ph, idx) => (
                                  <a 
                                    key={idx} 
                                    href={ph} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded shadow-xs border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity"
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

                    <div className="text-right text-xs text-slate-500 font-medium">
                      Day Budget: <span className="font-extrabold text-slate-800">${selectedDayTotalBudget.toLocaleString()}</span>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* General notes for Buckellist wants & Favorites */}
            {(category === 'want to visit' || category === 'favorite') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
              >
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  Wishlist & Travel Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Record your thoughts! Best time/season to visit, why you love this place, culinary preferences, or packing items..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 mt-2"
                />
              </motion.div>
            )}

          </div>

          {/* Footer Save Deck */}
          <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
            {existingTrack ? (
              <button
                type="button"
                id="delete-country-btn"
                onClick={() => {
                  onDelete(countryCode);
                  onClose();
                }}
                className="px-4 py-2.5 text-xs text-red-650 bg-red-50 hover:bg-red-100 rounded-xl font-bold flex items-center gap-1 border border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Unpin
              </button>
            ) : (
              <div /> // spacing filler
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="save-country-btn"
                onClick={handleSaveCountrySettings}
                className="px-5 py-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Save Category
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
