import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Search, ZoomIn, ZoomOut, RefreshCw, Compass, Info } from 'lucide-react';
import { CountryTrack, CountryCategory } from '../types';
import worldAtlasData from '../data/countries-110m.json';
import isoCountriesData from '../data/iso-countries.json';

interface WorldMapProps {
  tracks: CountryTrack[];
  onSelectCountry: (countryCode: string, countryName: string) => void;
  selectedCountryCode: string | null;
}

interface MapCountry {
  id: string; // numeric code (e.g. "840")
  name: string; // country name (e.g. "United States")
  code3: string; // alpha-3 code (e.g. "USA")
  feature: any; // geojson feature for drawing
}

const MICROSTATES = [
  { code3: 'SGP', numeric: '702', name: 'Singapore', lat: 1.3521, lng: 103.8198, r: 0.35 },
  { code3: 'MCO', numeric: '492', name: 'Monaco', lat: 43.7384, lng: 7.4246, r: 0.15 },
  { code3: 'VAT', numeric: '336', name: 'Vatican City', lat: 41.9029, lng: 12.4534, r: 0.15 },
  { code3: 'SMR', numeric: '674', name: 'San Marino', lat: 43.9424, lng: 12.4578, r: 0.15 },
  { code3: 'LIE', numeric: '438', name: 'Liechtenstein', lat: 47.1410, lng: 9.5554, r: 0.15 },
  { code3: 'AND', numeric: '020', name: 'Andorra', lat: 42.5063, lng: 1.5218, r: 0.15 },
  { code3: 'MLT', numeric: '470', name: 'Malta', lat: 35.9375, lng: 14.3754, r: 0.25 },
  { code3: 'LUX', numeric: '442', name: 'Luxembourg', lat: 49.8153, lng: 6.1296, r: 0.22 },
  { code3: 'MDV', numeric: '462', name: 'Maldives', lat: 3.2028, lng: 73.2207, r: 0.35 },
  { code3: 'BHR', numeric: '048', name: 'Bahrain', lat: 26.0667, lng: 50.5500, r: 0.35 },
  { code3: 'SYC', numeric: '690', name: 'Seychelles', lat: -4.6796, lng: 55.4920, r: 0.35 },
  { code3: 'MUS', numeric: '480', name: 'Mauritius', lat: -20.3484, lng: 57.5522, r: 0.35 },
  { code3: 'CPV', numeric: '132', name: 'Cabo Verde', lat: 16.0021, lng: -24.0132, r: 0.35 },
  { code3: 'BRB', numeric: '052', name: 'Barbados', lat: 13.1939, lng: -59.5432, r: 0.25 },
  { code3: 'LCA', numeric: '662', name: 'Saint Lucia', lat: 13.9094, lng: -60.9789, r: 0.25 },
  { code3: 'GRD', numeric: '308', name: 'Grenada', lat: 12.1165, lng: -61.6790, r: 0.25 },
  { code3: 'VCT', numeric: '670', name: 'Saint Vincent and the Grenadines', lat: 12.9843, lng: -61.2872, r: 0.25 },
  { code3: 'KNA', numeric: '659', name: 'Saint Kitts and Nevis', lat: 17.3578, lng: -62.7830, r: 0.25 },
  { code3: 'ATG', numeric: '028', name: 'Antigua and Barbuda', lat: 17.0608, lng: -61.7964, r: 0.25 },
  { code3: 'WSM', numeric: '882', name: 'Samoa', lat: -13.7590, lng: -172.1046, r: 0.35 },
  { code3: 'TON', numeric: '776', name: 'Tonga', lat: -21.1789, lng: -175.1982, r: 0.35 },
  { code3: 'TUV', numeric: '798', name: 'Tuvalu', lat: -7.1095, lng: 177.6493, r: 0.35 },
  { code3: 'NRU', numeric: '520', name: 'Nauru', lat: -0.5228, lng: 166.9315, r: 0.35 },
  { code3: 'PLW', numeric: '585', name: 'Palau', lat: 7.5150, lng: 134.5825, r: 0.35 },
  { code3: 'MHL', numeric: '584', name: 'Marshall Islands', lat: 7.1315, lng: 171.1844, r: 0.35 },
  { code3: 'FSM', numeric: '583', name: 'Micronesia', lat: 7.4256, lng: 150.5508, r: 0.35 },
  { code3: 'MAC', numeric: '446', name: 'Macao', lat: 22.1987, lng: 113.5439, r: 0.25 },
  { code3: 'HKG', numeric: '344', name: 'Hong Kong', lat: 22.3193, lng: 114.1694, r: 0.30 }
];

const createCirclePolygon = (lng: number, lat: number, radius: number): any => {
  const points = 16;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);
    const latRad = (lat * Math.PI) / 180;
    const adjustX = dx / Math.max(0.1, Math.cos(latRad));
    coordinates.push([lng + adjustX, lat + dy]);
  }
  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
};

export default function WorldMap({ tracks, onSelectCountry, selectedCountryCode }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<MapCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCountry, setHoveredCountry] = useState<MapCountry | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

  // Map tracks by alpha-3 country code for quick lookup
  const trackMap = useMemo(() => {
    const map = new Map<string, CountryTrack>();
    tracks.forEach(t => map.set(t.countryCode, t));
    return map;
  }, [tracks]);

  // Handle auto-resizing of SVG container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain consistent aspect ratio
      const height = Math.max(350, Math.min(600, width * 0.55));
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch topologies and country codes from local static database
  useEffect(() => {
    let active = true;

    function loadMapData() {
      try {
        setLoading(true);
        setError(null);

        const topoData = worldAtlasData;
        const isoData = isoCountriesData;

        if (!active) return;

        if (!topoData || !isoData) {
          throw new Error('Could not load map or code database.');
        }

        // Convert topojson back to GeoJSON features
        const geoJSON: any = topojson.feature(
          topoData as any, 
          (topoData as any).objects.countries
        );

        // Create ISO index mapping numeric string to detailed info
        const isoIndex = new Map<string, any>();
        (isoData as any[]).forEach((item) => {
          // Normalize leading zeros for ID comparison
          const numCode = String(item['country-code']).padStart(3, '0');
          isoIndex.set(numCode, item);
        });

        // Mix custom overrides or standard mappings
        const baseMapped: MapCountry[] = geoJSON.features.map((feature: any) => {
          const numId = String(feature.id).padStart(3, '0');
          const lookup = isoIndex.get(numId);

          let name = feature.properties?.name || 'Unknown Country';
          let code3 = '';

          if (lookup) {
            name = lookup.name;
            code3 = lookup['alpha-3'];
          } else {
            // Hardcoded common fallbacks for world-atlas values that might differ
            if (numId === '156') { name = 'China'; code3 = 'CHN'; }
            else if (numId === '356') { name = 'India'; code3 = 'IND'; }
            else if (numId === '840') { name = 'United States'; code3 = 'USA'; }
            else if (numId === '124') { name = 'Canada'; code3 = 'CAN'; }
            else if (numId === '643') { name = 'Russia'; code3 = 'RUS'; }
            else if (numId === '032') { name = 'Argentina'; code3 = 'ARG'; }
            else if (numId === '076') { name = 'Brazil'; code3 = 'BRA'; }
            else if (numId === '036') { name = 'Australia'; code3 = 'AUS'; }
            else if (numId === '250') { name = 'France'; code3 = 'FRA'; }
            else if (numId === '276') { name = 'Germany'; code3 = 'DEU'; }
            else if (numId === '392') { name = 'Japan'; code3 = 'JPN'; }
            else if (numId === '826') { name = 'United Kingdom'; code3 = 'GBR'; }
            else if (numId === '010') { name = 'Antarctica'; code3 = 'ATA'; }
          }

          return {
            id: numId,
            name,
            code3,
            feature
          };
        }).filter((c: MapCountry) => c.code3 !== ''); // Filter out unmapped boundaries

        // Create entries for microstates that are NOT already in the standard atlas
        const existingCodes = new Set(baseMapped.map(c => c.code3));
        const microstateEntries: MapCountry[] = MICROSTATES.map(m => ({
          id: m.numeric,
          name: m.name,
          code3: m.code3,
          feature: {
            type: 'Feature',
            id: m.numeric,
            properties: { name: m.name },
            geometry: {
              type: 'Point',
              coordinates: [m.lng, m.lat]
            }
          }
        }));

        const finalMapped = [...baseMapped];
        microstateEntries.forEach(m => {
          if (!existingCodes.has(m.code3)) {
            finalMapped.push(m);
          }
        });

        setCountries(finalMapped);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError('Failed to setup local map data.');
          setLoading(false);
        }
      }
    }

    loadMapData();
    return () => {
      active = false;
    };
  }, []);

  // Filter countries by search keyword
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return countries.filter(
      c => c.name.toLowerCase().includes(query) || c.code3.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery, countries]);

  // Setup D3 Zoom and Draw rendering within the SVG
  useEffect(() => {
    if (loading || error || countries.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    // Clear dynamic bindings 
    svg.select('.map-content').selectAll('*').remove();

    const g = svg.select('.map-content');

    const microstateCodes = new Set(MICROSTATES.map(m => m.code3));
    const pathCountries = countries.filter(c => c.feature && c.feature.geometry && !microstateCodes.has(c.code3));

    // Create Natural Earth projection centered on standard countries
    const projection = d3.geoNaturalEarth1()
      .fitSize([dimensions.width, dimensions.height], { type: 'FeatureCollection', features: pathCountries.map(c => c.feature) });

    const pathGenerator = d3.geoPath().projection(projection);

    // Render country path elements
    const countryPaths = g.selectAll('.country-path')
      .data(pathCountries, (d: any) => d.code3)
      .join('path')
      .attr('class', 'country-path transition-all cursor-pointer stroke-white outline-none')
      .attr('d', (d: any) => pathGenerator(d.feature))
      .attr('stroke-width', 0.5)
      .attr('fill', (d: any) => {
        const track = trackMap.get(d.code3);
        if (track) {
          switch (track.category) {
            case 'lived': return 'url(#pattern-lived)'; // Emerald pattern or color
            case 'visited': return 'url(#pattern-visited)'; // Indigo pattern or color
            case 'planned': return 'url(#pattern-planned)'; // Amber pattern or color
            case 'want to visit': return 'url(#pattern-want)'; // Rose pattern or color
            case 'favorite': return 'url(#pattern-favorite)'; // Red pattern or color
            default: return '#E2E8F0'; // Fallback
          }
        }
        return selectedCountryCode === d.code3 ? '#CBD5E1' : '#F1F5F9';
      })
      .attr('stroke', (d: any) => {
        return selectedCountryCode === d.code3 ? '#0F172A' : '#FFFFFF';
      })
      .attr('stroke-width', (d: any) => {
        return selectedCountryCode === d.code3 ? 1.5 : 0.5;
      });

    // Render microstate circles
    const microstateCircles = g.selectAll('.microstate-circle')
      .data(MICROSTATES, (d: any) => d.code3)
      .join('circle')
      .attr('class', 'microstate-circle transition-all cursor-pointer stroke-white')
      .attr('cx', (d: any) => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[0] : 0;
      })
      .attr('cy', (d: any) => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[1] : 0;
      })
      .attr('r', 4.5)
      .attr('stroke-width', (d: any) => {
        return selectedCountryCode === d.code3 ? 1.5 : 0.75;
      })
      .attr('stroke', (d: any) => {
        return selectedCountryCode === d.code3 ? '#0F172A' : '#FFFFFF';
      })
      .attr('fill', (d: any) => {
        const track = trackMap.get(d.code3);
        if (track) {
          switch (track.category) {
            case 'lived': return '#10B981';
            case 'visited': return '#6366F1';
            case 'planned': return '#F59E0B';
            case 'want to visit': return '#F43F5E';
            case 'favorite': return '#DC2626';
          }
        }
        return selectedCountryCode === d.code3 ? '#475569' : '#CBD5E1';
      });

    // Interaction Events for Paths
    countryPaths
      .on('mouseover', function (event, d: any) {
        d3.select(this)
          .attr('opacity', 0.85)
          .attr('stroke', '#0F172A')
          .attr('stroke-width', 1);
        
        setHoveredCountry(d);
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (event) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseout', function (event, d: any) {
        const isSelected = selectedCountryCode === d.code3;
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke', isSelected ? '#0F172A' : '#FFFFFF')
          .attr('stroke-width', isSelected ? 1.5 : 0.5);
        
        setHoveredCountry(null);
      })
      .on('click', function (event, d: any) {
        onSelectCountry(d.code3, d.name);
      });

    // Interaction Events for Microstate Circles
    microstateCircles
      .on('mouseover', function (event, d: any) {
        d3.select(this)
          .attr('r', 6.5)
          .attr('stroke', '#0F172A')
          .attr('stroke-width', 1.5);
        
        setHoveredCountry({
          id: d.numeric,
          name: d.name,
          code3: d.code3,
          feature: null
        });
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (event) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseout', function (event, d: any) {
        const isSelected = selectedCountryCode === d.code3;
        d3.select(this)
          .attr('r', 4.5)
          .attr('stroke', isSelected ? '#0F172A' : '#FFFFFF')
          .attr('stroke-width', isSelected ? 1.5 : 0.75);
        
        setHoveredCountry(null);
      })
      .on('click', function (event, d: any) {
        onSelectCountry(d.code3, d.name);
      });

    // Zoom setup
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [dimensions.width, dimensions.height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Zoom buttons handling
    d3.select('.zoom-btn-in').on('click', () => {
      svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.4);
    });

    d3.select('.zoom-btn-out').on('click', () => {
      svg.transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.4);
    });

    d3.select('.zoom-btn-reset').on('click', () => {
      svg.transition().duration(250).call(zoomBehavior.transform, d3.zoomIdentity);
    });

    // Cleanup listeners
    return () => {
      svg.on('.zoom', null);
    };

  }, [loading, error, countries, dimensions, trackMap, selectedCountryCode]);

  // Center on a searched country
  const handleSelectSearchCountry = (country: MapCountry) => {
    onSelectCountry(country.code3, country.name);
    setSearchQuery('');
    
    if (!svgRef.current || countries.length === 0) return;
    const svg = d3.select(svgRef.current);
    
    // Calculate bounding box and zoom to it
    const projection = d3.geoNaturalEarth1()
      .fitSize([dimensions.width, dimensions.height], { type: 'FeatureCollection', features: countries.map(c => c.feature) });

    const pathGenerator = d3.geoPath().projection(projection);
    const bounds = pathGenerator.bounds(country.feature);
    
    if (!bounds) return;

    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const x = (bounds[0][0] + bounds[1][0]) / 2;
    const y = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.max(1.2, Math.min(8, 0.9 / Math.max(dx / dimensions.width, dy / dimensions.height)));
    const translate = [dimensions.width / 2 - scale * x, dimensions.height / 2 - scale * y];

    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  };

  // Status mapping for visual descriptions in hover
  const getCategoryClass = (cat: CountryCategory) => {
    switch (cat) {
      case 'lived': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'visited': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'planned': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'want to visit': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'favorite': return 'bg-red-100 text-red-800 border-red-200';
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

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col relative w-full h-full max-w-7xl mx-auto">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 id="world-map-title" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-slate-700" />
            Interactive Travel Map
          </h2>
          <p className="text-xs text-slate-500 font-sans tracking-wide mt-1">
            Tap on any country or search below to change status, budget, timelines, and city details.
          </p>
        </div>

        {/* Search Panel */}
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="map-country-search"
              type="text"
              placeholder="Search country to pin... (e.g. France, Japan)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Autocomplete dropdown dropdown */}
          {filteredCountries.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden divide-y divide-slate-100">
              {filteredCountries.map((c) => {
                const track = trackMap.get(c.code3);
                return (
                  <button
                    key={c.code3}
                    id={`search-item-${c.code3}`}
                    onClick={() => handleSelectSearchCountry(c)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    {track ? (
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getCategoryClass(track.category)}`}>
                        {track.category}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Unpinned</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
        <span className="text-[10px] uppercase text-slate-400 font-bold mr-1">Legend:</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-600"></span>
          <span>Lived</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-indigo-500 border border-indigo-600"></span>
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-600"></span>
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-rose-500 border border-rose-600"></span>
          <span>Want to visit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-red-600 border border-red-700"></span>
          <span>Favorite</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-[10px] text-slate-400 font-normal">
          <Info className="w-3.5 h-3.5 text-slate-400 inline mr-0.5" />
          Scroll to zoom, drag to pan map.
        </div>
      </div>

      {/* Map Stage container */}
      <div
        ref={containerRef}
        className="w-full relative overflow-hidden bg-slate-50/30 rounded-2xl border border-slate-100 flex items-center justify-center min-h-[350px] cursor-grab active:cursor-grabbing"
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 gap-3">
            <RefreshCw className="w-6 h-6 text-slate-700 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading premium cartography maps...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 p-6 text-center">
            <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <svg
          ref={svgRef}
          id="world-map-svg"
          width={dimensions.width}
          height={dimensions.height}
          className="select-none outline-none block"
        >
          <defs>
            {/* Elegant patterns to fill country shapes */}
            {/* Lived: Teal/Emerald */}
            <pattern id="pattern-lived" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#10B981" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#059669" strokeWidth="1.5" />
            </pattern>
            {/* Visited: Slate Indigo */}
            <pattern id="pattern-visited" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#6366F1" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#4F46E5" strokeWidth="1.5" />
            </pattern>
            {/* Planned: Deep Amber */}
            <pattern id="pattern-planned" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#F59E0B" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#D97706" strokeWidth="1.5" />
            </pattern>
            {/* Want to visit: Light Warm Rose */}
            <pattern id="pattern-want" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#F43F5E" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#E11D48" strokeWidth="1.5" />
            </pattern>
            {/* Favorite: Royal Red Gradient */}
            <pattern id="pattern-favorite" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#DC2626" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#991B1B" strokeWidth="2.5" />
            </pattern>
          </defs>
          
          {/* Main content group for dynamic canvas transformations */}
          <g className="map-content" />
        </svg>

        {/* Vector Control Rails */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-20">
          <button
            title="Zoom In"
            className="zoom-btn-in p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all focus:outline-none flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 text-slate-800" />
          </button>
          <button
            title="Zoom Out"
            className="zoom-btn-out p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all focus:outline-none flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 text-slate-800" />
          </button>
          <button
            title="Recenter Map"
            className="zoom-btn-reset p-2 px-3 text-[10px] font-bold tracking-wider uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all focus:outline-none flex items-center justify-center active:scale-95 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Floating Hover Custom Tooltip */}
      {hoveredCountry && (
        <div
          id="map-tooltip"
          className="fixed pointer-events-none z-50 bg-slate-900 text-white rounded-xl py-2 px-3.5 shadow-xl border border-slate-800 max-w-xs transition-opacity duration-150"
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y + 12}px`,
          }}
        >
          <p className="font-bold text-sm leading-tight text-white">{hoveredCountry.name}</p>
          <p className="text-[10px] text-slate-300 font-sans tracking-wide mt-0.5 uppercase">
            Code: {hoveredCountry.code3}
          </p>
          
          {(() => {
            const track = trackMap.get(hoveredCountry.code3);
            if (track) {
              return (
                <div className="mt-2 pt-1.5 border-t border-slate-800 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      track.category === 'lived' ? 'bg-emerald-400' :
                      track.category === 'visited' ? 'bg-indigo-400' :
                      track.category === 'planned' ? 'bg-amber-400' :
                      track.category === 'want to visit' ? 'bg-rose-400' : 'bg-red-500'
                    }`} />
                    <span className="text-xs font-semibold">{getCategoryLabel(track.category)}</span>
                  </div>
                  
                  {/* Additional metadata info on stay */}
                  {(track.category === 'visited' || track.category === 'lived') && track.startDate && (
                    <p className="text-[10px] text-slate-400">
                      Stayed: {track.startDate} {track.endDate ? `to ${track.endDate}` : '(Present)'}
                    </p>
                  )}
                  {track.category === 'planned' && track.plannedStartDate && (
                    <p className="text-[10px] text-slate-400">
                      Trip starts: {track.plannedStartDate}
                    </p>
                  )}
                  {track.cities && track.cities.length > 0 && (
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      Cities ({track.cities.length}): {track.cities.join(', ')}
                    </p>
                  )}
                </div>
              );
            }
            return (
              <p className="text-[10px] text-slate-400 mt-1">Click country to label status</p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
