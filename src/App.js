import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Weather App Component
function App() {
  const [city, setCity] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("metric"); // metric or imperial
  const [theme, setTheme] = useState("weather-gradient-day");

  // API Key - Your OpenWeatherMap API key
  const API_KEY = "bb975ed0422332c59167d806bf662b68";

  // Get weather icon URL
  const getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  // Get theme based on weather condition and time
  const getThemeClass = (iconCode) => {
    if (!iconCode) return "weather-gradient-day";
    
    const isDayTime = iconCode.includes("d");
    const weatherCode = iconCode.substr(0, 2);
    
    if (!isDayTime) {
      return "weather-gradient-night";
    }
    
    switch (weatherCode) {
      case "01": // clear sky
      case "02": // few clouds
        return "weather-gradient-day";
      case "03": // scattered clouds
      case "04": // broken clouds
        return "weather-gradient-cloudy";
      case "09": // shower rain
      case "10": // rain
      case "11": // thunderstorm
        return "weather-gradient-rain";
      case "13": // snow
        return "weather-gradient-snow";
      default:
        return "weather-gradient-day";
    }
  };

  // Fetch weather data using free API endpoints
  const fetchWeatherData = async (params) => {
    try {
      setLoading(true);
      setError("");
      
      let latitude, longitude, cityName;
      
      // If city is provided, get coordinates first
      if (params.city) {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${params.city}&limit=1&appid=${API_KEY}`;
        const geoResponse = await axios.get(geoUrl);
        
        if (!geoResponse.data || geoResponse.data.length === 0) {
          throw new Error("City not found");
        }
        
        latitude = geoResponse.data[0].lat;
        longitude = geoResponse.data[0].lon;
        cityName = params.city;
      } else if (params.lat && params.lon) {
        // Use provided coordinates
        latitude = params.lat;
        longitude = params.lon;
        
        // Get city name from coordinates
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
        const reverseGeoResponse = await axios.get(reverseGeoUrl);
        
        if (reverseGeoResponse.data && reverseGeoResponse.data.length > 0) {
          cityName = reverseGeoResponse.data[0].name;
        } else {
          cityName = "Unknown Location";
        }
      } else {
        throw new Error("Either city or coordinates are required");
      }
      
      // Get current weather data (free API)
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${params.units || unit}&appid=${API_KEY}`;
      const currentWeatherResponse = await axios.get(currentWeatherUrl);
      
      // Get 5-day forecast data (free API)
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${params.units || unit}&appid=${API_KEY}`;
      const forecastResponse = await axios.get(forecastUrl);
      
      // Process and set the data
      setWeatherData({
        ...currentWeatherResponse.data,
        city: cityName
      });
      
      setForecastData(forecastResponse.data);
      setCity(cityName);
      
      // Set theme based on current weather
      if (currentWeatherResponse.data && currentWeatherResponse.data.weather && currentWeatherResponse.data.weather[0]) {
        setTheme(getThemeClass(currentWeatherResponse.data.weather[0].icon));
      }
      
      return {
        current: currentWeatherResponse.data,
        forecast: forecastResponse.data
      };
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setError(error.message === "City not found" ? "City not found. Please try another city." : "Failed to fetch weather data. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Try to get user's location when the app loads
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            await fetchWeatherData({
              lat: latitude,
              lon: longitude,
              units: unit
            });
          } catch (err) {
            console.error(err);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Geolocation is not available. Please search for a city.");
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    
    try {
      await fetchWeatherData({ city, units: unit });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle temperature unit
  const toggleUnit = async () => {
    const newUnit = unit === "metric" ? "imperial" : "metric";
    setUnit(newUnit);
    
    if (weatherData) {
      try {
        await fetchWeatherData({ 
          city: city, 
          units: newUnit 
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
  };

  // Format current date
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Group forecast data by day
  const getDailyForecast = () => {
    if (!forecastData || !forecastData.list) return [];
    
    const dailyData = {};
    
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      
      if (!dailyData[date]) {
        dailyData[date] = {
          dt: item.dt,
          temp: {
            min: item.main.temp,
            max: item.main.temp
          },
          weather: item.weather[0],
          pop: item.pop || 0
        };
      } else {
        // Update min/max temperatures
        if (item.main.temp > dailyData[date].temp.max) {
          dailyData[date].temp.max = item.main.temp;
        }
        if (item.main.temp < dailyData[date].temp.min) {
          dailyData[date].temp.min = item.main.temp;
        }
        
        // Update precipitation probability if higher
        if (item.pop > dailyData[date].pop) {
          dailyData[date].pop = item.pop;
        }
      }
    });
    
    return Object.values(dailyData).slice(0, 5); // Return first 5 days
  };

  return (
    <div className={`min-h-screen ${theme} text-white`}>
      <div className="relative">
        {/* Background pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30 z-0"></div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Weather Forecast</h1>
            <p className="text-white/80">{getCurrentDate()}</p>
          </header>
          
          {/* Search Form */}
          <div className="max-w-md mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search for a city..."
                className="w-full p-4 pl-12 pr-10 rounded-full glass text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70"></i>
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/30 hover:bg-white/40 text-white p-2 rounded-full transition-all"
              >
                <i className="fas fa-search"></i>
              </button>
            </form>
          </div>
          
          {/* Unit Toggle */}
          <div className="flex justify-center mb-6">
            <button
              onClick={toggleUnit}
              className="glass px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/30 transition-all"
            >
              <span className={unit === "metric" ? "font-bold" : "opacity-70"}>°C</span>
              <div className="w-10 h-5 bg-white/30 rounded-full relative">
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    unit === "metric" ? "left-0.5" : "transform translate-x-5"
                  }`}
                ></div>
              </div>
              <span className={unit === "imperial" ? "font-bold" : "opacity-70"}>°F</span>
            </button>
          </div>
          
          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 right-0 bottom-0 border-4 border-t-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto bg-red-500/80 text-white p-4 rounded-lg mb-6 flex items-center">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span>{error}</span>
            </div>
          )}
          
          {/* Weather Content */}
          {weatherData && !loading && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Current Weather */}
              <div className="glass rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold">{weatherData.city || weatherData.name}</h2>
                    <p className="text-xl capitalize">{weatherData.weather[0].description}</p>
                    
                    <div className="mt-4 flex items-center">
                      <i className="fas fa-temperature-high mr-2 text-2xl"></i>
                      <span className="text-5xl md:text-6xl font-bold">
                        {Math.round(weatherData.main.temp)}°
                        <span className="text-2xl font-normal">{unit === "metric" ? "C" : "F"}</span>
                      </span>
                    </div>
                    
                    <p className="text-lg mt-1">
                      Feels like {Math.round(weatherData.main.feels_like)}°
                      {unit === "metric" ? "C" : "F"}
                    </p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex flex-col items-center">
                    <img 
                      src={getWeatherIconUrl(weatherData.weather[0].icon) || "/placeholder.svg"}
                      alt="Weather icon" 
                      className="w-24 h-24 md:w-32 md:h-32 drop-shadow-lg"
                    />
                  </div>
                </div>
                
                {/* Weather Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="glass rounded-2xl p-4 flex items-center">
                    <i className="fas fa-tint mr-3 text-blue-300 text-xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Humidity</p>
                      <p className="font-semibold text-lg">{weatherData.main.humidity}%</p>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-4 flex items-center">
                    <i className="fas fa-wind mr-3 text-blue-300 text-xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Wind</p>
                      <p className="font-semibold text-lg">
                        {Math.round(weatherData.wind.speed)} {unit === "metric" ? "m/s" : "mph"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-4 flex items-center">
                    <i className="fas fa-cloud mr-3 text-blue-300 text-xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Clouds</p>
                      <p className="font-semibold text-lg">{weatherData.clouds.all}%</p>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-4 flex items-center">
                    <i className="fas fa-compress-alt mr-3 text-blue-300 text-xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Pressure</p>
                      <p className="font-semibold text-lg">{weatherData.main.pressure} hPa</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hourly Forecast */}
              {forecastData && forecastData.list && (
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Hourly Forecast</h3>
                  
                  <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-4 min-w-max">
                      {forecastData.list.slice(0, 8).map((hour, index) => (
                        <div key={index} className="glass rounded-2xl p-3 flex flex-col items-center min-w-[80px] hover:bg-white/30 transition-all">
                          <p className="text-sm font-medium">
                            {index === 0 ? "Now" : formatTime(hour.dt)}
                          </p>
                          <img 
                            src={getWeatherIconUrl(hour.weather[0].icon) || "/placeholder.svg"}
                            alt="Weather icon" 
                            className="w-12 h-12 my-1"
                          />
                          <p className="font-bold text-lg">
                            {Math.round(hour.main.temp)}°
                          </p>
                          <div className="flex items-center mt-1">
                            <i className="fas fa-tint text-xs text-blue-300 mr-1"></i>
                            <span className="text-xs">{Math.round((hour.pop || 0) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Daily Forecast */}
              {forecastData && forecastData.list && (
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-xl font-semibold mb-4">5-Day Forecast</h3>
                  
                  <div className="space-y-3">
                    {getDailyForecast().map((day, index) => (
                      <div key={index} className="glass rounded-2xl p-4 hover:bg-white/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <p className="font-medium w-16">
                              {index === 0 ? "Today" : formatDate(day.dt)}
                            </p>
                            <img 
                              src={getWeatherIconUrl(day.weather.icon) || "/placeholder.svg"}
                              alt="Weather icon" 
                              className="w-10 h-10"
                            />
                          </div>
                          
                          <div className="hidden md:block text-sm capitalize">
                            {day.weather.description}
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <i className="fas fa-temperature-high text-red-300 mr-1"></i>
                              <span className="font-bold">
                                {Math.round(day.temp.max)}°
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <i className="fas fa-temperature-low text-blue-300 mr-1"></i>
                              <span className="opacity-70">
                                {Math.round(day.temp.min)}°
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Precipitation bar */}
                        <div className="mt-2 flex items-center">
                          <i className="fas fa-tint text-xs text-blue-300 mr-2"></i>
                          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-300 rounded-full" 
                              style={{ width: `${day.pop * 100}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs">{Math.round(day.pop * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sunrise/Sunset */}
              <div className="glass rounded-3xl p-6">
                <h3 className="text-xl font-semibold mb-4">Sun & Moon</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <i className="fas fa-sun text-yellow-300 text-2xl mr-3"></i>
                      <div>
                        <p className="text-sm opacity-70">Sunrise</p>
                        <p className="font-semibold text-lg">
                          {new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <i className="fas fa-moon text-blue-200 text-2xl mr-3"></i>
                      <div>
                        <p className="text-sm opacity-70">Sunset</p>
                        <p className="font-semibold text-lg">
                          {new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm opacity-70">Location</p>
                        <p className="font-semibold">
                          {weatherData.coord.lat.toFixed(2)}°N, {weatherData.coord.lon.toFixed(2)}°E
                        </p>
                      </div>
                      <div>
                        <i className="fas fa-map-marker-alt text-2xl"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <footer className="text-center text-white/70 text-sm mt-10 pb-4">
            <p>Weather data provided by OpenWeatherMap</p>
            <p className="mt-1">© {new Date().getFullYear()} Weather Forecast App</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;