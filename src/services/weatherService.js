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

const CACHE_KEY = 'weather_smart_cache_v3'; // Updated cache key
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getSmartWeatherSummary = async () => {
    // 0. Check Cache
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            if (age < CACHE_DURATION) {
                console.log("Using cached weather data (Gemini 3)");
                return parsed.data;
            }
        }
    } catch (e) {
        console.error("Cache read error:", e);
    }

    // 1. Fetch raw data (OpenMeteo)
    let weatherData = [];
    try {
        const weatherPromises = LOCATIONS.map(async (loc) => {
            const data = await fetchRawWeather(loc.lat, loc.lng);

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
        weatherData = await Promise.all(weatherPromises);
    } catch (e) {
        console.error("OpenMeteo Error:", e);
    }

    const homeData = weatherData.find(d => d.location === 'Home') || {};

    // 2. Feed to Gemini 3 Flash Preview
    let aiSummary = {
        pill: homeData.current?.condition || 'Weather',
        recommendation: `Currently ${homeData.current?.temp || '--'}°C. Check forecast.`
    };

    const promptText = `
        Current Date/Time: ${new Date().toLocaleString('en-PH')}
        
        You are a helpful, witty personal assistant.
        Here is the comprehensive weather data for my locations (Home, Work, Metro Manila):
        ${JSON.stringify(weatherData)}

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

    let modelUsed = 'Offline Fallback';

    try {
        // Initialize Gemini 3 Client (Official Pattern)
        const ai = new GoogleGenAI({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        });

        // "Generic" tools array if needed, but we rely on context. 
        // Adding thinkingConfig as per user documentation.
        const config = {
            thinkingConfig: {
                thinkingLevel: 'HIGH',
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
            ],
        };

        const req = {
            model: 'gemini-3-flash-preview',
            config: config,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: promptText }]
                }
            ],
        };

        // Use Stream as per official docs
        const responseStream = await ai.models.generateContentStream(req);

        let fullText = '';
        for await (const chunk of responseStream) {
            if (chunk.text) {
                fullText += chunk.text;
            }
        }

        console.log("Gemini 3 Raw Output:", fullText);

        const cleanText = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
        aiSummary = JSON.parse(cleanText);
        modelUsed = 'Gemini 3 Flash Preview';

    } catch (error) {
        console.warn("Gemini 3 Summary Failed:", error);

        // 2b. Fallback to Gemini 1.5 Flash (Standard)
        try {
            console.log("Attempting Gemini 1.5 Fallback...");
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const req = {
                model: 'gemini-1.5-flash',
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                config: { responseMimeType: 'application/json' }
            };
            const result = await ai.models.generateContent(req);
            const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                aiSummary = JSON.parse(text);
                modelUsed = 'Gemini 1.5 Flash';
            } else {
                throw new Error("Empty 1.5 response");
            }
        } catch (fallbackError) {
            console.warn("Gemini 1.5 Fallback Failed:", fallbackError);
            modelUsed = 'Offline Fallback';

            // 2c. Robust Hardcoded Fallback
            const rainComing = homeData.hourlyForecast?.some(h => h.rainProb > 40) || homeData.current?.precip > 0;
            const isHot = homeData.current?.temp > 32;
            const isCloudy = homeData.current?.condition?.includes('cloud') || homeData.current?.condition?.includes('Overcast');

            if (rainComing) {
                aiSummary.recommendation = "Bring an umbrella, rain is expected soon! ☔";
                aiSummary.pill = "Rain Likely 🌧️";
            } else if (isHot) {
                aiSummary.recommendation = "It's scorching outside! Wear sunscreen. ☀️";
                aiSummary.pill = "Hot Weather ☀️";
            } else if (isCloudy) {
                aiSummary.recommendation = "It's cloudy but dry. Good weather for a walk. ☁️";
                aiSummary.pill = "Overcast ☁️";
            } else {
                aiSummary.recommendation = "Clear skies ahead. Enjoy your day! 🌤️";
                aiSummary.pill = "Clear Skies ☀️";
            }
        }
    }

    const finalResult = {
        raw: weatherData,
        homeTemp: homeData.current?.temp,
        summary: { ...aiSummary, model: modelUsed }
    };

    // 3. Save to Cache
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: finalResult
        }));
    } catch (e) {
        console.error("Cache write error:", e);
    }

    return finalResult;
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

