import React, { useMemo } from 'react';
import { Globe, PlaneTakeoff, Award, MapPin, DollarSign, Calendar, Heart, ShieldAlert } from 'lucide-react';
import { CountryTrack, TravelStats } from '../types';
import { formatCurrency, CurrencyType } from '../lib/currency';

interface StatsSectionProps {
  tracks: CountryTrack[];
  currency?: CurrencyType;
}

export default function StatsSection({ tracks, currency = 'USD' }: StatsSectionProps) {
  const stats = useMemo<TravelStats>(() => {
    let visited = 0;
    let lived = 0;
    let want = 0;
    let planned = 0;
    let favorite = 0;
    let totalCities = 0;
    let plannedBudget = 0;

    tracks.forEach((t) => {
      const logs = t.logs || [];
      
      const hasLived = logs.some(l => l.category === 'lived');
      const hasVisited = logs.some(l => l.category === 'visited');
      const hasPlanned = logs.some(l => l.category === 'planned');
      const hasWant = logs.some(l => l.category === 'want to visit');
      const hasFavorite = logs.some(l => l.category === 'favorite');

      if (hasLived) lived++;
      if (hasVisited) visited++;
      if (hasPlanned) planned++;
      if (hasWant) want++;
      if (hasFavorite) favorite++;

      // Count distinct cities for this country across all its logs
      const uniqueCities = new Set<string>();
      logs.forEach(l => {
        if (l.cities) {
          l.cities.forEach(c => uniqueCities.add(c.trim().toLowerCase()));
        }
      });
      totalCities += uniqueCities.size;

      // Plan budgets
      logs.forEach(l => {
        if (l.category === 'planned' && l.itinerary) {
          l.itinerary.forEach((day) => {
            day.entries.forEach((ent) => {
              if (ent.price) {
                plannedBudget += ent.price;
              }
            });
          });
        }
      });
    });

    return {
      visitedCount: visited,
      livedCount: lived,
      wantToVisitCount: want,
      plannedCount: planned,
      favoriteCount: favorite,
      totalUniqueCountries: tracks.length,
      citiesTracked: totalCities,
      totalPlannedBudget: plannedBudget,
    };
  }, [tracks]);

  // There are roughly 195 sovereign countries in the world.
  const worldVisitedPercent = useMemo(() => {
    const uniqueVisitedOrLived = tracks.filter((t) => {
      const logs = t.logs || [];
      return logs.some(l => l.category === 'visited' || l.category === 'lived' || l.category === 'favorite');
    }).length;
    return Math.round((uniqueVisitedOrLived / 195) * 100);
  }, [tracks]);

  const totalUniqueExplored = useMemo(() => {
    return tracks.filter((t) => {
      const logs = t.logs || [];
      return logs.some(l => l.category === 'visited' || l.category === 'lived' || l.category === 'favorite');
    }).length;
  }, [tracks]);

  // Find the next upcoming trip countdown across all multiple logs
  const nextTrip = useMemo(() => {
    const plannedTrips: Array<{ countryName: string; countryCode: string; plannedStartDate: string }> = [];
    tracks.forEach(t => {
      (t.logs || []).forEach(l => {
        if (l.category === 'planned' && l.plannedStartDate) {
          plannedTrips.push({
            countryName: t.countryName,
            countryCode: t.countryCode,
            plannedStartDate: l.plannedStartDate
          });
        }
      });
    });

    if (plannedTrips.length === 0) return null;

    // Filter and sort by plannedStartDate
    const futureTrips = plannedTrips
      .map((pt) => {
        const tripDate = new Date(pt.plannedStartDate);
        const today = new Date();
        // Zero out times
        today.setHours(0, 0, 0, 0);
        tripDate.setHours(0, 0, 0, 0);
        const diffTime = tripDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          countryName: pt.countryName,
          countryCode: pt.countryCode,
          startDate: pt.plannedStartDate,
          daysRemaining: diffDays,
        };
      })
      .filter((pt) => pt.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return futureTrips[0] || null;
  }, [tracks]);

  return (
    <div id="stats-dashboard-container" className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-7xl mx-auto">
      {/* Percentage Globe Card */}
      <div id="stat-card-visited-percent" className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4 md:col-span-2">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">World Footprint</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{worldVisitedPercent}% Visited</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            You have footprint in <span className="font-semibold text-slate-800">{totalUniqueExplored} countries</span>. Keep exploring to fill your global coordinate history!
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden relative border border-slate-100/50">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(2, Math.min(100, worldVisitedPercent))}%` }}
            />
          </div>
        </div>
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-center relative shrink-0">
          <Globe className="w-8 h-8 text-indigo-600 animate-pulse" />
        </div>
      </div>

      {/* Countdown Card */}
      <div id="stat-card-countdown" className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Adventure</span>
          {nextTrip ? (
            <div className="mt-1">
              <h4 className="text-xl font-bold text-slate-900 leading-tight">
                {nextTrip.daysRemaining === 0 ? 'Today!' : `${nextTrip.daysRemaining} Days`}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium text-indigo-600">
                To {nextTrip.countryName}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Starting: {nextTrip.startDate}
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <h4 className="text-sm font-semibold text-slate-600 leading-normal">No upcoming travels</h4>
              <p className="text-xs text-slate-400 leading-normal">
                Tag countries as <span className="font-medium text-amber-600">Planned</span> to schedule itineraries.
              </p>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
          <PlaneTakeoff className="w-5 h-5 text-amber-600" />
        </div>
      </div>


      {/* Budget Card */}
      <div id="stat-card-budget" className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Itinerary Budgets</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(stats.totalPlannedBudget, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Accumulated price across planned itineraries.
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Stat grid of minor badges */}
      <div id="stats-summary-grid" className="md:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Lived category value */}
        <div className="bg-white border border-slate-150/70 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold">Lived Here</div>
            <div className="text-lg font-bold text-slate-800">{stats.livedCount}</div>
          </div>
        </div>

        {/* Visited */}
        <div className="bg-white border border-slate-150/70 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold">Visited</div>
            <div className="text-lg font-bold text-slate-800">{stats.visitedCount}</div>
          </div>
        </div>

        {/* Planned */}
        <div className="bg-white border border-slate-150/70 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold">Planned</div>
            <div className="text-lg font-bold text-slate-800">{stats.plannedCount}</div>
          </div>
        </div>

        {/* Wishlist / Want to visit */}
        <div className="bg-white border border-slate-150/70 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold">Wants</div>
            <div className="text-lg font-bold text-slate-800">{stats.wantToVisitCount}</div>
          </div>
        </div>

        {/* Cities */}
        <div className="bg-white border border-slate-150/70 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold">Cities Logged</div>
            <div className="text-lg font-bold text-slate-800">{stats.citiesTracked}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
