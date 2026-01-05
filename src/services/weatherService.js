import { GoogleGenAI } from '@google/genai';

const LOCATIONS = [
    { name: 'Home', lat: 14.429, lng: 120.936 }, // Orchids St, Imus
    { name: 'Work', lat: 14.561, lng: 121.021 }, // Trafalgar Plaza, Makati
    { name: 'Metro', lat: 14.609, lng: 120.989 }  // General Manila
];

// Fetch raw weather from OpenMeteo (Free, reliable source for Lat/Lng weather)
async function fetchRawWeather(lat, lng) {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila&forecast_days=2`
        );
        return await response.json();
    } catch (error) {
        console.error("Weather fetch error:", error);
        return null;
    }
}

// Get readable condition from WMO code
const getWeatherCondition = (code) => {
    const codes = {
        0: 'Clear sky ☀️',
        1: 'Mainly clear 🌤️',
        2: 'Partly cloudy ⛅',
        3: 'Overcast ☁️',
        45: 'Fog 🌫️', 48: 'Fog 🌫️',
        51: 'Drizzle 🌧️', 53: 'Drizzle 🌧️', 55: 'Drizzle 🌧️',
        61: 'Rain 🌧️', 63: 'Rain 🌧️', 65: 'Heavy Rain ⛈️',
        80: 'Showers 🌦️', 81: 'Showers 🌦️', 82: 'Violent Showers ⛈️',
    };
    return codes[code] || 'Unknown';
};

const RAW_CACHE_KEY = 'weather_raw_v4';
const RAW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const AI_SUMMARY_CACHE_KEY = 'weather_ai_summary_docs_v4';
const AI_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

export const getSmartWeatherSummary = async () => {
    let rawWeatherData = null;
    let homeTemp = null;

    // 1. Try to get RAW weather data (Cheap/Free)
    try {
        const cachedRaw = localStorage.getItem(RAW_CACHE_KEY);
        if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (Date.now() - parsed.timestamp < RAW_CACHE_DURATION) {
                rawWeatherData = parsed.data;
                // console.log("Using cached RAW weather");
            }
        }
    } catch (e) { console.error("Raw cache error", e); }

    if (!rawWeatherData) {
        try {
            const weatherPromises = LOCATIONS.map(async (loc) => {
                const data = await fetchRawWeather(loc.lat, loc.lng);

                // If fetch fails, return a safe fallback structure
                if (!data) return { location: loc.name, current: {}, hourlyForecast: [], tomorrow: {} };

                // Extract relevant future data for Gemini
                const next24Hours = data?.hourly?.temperature_2m?.slice(0, 24).map((temp, i) => ({
                    time: data.hourly.time[i],
                    temp: temp,
                    rainProb: data.hourly.precipitation_probability[i],
                    condition: getWeatherCondition(data.hourly.weather_code[i])
                })) || [];

                const tomorrow = {
                    maxTemp: data?.daily?.temperature_2m_max?.[1],
                    minTemp: data?.daily?.temperature_2m_min?.[1],
                    rainSum: data?.daily?.precipitation_sum?.[1],
                    condition: getWeatherCondition(data?.daily?.weather_code?.[1])
                };

                return {
                    location: loc.name,
                    current: {
                        temp: data?.current?.temperature_2m,
                        feelsLike: data?.current?.apparent_temperature,
                        condition: getWeatherCondition(data?.current?.weather_code),
                        precip: data?.current?.precipitation,
                    },
                    hourlyForecast: next24Hours.filter((_, i) => i % 4 === 0), // Sample every 4 hours to save tokens
                    tomorrow: tomorrow
                };
            });
            rawWeatherData = await Promise.all(weatherPromises);

            // Validate we got data before caching
            if (rawWeatherData && rawWeatherData.length > 0 && rawWeatherData[0].current.temp !== undefined) {
                localStorage.setItem(RAW_CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: rawWeatherData
                }));
            }
        } catch (e) {
            console.error("OpenMeteo Fetch Error:", e);
        }
    }

    // Safely extract Home Temp for Widget (Fixes NaN issue)
    const homeData = rawWeatherData?.find(d => d.location === 'Home') || {};
    homeTemp = homeData.current?.temp;
    // If undefined, we leave it null so UI can handle it, or default to 0 if preferred, but null is semantically better for "loading" or "error"

    // 2. Try to get AI Summary (Expensive)
    let aiSummary = null;
    let modelUsed = 'Cached Memory';

    try {
        const cachedAI = localStorage.getItem(AI_SUMMARY_CACHE_KEY);
        if (cachedAI) {
            const parsed = JSON.parse(cachedAI);
            const age = Date.now() - parsed.timestamp;

            // Check day change
            const cachedDate = new Date(parsed.timestamp).getDate();
            const todayDate = new Date().getDate();

            // Use cache if:
            // 1. Same day AND
            // 2. Age < 4 hours
            if (cachedDate === todayDate && age < AI_CACHE_DURATION) {
                aiSummary = parsed.data;
                // console.log("Using cached AI Summary");
            }
        }
    } catch (e) { console.error("AI cache error", e); }

    // 3. Generate New AI Summary if missing or stale
    if (!aiSummary && rawWeatherData) {
        const promptText = `
            Current Date/Time: ${new Date().toLocaleString('en-PH')}
            
            You are a helpful, witty personal assistant.
            Here is the comprehensive weather data for my locations (Home, Work, Metro Manila):
            ${JSON.stringify(rawWeatherData)}
    
            Based on the "current", "hourlyForecast" (next 24h), and "tomorrow" data:
            1. Analyze the likelihood of RAIN or EXTREME HEAT.
            2. Formulate a specific recommendation (e.g., "Bring an umbrella", "Wear sunscreen", "Bring a jacket", "Stay dry").
    
            TASKS:
            1. "pill": A very short status (max 4 words) e.g., "Rainy Day ☔" or "Clear Skies ☀️".
            2. "recommendation": A conversational sentence telling me what to do/bring. 
               - If rainy: "Bring an umbrella, it's likely to rain later."
               - If hot: "It's scorching outside, don't forget sunscreen!"
               - If clear: "Great weather for a walk today."
    
            Output strictly valid JSON:
            { "pill": "...", "recommendation": "..." }
        `;

        try {
            // Attempt Gemini 3 Flash Preview
            const ai = new GoogleGenAI({
                apiKey: import.meta.env.VITE_GEMINI_API_KEY,
            });

            const config = {
                thinkingConfig: { thinkingLevel: 'HIGH' },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
                ],
            };

            const req = {
                model: 'gemini-3-flash-preview', // Or 'gemini-2.0-flash-thinking-exp' if 3 not avail
                config: config,
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
            };

            // Fallback safety for streaming vs non-streaming
            // We'll use standard generateContent to be simpler/more robust for this cron-like task
            // unless streaming is strictly required. Standard is fine for background fetch.
            // Actually, let's keep it robust.

            const result = await ai.models.generateContent(req);
            const fullText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (fullText) {
                console.log("Gemini 3 Output:", fullText);
                const cleanText = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
                aiSummary = JSON.parse(cleanText);
                modelUsed = 'Gemini 3 Flash';
            } else {
                throw new Error("Empty Gemini 3 response");
            }

        } catch (error) {
            console.warn("Gemini 3 Failed, trying 1.5:", error);
            try {
                const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
                const result = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: { responseMimeType: 'application/json' }
                });
                aiSummary = JSON.parse(result.response.text());
                modelUsed = 'Gemini 1.5 Flash';
            } catch (fbError) {
                console.warn("All AI Failed:", fbError);
                modelUsed = 'Offline Fallback';

                // 2c. Robust Hardcoded Fallback
                const rainComing = homeData.hourlyForecast?.some(h => h.rainProb > 40) || homeData.current?.precip > 0;
                const isHot = homeData.current?.temp > 32;
                const isCloudy = homeData.current?.condition?.includes('cloud') || homeData.current?.condition?.includes('Overcast');

                aiSummary = {
                    pill: rainComing ? "Rain Likely 🌧️" : isHot ? "Hot Weather ☀️" : isCloudy ? "Overcast ☁️" : "Clear Skies ☀️",
                    recommendation: rainComing ? "Bring an umbrella, rain is expected! ☔" : "Check the forecast, AI is sleeping. 😴"
                };
            }
        }

        // Cache the AI Result
        if (aiSummary) {
            localStorage.setItem(AI_SUMMARY_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: aiSummary
            }));
        }
    }

    // Default return if everything failed (prevents crash)
    if (!aiSummary) {
        aiSummary = { pill: "Weather", recommendation: "Unable to load weather." };
    }

    return {
        raw: rawWeatherData || [],
        homeTemp: homeTemp !== undefined ? homeTemp : null, // Explicit null
        summary: { ...aiSummary, model: modelUsed }
    };
};

const CACHE_KEY_DETAIL_PREFIX = 'weather_detail_cache_v3_'; // Version 3
const CACHE_DURATION_DETAIL = 2 * 60 * 60 * 1000; // 2 hours

export const getDetailedLocationSummary = async (locationName, locationData) => {
    if (!locationData) return null;

    // 0. Check Cache
    const cacheKey = `${CACHE_KEY_DETAIL_PREFIX}${locationName}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            if (age < CACHE_DURATION_DETAIL) {
                console.log(`Using cached summary for ${locationName}`);
                return parsed.data;
            }
        }
    } catch (e) {
        console.error("Detail cache read error:", e);
    }

    // 1. Prepare Data
    const minimalData = {
        current: locationData.current,
        forecast: locationData.hourlyForecast?.slice(0, 5).map(h => ({
            time: new Date(h.time).getHours() + ':00',
            temp: h.temp,
            rain: h.rainProb + '%',
            cond: h.condition
        }))
    };

    const promptText = `
        Current Time: ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}.
        Location: ${locationName}
        Official API Data: ${JSON.stringify(minimalData)}

        Task: You are a smart weather assistant. 
        1. Search current weather for ${locationName}, Philippines to verify the API data.
        2. Combine specific API details (rain %, temp) with your search insights.
        3. Give 1 sentence of PRACTICAL ADVICE (wear/bring).
        
        Style: Casual, witty, helpful.
        Emoji: Required.
        
        Examples:
        - "Cloudy with a chance of meatballs—jk, but do bring a brolly! ☔"
        - "It's 34°C! Wear breathable fabrics and stay hydrated. 🥤"
        - "Clear skies tonight, perfect for a run. 🏃"
    `;

    try {
        const ai = new GoogleGenAI({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        });

        // Attempt 1: Gemini 2.0 Flash (Bleeding Edge) with Search
        console.log(`Asking Gemini 2.0 for ${locationName}...`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            config: {
                tools: [{ googleSearch: {} }], // Enable Search Grounding
                temperature: 0.9,
            }
        });

        const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (text) {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
            return text;
        }

    } catch (error) {
        console.warn("Gemini 2.0 Summary Failed, falling back to 1.5:", error);

        // Attempt 2: Gemini 1.5 Flash (Reliable)
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                config: { temperature: 0.7 }
            });
            const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
                return text;
            }
        } catch (fbError) {
            console.error("Gemini 1.5 Fallback Failed:", fbError);
        }
    }

    // Smart Fallback (Offline/Error) - Improved Logic
    const temp = locationData.current?.temp || 25;
    const cond = locationData.current?.condition?.toLowerCase() || '';
    const rainForecast = locationData.hourlyForecast?.some(h => h.rainProb > 30);
    const rainNow = locationData.current?.precip > 0 || cond.includes('rain') || cond.includes('drizzle');

    if (rainNow || rainForecast) return "Rain detected or expected provided by OpenMeteo. Bring an umbrella! ☔";
    if (temp > 31) return `It's ${Math.round(temp)}°C outside. Wear cool clothes and sunscreen! ☀️`;
    if (cond.includes('cloud') || cond.includes('overcast')) return "It's a bit cloudy, but should remain dry. ☁️";
    if (temp < 24) return "Cooler weather today. A light jacket might be nice. 🧥";

    return "Skies look clear. Enjoy your day! 🌤️";
};

