import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, Train, MapPin, Clock, Briefcase, Gift, Compass, Plus, Trash2, 
  Edit2, ChevronRight, Check, Calendar, AlertCircle, ArrowRight, 
  CheckSquare, Square, Info, ShieldCheck, HelpCircle, DollarSign, Palmtree
} from 'lucide-react';
import { Trip, TripDay, TripActivity, VisaRequirement, PackingItem, SouvenirItem, BucketListItem } from '../types';
import countryData from '../data/iso-countries.json';

const sortedCountries = [...countryData].sort((a, b) => a.name.localeCompare(b.name));

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

interface TripPlannerProps {
  currency: 'USD' | 'GBP' | 'PHP';
  onAddPlannedCountry?: (countryName: string) => void;
}

export default function TripPlanner({ currency, onAddPlannedCountry }: TripPlannerProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'itinerary' | 'visas' | 'packing' | 'souvenirs' | 'bucketlist'>('itinerary');

  // Form States for creating/editing a trip
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [newTripType, setNewTripType] = useState<'single' | 'multi'>('single');
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripStartDate, setNewTripStartDate] = useState('');
  const [newTripEndDate, setNewTripEndDate] = useState('');
  const [newTripCountries, setNewTripCountries] = useState('');
  const [newBucketPlace, setNewBucketPlace] = useState('');

  // Itinerary Editing Form States
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingDayNum, setEditingDayNum] = useState<number | null>(null);
  const [editingActivity, setEditingActivity] = useState<TripActivity | null>(null);
  const [activityForm, setActivityForm] = useState<{
    id: string;
    type: 'place' | 'flight' | 'train' | 'other';
    title: string;
    notes: string;
    block: 'morning' | 'afternoon' | 'evening';
    time: string;
    origin: string;
    destination: string;
    travelTimeStart: string;
    travelTimeEnd: string;
  }>({
    id: '',
    type: 'place',
    title: '',
    notes: '',
    block: 'morning',
    time: '',
    origin: '',
    destination: '',
    travelTimeStart: '',
    travelTimeEnd: '',
  });

  // Modal State for viewing details of an activity when a block is clicked
  const [selectedActivityDetails, setSelectedActivityDetails] = useState<{
    dayNum: number;
    activity: TripActivity;
  } | null>(null);

  // Quick Add Item States
  const [newVisaCountry, setNewVisaCountry] = useState('');
  const [newVisaReq, setNewVisaReq] = useState('');
  const [newPackingItem, setNewPackingItem] = useState('');
  const [newPackingCat, setNewPackingCat] = useState('Clothing');
  const [newSouvenirRecipient, setNewSouvenirRecipient] = useState('');
  const [newSouvenirName, setNewSouvenirName] = useState('');
  const [newSouvenirWhere, setNewSouvenirWhere] = useState('');
  const [newSouvenirPrice, setNewSouvenirPrice] = useState('');
  const [newBucketItem, setNewBucketItem] = useState('');

  // Load Trips from localStorage
  useEffect(() => {
    const cachedTrips = localStorage.getItem('world_travel_trips');
    if (cachedTrips) {
      try {
        setTrips(JSON.parse(cachedTrips));
      } catch (e) {
        console.error('Error parsing cached trips:', e);
      }
    }
  }, []);

  // Save Trips to localStorage
  const saveTrips = (updatedTrips: Trip[]) => {
    setTrips(updatedTrips);
    localStorage.setItem('world_travel_trips', JSON.stringify(updatedTrips));
  };

  const activeTrip = trips.find(t => t.id === activeTripId) || null;

  // Add Trip
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripTitle.trim()) return;

    const countriesList = newTripCountries
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    // Auto-generate some basic days if dates are provided
    const dayList: TripDay[] = [];
    if (newTripStartDate && newTripEndDate) {
      const start = new Date(newTripStartDate);
      const end = new Date(newTripEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 1; i <= Math.min(diffDays, 30); i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + (i - 1));
        dayList.push({
          dayNumber: i,
          date: currentDate.toISOString().slice(0, 10),
          activities: []
        });
      }
    } else {
      // Create 3 default days if no dates
      dayList.push(
        { dayNumber: 1, activities: [] },
        { dayNumber: 2, activities: [] },
        { dayNumber: 3, activities: [] }
      );
    }

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: newTripTitle,
      startDate: newTripStartDate || undefined,
      endDate: newTripEndDate || undefined,
      countries: countriesList.length > 0 ? countriesList : ['Unspecified Destination'],
      itinerary: dayList,
      visas: [],
      packingList: [
        { id: `pack-1-${Date.now()}`, item: 'Passport & Travel Visas', category: 'Documents', completed: false, quantity: 1 },
        { id: `pack-2-${Date.now()}`, item: 'Flight/Train Boarding Passes', category: 'Documents', completed: false, quantity: 1 },
        { id: `pack-3-${Date.now()}`, item: 'Universal Power Adapter', category: 'Tech', completed: false, quantity: 1 },
        { id: `pack-4-${Date.now()}`, item: 'Toothbrush & Toiletries', category: 'Toiletries', completed: false, quantity: 1 },
      ],
      souvenirs: [],
      bucketList: []
    };

    if (onAddPlannedCountry && countriesList.length > 0) {
      countriesList.forEach(country => {
        onAddPlannedCountry(country);
      });
    }

    const nextTrips = [...trips, newTrip];
    saveTrips(nextTrips);
    setActiveTripId(newTrip.id);
    
    // Clear state
    setNewTripTitle('');
    setNewTripStartDate('');
    setNewTripEndDate('');
    setNewTripCountries('');
    setShowAddTripModal(false);
  };

  // Delete Trip
  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this trip and all its itineraries?')) {
      const next = trips.filter(t => t.id !== id);
      saveTrips(next);
      if (activeTripId === id) {
        setActiveTripId(null);
      }
    }
  };

  // Add empty Day to Itinerary
  const handleAddDay = () => {
    if (!activeTrip) return;
    const currentItinerary = activeTrip.itinerary || [];
    const nextDayNum = currentItinerary.length > 0 
      ? Math.max(...currentItinerary.map(d => d.dayNumber)) + 1 
      : 1;

    let nextDate = '';
    if (activeTrip.startDate && currentItinerary.length > 0) {
      const lastDay = currentItinerary[currentItinerary.length - 1];
      if (lastDay.date) {
        const d = new Date(lastDay.date);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().slice(0, 10);
      }
    }

    const newDay: TripDay = {
      dayNumber: nextDayNum,
      date: nextDate || undefined,
      activities: []
    };

    const updatedTrip = {
      ...activeTrip,
      itinerary: [...currentItinerary, newDay]
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
  };

  // Delete Day from Itinerary
  const handleDeleteDay = (dayNum: number) => {
    if (!activeTrip) return;
    if (window.confirm(`Delete Day ${dayNum} and all its activities?`)) {
      const updatedItinerary = activeTrip.itinerary
        .filter(d => d.dayNumber !== dayNum)
        .map((d, index) => ({
          ...d,
          dayNumber: index + 1 // Re-index days beautifully
        }));

      const updatedTrip = {
        ...activeTrip,
        itinerary: updatedItinerary
      };
      
      const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
      saveTrips(updatedTrips);
    }
  };

  // Open form to add/edit activity
  const handleOpenActivityForm = (dayNum: number, activity: TripActivity | null = null, defaultBlock: 'morning' | 'afternoon' | 'evening' = 'morning') => {
    setEditingDayNum(dayNum);
    setEditingActivity(activity);
    
    if (activity) {
      setActivityForm({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        notes: activity.notes || '',
        block: activity.block,
        time: activity.time || '',
        origin: activity.origin || '',
        destination: activity.destination || '',
        travelTimeStart: activity.travelTimeStart || '',
        travelTimeEnd: activity.travelTimeEnd || '',
      });
    } else {
      setActivityForm({
        id: `act-${Date.now()}`,
        type: 'place',
        title: '',
        notes: '',
        block: defaultBlock,
        time: '',
        origin: '',
        destination: '',
        travelTimeStart: '',
        travelTimeEnd: '',
      });
    }
    setShowActivityModal(true);
  };

  // Save Activity Form
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || editingDayNum === null) return;

    const activityData: TripActivity = {
      id: activityForm.id,
      type: activityForm.type,
      title: activityForm.title.trim() || (activityForm.type === 'flight' ? 'Flight' : activityForm.type === 'train' ? 'Train' : 'Activity'),
      block: activityForm.block,
      notes: activityForm.notes.trim() || undefined,
      time: activityForm.time || undefined,
      origin: ['flight', 'train'].includes(activityForm.type) ? activityForm.origin.trim() || undefined : undefined,
      destination: ['flight', 'train'].includes(activityForm.type) ? activityForm.destination.trim() || undefined : undefined,
      travelTimeStart: ['flight', 'train'].includes(activityForm.type) ? activityForm.travelTimeStart.trim() || undefined : undefined,
      travelTimeEnd: ['flight', 'train'].includes(activityForm.type) ? activityForm.travelTimeEnd.trim() || undefined : undefined,
    };

    const updatedItinerary = activeTrip.itinerary.map(day => {
      if (day.dayNumber !== editingDayNum) return day;

      const exists = day.activities.some(a => a.id === activityData.id);
      let updatedActs: TripActivity[];
      if (exists) {
        updatedActs = day.activities.map(a => a.id === activityData.id ? activityData : a);
      } else {
        updatedActs = [...day.activities, activityData];
      }

      // Sort activities inside day: first by block (morning, afternoon, evening), then by custom time if available
      const blockOrder = { morning: 1, afternoon: 2, evening: 3 };
      updatedActs.sort((a, b) => {
        if (blockOrder[a.block] !== blockOrder[b.block]) {
          return blockOrder[a.block] - blockOrder[b.block];
        }
        return (a.time || '').localeCompare(b.time || '');
      });

      return {
        ...day,
        activities: updatedActs
      };
    });

    const updatedTrip = {
      ...activeTrip,
      itinerary: updatedItinerary
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
    setShowActivityModal(false);
    setEditingDayNum(null);
    setEditingActivity(null);
  };

  // Delete Activity
  const handleDeleteActivity = (dayNum: number, activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTrip) return;
    if (window.confirm('Remove this entry from the itinerary?')) {
      const updatedItinerary = activeTrip.itinerary.map(day => {
        if (day.dayNumber !== dayNum) return day;
        return {
          ...day,
          activities: day.activities.filter(a => a.id !== activityId)
        };
      });

      const updatedTrip = {
        ...activeTrip,
        itinerary: updatedItinerary
      };

      const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
      saveTrips(updatedTrips);
      
      if (selectedActivityDetails?.activity.id === activityId) {
        setSelectedActivityDetails(null);
      }
    }
  };

  // =====================================
  // Visa Requirements Actions
  // =====================================
  const handleAddVisaRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newVisaReq.trim()) return;

    const newReq: VisaRequirement = {
      id: `visa-${Date.now()}`,
      countryCode: newVisaCountry.trim() || 'ALL',
      countryName: newVisaCountry.trim() || 'General',
      requirement: newVisaReq.trim(),
      completed: false
    };

    const updatedTrip = {
      ...activeTrip,
      visas: [...(activeTrip.visas || []), newReq]
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
    setNewVisaReq('');
    setNewVisaCountry('');
  };

  const handleToggleVisaRequirement = (id: string) => {
    if (!activeTrip) return;
    const updatedVisas = (activeTrip.visas || []).map(v => 
      v.id === id ? { ...v, completed: !v.completed } : v
    );
    const updatedTrip = { ...activeTrip, visas: updatedVisas };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  const handleDeleteVisaRequirement = (id: string) => {
    if (!activeTrip) return;
    const updatedTrip = {
      ...activeTrip,
      visas: (activeTrip.visas || []).filter(v => v.id !== id)
    };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  // =====================================
  // Packing List Actions
  // =====================================
  const handleAddPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newPackingItem.trim()) return;

    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      item: newPackingItem.trim(),
      category: newPackingCat,
      completed: false,
      quantity: 1
    };

    const updatedTrip = {
      ...activeTrip,
      packingList: [...(activeTrip.packingList || []), newItem]
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
    setNewPackingItem('');
  };

  const handleTogglePackingItem = (id: string) => {
    if (!activeTrip) return;
    const updatedList = (activeTrip.packingList || []).map(p => 
      p.id === id ? { ...p, completed: !p.completed } : p
    );
    const updatedTrip = { ...activeTrip, packingList: updatedList };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  const handleDeletePackingItem = (id: string) => {
    if (!activeTrip) return;
    const updatedTrip = {
      ...activeTrip,
      packingList: (activeTrip.packingList || []).filter(p => p.id !== id)
    };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  // =====================================
  // Souvenirs Actions
  // =====================================
  const handleAddSouvenir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newSouvenirName.trim() || !newSouvenirRecipient.trim()) return;

    const priceNum = parseFloat(newSouvenirPrice);

    const newItem: SouvenirItem = {
      id: `souv-${Date.now()}`,
      recipient: newSouvenirRecipient.trim(),
      souvenir: newSouvenirName.trim(),
      whereToBuy: newSouvenirWhere.trim() || undefined,
      price: isNaN(priceNum) ? undefined : priceNum,
      completed: false
    };

    const updatedTrip = {
      ...activeTrip,
      souvenirs: [...(activeTrip.souvenirs || []), newItem]
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
    setNewSouvenirRecipient('');
    setNewSouvenirName('');
    setNewSouvenirWhere('');
    setNewSouvenirPrice('');
  };

  const handleToggleSouvenir = (id: string) => {
    if (!activeTrip) return;
    const updatedList = (activeTrip.souvenirs || []).map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    const updatedTrip = { ...activeTrip, souvenirs: updatedList };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  const handleDeleteSouvenir = (id: string) => {
    if (!activeTrip) return;
    const updatedTrip = {
      ...activeTrip,
      souvenirs: (activeTrip.souvenirs || []).filter(s => s.id !== id)
    };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  // =====================================
  // Bucket List Actions
  // =====================================
  const handleAddBucketItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newBucketItem.trim()) return;

    const newItem: BucketListItem = {
      id: `bucket-${Date.now()}`,
      activity: newBucketItem.trim(),
      place: newBucketPlace.trim() || undefined,
      completed: false
    };

    const updatedTrip = {
      ...activeTrip,
      bucketList: [...(activeTrip.bucketList || []), newItem]
    };

    const updatedTrips = trips.map(t => t.id === activeTrip.id ? updatedTrip : t);
    saveTrips(updatedTrips);
    setNewBucketItem('');
    setNewBucketPlace('');
  };

  const handleToggleBucketItem = (id: string) => {
    if (!activeTrip) return;
    const updatedList = (activeTrip.bucketList || []).map(b => 
      b.id === id ? { ...b, completed: !b.completed } : b
    );
    const updatedTrip = { ...activeTrip, bucketList: updatedList };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  const handleDeleteBucketItem = (id: string) => {
    if (!activeTrip) return;
    const updatedTrip = {
      ...activeTrip,
      bucketList: (activeTrip.bucketList || []).filter(b => b.id !== id)
    };
    saveTrips(trips.map(t => t.id === activeTrip.id ? updatedTrip : t));
  };

  // Format Helper for Currency Symbol
  const getCurrencySymbol = () => {
    switch (currency) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'PHP': return '₱';
      default: return '$';
    }
  };

  return (
    <div className="space-y-8" id="trip-planner-main">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Palmtree className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
            Future Travels & Trip Planner
          </h2>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
            Build beautiful multi-country itineraries, packing checklists, visa requirements, gift registries, and bucket lists.
          </p>
        </div>
        
        {!activeTrip && (
          <button
            onClick={() => setShowAddTripModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-white py-3 px-4.5 rounded-xl transition-all shadow-md active:scale-97 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Future Trip
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* CASE A: NO ACTIVE TRIP - SHOW TRIP LIST                  */}
      {/* ======================================================== */}
      {!activeTrip ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Compass className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No upcoming trips created yet</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Click the "Add New Future Trip" button to generate a timeline, custom day-to-day organizer, and checklist for your upcoming vacation.
              </p>
              <button
                onClick={() => setShowAddTripModal(true)}
                className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-750 px-4 py-2.5 rounded-xl border border-indigo-150 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Plan My First Voyage
              </button>
            </div>
          ) : (
            trips.map((trip) => {
              const totalPack = trip.packingList?.length || 0;
              const packCompleted = trip.packingList?.filter(p => p.completed).length || 0;
              const totalVisas = trip.visas?.length || 0;
              const visasCompleted = trip.visas?.filter(v => v.completed).length || 0;
              const bucketTotal = trip.bucketList?.length || 0;
              const bucketCompleted = trip.bucketList?.filter(b => b.completed).length || 0;

              return (
                <motion.div
                  key={trip.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  onClick={() => {
                    setActiveTripId(trip.id);
                    setActiveSubTab('itinerary');
                  }}
                  className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-64"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap gap-1">
                        {trip.countries.map((c, i) => (
                          <span key={i} className="text-[9px] font-extrabold uppercase tracking-widest bg-slate-100 text-slate-650 px-2 py-0.75 rounded-md">
                            {c}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {trip.title}
                      </h3>
                      {trip.startDate && (
                        <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {trip.endDate && (
                            <>
                              <ArrowRight className="w-2.5 h-2.5" />
                              {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-500">
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <div className="text-slate-800 font-extrabold">{packCompleted}/{totalPack}</div>
                        <div className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Packing</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <div className="text-slate-800 font-extrabold">{visasCompleted}/{totalVisas}</div>
                        <div className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Visas</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <div className="text-slate-800 font-extrabold">{bucketCompleted}/{bucketTotal}</div>
                        <div className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Bucket</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-indigo-650 pt-1">
                      <span>View Full Workspace</span>
                      <ChevronRight className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* CASE B: ACTIVE TRIP WORKSPACE                            */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Workspace Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-12">
              <Compass className="w-72 h-72 animate-spin-slow text-white" />
            </div>

            <div className="space-y-4 relative z-10">
              <button
                onClick={() => setActiveTripId(null)}
                className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-300 hover:text-white transition-colors"
              >
                ← Back to all trips
              </button>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activeTrip.countries.map((c, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-wider bg-slate-800/85 text-indigo-300 border border-slate-700/80 px-2.5 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
                    {activeTrip.title}
                  </h1>
                  {activeTrip.startDate && (
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(activeTrip.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      {activeTrip.endDate && (
                        <>
                          <ArrowRight className="w-3 h-3 text-indigo-400" />
                          {new Date(activeTrip.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-medium">
                    {activeTrip.itinerary?.length || 0} Days Planned
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Workspace Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 rounded-2xl p-1 max-w-2xl">
            <button
              onClick={() => setActiveSubTab('itinerary')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'itinerary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Itinerary
            </button>
            <button
              onClick={() => setActiveSubTab('visas')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'visas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Visas
            </button>
            <button
              onClick={() => setActiveSubTab('packing')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'packing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Packing
            </button>
            <button
              onClick={() => setActiveSubTab('souvenirs')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'souvenirs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Souvenirs
            </button>
            <button
              onClick={() => setActiveSubTab('bucketlist')}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'bucketlist' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Bucket List
            </button>
          </div>

          {/* ======================================================== */}
          {/* SUB-TAB: ITINERARY                                       */}
          {/* ======================================================== */}
          {activeSubTab === 'itinerary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Day-to-Day Travel Schedule</h2>
                  <p className="text-[11px] text-slate-500">Activities grouped elegantly into Morning, Afternoon, and Evening blocks. Click block cards to view times or flight/train terminals.</p>
                </div>
                <button
                  onClick={handleAddDay}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-750 px-3.5 py-2 rounded-xl border border-indigo-150 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Day
                </button>
              </div>

              <div className="space-y-8">
                {(activeTrip.itinerary || []).map((day) => {
                  // Filter activities into Morning, Afternoon, Evening blocks
                  const morningActs = day.activities.filter(a => a.block === 'morning');
                  const afternoonActs = day.activities.filter(a => a.block === 'afternoon');
                  const eveningActs = day.activities.filter(a => a.block === 'evening');

                  const formatDayDate = (dString?: string) => {
                    if (!dString) return '';
                    return new Date(dString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  };

                  return (
                    <div key={day.dayNumber} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-baseline gap-3">
                          <h3 className="text-base font-extrabold text-slate-900">
                            Day {day.dayNumber}
                          </h3>
                          {day.date && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                              {formatDayDate(day.date)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteDay(day.dayNumber)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-750 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Day
                        </button>
                      </div>

                      {/* Blocks Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* MORNING BLOCK */}
                        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70">
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Morning Block
                            </span>
                            <button 
                              onClick={() => handleOpenActivityForm(day.dayNumber, null, 'morning')}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            {morningActs.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic py-4 text-center">No morning activities</p>
                            ) : (
                              morningActs.map(act => renderActivityCard(day.dayNumber, act))
                            )}
                          </div>
                        </div>

                        {/* AFTERNOON BLOCK */}
                        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70">
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              Afternoon Block
                            </span>
                            <button 
                              onClick={() => handleOpenActivityForm(day.dayNumber, null, 'afternoon')}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            {afternoonActs.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic py-4 text-center">No afternoon activities</p>
                            ) : (
                              afternoonActs.map(act => renderActivityCard(day.dayNumber, act))
                            )}
                          </div>
                        </div>

                        {/* EVENING BLOCK */}
                        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70">
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-violet-500" />
                              Evening Block
                            </span>
                            <button 
                              onClick={() => handleOpenActivityForm(day.dayNumber, null, 'evening')}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            {eveningActs.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic py-4 text-center">No evening activities</p>
                            ) : (
                              eveningActs.map(act => renderActivityCard(day.dayNumber, act))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB: VISA REQUIREMENTS                               */}
          {/* ======================================================== */}
          {activeSubTab === 'visas' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Visa Application Requirements</h2>
                <p className="text-[11px] text-slate-500">Track documentation, photo standards, visa applications, and verification requirements.</p>
              </div>

              {/* Visa Add Form */}
              <form onSubmit={handleAddVisaRequirement} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Visa Requirement Description (e.g. Flight booking, 6 months passport validity)"
                    value={newVisaReq}
                    onChange={(e) => setNewVisaReq(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="Country (e.g. Japan)"
                    value={newVisaCountry}
                    onChange={(e) => setNewVisaCountry(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="text-[10px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-97 cursor-pointer self-stretch"
                >
                  Add Req
                </button>
              </form>

              {/* Visa List */}
              <div className="space-y-2">
                {(activeTrip.visas || []).length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs">No specific visa requirements added yet.</p>
                    <p className="text-[10px] mt-1">Use the quick form above to list necessary permits, certifications, and entry parameters.</p>
                  </div>
                ) : (
                  (activeTrip.visas || []).map((req) => (
                    <div 
                      key={req.id} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        req.completed 
                          ? 'bg-emerald-50/50 border-emerald-150 text-slate-550' 
                          : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleVisaRequirement(req.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {req.completed ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                        
                        <div>
                          <p className={`text-xs font-bold leading-relaxed ${req.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {req.requirement}
                          </p>
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-650 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {req.countryName}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVisaRequirement(req.id)}
                        className="p-1.5 text-slate-350 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB: PACKING CHECKLIST                               */}
          {/* ======================================================== */}
          {activeSubTab === 'packing' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Must-Brings Packing Checklist</h2>
                  <p className="text-[11px] text-slate-500">Categorize clothing, documents, toiletries, power modules, and other flight necessities.</p>
                </div>
                
                <div className="text-right">
                  <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-150">
                    {(activeTrip.packingList || []).filter(p => p.completed).length} / {(activeTrip.packingList || []).length} Packed
                  </span>
                </div>
              </div>

              {/* Packing Add Form */}
              <form onSubmit={handleAddPackingItem} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Item name (e.g. Universal Charger, Warm Coat, Medication)"
                    value={newPackingItem}
                    onChange={(e) => setNewPackingItem(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={newPackingCat}
                    onChange={(e) => setNewPackingCat(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="Clothing">Clothing</option>
                    <option value="Toiletries">Toiletries</option>
                    <option value="Tech">Tech / Gear</option>
                    <option value="Documents">Documents / Money</option>
                    <option value="Medicines">Medicines</option>
                    <option value="Other">Other Items</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="text-[10px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-97 cursor-pointer self-stretch"
                >
                  Add Item
                </button>
              </form>

              {/* Packing Categories Grouped */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['Documents', 'Tech', 'Clothing', 'Toiletries', 'Medicines', 'Other'].map(cat => {
                  const itemsInCat = (activeTrip.packingList || []).filter(p => (p.category || 'Other') === cat);
                  if (itemsInCat.length === 0 && cat !== 'Other') return null;

                  return (
                    <div key={cat} className="space-y-2 bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 border-b border-slate-100 pb-1 flex items-center justify-between">
                        <span>{cat}</span>
                        <span className="text-[9px] font-black bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {itemsInCat.filter(i => i.completed).length}/{itemsInCat.length}
                        </span>
                      </h3>

                      <div className="space-y-1">
                        {itemsInCat.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic py-2">No items listed</p>
                        ) : (
                          itemsInCat.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-1 px-2 hover:bg-slate-100/50 rounded-lg">
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => handleTogglePackingItem(item.id)}
                                  className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className={`text-xs font-semibold ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {item.item}
                                </span>
                              </label>
                              <button
                                onClick={() => handleDeletePackingItem(item.id)}
                                className="text-slate-350 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB: SOUVENIR REGISTRY                               */}
          {/* ======================================================== */}
          {activeSubTab === 'souvenirs' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Souvenir & Gift List Planner</h2>
                <p className="text-[11px] text-slate-500">Draft customized souvenir list. Input for who, what, where to buy, and optional pricing.</p>
              </div>

              {/* Souvenir Add Form */}
              <form onSubmit={handleAddSouvenir} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">For Who?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mom, Best Friend, Coworkers"
                      value={newSouvenirRecipient}
                      onChange={(e) => setNewSouvenirRecipient(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">What Souvenir?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Matcha powder, Silk Scarf"
                      value={newSouvenirName}
                      onChange={(e) => setNewSouvenirName(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Where to buy? (Shop/City)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kyoto Old Town, Airport Duty Free"
                      value={newSouvenirWhere}
                      onChange={(e) => setNewSouvenirWhere(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Est. Price ({getCurrencySymbol()}) - Optional</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15"
                      value={newSouvenirPrice}
                      onChange={(e) => setNewSouvenirPrice(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="text-[10px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-97 cursor-pointer"
                  >
                    Add Gift Entry
                  </button>
                </div>
              </form>

              {/* Souvenirs Table/List */}
              <div className="overflow-hidden border border-slate-150 rounded-2xl">
                <table className="w-full text-left text-xs font-medium text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-12">Bought</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Souvenir</th>
                      <th className="py-3 px-4">Where to buy</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(activeTrip.souvenirs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                          No souvenirs added to this registry yet.
                        </td>
                      </tr>
                    ) : (
                      (activeTrip.souvenirs || []).map((s) => (
                        <tr key={s.id} className={s.completed ? 'bg-slate-50/50' : ''}>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={s.completed}
                              onChange={() => handleToggleSouvenir(s.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className={`py-3 px-4 font-bold ${s.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {s.recipient}
                          </td>
                          <td className={`py-3 px-4 ${s.completed ? 'line-through text-slate-400' : 'text-slate-750'}`}>
                            {s.souvenir}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {s.whereToBuy || <span className="text-[10px] italic text-slate-300">Unspecified</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                            {s.price !== undefined ? `${getCurrencySymbol()}${s.price.toLocaleString()}` : <span className="text-[10px] italic text-slate-300">—</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteSouvenir(s.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB: TRIP BUCKET LIST                                */}
          {/* ======================================================== */}
          {activeSubTab === 'bucketlist' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Trip Bucket List & Mini Milestones</h2>
                <p className="text-[11px] text-slate-500">Log standard things you absolutely must eat, see, photograph, or experience on this trip.</p>
              </div>

              {/* Bucket list Add Form */}
              <form onSubmit={handleAddBucketItem} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div className="flex-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Bucket Experience / Activity</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Watch Sunrise from Mt. Fuji peak, Try authentic Tonkotsu Ramen"
                    value={newBucketItem}
                    onChange={(e) => setNewBucketItem(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="w-full sm:w-64">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Specific Place / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Kyoto Old Town, Mt. Fuji"
                    value={newBucketPlace}
                    onChange={(e) => setNewBucketPlace(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto text-[10px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-white px-5 py-3 rounded-xl transition-all whitespace-nowrap active:scale-97 cursor-pointer"
                  >
                    Add Experience
                  </button>
                </div>
              </form>

              {/* Bucket List Items */}
              <div className="space-y-2">
                {(activeTrip.bucketList || []).length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs">No bucket list experiences added for this trip yet.</p>
                    <p className="text-[10px] mt-1">Make a list of top landmarks, secret cafes, or adventure plans to track your goals.</p>
                  </div>
                ) : (
                  (activeTrip.bucketList || []).map((b) => (
                    <div 
                      key={b.id} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        b.completed 
                          ? 'bg-amber-50/20 border-amber-200/50 text-slate-450' 
                          : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleBucketItem(b.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        >
                          {b.completed ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                        
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold leading-relaxed ${b.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {b.activity}
                          </p>
                          {b.place && (
                            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>{b.place}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBucketItem(b.id)}
                        className="p-1.5 text-slate-350 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD TRIP                                          */}
      {/* ======================================================== */}
      {showAddTripModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Create Upcoming Journey</h3>
              <button 
                onClick={() => setShowAddTripModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Trip Name/Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EuroTrip Summer 2026, Japan Expedition"
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Single vs Multi country selection buttons */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Itinerary Scope</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-150 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTripType('single');
                      if (newTripCountries.includes(',')) {
                        setNewTripCountries(newTripCountries.split(',')[0].trim());
                      }
                    }}
                    className={`py-2 text-[10px] font-black tracking-wide rounded-xl uppercase transition-all whitespace-nowrap cursor-pointer ${
                      newTripType === 'single'
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                    }`}
                  >
                    ⛰️ Single Country
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTripType('multi')}
                    className={`py-2 text-[10px] font-black tracking-wide rounded-xl uppercase transition-all whitespace-nowrap cursor-pointer ${
                      newTripType === 'multi'
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                    }`}
                  >
                    ✈️ Multi-Country
                  </button>
                </div>
              </div>

              {newTripType === 'single' ? (
                <div>
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Planned Destination Country
                  </label>
                  <select
                    required
                    value={newTripCountries}
                    onChange={(e) => setNewTripCountries(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select a Country --</option>
                    {sortedCountries.map(c => (
                      <option key={c["alpha-3"]} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Planned Destination Countries
                  </label>
                  
                  {/* Selected countries tags */}
                  {newTripCountries.split(',').map(c => c.trim()).filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      {newTripCountries.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} className="inline-flex items-center gap-1 bg-white border border-slate-150 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-700 shadow-3xs">
                          {c}
                          <button
                            type="button"
                            onClick={() => {
                              const newList = newTripCountries
                                .split(',')
                                .map(x => x.trim())
                                .filter(x => x && x !== c)
                                .join(', ');
                              setNewTripCountries(newList);
                            }}
                            className="text-slate-400 hover:text-red-500 font-bold ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dropdown to add country to the multi-country list */}
                  <select
                    value=""
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (!selected) return;
                      const currentList = newTripCountries
                        .split(',')
                        .map(x => x.trim())
                        .filter(Boolean);
                      if (!currentList.includes(selected)) {
                        const nextList = [...currentList, selected].join(', ');
                        setNewTripCountries(nextList);
                      }
                    }}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="">-- Add a Country to Itinerary --</option>
                    {sortedCountries.map(c => (
                      <option key={c["alpha-3"]} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTripStartDate}
                    onChange={(e) => setNewTripStartDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newTripEndDate}
                    onChange={(e) => setNewTripEndDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer mt-4"
              >
                Create Trip & Open Workspace
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD/EDIT ACTIVITY IN ITINERARY                    */}
      {/* ======================================================== */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {editingActivity ? 'Edit Schedule Item' : `Add Item to Day ${editingDayNum}`}
              </h3>
              <button 
                onClick={() => {
                  setShowActivityModal(false);
                  setEditingDayNum(null);
                  setEditingActivity(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Schedule Item Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['place', 'flight', 'train', 'other'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityForm(prev => ({ ...prev, type: t }))}
                      className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer text-center ${
                        activityForm.type === t
                          ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'flight' && <Plane className="w-3.5 h-3.5 mx-auto mb-1" />}
                      {t === 'train' && <Train className="w-3.5 h-3.5 mx-auto mb-1" />}
                      {t === 'place' && <MapPin className="w-3.5 h-3.5 mx-auto mb-1" />}
                      {t === 'other' && <Compass className="w-3.5 h-3.5 mx-auto mb-1" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Block */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Schedule Block</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['morning', 'afternoon', 'evening'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setActivityForm(prev => ({ ...prev, block: b }))}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer text-center ${
                        activityForm.block === b
                          ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  {activityForm.type === 'flight' ? 'Flight Number/Airline' : activityForm.type === 'train' ? 'Train Line/Service' : 'Item Name/Place Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={activityForm.type === 'flight' ? 'e.g. JL006 to Tokyo' : activityForm.type === 'train' ? 'e.g. Shinkansen Hikari' : 'e.g. Golden Pavilion, Kinkaku-ji'}
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Time Indicator Input */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Specific Activity Time (Optional)</label>
                <input
                  type="time"
                  value={activityForm.time}
                  onChange={(e) => {
                    const selectedTime = e.target.value;
                    const autoBlock = selectedTime ? classifyTimeBlock(selectedTime) : activityForm.block;
                    setActivityForm(prev => ({ 
                      ...prev, 
                      time: selectedTime,
                      block: autoBlock
                    }));
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                />
              </div>

              {/* FLIGHT/TRAIN ADDITIONAL FIELDS */}
              {['flight', 'train'].includes(activityForm.type) && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-700">Travel/Terminal Details</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Origin Station/Airport</label>
                      <input
                        type="text"
                        placeholder="e.g. LAX, Haneda"
                        value={activityForm.origin}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, origin: e.target.value }))}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Destination Station/Airport</label>
                      <input
                        type="text"
                        placeholder="e.g. Kyoto, Narita"
                        value={activityForm.destination}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, destination: e.target.value }))}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Travel Start Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 11:30 AM"
                        value={activityForm.travelTimeStart}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, travelTimeStart: e.target.value }))}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Travel End Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 02:45 PM"
                        value={activityForm.travelTimeEnd}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, travelTimeEnd: e.target.value }))}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Notes / Reminders / Reservation codes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Reservation Code: #X984-Z. Bring comfortable shoes."
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer mt-4"
              >
                Save Schedule Item
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ACTIVITY DETAILS VIEW (WHEN A CARD IS CLICKED)    */}
      {/* ======================================================== */}
      {selectedActivityDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                  selectedActivityDetails.activity.type === 'flight' ? 'bg-indigo-50 text-indigo-750' :
                  selectedActivityDetails.activity.type === 'train' ? 'bg-amber-50 text-amber-750' :
                  'bg-emerald-50 text-emerald-750'
                }`}>
                  {selectedActivityDetails.activity.type}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                  Day {selectedActivityDetails.dayNum} • {selectedActivityDetails.activity.block}
                </span>
              </div>
              <button 
                onClick={() => setSelectedActivityDetails(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedActivityDetails.activity.title}
                </h3>
                {selectedActivityDetails.activity.time && (
                  <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Scheduled Time: <span className="underline">{selectedActivityDetails.activity.time}</span>
                  </p>
                )}
              </div>

              {/* Train/Flight Details */}
              {['flight', 'train'].includes(selectedActivityDetails.activity.type) && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-center flex-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block">Origin</span>
                    <span className="text-xs font-bold text-slate-800">{selectedActivityDetails.activity.origin || 'Unspecified'}</span>
                    {selectedActivityDetails.activity.travelTimeStart && (
                      <span className="text-[10px] text-slate-500 block">{selectedActivityDetails.activity.travelTimeStart}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight className="w-4 h-4 text-slate-400 animate-pulse" />
                    {selectedActivityDetails.activity.type === 'flight' ? (
                      <Plane className="w-4 h-4 text-indigo-500 mt-1" />
                    ) : (
                      <Train className="w-4 h-4 text-amber-500 mt-1" />
                    )}
                  </div>
                  <div className="space-y-1 text-center flex-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block">Destination</span>
                    <span className="text-xs font-bold text-slate-800">{selectedActivityDetails.activity.destination || 'Unspecified'}</span>
                    {selectedActivityDetails.activity.travelTimeEnd && (
                      <span className="text-[10px] text-slate-500 block">{selectedActivityDetails.activity.travelTimeEnd}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Description */}
              <div className="space-y-1.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Notes & Details</span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {selectedActivityDetails.activity.notes || 'No description or notes specified for this item.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivityDetails(null);
                    handleOpenActivityForm(selectedActivityDetails.dayNum, selectedActivityDetails.activity);
                  }}
                  className="text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  Edit Item
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteActivity(selectedActivityDetails.dayNum, selectedActivityDetails.activity.id, e);
                  }}
                  className="text-[10px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-750 px-4 py-2.5 rounded-xl transition-all border border-red-150 cursor-pointer"
                >
                  Delete Item
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  // Helper Card Render to make day blocks super tidy
  function renderActivityCard(dayNum: number, act: TripActivity) {
    const isFlight = act.type === 'flight';
    const isTrain = act.type === 'train';

    return (
      <motion.div
        key={act.id}
        whileHover={{ y: -1, scale: 1.01 }}
        onClick={() => setSelectedActivityDetails({ dayNum, activity: act })}
        className={`p-3 rounded-xl border text-left cursor-pointer relative group transition-all ${
          isFlight ? 'bg-indigo-50/50 border-indigo-150 hover:bg-indigo-50' :
          isTrain ? 'bg-amber-50/50 border-amber-150 hover:bg-amber-50' :
          'bg-white border-slate-150 hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-950 leading-tight pr-6 group-hover:text-indigo-650 transition-colors">
              {act.title}
            </h4>
            
            {/* Show time inside card immediately */}
            {act.time && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700">
                <Clock className="w-3 h-3 shrink-0" />
                {formatDisplayTime(act.time)}
              </span>
            )}

            {/* Flight or train short summary */}
            {(isFlight || isTrain) && (act.origin || act.destination) && (
              <div className="flex flex-col gap-0.5 text-[10px] font-extrabold text-slate-500 pt-1">
                <div className="flex items-center gap-1">
                  <span>{act.origin || '?'}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                  <span>{act.destination || '?'}</span>
                </div>
                {(act.travelTimeStart || act.travelTimeEnd) && (
                  <span className="text-[9px] text-indigo-650 font-semibold">
                    {act.travelTimeStart || '—'} to {act.travelTimeEnd || '—'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1">
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {isFlight && <Plane className="w-3.5 h-3.5 text-indigo-650" />}
              {isTrain && <Train className="w-3.5 h-3.5 text-amber-650" />}
              {!isFlight && !isTrain && act.type === 'place' && <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
              {!isFlight && !isTrain && act.type === 'other' && <Compass className="w-3.5 h-3.5 text-slate-400" />}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
}
