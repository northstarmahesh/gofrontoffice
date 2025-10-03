import { useState, useEffect } from 'react';

interface WeatherData {
  condition: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy';
  temp: number;
}

export const useGreetingAndWeather = () => {
  const [greeting, setGreeting] = useState('Good Morning');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('useGreetingAndWeather hook initialized');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      console.log('Current hour:', hour);
      
      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
        setTimeOfDay('morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good Afternoon');
        setTimeOfDay('afternoon');
      } else if (hour >= 17 && hour < 21) {
        setGreeting('Good Evening');
        setTimeOfDay('evening');
      } else {
        setGreeting('Good Night');
        setTimeOfDay('night');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Get user's location
        if (!navigator.geolocation) {
          console.log('Geolocation not supported');
          setLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Location:', latitude, longitude);
            
            // Using Open-Meteo API (free, no API key required)
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
            );
            
            if (!response.ok) {
              console.error('Weather fetch failed');
              throw new Error('Weather fetch failed');
            }
            
            const data = await response.json();
            const weatherCode = data.current.weather_code;
            const temp = data.current.temperature_2m;
            
            console.log('Weather data:', { weatherCode, temp });
            
            // Map weather codes to conditions
            let condition: WeatherData['condition'] = 'clear';
            if (weatherCode === 0) condition = 'clear';
            else if (weatherCode <= 3) condition = 'cloudy';
            else if (weatherCode <= 67) condition = 'rainy';
            else if (weatherCode <= 77) condition = 'snowy';
            else if (weatherCode <= 82) condition = 'rainy';
            else if (weatherCode <= 86) condition = 'snowy';
            else if (weatherCode >= 95) condition = 'stormy';
            else if (weatherCode >= 45 && weatherCode <= 48) condition = 'foggy';
            
            console.log('Weather condition:', condition);
            setWeather({ condition, temp });
            setLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Weather fetch error:', error);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getBackgroundGradient = () => {
    const baseGradients = {
      morning: 'from-amber-400 via-orange-400 to-yellow-500',
      afternoon: 'from-blue-400 via-sky-400 to-cyan-400',
      evening: 'from-orange-500 via-purple-500 to-pink-500',
      night: 'from-indigo-900 via-purple-900 to-slate-900',
    };

    if (!weather) return `bg-gradient-to-br ${baseGradients[timeOfDay]}`;

    // Modify gradient based on weather
    const weatherGradients = {
      clear: baseGradients[timeOfDay],
      cloudy: timeOfDay === 'night' 
        ? 'from-slate-700 via-gray-800 to-slate-900'
        : 'from-gray-400 via-slate-400 to-gray-500',
      rainy: 'from-slate-600 via-gray-600 to-slate-700',
      snowy: 'from-blue-200 via-slate-300 to-gray-400',
      stormy: 'from-slate-800 via-gray-900 to-slate-950',
      foggy: 'from-gray-400 via-slate-400 to-gray-500',
    };

    return `bg-gradient-to-br ${weatherGradients[weather.condition]}`;
  };

  const getEmoji = () => {
    if (!weather) {
      const emojiMap = {
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌆',
        night: '🌙',
      };
      return emojiMap[timeOfDay];
    }

    const weatherEmojiMap = {
      clear: timeOfDay === 'night' ? '🌙' : '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      snowy: '❄️',
      stormy: '⛈️',
      foggy: '🌫️',
    };

    return weatherEmojiMap[weather.condition];
  };

  return {
    greeting,
    timeOfDay,
    weather,
    loading,
    backgroundGradient: getBackgroundGradient(),
    emoji: getEmoji(),
  };
};
