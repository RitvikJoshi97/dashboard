"use client";

import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

interface Device {
  mac: string;
  hostname: string;
  ip: string;
  last_seen: string;
}

interface Weather {
  temperature: number;
  condition: string;
}

interface Recipe {
  title: string;
  description: string;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch devices
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
        console.log('Received devices:', devicesData);
        setDevices(devicesData);
        setLastUpdate(new Date().toLocaleString());

        // Fetch weather (you'll need to implement this with a weather API)
        // const weatherRes = await fetch('YOUR_WEATHER_API_ENDPOINT');
        // const weatherData = await weatherRes.json();
        // setWeather(weatherData);

        // Fetch recipe suggestion (you'll need to implement this with a recipe API)
        // const recipeRes = await fetch('YOUR_RECIPE_API_ENDPOINT');
        // const recipeData = await recipeRes.json();
        // setRecipe(recipeData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading && devices.length === 0) {
    return (
      <div className={styles.container}>
        <h1>Home Dashboard</h1>
        <p>Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1>Home Dashboard</h1>
        <p className={styles.error}>Error: {error}</p>
        <p className={styles.error}>Please make sure the API server is running at http://localhost:5002</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Home Dashboard</h1>
      {lastUpdate && (
        <p className={styles.lastUpdate}>Last updated: {lastUpdate}</p>
      )}
      
      <section className={styles.devices}>
        <h2>Connected Devices ({devices.length})</h2>
        <div className={styles.deviceList}>
          {devices.length === 0 ? (
            <p>No devices found</p>
          ) : (
            devices.map((device) => (
              <div key={device.mac} className={styles.deviceCard}>
                <h3>{device.hostname || 'Unknown Device'}</h3>
                <p>IP: {device.ip}</p>
                <p>MAC: {device.mac}</p>
                <p>Last seen: {new Date(device.last_seen).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {weather && (
        <section className={styles.weather}>
          <h2>Weather</h2>
          <p>Temperature: {weather.temperature}°C</p>
          <p>Condition: {weather.condition}</p>
        </section>
      )}

      {recipe && (
        <section className={styles.recipe}>
          <h2>Recipe Suggestion</h2>
          <h3>{recipe.title}</h3>
          <p>{recipe.description}</p>
        </section>
      )}
    </div>
  );
}