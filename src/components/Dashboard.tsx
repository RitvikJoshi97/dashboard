"use client";

import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

interface Device {
  mac: string;
  hostname: string;
  ip: string;
  last_seen: string;
  name?: string;
  preferences?: {
    type?: string;
    location?: string;
    user?: string;
    wake_word?: string;
    brand?: string;
    [key: string]: any;
  };
  isKnown: boolean;
}

interface Weather {
  temperature: number;
  condition: string;
  humidity?: number;
  is_day?: boolean;
  prefersDarkMode?: boolean;
  weather_code?: number;
  cloud_cover?: number;
  precipitation?: number;
  wind_speed?: number;
  wind_direction?: number;
  max_temp?: number;
  min_temp?: number;
  location?: {
    name: string;
    country: string;
    displayName?: string;
    latitude?: number;
    longitude?: number;
  };
  forecast?: {
    date: string;
    condition: string;
    max: number;
    min: number;
    precipitation_probability: number;
  }[];
}

interface Recipe {
  title: string;
  description: string;
}

// Helper to get display name for a device
function getDisplayName(device: Device): string {
  if (device.preferences?.user) return device.preferences.user;
  if (device.name) return device.name;
  if (device.hostname) return device.hostname;
  return 'Unknown Device';
}

// Helper to get wind direction from degrees
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [weatherLocation, setWeatherLocation] = useState<string | null>(null);
  const [devicesExpanded, setDevicesExpanded] = useState<boolean>(false); // Default to collapsed

  // Initialize state from localStorage on client-side only
  useEffect(() => {
    // Get devices expanded state from localStorage
    const savedDevicesExpanded = localStorage.getItem('devicesExpanded');
    if (savedDevicesExpanded !== null) {
      setDevicesExpanded(savedDevicesExpanded === 'true');
    }
    
    // Get dark mode state if available
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // Function to toggle devices section expansion
  const toggleDevicesSection = () => {
    const newState = !devicesExpanded;
    setDevicesExpanded(newState);
    localStorage.setItem('devicesExpanded', String(newState));
  };

  // Function to fetch weather data
  const fetchWeather = async (location: string) => {
    try {
      console.log(`🌤️ Fetching weather for location: ${location}`);
      const weatherRes = await fetch(`http://localhost:5002/api/weather/${encodeURIComponent(location)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!weatherRes.ok) {
        console.error(`❌ Weather fetch error: ${weatherRes.status} ${weatherRes.statusText}`);
        throw new Error(`Failed to fetch weather: ${weatherRes.status} ${weatherRes.statusText}`);
      }

      const weatherData = await weatherRes.json();
      console.log('📊 Received weather data:', weatherData);
      
      // Make sure we have all required properties
      if (!weatherData.current) {
        console.error('❌ Missing current weather data in response');
        return;
      }
      
      const processedWeather: Weather = {
        temperature: weatherData.current.temperature_2m || 20,
        condition: weatherData.current.condition || 'Unknown',
        humidity: weatherData.current.relative_humidity_2m,
        is_day: weatherData.current.is_day,
        prefersDarkMode: weatherData.current.prefersDarkMode !== undefined 
          ? weatherData.current.prefersDarkMode 
          : false,
        weather_code: weatherData.current.weather_code,
        cloud_cover: weatherData.current.cloud_cover,
        precipitation: weatherData.current.precipitation,
        wind_speed: weatherData.current.wind_speed_10m,
        wind_direction: weatherData.current.wind_direction_10m,
        max_temp: weatherData.current.temperature_2m_max,
        min_temp: weatherData.current.temperature_2m_min,
        location: weatherData.location || { 
          name: location, 
          country: 'Unknown',
          displayName: location 
        }
      };
      
      // Process forecast data if available
      if (weatherData.daily && weatherData.daily.time && weatherData.daily.time.length > 0) {
        // Internal function to get weather condition from code
        const getConditionFromCode = (code: number): string => {
          // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
          const weatherConditions: {[key: number]: string} = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Fog',
            51: 'Light drizzle',
            53: 'Drizzle',
            55: 'Heavy drizzle',
            56: 'Freezing drizzle',
            57: 'Freezing drizzle',
            61: 'Light rain',
            63: 'Rain',
            65: 'Heavy rain',
            66: 'Freezing rain',
            67: 'Freezing rain',
            71: 'Light snow',
            73: 'Snow',
            75: 'Heavy snow',
            77: 'Snow',
            80: 'Light showers',
            81: 'Showers',
            82: 'Heavy showers',
            85: 'Snow showers',
            86: 'Snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm',
            99: 'Thunderstorm'
          };
          return weatherConditions[code] || 'Unknown';
        };
        
        processedWeather.forecast = weatherData.daily.time.map((time: string, index: number) => {
          const date = new Date(time);
          return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            condition: getConditionFromCode(weatherData.daily.weather_code[index]),
            max: weatherData.daily.temperature_2m_max[index],
            min: weatherData.daily.temperature_2m_min[index],
            precipitation_probability: weatherData.daily.precipitation_probability_max[index],
            weather_code: weatherData.daily.weather_code[index]
          };
        });
      }
      
      console.log('✅ Processed weather data:', processedWeather);
      setWeather(processedWeather);
      
      // Always set dark mode based on weather conditions
      setDarkMode(processedWeather.prefersDarkMode || false);
      localStorage.setItem('darkMode', String(processedWeather.prefersDarkMode || false));
    } catch (err) {
      console.error('❌ Weather fetch error:', err);
      // Create a fallback weather object
      const fallbackWeather: Weather = {
        temperature: 20,
        condition: 'Unknown',
        humidity: 50,
        is_day: true,
        prefersDarkMode: false,
        wind_speed: 0,
        wind_direction: 0,
        precipitation: 0,
        max_temp: 25,
        min_temp: 15,
        location: { name: location, country: 'Unknown', displayName: location },
        forecast: [
          {
            date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            condition: 'Unknown',
            max: 25,
            min: 15,
            precipitation_probability: 0
          },
          {
            date: new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            condition: 'Unknown',
            max: 26,
            min: 16,
            precipitation_probability: 0
          },
          {
            date: new Date(Date.now() + 172800000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            condition: 'Unknown',
            max: 24,
            min: 14,
            precipitation_probability: 0
          }
        ]
      };
      setWeather(fallbackWeather);
      setDarkMode(false);
      localStorage.setItem('darkMode', 'false');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch devices
        console.log('📱 Fetching devices...');
        const devicesRes = await fetch('http://localhost:5002/api/devices', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
        });

        if (!devicesRes.ok) {
          throw new Error(`Failed to fetch devices: ${devicesRes.status} ${devicesRes.statusText}`);
        }

        const devicesData = await devicesRes.json();
        console.log('📱 Received devices:', devicesData);
        setDevices(devicesData);
        setLastUpdate(new Date().toLocaleString());

        // Get the current known device for weather location
        const currentDevice = getCurrentKnownDevice(devicesData);
        console.log('📱 Current known device:', currentDevice);
        
        if (currentDevice && currentDevice.preferences?.location) {
          console.log(`📍 Device location: ${currentDevice.preferences.location}`);
          // Always fetch weather on each update to ensure we have the latest data
          setWeatherLocation(currentDevice.preferences.location);
          await fetchWeather(currentDevice.preferences.location);
        } else {
          console.log('❌ No location found in device preferences');
          // Use a default location if none is found in device preferences
          const defaultLocation = "London";
          setWeatherLocation(defaultLocation);
          await fetchWeather(defaultLocation);
        }
      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // When weather location changes, fetch the weather
  useEffect(() => {
    if (weatherLocation) {
      fetchWeather(weatherLocation);
    }
  }, [weatherLocation]);

  // Apply dark mode class to the document body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.style.backgroundColor = '#1a202c';
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.style.backgroundColor = '#f8f9fa';
    }
  }, [darkMode]);

  // Add meta viewport tag to ensure proper rendering on mobile devices
  useEffect(() => {
    // Set viewport meta tag for portrait mode
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(viewportMeta);

    // Add touch action handling for iOS
    document.documentElement.style.touchAction = 'manipulation';
    
    // Force portrait orientation if possible
    if (window.screen && window.screen.orientation) {
      try {
        // Lock to portrait if supported
        // @ts-ignore - TypeScript doesn't recognize lock method on some implementations
        window.screen.orientation.lock && window.screen.orientation.lock('portrait').catch(() => {
          // Silently fail if not supported or permission denied
          console.log('Could not lock screen orientation');
        });
      } catch (e) {
        console.log('Screen orientation API not supported');
      }
    }

    // Prevent bounce/elastic scrolling on iOS
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overflowY = 'auto';
    // @ts-ignore - TypeScript doesn't recognize WebkitOverflowScrolling
    document.body.style.WebkitOverflowScrolling = 'touch';

    // Set app to fullscreen for iOS when added to home screen
    const metaAppleMobileWebAppCapable = document.createElement('meta');
    metaAppleMobileWebAppCapable.name = 'apple-mobile-web-app-capable';
    metaAppleMobileWebAppCapable.content = 'yes';
    document.head.appendChild(metaAppleMobileWebAppCapable);

    const metaAppleMobileWebAppStatus = document.createElement('meta');
    metaAppleMobileWebAppStatus.name = 'apple-mobile-web-app-status-bar-style';
    metaAppleMobileWebAppStatus.content = 'black-translucent';
    document.head.appendChild(metaAppleMobileWebAppStatus);

    return () => {
      // Clean up on component unmount
      document.head.removeChild(viewportMeta);
      document.head.removeChild(metaAppleMobileWebAppCapable);
      document.head.removeChild(metaAppleMobileWebAppStatus);
    };
  }, []);

  // Get the most recently seen known device
  const getCurrentKnownDevice = (deviceList: Device[] = devices) => {
    const knownDevices = deviceList.filter(d => d.isKnown);
    if (knownDevices.length === 0) {
      console.log('❌ No known devices found');
      return null;
    }
    
    // Since devices are already sorted by priority from the API,
    // we just take the first device in the array (highest priority)
    // that was seen in the last 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    for (const device of knownDevices) {
      if (new Date(device.last_seen) > thirtyMinutesAgo) {
        return device;
      }
    }
    
    // If no device was seen in the last 30 minutes, return the most recently seen
    return knownDevices.reduce((latest, current) => {
      return new Date(current.last_seen) > new Date(latest.last_seen) ? current : latest;
    }, knownDevices[0]);
  };

  if (isLoading && devices.length === 0) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <h1 className={styles.heading}>Home Dashboard</h1>
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <h1 className={styles.heading}>Home Dashboard</h1>
        <div className={styles.errorContainer}>
          <p className={styles.error}>Error: {error}</p>
          <p className={styles.error}>Please make sure the API server is running at http://localhost:5002</p>
        </div>
      </div>
    );
  }

  const currentKnownDevice = getCurrentKnownDevice();

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
      {currentKnownDevice && (
        <p className={styles.heading}>Hello {getDisplayName(currentKnownDevice)}</p>
      )}
      {lastUpdate && (
        <p className={styles.lastUpdate}>Last updated: {lastUpdate}</p>
      )}

      {/* Weather section */}
      {weather && (
        <section className={styles.weather}>
          <h2 className={styles.subheading}>
            {weather.location && weather.location.name && 
              `Weather in ${weather.location.displayName || weather.location.name}`
            }
            {weather.location?.country && ` (${weather.location.country})`}
          </h2>
          <div className={styles.weatherDetails}>
            {weather.temperature !== undefined && (
              <p className={styles.temperature}>{weather.temperature}°C</p>
            )}
            {(weather.max_temp !== undefined && weather.min_temp !== undefined) && (
              <p className={styles.tempRange}>
                <span className={styles.maxTemp}>{weather.max_temp}°</span> / 
                <span className={styles.minTemp}>{weather.min_temp}°</span>
              </p>
            )}
            {weather.condition && (
              <p className={styles.condition}>{weather.condition}</p>
            )}
            {weather.humidity !== undefined && (
              <p className={styles.humidity}>Humidity: {weather.humidity}%</p>
            )}
            {(weather.wind_speed !== undefined && weather.wind_direction !== undefined) && (
              <p className={styles.wind}>
                Wind: {weather.wind_speed} km/h from {getWindDirection(weather.wind_direction)}
              </p>
            )}
            {weather.precipitation !== undefined && weather.precipitation > 0 && (
              <p className={styles.precipitation}>
                Precipitation: {weather.precipitation} mm
              </p>
            )}
            {weather.cloud_cover !== undefined && (
              <p className={styles.cloudCover}>
                Cloud cover: {weather.cloud_cover}%
              </p>
            )}
            <p className={styles.modeInfo}>
              {darkMode ? 'Night mode' : 'Day mode'} active based on weather conditions
            </p>
          </div>
          
          {/* Add forecast section if available */}
          {weather.forecast && (
            <div className={styles.forecastSection}>
              <h3 className={styles.forecastHeading}>3-Day Forecast</h3>
              <div className={styles.forecastContainer}>
                {weather.forecast.map((day, index) => (
                  <div key={index} className={styles.forecastDay}>
                    <h4 className={styles.forecastDate}>{day.date}</h4>
                    {day.condition && <p className={styles.forecastCondition}>{day.condition}</p>}
                    {(day.max !== undefined && day.min !== undefined) && (
                      <p className={styles.forecastTemp}>
                        <span className={styles.maxTemp}>{day.max}°</span> / 
                        <span className={styles.minTemp}>{day.min}°</span>
                      </p>
                    )}
                    {day.precipitation_probability !== undefined && (
                      <p className={styles.forecastPrecip}>
                        Rain: {day.precipitation_probability}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      
      <section className={`${styles.devices} ${!devicesExpanded ? styles.collapsedSection : ''}`}>
        <div className={styles.sectionHeader} onClick={toggleDevicesSection}>
          <h2 className={styles.subheading}>Connected Devices ({devices.length})</h2>
          <button className={styles.toggleButton} aria-label={devicesExpanded ? 'Collapse devices section' : 'Expand devices section'}>
            {devicesExpanded ? 'Hide Devices ▼' : 'Show Devices ►'}
          </button>
        </div>
        
        {!devicesExpanded && devices.length > 0 && (
          <p className={styles.collapsedHint}>
            {devices.filter(d => d.isKnown).length} known devices, {devices.length - devices.filter(d => d.isKnown).length} unknown devices connected
          </p>
        )}
        
        {devicesExpanded && (
          <div className={styles.deviceList}>
            {devices.length === 0 ? (
              <p>No devices found</p>
            ) : (
              devices.map((device) => (
                <div key={device.mac} className={`${styles.deviceCard} ${device.isKnown ? styles.knownDevice : ''}`}>
                  <h3 className={styles.deviceName}>{getDisplayName(device)}</h3>
                  <p className={styles.deviceInfo}>IP: {device.ip}</p>
                  <p className={styles.deviceInfo}>MAC: {device.mac}</p>
                  <p className={styles.deviceInfo}>Last seen: {new Date(device.last_seen).toLocaleString()}</p>
                  {device.preferences && (
                    <div className={styles.preferences}>
                      {device.preferences.location && (
                        <p className={styles.preferenceInfo}>Location: {device.preferences.location}</p>
                      )}
                      {device.preferences.type && (
                        <p className={styles.preferenceInfo}>Type: {device.preferences.type}</p>
                      )}
                      {device.preferences.wake_word && (
                        <p className={styles.preferenceInfo}>Wake word: {device.preferences.wake_word}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {recipe && (
        <section className={styles.recipe}>
          <h2 className={styles.subheading}>Recipe Suggestion</h2>
          <h3 className={styles.recipeTitle}>{recipe.title}</h3>
          <p className={styles.recipeDescription}>{recipe.description}</p>
        </section>
      )}
    </div>
  );
}