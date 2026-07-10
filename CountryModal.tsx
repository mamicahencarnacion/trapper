import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, MapPin, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, 
  DollarSign, Clock, ListTodo, AlertCircle, Sparkles, Check, ChevronLeft, ChevronRight, ChevronsUpDown, Info, Edit, ArrowLeft, Heart, Award, Eye, Star
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

function classifyTimeBlock(timeStr: string): 'morning' | 'afternoon' | 'evening' {
  if (!timeStr) return 'morning';
  const upper = timeStr.toUpperCase();
  const isPM = upper.includes('PM');
  const isAM = upper.includes('AM');
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 'morning';
  const hour = parseInt(match[1], 10);
  
  if (isPM || isAM) {
    if (isPM) {
      if (hour === 12 || hour < 6) return 'afternoon';
      return 'evening';
    } else {
      if (hour === 12 || hour < 6) return 'evening';
      return 'morning';
    }
  } else {
    // 24-hour format
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  const upper = timeStr.toUpperCase();
  if (upper.includes('AM') || upper.includes('PM')) {
    return timeStr;
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const min = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${min} ${ampm}`;
  }
  return timeStr;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date();
};

function CalendarPicker({
  startDate,
  endDate,
  onRangeChange,
  isStillLiving = false,
  category
}: {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  isStillLiving?: boolean;
  category: string;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initialDate = startDate ? parseLocalDate(startDate) : new Date();
    return isNaN(initialDate.getTime()) ? new Date() : initialDate;
  });

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const lastSyncedDateRef = React.useRef(startDate);

  // Sync currentMonth when startDate is edited manually/changed
  useEffect(() => {
    if (startDate && startDate !== lastSyncedDateRef.current) {
      const d = parseLocalDate(startDate);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d);
      }
      lastSyncedDateRef.current = startDate;
    } else if (!startDate) {
      lastSyncedDateRef.current = '';
    }
  }, [startDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Helper formats
  const formatDateString = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const dayClick = (dayNum: number) => {
    const dateStr = formatDateString(year, month, dayNum);
    if (!startDate || (startDate && endDate)) {
      onRangeChange(dateStr, '');
    } else {
      if (dateStr < startDate) {
        onRangeChange(dateStr, '');
      } else {
        onRangeChange(startDate, dateStr);
      }
    }
  };

  // Days of previous month to pad the first week
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDaysCount = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Pad previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevDayNum = prevMonthDaysCount - i;
      cells.push({
        dayNum: prevDayNum,
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        dayNum: i,
        dateStr: formatDateString(year, month, i),
        isCurrentMonth: true
      });
    }

    // Pad next month days to make grid multi-row uniform (usually 42 cells = 6 rows)
    const totalCells = cells.length;
    const nextMonthPadding = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= nextMonthPadding; i++) {
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      cells.push({
        dayNum: i,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    return cells;
  }, [year, month, firstDayIndex, daysInMonth, prevMonthDaysCount]);

  // Check if dates are in range
  const isSelectedStart = (dateStr: string) => startDate === dateStr;
  const isSelectedEnd = (dateStr: string) => endDate === dateStr;
  
  const isInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr > startDate && dateStr < endDate;
  };

  const isInHoverRange = (dateStr: string) => {
    if (!startDate || endDate || !hoveredDate) return false;
    return dateStr > startDate && dateStr <= hoveredDate;
  };

  // Preset generator helpers
  const handleApplyPreset = (daysDiff: number) => {
    if (!startDate) return;
    const baseDate = parseLocalDate(startDate);
    const end = new Date(baseDate);
    end.setDate(end.getDate() + daysDiff);
    const endStr = formatDateString(end.getFullYear(), end.getMonth(), end.getDate());
    onRangeChange(startDate, endStr);
  };

  const handleApplyTodayPreset = (daysDiff: number) => {
    const today = new Date();
    const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today);
    end.setDate(end.getDate() + daysDiff);
    const endStr = formatDateString(end.getFullYear(), end.getMonth(), end.getDate());
    onRangeChange(todayStr, endStr);
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(year, newMonth, 1));
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(newYear, month, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
      {/* Calendar Header with Pickable Month & Year Dropdowns */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex items-center gap-1">
            {/* Month Dropdown */}
            <select
              value={month.toString()}
              onChange={handleMonthSelect}
              className="text-[11px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-250 hover:border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
            >
              {monthNames.map((name, mIdx) => (
                <option key={mIdx} value={mIdx.toString()} className="font-sans normal-case text-xs text-slate-800 bg-white">
                  {name}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={year.toString()}
              onChange={handleYearSelect}
              className="text-[11px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-250 hover:border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
            >
              {Array.from({ length: 70 }, (_, i) => {
                const yVal = new Date().getFullYear() + 5 - i;
                return (
                  <option key={yVal} value={yVal.toString()} className="font-sans text-xs text-slate-800 bg-white">
                    {yVal}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-650 cursor-pointer transition-all flex items-center justify-center"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-650 cursor-pointer transition-all flex items-center justify-center"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, dIdx) => (
          <span key={dIdx} className="text-[10px] font-black uppercase text-slate-400 select-none py-1">
            {day}
          </span>
        ))}

        {calendarCells.map((cell, idx) => {
          const isStart = isSelectedStart(cell.dateStr);
          const isEnd = isSelectedEnd(cell.dateStr);
          const inRange = isInRange(cell.dateStr);
          const hoverRange = isInHoverRange(cell.dateStr);

          let cellClass = "relative py-2 text-[11px] font-bold transition-all rounded-lg cursor-pointer max-w-full flex items-center justify-center ";
          if (isStart) {
            cellClass += "bg-indigo-600 text-white shadow-xs font-black rounded-r-none";
          } else if (isEnd) {
            cellClass += "bg-indigo-600 text-white shadow-xs font-black rounded-l-none";
          } else if (inRange) {
            cellClass += "bg-indigo-50 text-indigo-900 rounded-none hover:bg-indigo-100";
          } else if (hoverRange) {
            cellClass += "bg-indigo-50/60 text-indigo-950 rounded-none border-y border-dashed border-indigo-200";
          } else if (!cell.isCurrentMonth) {
            cellClass += "text-slate-300 hover:bg-slate-200/50 hover:text-slate-500";
          } else {
            cellClass += "text-slate-700 hover:bg-slate-200 hover:text-slate-900";
          }

          // Highlight Today
          const today = new Date();
          const isToday = formatDateString(today.getFullYear(), today.getMonth(), today.getDate()) === cell.dateStr;
          if (isToday && !isStart && !isEnd) {
            cellClass += " border border-indigo-400 font-extrabold";
          }

          return (
            <button
              key={`${cell.dateStr}-${idx}`}
              type="button"
              onClick={() => dayClick(cell.dayNum)}
              onMouseEnter={() => setHoveredDate(cell.dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              className={cellClass}
            >
              <span>{cell.dayNum}</span>
              {isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-505" />
              )}
            </button>
          );
        })}
      </div>

      {/* Help Tip */}
      <p className="text-[10px] text-slate-450 italic leading-snug">
        {!startDate ? (
          <span>Select first date to set your <b>start date</b>.</span>
        ) : !endDate && !isStillLiving ? (
          <span>Select second date to lock <b>end date</b>, or use presets below.</span>
        ) : (
          <span>Click any date to reset selection range.</span>
        )}
      </p>

      {/* Presets Grid */}
      <div className="border-t border-slate-200/60 pt-3 space-y-2">
        <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">
          ⚡ 1-Click Stay Presets
        </label>

        {startDate ? (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 block">
              Set stay length starting from {startDate}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '3 Days', val: 2 },
                { label: '5 Days', val: 4 },
                { label: '1 Week', val: 6 },
                { label: '10 Days', val: 9 },
                { label: '2 Weeks', val: 13 },
                { label: '3 Weeks', val: 20 },
                { label: '1 Month', val: 30 }
              ].map((pSet) => (
                <button
                  key={pSet.label}
                  type="button"
                  onClick={() => handleApplyPreset(pSet.val)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 border border-indigo-200 rounded-lg shadow-3xs cursor-pointer transition-all active:scale-95"
                >
                  +{pSet.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 block">
              Set stay range starting from Today:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '3 Days Stay', val: 2 },
                { label: '5 Days Stay', val: 4 },
                { label: '1 Week Stay', val: 6 },
                { label: '10 Days Stay', val: 9 },
                { label: '2 Weeks Stay', val: 13 },
                { label: '1 Month Stay', val: 30 }
              ].map((pSet) => (
                <button
                  key={pSet.label}
                  type="button"
                  onClick={() => handleApplyTodayPreset(pSet.val)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 border border-indigo-200 rounded-lg shadow-3xs cursor-pointer transition-all active:scale-95"
                >
                  {pSet.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(startDate || endDate) && (
          <div className="flex items-center justify-between gap-4 bg-slate-100 p-2.5 text-[11px] rounded-xl border border-slate-150">
            <div className="font-bold text-slate-700">
              Range: <span className="text-indigo-700 font-mono">{startDate || '...'}</span> &rarr; <span className="text-indigo-700 font-mono">{endDate || (isStillLiving ? 'Present (Ongoing)' : '...')}</span>
            </div>
            <button
              type="button"
              onClick={() => onRangeChange('', '')}
              className="px-2 py-0.5 text-[9.5px] font-black uppercase text-red-650 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CountryModal({
  countryCode,
  countryName,
  existingTrack,
  onSave,
  onDelete,
  onClose,
  currency = 'PHP'
}: CountryModalProps) {
  
  // List of all logs in local state
  const [logs, setLogs] = useState<TravelLog[]>([]);
  const [isLoved, setIsLoved] = useState(false);
  const [wantToVisit, setWantToVisit] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmStopTracking, setConfirmStopTracking] = useState<boolean>(false);
  const [confirmStripDay, setConfirmStripDay] = useState<boolean>(false);
  
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
  const [validationError, setValidationError] = useState<string | null>(null);

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
      setIsLoved(!!existingTrack.isLoved);
      setWantToVisit(!!existingTrack.wantToVisit);
      if (existingTrack.logs && existingTrack.logs.length > 0) {
        setLogs(existingTrack.logs);
        setEditingLogId(null); // default to list hub
      } else if (existingTrack.category && (existingTrack.startDate || existingTrack.plannedStartDate || existingTrack.cities?.length)) {
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
      } else {
        setLogs([]);
        setEditingLogId(null);
      }
    } else {
      // Unpinned country - initialize cleanly with empty logs and let users decide to add or just toggle LOVED/WANT!
      setIsLoved(false);
      setWantToVisit(false);
      setLogs([]);
      setEditingLogId(null);
    }
  }, [existingTrack, countryCode]);

  const handleToggleLoved = () => {
    const nextLoved = !isLoved;
    setIsLoved(nextLoved);
    
    // If they have no logs and both toggles are off, delete/unpin the country!
    if (!nextLoved && !wantToVisit && logs.length === 0) {
      onDelete(countryCode);
      onClose();
    } else {
      // Auto-save the updated loved preference!
      onSave({
        id: countryCode,
        countryCode,
        countryName,
        category: logs.length > 0 ? getPrimaryCategory(logs) : 'visited',
        logs: logs,
        isLoved: nextLoved,
        wantToVisit: wantToVisit
      });
    }
  };

  const handleToggleWantToVisit = () => {
    const nextWant = !wantToVisit;
    setWantToVisit(nextWant);
    
    // If they have no logs and both toggles are off, delete/unpin the country!
    if (!isLoved && !nextWant && logs.length === 0) {
      onDelete(countryCode);
      onClose();
    } else {
      // Auto-save the updated want to visit preference!
      onSave({
        id: countryCode,
        countryCode,
        countryName,
        category: logs.length > 0 ? getPrimaryCategory(logs) : 'visited',
        logs: logs,
        isLoved: isLoved,
        wantToVisit: nextWant
      });
    }
  };

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
    setValidationError(null);
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
    setValidationError(null);
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
    const parts = cityInput.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      const newCities = [...cities];
      parts.forEach(part => {
        if (!newCities.includes(part)) {
          newCities.push(part);
        }
      });
      setCities(newCities);
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
    const nextLogs = logs.filter(l => l.id !== logId);
    setLogs(nextLogs);
    
    if (nextLogs.length === 0) {
      // If no logs left and also no toggles active, delete/unpin the country completely
      if (!isLoved && !wantToVisit) {
        onDelete(countryCode);
        onClose();
      } else {
        onSave({
          id: countryCode,
          countryCode,
          countryName,
          category: 'visited',
          logs: nextLogs,
          isLoved,
          wantToVisit
        });
      }
    } else {
      const prim = getPrimaryCategory(nextLogs);
      onSave({
        id: countryCode,
        countryCode,
        countryName,
        category: prim,
        logs: nextLogs,
        isLoved,
        wantToVisit
      });
    }
  };

  // Save/Commit active Log Form changes back to the list
  const handleCommitLogForm = () => {
    // Validate required dates
    if (category === 'visited' || category === 'lived') {
      if (!startDate) {
        setValidationError("Please choose a Start Date before saving. Click any day on the calendar above or type it manually in the fields below.");
        return;
      }
    } else if (category === 'planned') {
      if (!plannedStartDate) {
        setValidationError("Please select a Planned Start Date before saving. Click any day on the calendar above or type it manually in the fields below.");
        return;
      }
    }

    setValidationError(null); // Clear active validation errors

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
      logs: nextLogs,
      isLoved,
      wantToVisit
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
          
          {/* Quick Toggles: Loved & Want to Visit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 shadow-3xs">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Preferences</span>
              <span className="text-xs font-bold text-slate-800">Pin status preferences for {countryName}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Loved Heart Toggle */}
              <button
                type="button"
                onClick={handleToggleLoved}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isLoved 
                    ? 'bg-rose-50 text-rose-750 border border-rose-200 shadow-3xs' 
                    : 'bg-white hover:bg-slate-100/50 border border-slate-200 text-slate-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLoved ? 'fill-rose-600 text-rose-650' : 'text-slate-400'}`} />
                {isLoved ? 'Loved' : 'Love'}
              </button>

              {/* Want to Visit Toggle */}
              <button
                type="button"
                onClick={handleToggleWantToVisit}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  wantToVisit 
                    ? 'bg-amber-50 text-amber-750 border border-amber-200 shadow-3xs' 
                    : 'bg-white hover:bg-slate-100/50 border border-slate-200 text-slate-500'
                }`}
              >
                <Star className={`w-4 h-4 ${wantToVisit ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                {wantToVisit ? 'Want to Visit' : 'Want to Visit'}
              </button>
            </div>
          </div>

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
                              {confirmDeleteLogId === log.id ? (
                                <div className="flex items-center gap-1 bg-red-50 border border-red-150 rounded-lg p-0.5 px-1.5 shrink-0">
                                  <span className="text-[9px] font-black text-red-800">Clear?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteLogItem(log.id);
                                      setConfirmDeleteLogId(null);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteLogId(null)}
                                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[8px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLogId(log.id)}
                                  className="p-1.5 hover:bg-red-50 hover:border-red-200 text-slate-350 hover:text-red-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                  title="Delete Stay Log"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
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

                {/* Validation Error Banner */}
                {validationError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-red-800 text-[11px] font-medium leading-relaxed shadow-3xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{validationError}</div>
                  </div>
                )}

                {/* Milestone category selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Milestone Status</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-150 p-1 rounded-2xl">
                    {(['visited', 'lived', 'planned'] as CountryCategory[]).map((cat) => {
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
                           cat === 'visited' ? 'Visited' : 'Planned'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VISITED & LIVED Timeline forms */}
                {(category === 'visited' || category === 'lived') && (
                  <div className="space-y-4 bg-white p-4.5 rounded-2xl border border-slate-150 shadow-2xs">
                    <div className="flex items-center gap-1.5 justify-between">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-455 block">Timeline Date Range</label>
                      {category === 'lived' && (
                        <label className="flex items-center gap-1.5 text-[10.5px] text-emerald-800 font-extrabold select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isStillLiving}
                            onChange={(e) => setIsStillLiving(e.target.checked)}
                            className="accent-emerald-700 w-3.5 h-3.5 cursor-pointer rounded"
                          />
                          Currently Live Here
                        </label>
                      )}
                    </div>
                    
                    {/* Embedded Interactive Calendar Date-Range Picker & 1-Click Presets */}
                    <CalendarPicker 
                      startDate={startDate}
                      endDate={isStillLiving ? '' : endDate}
                      onRangeChange={(start, end) => {
                        setStartDate(start);
                        if (!isStillLiving) {
                          setEndDate(end);
                        }
                      }}
                      isStillLiving={isStillLiving}
                      category={category}
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">Start Date (Manual)</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">End Date (Manual)</label>
                        <input
                          type="date"
                          value={endDate}
                          disabled={category === 'lived' && isStillLiving}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PLANNED Trip Timeline Form */}
                {category === 'planned' && (
                  <div className="space-y-4 bg-indigo-50/30 p-4.5 rounded-2xl border border-indigo-100 shadow-2xs">
                    <div className="flex items-center gap-2 text-[10.5px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150 p-2.5 rounded-xl mb-1 leading-normal">
                      <Info className="w-4 h-4 shrink-0 text-indigo-505" />
                      <span>Specifying planned travels automatically generates Day timeline buckets for scheduling detailed stops.</span>
                    </div>

                    {/* Embedded Interactive Calendar Date-Range Picker & 1-Click Presets */}
                    <CalendarPicker 
                      startDate={plannedStartDate}
                      endDate={plannedEndDate}
                      onRangeChange={(start, end) => {
                        setPlannedStartDate(start);
                        setPlannedEndDate(end);
                      }}
                      category={category}
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">Trip Start Date (Manual)</label>
                        <input
                          type="date"
                          value={plannedStartDate}
                          onChange={(e) => setPlannedStartDate(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-slate-600 block">Trip End Date (Manual)</label>
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
                        confirmStripDay ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-150 rounded-xl p-1 px-2 shrink-0 animate-fadeIn">
                            <span className="text-[9px] font-black text-red-800">Strip?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDays(days.slice(0, -1));
                                setActiveDayIdx(0);
                                setConfirmStripDay(false);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmStripDay(false)}
                              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-550 font-bold text-[8px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const lastDay = days[days.length - 1];
                              if (lastDay && lastDay.entries && lastDay.entries.length > 0) {
                                setConfirmStripDay(true);
                              } else {
                                setDays(days.slice(0, -1));
                                setActiveDayIdx(0);
                              }
                            }}
                            className="shrink-0 p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer"
                            title="Delete Last Planning Day"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-650" />
                          </button>
                        )
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
                                type="time"
                                value={itemTime}
                                onChange={(e) => setItemTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none bg-white cursor-pointer"
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
                                      <span className="text-[9px] text-slate-450 font-bold bg-slate-50 border border-slate-150 rounded px-1.5 capitalize">
                                        ⏰ {formatDisplayTime(item.time)} ({classifyTimeBlock(item.time)})
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

              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* Static Premium Footer (Always visible at the bottom) */}
        <footer className="px-6 py-4 border-t border-slate-150 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between shrink-0 font-sans">
          {editingLogId === null ? (
            // Footer actions for View 1 List Hub (Modal Open)
            <>
              <p className="text-[10px] text-slate-450 font-bold max-w-[240px] uppercase tracking-wide leading-normal">
                All records sync automatically to your browser's private local storage.
              </p>
              <div className="flex items-center gap-2">
                {confirmStopTracking ? (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl p-1 px-2">
                    <span className="text-[9px] font-black text-red-800 uppercase tracking-wide">Unpin track?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(countryCode);
                        onClose();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-3xs"
                    >
                      Unpin
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStopTracking(false)}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmStopTracking(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-650 font-bold border border-red-200 py-2.5 px-4 bg-red-50 hover:bg-red-100/70 hover:border-red-300 rounded-xl cursor-pointer transition-all shadow-3xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    Unpin Country
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 rounded-xl text-xs font-black shadow-xs hover:shadow transition-all cursor-pointer leading-none flex items-center justify-center h-9"
                >
                  Done & Exit
                </button>
              </div>
            </>
          ) : (
            // Footer actions for View 2 Log Editor Form
            <>
              <button
                type="button"
                onClick={() => {
                  if (editingLogId === 'new' && logs.length === 0) {
                    onClose();
                  } else {
                    setEditingLogId(null);
                  }
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer text-slate-655"
              >
                Cancel / Back
              </button>

              <button
                type="button"
                onClick={handleCommitLogForm}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all border-t border-indigo-400 cursor-pointer"
              >
                Done & Save Stay Log
              </button>
            </>
          )}
        </footer>

      </div>
      
    </div>
  );
}
