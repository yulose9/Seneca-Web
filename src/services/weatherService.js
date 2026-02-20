import { GoogleGenAI } from "@google/genai";

const LOCATIONS = [
  { name: "Home", lat: 14.429, lng: 120.936 }, // Orchids St, Imus
  { name: "Work", lat: 14.561, lng: 121.021 }, // Trafalgar Plaza, Makati
  { name: "Metro", lat: 14.609, lng: 120.989 }, // General Manila
];

// Fetch raw weather from OpenMeteo (Free, reliable source for Lat/Lng weather)
async function fetchRawWeather(lat, lng) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila&forecast_days=2`,
    );
    return await response.json();
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

// Get readable condition from WMO code localized for the Philippines
const getWeatherCondition = (code) => {
  // WMO weather interpretation codes tailored to PH context
  const codes = {
    0: "Tirik ang Araw ☀️", // Clear sky
    1: "Maaraw 🌤️", // Mainly clear
    2: "Medyo Maulap ⛅", // Partly cloudy
    3: "Makulimlim ☁️", // Overcast
    45: "Hamon ng Hamog 🌫️", // Fog
    48: "Makapal na Hamog 🌫️", // Depositing rime fog
    51: "Umaambon 🌧️", // Light drizzle
    53: "Umaambon 🌧️", // Moderate drizzle
    55: "Umaambon nang Malakas 🌧️", // Dense drizzle
    56: "Malamig na Ambon 🌧️", // Light freezing drizzle (Amihan vibes)
    57: "Malamig na Ambon 🌧️", // Dense freezing drizzle
    61: "Umuulan 🌧️", // Slight rain
    63: "Lakas ng Ulan 🌧️", // Moderate rain
    65: "Malakas na Ulan ⛈️", // Heavy rain
    66: "Malamig na Ulan 🌧️", // Light freezing rain
    67: "Malamig na Ulan 🌧️", // Heavy freezing rain
    71: "Nagniniyebe? (Imposible) ❄️", // Slight snow fall 
    73: "Nagniniyebe? (Imposible) ❄️", // Moderate snow fall
    75: "Nagniniyebe? (Imposible) ❄️", // Heavy snow fall
    77: "Yelo? ❄️", // Snow grains
    80: "Paulan-ulan 🌦️", // Slight rain showers
    81: "Paulan-ulan 🌦️", // Moderate rain showers
    82: "Buhos ng Ulan ⛈️", // Violent rain showers (Habagat level)
    85: "Snow Showers? ❄️", // Slight snow showers
    86: "Snow Showers? ❄️", // Heavy snow showers
    95: "May Pagkulog at Pagkidlat 🌩️", // Thunderstorm: Slight or moderate
    96: "Bagyo! 🌀", // Thunderstorm with slight hail (PH context: severe storm)
    99: "Bagyo! 🌀", // Thunderstorm with heavy hail
  };
  return codes[code] || "Hindi matukoy 🤔";
};

const RAW_CACHE_KEY = "weather_raw_v5";
const RAW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const AI_SUMMARY_CACHE_KEY = "weather_ai_summary_docs_v6";
const AI_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours (3 times a day)

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
  } catch (e) {
    console.error("Raw cache error", e);
  }

  if (!rawWeatherData) {
    try {
      const weatherPromises = LOCATIONS.map(async (loc) => {
        const data = await fetchRawWeather(loc.lat, loc.lng);

        // If fetch fails, return a safe fallback structure
        if (!data)
          return {
            location: loc.name,
            current: {},
            hourlyForecast: [],
            tomorrow: {},
          };

        // Extract relevant future data for Gemini
        const next24Hours =
          data?.hourly?.temperature_2m?.slice(0, 24).map((temp, i) => ({
            time: data.hourly.time[i],
            temp: temp,
            rainProb: data.hourly.precipitation_probability[i],
            condition: getWeatherCondition(data.hourly.weather_code[i]),
          })) || [];

        const tomorrow = {
          maxTemp: data?.daily?.temperature_2m_max?.[1],
          minTemp: data?.daily?.temperature_2m_min?.[1],
          rainSum: data?.daily?.precipitation_sum?.[1],
          condition: getWeatherCondition(data?.daily?.weather_code?.[1]),
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
          tomorrow: tomorrow,
        };
      });
      rawWeatherData = await Promise.all(weatherPromises);

      // Validate we got data before caching
      if (
        rawWeatherData &&
        rawWeatherData.length > 0 &&
        rawWeatherData[0].current.temp !== undefined
      ) {
        localStorage.setItem(
          RAW_CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            data: rawWeatherData,
          }),
        );
      }
    } catch (e) {
      console.error("OpenMeteo Fetch Error:", e);
    }
  }

  // Safely extract Home Temp for Widget (Fixes NaN issue)
  const homeData = rawWeatherData?.find((d) => d.location === "Home") || {};
  homeTemp = homeData.current?.temp;
  // If undefined, we leave it null so UI can handle it, or default to 0 if preferred, but null is semantically better for "loading" or "error"

  // 2. Try to get AI Summary (Expensive)
  let aiSummary = null;
  let modelUsed = "Cached Memory";

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
      // 2. Age < 8 hours
      if (cachedDate === todayDate && age < AI_CACHE_DURATION) {
        aiSummary = parsed.data;
        aiSummary.timestamp = parsed.timestamp;
        // console.log("Using cached AI Summary");
      }
    }
  } catch (e) {
    console.error("AI cache error", e);
  }

  // 3. Generate New AI Summary if missing or stale
  if (!aiSummary && rawWeatherData) {
    const promptText = `
            Current Date/Time: ${new Date().toLocaleString("en-PH")}
            
            You are a helpful, witty personal assistant.
            Here is the comprehensive weather data for my locations:
            - Home: Imus, Cavite
            - Work: Salcedo Village, Makati
            - Metro: Metro Manila
            
            Data: ${JSON.stringify(rawWeatherData)}
    
            Based on the "current", "hourlyForecast" (next 24h), and "tomorrow" data for ALL THREE locations above:
            1. Summarize the overall weather outlook across these areas in just ONE SHARP, CONCISE sentence.
            2. Tell me whether to bring an umbrella, a jacket, or just a general practical suggestion based on the overview.
    
            TASKS:
            1. "pill": A very short status (max 4 words) e.g., "Rainy Day ☔" or "Clear Skies ☀️".
            2. "recommendation": A straight-to-the-point sentence combining the summary and action. 
               - Example: "Rain expected across all locations later today, definitely bring an umbrella! ☔"
               - Example: "Scorching hot at home and work today, dress light and stay hydrated! 🥤"
               - Example: "Overcast but dry everywhere today, comfortable weather for commuting. ☁️"
               Make it maximum 15 words. NO fluff.
    
            Output strictly valid JSON:
            { "pill": "...", "recommendation": "..." }
        `;

    try {
      // Attempt 1: Gemini 2.0 Flash (Stable)
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: { responseMimeType: "application/json" },
      });

      const fullText = result?.text || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || (typeof result?.response?.text === 'function' ? result.response.text() : undefined);

      if (fullText) {
        console.log("Gemini 2.0 Flash Output:", fullText);
        const cleanText = fullText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        aiSummary = JSON.parse(cleanText);
        modelUsed = "Gemini 2.0 Flash";
      } else {
        throw new Error("Empty Gemini 2.0 response");
      }
    } catch (error) {
      console.warn("Gemini 2.0 Failed, trying 1.5:", error);
      try {
        const ai = new GoogleGenAI({
          apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        });
        const result = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: { responseMimeType: "application/json" },
        });
        const text = result?.text || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || (typeof result?.response?.text === 'function' ? result.response.text() : undefined);
        if (text) {
          aiSummary = JSON.parse(
            text
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim(),
          );
          modelUsed = "Gemini 1.5 Flash";
        } else {
          throw new Error("Empty Gemini 1.5 response");
        }
      } catch (fbError) {
        console.warn("All AI Failed:", fbError);
        modelUsed = "Offline Fallback";

        // Smart Offline Fallback using raw weather data
        aiSummary = generateOfflineSummary(homeData);
      }
    }

    const generatedTimestamp = Date.now();
    if (aiSummary) {
      aiSummary.timestamp = generatedTimestamp;
      localStorage.setItem(
        AI_SUMMARY_CACHE_KEY,
        JSON.stringify({
          timestamp: generatedTimestamp,
          data: aiSummary,
        }),
      );
    }
  }

  // Default return if everything failed (prevents crash)
  if (!aiSummary) {
    aiSummary = { pill: "Weather", recommendation: "Unable to load weather.", timestamp: Date.now() };
  }

  return {
    raw: rawWeatherData || [],
    homeTemp: homeTemp !== undefined ? homeTemp : null, // Explicit null
    summary: { ...aiSummary, model: modelUsed },
  };
};

const CACHE_KEY_DETAIL_PREFIX = "weather_detail_cache_v6_"; // Version 6
const CACHE_DURATION_DETAIL = 8 * 60 * 60 * 1000; // 8 hours (3 times a day)

export const getDetailedLocationSummary = async (
  locationName,
  locationData,
) => {
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
        return { text: parsed.data, timestamp: parsed.timestamp, cached: true };
      }
    }
  } catch (e) {
    console.error("Detail cache read error:", e);
  }

  // 1. Prepare Data
  const minimalData = {
    current: locationData.current,
    forecast: locationData.hourlyForecast?.slice(0, 5).map((h) => ({
      time: new Date(h.time).getHours() + ":00",
      temp: h.temp,
      rain: h.rainProb + "%",
      cond: h.condition,
    })),
  };

  const locationMapping = {
    "Home": "Imus, Cavite",
    "Work": "Salcedo Village, Makati",
    "Metro": "Metro Manila"
  };
  const actualLocation = locationMapping[locationName] || locationName;

  const promptText = `
        Current Time: ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}.
        Location: ${actualLocation}
        API Data: ${JSON.stringify(minimalData)}

        Task: You are a smart weather assistant. 
        Give me a completely straight-to-the-point, ultra-short summary (max 1-2 SHORT sentences).
        State the vibe (e.g. humid, rainy, clear) and ONE piece of practical advice (wear/bring).
        NO fluff. No introductory filler like "Alright, checking...". Just the facts + advice.
        
        Style: Casual, witty, helpful.
        Emoji: Required.
        
        Examples:
        - "Cloudy with a chance of meatballs—jk, but do bring a brolly! ☔"
        - "34°C and extremely humid! Wear breathable fabrics and stay hydrated. 🥤"
        - "Clear skies tonight in ${actualLocation}, perfect for a run. 🏃"
    `;

  try {
    const ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    });

    // Attempt 1: Gemini 2.0 Flash (Stable)
    console.log(`Asking Gemini 2.0 Flash for ${locationName}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: { temperature: 0.9 },
    });

    const text = (response?.text || response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || (typeof response?.response?.text === 'function' ? response.response.text() : undefined))?.trim();

    if (text) {
      const generatedTimestamp = Date.now();
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: generatedTimestamp, data: text }),
      );
      return { text, timestamp: generatedTimestamp, cached: false };
    }
  } catch (error) {
    console.warn(
      "Gemini 2.0 Flash Summary Failed, falling back to 1.5:",
      error,
    );

    // Attempt 2: Gemini 1.5 Flash (Reliable)
    try {
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: { temperature: 0.7 },
      });
      const text = (response?.text || response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || (typeof response?.response?.text === 'function' ? response.response.text() : undefined))?.trim();
      if (text) {
        const generatedTimestamp = Date.now();
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: generatedTimestamp, data: text }),
        );
        return { text, timestamp: generatedTimestamp, cached: false };
      }
    } catch (fbError) {
      console.error("Gemini 1.5 Fallback Failed:", fbError);
    }
  }

  // Smart Fallback (Offline/Error) - Improved Logic
  const temp = locationData.current?.temp || 25;
  const cond = locationData.current?.condition?.toLowerCase() || "";
  const rainForecast = locationData.hourlyForecast?.some(
    (h) => h.rainProb > 30,
  );
  const rainNow =
    locationData.current?.precip > 0 ||
    cond.includes("rain") ||
    cond.includes("drizzle");

  const fallbackTimestamp = Date.now();
  if (rainNow || rainForecast)
    return { text: "Rain detected or expected provided by OpenMeteo. Bring an umbrella! ☔", timestamp: fallbackTimestamp, cached: false };
  if (temp > 31)
    return { text: `It's ${Math.round(temp)}°C outside. Wear cool clothes and sunscreen! ☀️`, timestamp: fallbackTimestamp, cached: false };
  if (cond.includes("cloud") || cond.includes("overcast"))
    return { text: "It's a bit cloudy, but should remain dry. ☁️", timestamp: fallbackTimestamp, cached: false };
  if (temp < 24)
    return { text: "Cooler weather today. A light jacket might be nice. 🧥", timestamp: fallbackTimestamp, cached: false };

  return { text: "Skies look clear. Enjoy your day! 🌤️", timestamp: fallbackTimestamp, cached: false };
};

// Smart offline fallback that generates a useful summary from raw weather data
const generateOfflineSummary = (locationData) => {
  const temp = locationData?.current?.temp;
  const cond = (locationData?.current?.condition || "").toLowerCase();
  const precip = locationData?.current?.precip || 0;
  const rainComing = locationData?.hourlyForecast?.some((h) => h.rainProb > 40);
  const rainNow =
    precip > 0 ||
    cond.includes("rain") ||
    cond.includes("drizzle") ||
    cond.includes("shower");
  const isHot = temp > 32;
  const isWarm = temp > 28;
  const isCool = temp < 24;
  const isCloudy = cond.includes("cloud") || cond.includes("overcast");
  const isFoggy = cond.includes("fog");

  if (rainNow) {
    return {
      pill: "Raining Now 🌧️",
      recommendation:
        "It's raining outside. Grab an umbrella before heading out! ☔",
    };
  }
  if (rainComing) {
    return {
      pill: "Rain Expected 🌦️",
      recommendation: "Rain is expected later. Keep an umbrella handy! ☂️",
    };
  }
  if (isHot) {
    return {
      pill: "Hot Weather ☀️",
      recommendation: `It's ${temp ? Math.round(temp) + "°C" : "hot"}. Stay hydrated and wear light clothing! 🥤`,
    };
  }
  if (isFoggy) {
    return {
      pill: "Foggy 🌫️",
      recommendation: "Visibility is low with fog. Drive carefully! 🌫️",
    };
  }
  if (isCloudy && isWarm) {
    return {
      pill: "Warm & Cloudy ⛅",
      recommendation: `${temp ? Math.round(temp) + "°C" : "Warm"} with clouds. Comfortable weather, no umbrella needed. 👍`,
    };
  }
  if (isCloudy) {
    return {
      pill: "Overcast ☁️",
      recommendation: "Cloudy skies today. Should stay dry though! ☁️",
    };
  }
  if (isCool) {
    return {
      pill: "Cool Weather 🧥",
      recommendation: `Cooler at ${temp ? Math.round(temp) + "°C" : "low temps"}. A light jacket would be nice! 🧥`,
    };
  }
  if (temp !== undefined) {
    return {
      pill: "Clear Skies ☀️",
      recommendation: `${Math.round(temp)}°C with clear skies. Great weather to be outside! 🌤️`,
    };
  }
  return {
    pill: "Weather ⛅",
    recommendation:
      "Couldn't reach the forecast. Check outside before heading out! 👀",
  };
};
