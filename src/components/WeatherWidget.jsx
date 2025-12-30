import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Sun, Umbrella, Cloud } from 'lucide-react';
import { getDetailedLocationSummary, getSmartWeatherSummary } from '../services/weatherService';

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // New state for location details
    const [expandedLocation, setExpandedLocation] = useState(null);
    const [summaries, setSummaries] = useState({});
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        const fetchWeather = async () => {
            const data = await getSmartWeatherSummary();
            setWeather(data);
            setLoading(false);
        };

        fetchWeather();
        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLocationClick = async (loc) => {
        if (expandedLocation === loc.location) {
            setExpandedLocation(null);
            return;
        }

        setExpandedLocation(loc.location);

        // Fetch summary if not already cached
        if (!summaries[loc.location]) {
            setLoadingSummary(true);
            try {
                const summary = await getDetailedLocationSummary(loc.location, loc);
                setSummaries(prev => ({ ...prev, [loc.location]: summary }));
            } finally {
                setLoadingSummary(false);
            }
        }
    };

    if (loading) return (
        <div className="h-8 w-24 bg-black/5 rounded-full animate-pulse" />
    );

    return (
        <div className="relative z-50">
            {/* Status Pill in Header */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-black/5 px-3 py-1.5 rounded-full shadow-sm"
            >
                <span className="text-xl">
                    {weather?.raw[0]?.current?.temp > 30 ? '☀️' : weather?.raw[0]?.current?.precip > 0 ? '🌧️' : '⛅'}
                </span>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[13px] font-bold text-black">
                        {Math.round(weather?.homeTemp)}°C
                    </span>
                    <span className="text-[10px] text-black/60 font-medium truncate max-w-[100px]">
                        {weather?.summary?.pill || 'Loading...'}
                    </span>
                </div>
            </motion.button>

            {/* Expanded Weather Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-[320px] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden p-4"
                        style={{ zIndex: 100 }}
                    >
                        {/* Gemini Recommendation */}
                        <div className="bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 rounded-xl p-3 mb-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-full shadow-sm">
                                    <Umbrella size={16} className="text-[#007AFF]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[14px] leading-snug text-[#1C1C1E]/80 font-medium">
                                        "{weather?.summary?.recommendation}"
                                    </p>
                                    <p className="text-[10px] text-[#1C1C1E]/40 mt-1 font-medium">
                                        Short summary - {weather?.summary?.model}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-1">
                            {weather?.raw?.map((loc) => {
                                const rainChance = loc.hourlyForecast
                                    ? Math.max(...loc.hourlyForecast.map(h => h.rainProb))
                                    : 0;
                                const isExpanded = expandedLocation === loc.location;

                                return (
                                    <motion.div
                                        key={loc.location}
                                        layout
                                        onClick={() => handleLocationClick(loc)}
                                        className={`rounded-xl p-2 transition-all cursor-pointer border ${isExpanded ? 'bg-black/[0.03] border-black/5' : 'bg-transparent border-transparent hover:bg-black/[0.02]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-black/70 w-12">{loc.location}</span>
                                                <span className="text-xs text-black/40">{loc.current?.condition}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {rainChance > 20 && (
                                                    <span className="text-xs font-bold text-[#007AFF] flex items-center gap-1">
                                                        <CloudRain size={10} /> {rainChance}%
                                                    </span>
                                                )}
                                                <span className="text-sm font-bold text-black">
                                                    {Math.round(loc.current?.temp)}°
                                                </span>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-3 pb-1 text-[13px] text-black/70 leading-relaxed font-medium">
                                                        {loadingSummary && !summaries[loc.location] ? (
                                                            <div className="flex items-center gap-2 text-black/40 py-1">
                                                                <div className="w-3 h-3 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                                                                <span className="text-[12px]">Asking Gemini...</span>
                                                            </div>
                                                        ) : (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="bg-white rounded-lg p-3 border border-black/5 shadow-sm text-black/80"
                                                            >
                                                                {summaries[loc.location]}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <p className="text-[10px] text-center text-black/20 mt-4 font-medium">
                            Tap a location for AI insights
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

