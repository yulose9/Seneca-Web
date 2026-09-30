import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Sun, Umbrella, Cloud, Clock, CloudLightning, Wind } from 'lucide-react';
import { EASE_OUT, LAYOUT_SPRING, TAP, TAP_TRANSITION } from '../constants/motion';
import { getDetailedLocationSummary, getSmartWeatherSummary } from '../services/weatherService';

const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);

    if (diffSeconds < 60) return 'Updated just now';

    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `Updated ${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `Updated at ${timeStr} (${diffHours}h ago)`;
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // New state for location details
    const [expandedLocation, setExpandedLocation] = useState(null);
    const [summaries, setSummaries] = useState({});
    const [loadingSummary, setLoadingSummary] = useState(false);
    const containerRef = useRef(null);

    // Dismiss the popover on outside tap or Escape, like a native popover
    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

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
        <div className="h-8 w-24 bg-fill rounded-full animate-pulse" />
    );

    return (
        <div ref={containerRef} className="relative z-50">
            {/* Status Pill in Header */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileTap={TAP}
                transition={TAP_TRANSITION}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="flex items-center gap-1.5 h-10 bg-white/60 backdrop-blur-md px-3 rounded-full shadow-card"
            >
                <span className="text-title-3">
                    {(weather?.homeTemp ?? 25) > 30 ? '☀️' : (weather?.raw?.[0]?.current?.precip ?? 0) > 0 ? '🌧️' : '⛅'}
                </span>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-footnote font-bold text-ink tabular-nums">
                        {typeof weather?.homeTemp === 'number' ? `${Math.round(weather.homeTemp)}°C` : '--'}
                    </span>
                    <span className="hidden min-[420px]:block text-caption-2 text-ink-2 font-medium truncate max-w-[100px]">
                        {weather?.summary?.pill || 'Loading...'}
                    </span>
                </div>
            </motion.button>

            {/* Expanded Weather Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: EASE_OUT } }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        role="dialog"
                        aria-label="Weather details"
                        className="absolute top-full right-0 mt-3 w-[320px] bg-surface rounded-sheet shadow-float border border-separator overflow-hidden p-3"
                        style={{ zIndex: 100, transformOrigin: 'top right' }}
                    >
                        {/* Gemini Recommendation */}
                        <div className="bg-gradient-to-br from-accent/10 to-indigo/10 rounded-xl p-3 mb-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-surface rounded-full shadow-card">
                                    {weather?.summary?.icon === 'sun' && <Sun size={16} className="text-caution" />}
                                    {weather?.summary?.icon === 'cloud-sun' && <Cloud size={16} className="text-caution" />}
                                    {(weather?.summary?.icon === 'cloud' || !weather?.summary?.icon) && <Cloud size={16} className="text-ink-2" />}
                                    {weather?.summary?.icon === 'cloud-rain' && <CloudRain size={16} className="text-accent" />}
                                    {weather?.summary?.icon === 'umbrella' && <Umbrella size={16} className="text-accent" />}
                                    {weather?.summary?.icon === 'cloud-lightning' && <CloudLightning size={16} className="text-indigo" />}
                                    {weather?.summary?.icon === 'wind' && <Wind size={16} className="text-positive" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-subhead text-ink font-medium">
                                        "{weather?.summary?.recommendation}"
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-caption-2 text-ink-2 font-medium border border-separator rounded-lg px-1.5 py-0.5 inline-block bg-white/50">
                                            AI Match • {weather?.summary?.model?.replace('Gemini ', '')}
                                        </p>
                                        {weather?.summary?.timestamp && (
                                            <p className="text-caption-2 text-accent/80 font-medium flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatTimeAgo(weather.summary.timestamp)}
                                            </p>
                                        )}
                                    </div>
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
                                        transition={LAYOUT_SPRING}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        onClick={() => handleLocationClick(loc)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleLocationClick(loc);
                                            }
                                        }}
                                        className={`rounded-2xl p-2 transition-colors duration-150 cursor-pointer border ${isExpanded ? 'bg-fill border-separator' : 'bg-transparent border-transparent hover:bg-black/[0.02] active:bg-fill'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-subhead font-semibold text-ink-2 w-12">{loc.location}</span>
                                                <span className="text-caption text-ink-2">{loc.current?.condition}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {rainChance > 20 && (
                                                    <span className="text-caption font-bold text-accent flex items-center gap-1 tabular-nums">
                                                        <CloudRain size={10} /> {rainChance}%
                                                    </span>
                                                )}
                                                <span className="text-subhead font-bold text-ink tabular-nums">
                                                    {loc.current?.temp !== undefined ? Math.round(loc.current.temp) : '--'}°
                                                </span>
                                            </div>
                                        </div>

                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ ...LAYOUT_SPRING, opacity: { duration: 0.2, ease: EASE_OUT } }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-3 pb-1 text-footnote text-ink-2 leading-relaxed font-medium">
                                                        {loadingSummary && !summaries[loc.location] ? (
                                                            <div className="flex items-center gap-2 text-ink-2 py-1">
                                                                <div className="w-3 h-3 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                                                                <span className="text-caption">Asking Gemini...</span>
                                                            </div>
                                                        ) : (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 4 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.2, ease: EASE_OUT }}
                                                                className="bg-surface rounded-lg p-3 shadow-card text-ink"
                                                            >
                                                                <p className="leading-snug">
                                                                    {summaries[loc.location]?.text || summaries[loc.location]}
                                                                </p>
                                                                {summaries[loc.location]?.timestamp && (
                                                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-separator">
                                                                        <div className="flex items-center gap-1 text-caption-2 text-ink-2 font-semibold">
                                                                            <Sun size={8} /> AI
                                                                        </div>
                                                                        <span className="text-caption-2 text-accent/80 font-medium flex items-center gap-1">
                                                                            <Clock size={8} />
                                                                            {formatTimeAgo(summaries[loc.location].timestamp)}
                                                                        </span>
                                                                    </div>
                                                                )}
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

                        <p className="text-caption-2 text-center text-ink-3 mt-4 font-medium">
                            Tap a location for AI insights
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

