"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"

// Weather App Component
function App() {
  const [city, setCity] = useState("")
  const [weatherData, setWeatherData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [unit, setUnit] = useState("metric") // metric or imperial
  const [theme, setTheme] = useState("weather-gradient-day")
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedDayData, setSelectedDayData] = useState(null)
  const searchRef = useRef(null)
  const modalRef = useRef(null)

  // API Key - Your OpenWeatherMap API key
  const API_KEY = "bb975ed0422332c59167d806bf662b68"

  // Get weather icon URL
  const getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
  }

  // Get theme based on weather condition and time
  const getThemeClass = (iconCode) => {
    if (!iconCode) return "weather-gradient-day"

    const isDayTime = iconCode.includes("d")
    const weatherCode = iconCode.substr(0, 2)

    if (!isDayTime) {
      return "weather-gradient-night"
    }

    switch (weatherCode) {
      case "01": // clear sky
        return "weather-gradient-clear"
      case "02": // few clouds
        return "weather-gradient-day"
      case "03": // scattered clouds
      case "04": // broken clouds
        return "weather-gradient-cloudy"
      case "09": // shower rain
      case "10": // rain
        return "weather-gradient-rain"
      case "11": // thunderstorm
        return "weather-gradient-storm"
      case "13": // snow
        return "weather-gradient-snow"
      case "50": // mist
        return "weather-gradient-mist"
      default:
        return "weather-gradient-day"
    }
  }

  // Fetch city suggestions
  const fetchCitySuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([])
      return
    }

    try {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
      const response = await axios.get(geoUrl)

      if (response.data && response.data.length > 0) {
        const suggestions = response.data.map((city) => ({
          name: city.name,
          country: city.country,
          state: city.state,
          lat: city.lat,
          lon: city.lon,
        }))
        setSearchSuggestions(suggestions)
      } else {
        setSearchSuggestions([])
      }
    } catch (error) {
      console.error("Error fetching city suggestions:", error)
      setSearchSuggestions([])
    }
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value
    setCity(value)

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchCitySuggestions(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion) => {
    setCity(`${suggestion.name}, ${suggestion.country}`)
    setSearchSuggestions([])
    setShowSuggestions(false)

    try {
      await fetchWeatherData({
        lat: suggestion.lat,
        lon: suggestion.lon,
        units: unit,
      })

      // Add to recent searches
      const search = {
        name: suggestion.name,
        country: suggestion.country,
        lat: suggestion.lat,
        lon: suggestion.lon,
      }

      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => !(item.name === search.name && item.country === search.country))
        return [search, ...filtered].slice(0, 5)
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Fetch weather data using free API endpoints
  const fetchWeatherData = async (params) => {
    try {
      setLoading(true)
      setError("")

      let latitude, longitude, cityName

      // If city is provided, get coordinates first
      if (params.city) {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${params.city}&limit=1&appid=${API_KEY}`
        const geoResponse = await axios.get(geoUrl)

        if (!geoResponse.data || geoResponse.data.length === 0) {
          throw new Error("City not found")
        }

        latitude = geoResponse.data[0].lat
        longitude = geoResponse.data[0].lon
        cityName = params.city
      } else if (params.lat && params.lon) {
        // Use provided coordinates
        latitude = params.lat
        longitude = params.lon

        // Get city name from coordinates
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        const reverseGeoResponse = await axios.get(reverseGeoUrl)

        if (reverseGeoResponse.data && reverseGeoResponse.data.length > 0) {
          cityName = `${reverseGeoResponse.data[0].name}, ${reverseGeoResponse.data[0].country}`
        } else {
          cityName = "Unknown Location"
        }
      } else {
        throw new Error("Either city or coordinates are required")
      }

      // Get current weather data (free API)
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${params.units || unit}&appid=${API_KEY}`
      const currentWeatherResponse = await axios.get(currentWeatherUrl)

      // Get 5-day forecast data (free API)
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${params.units || unit}&appid=${API_KEY}`
      const forecastResponse = await axios.get(forecastUrl)

      // Process and set the data
      setWeatherData({
        ...currentWeatherResponse.data,
        city: cityName,
      })

      setForecastData(forecastResponse.data)
      setCity(cityName)

      // Reset selected day when changing location
      setSelectedDay(null)
      setSelectedDayData(null)

      // Set theme based on current weather
      if (
        currentWeatherResponse.data &&
        currentWeatherResponse.data.weather &&
        currentWeatherResponse.data.weather[0]
      ) {
        setTheme(getThemeClass(currentWeatherResponse.data.weather[0].icon))
      }

      return {
        current: currentWeatherResponse.data,
        forecast: forecastResponse.data,
      }
    } catch (error) {
      console.error("Error fetching weather data:", error)
      setError(
        error.message === "City not found"
          ? "City not found. Please try another city."
          : "Failed to fetch weather data. Please try again.",
      )
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Try to get user's location when the app loads
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            await fetchWeatherData({
              lat: latitude,
              lon: longitude,
              units: unit,
            })
          } catch (err) {
            console.error(err)
          }
        },
        (err) => {
          console.error("Geolocation error:", err)
          setError("Geolocation is not available. Please search for a city.")
        },
      )
    }

    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem("recentSearches")
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }

    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }

      // Close day details modal when clicking outside
      if (modalRef.current && !modalRef.current.contains(event.target) && event.target.id !== "day-card") {
        setSelectedDay(null)
        setSelectedDayData(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save recent searches to localStorage
  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches))
  }, [recentSearches])

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!city.trim()) return

    try {
      await fetchWeatherData({ city, units: unit })
    } catch (err) {
      console.error(err)
    }
  }

  // Toggle temperature unit
  const toggleUnit = async () => {
    const newUnit = unit === "metric" ? "imperial" : "metric"
    setUnit(newUnit)

    if (weatherData) {
      try {
        await fetchWeatherData({
          city: city,
          units: newUnit,
        })
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  // Format full date
  const formatFullDate = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  // Format current date
  const getCurrentDate = () => {
    const date = new Date()
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Group forecast data by day
  const getDailyForecast = () => {
    if (!forecastData || !forecastData.list) return []

    const dailyData = {}

    forecastData.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toLocaleDateString()

      if (!dailyData[date]) {
        dailyData[date] = {
          dt: item.dt,
          date: date,
          temp: {
            min: item.main.temp,
            max: item.main.temp,
          },
          weather: item.weather[0],
          pop: item.pop || 0,
          hourlyData: [item],
        }
      } else {
        // Add hourly data
        dailyData[date].hourlyData.push(item)

        // Update min/max temperatures
        if (item.main.temp > dailyData[date].temp.max) {
          dailyData[date].temp.max = item.main.temp
        }
        if (item.main.temp < dailyData[date].temp.min) {
          dailyData[date].temp.min = item.main.temp
        }

        // Update precipitation probability if higher
        if (item.pop > dailyData[date].pop) {
          dailyData[date].pop = item.pop
        }
      }
    })

    return Object.values(dailyData).slice(0, 5) // Return first 5 days
  }

  // Get weather animation class
  const getWeatherAnimation = (iconCode) => {
    if (!iconCode) return ""

    const weatherCode = iconCode.substr(0, 2)

    switch (weatherCode) {
      case "01": // clear sky
        return "weather-clear-animation"
      case "02": // few clouds
      case "03": // scattered clouds
      case "04": // broken clouds
        return "weather-cloudy-animation"
      case "09": // shower rain
      case "10": // rain
        return "weather-rain-animation"
      case "11": // thunderstorm
        return "weather-storm-animation"
      case "13": // snow
        return "weather-snow-animation"
      case "50": // mist
        return "weather-mist-animation"
      default:
        return ""
    }
  }

  // Handle day selection
  const handleDayClick = (day) => {
    if (selectedDay === day.dt) {
      // If clicking the same day, close the details
      setSelectedDay(null)
      setSelectedDayData(null)
    } else {
      // Otherwise, show details for the selected day
      setSelectedDay(day.dt)
      setSelectedDayData(day)
    }
  }

  // Get wind direction as text
  const getWindDirection = (degrees) => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ]
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  // Get UV index description
  const getUVIndexDescription = (uvi) => {
    if (uvi <= 2) return { level: "Low", color: "green-400" }
    if (uvi <= 5) return { level: "Moderate", color: "yellow-400" }
    if (uvi <= 7) return { level: "High", color: "orange-400" }
    if (uvi <= 10) return { level: "Very High", color: "red-500" }
    return { level: "Extreme", color: "purple-600" }
  }

  // Get comfort level based on humidity and temperature
  const getComfortLevel = (humidity, temp) => {
    if (humidity < 30) return { level: "Very Dry", color: "yellow-500" }
    if (humidity > 70 && temp > 20) return { level: "Humid", color: "blue-400" }
    if (humidity > 85) return { level: "Very Humid", color: "blue-600" }
    return { level: "Comfortable", color: "green-400" }
  }

  return (
    <div className={`min-h-screen ${theme} text-white transition-all duration-1000`}>
      <div className="relative">
        {/* Weather animation background */}
        {weatherData && <div className={`absolute inset-0 ${getWeatherAnimation(weatherData.weather[0].icon)}`}></div>}

        {/* Background pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30 z-0"></div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-shadow-lg animate-fade-in">
              <i className="fas fa-cloud-sun mr-3"></i>
              Weather Forecast
            </h1>
            <p className="text-white/80 text-shadow-sm animate-fade-in-delay">{getCurrentDate()}</p>
          </header>

          {/* Search Form */}
          <div className="max-w-md mx-auto mb-8 relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={city}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search for a city..."
                className="w-full p-4 pl-12 pr-10 rounded-full premium-glass text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl transition-all"
              />
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70"></i>
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/30 hover:bg-white/40 text-white p-2 rounded-full transition-all hover:scale-110"
              >
                <i className="fas fa-search"></i>
              </button>
            </form>

            {/* Search suggestions */}
            {showSuggestions && (searchSuggestions.length > 0 || recentSearches.length > 0) && (
              <div className="absolute mt-2 w-full rounded-2xl premium-glass shadow-xl z-50 overflow-hidden animate-fade-in">
                {searchSuggestions.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-sm text-white/70 border-b border-white/10">Suggestions</div>
                    <ul>
                      {searchSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="px-4 py-3 hover:bg-white/20 cursor-pointer transition-all flex items-center"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <i className="fas fa-map-marker-alt mr-3"></i>
                          <div>
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-sm text-white/70">
                              {suggestion.state ? `${suggestion.state}, ` : ""}
                              {suggestion.country}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : recentSearches.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-sm text-white/70 border-b border-white/10">Recent Searches</div>
                    <ul>
                      {recentSearches.map((search, index) => (
                        <li
                          key={index}
                          className="px-4 py-3 hover:bg-white/20 cursor-pointer transition-all flex items-center"
                          onClick={() => handleSuggestionClick(search)}
                        >
                          <i className="fas fa-history mr-3"></i>
                          <div>
                            <div className="font-medium">{search.name}</div>
                            <div className="text-sm text-white/70">{search.country}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Unit Toggle */}
          <div className="flex justify-center mb-6">
            <button
              onClick={toggleUnit}
              className="premium-glass px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/30 transition-all shadow-lg hover:shadow-xl"
            >
              <span className={`font-semibold ${unit === "metric" ? "text-white" : "text-white/70"}`}>°C</span>
              <div className="w-12 h-6 bg-white/30 rounded-full relative">
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                    unit === "metric" ? "left-1" : "transform translate-x-6"
                  }`}
                ></div>
              </div>
              <span className={`font-semibold ${unit === "imperial" ? "text-white" : "text-white/70"}`}>°F</span>
            </button>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="premium-loading">
                <div className="premium-loading-circle"></div>
                <div className="premium-loading-circle"></div>
                <div className="premium-loading-circle"></div>
                <div className="mt-4 text-white font-medium">Loading weather data...</div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto bg-red-500/80 text-white p-4 rounded-2xl mb-6 flex items-center premium-glass animate-fade-in">
              <i className="fas fa-exclamation-triangle mr-3 text-xl"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Weather Content */}
          {weatherData && !loading && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              {/* Current Weather */}
              <div className="premium-glass rounded-3xl p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="animate-slide-in-left">
                    <h2 className="text-3xl md:text-5xl font-bold text-shadow-md">
                      {weatherData.city || weatherData.name}
                    </h2>
                    <p className="text-xl capitalize text-shadow-sm">{weatherData.weather[0].description}</p>

                    <div className="mt-6 flex items-center">
                      <i className="fas fa-temperature-high mr-3 text-3xl"></i>
                      <span className="text-6xl md:text-7xl font-bold text-shadow-lg">
                        {Math.round(weatherData.main.temp)}
                        <span className="text-3xl font-normal align-top ml-1">{unit === "metric" ? "°C" : "°F"}</span>
                      </span>
                    </div>

                    <p className="text-lg mt-2 text-shadow-sm">
                      Feels like {Math.round(weatherData.main.feels_like)}°{unit === "metric" ? "C" : "F"}
                    </p>

                    <div className="mt-4 flex items-center space-x-4">
                      <div className="flex items-center">
                        <i className="fas fa-arrow-up text-red-300 mr-1"></i>
                        <span>{Math.round(weatherData.main.temp_max)}°</span>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-arrow-down text-blue-300 mr-1"></i>
                        <span>{Math.round(weatherData.main.temp_min)}°</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 md:mt-0 flex flex-col items-center animate-slide-in-right">
                    <div className="weather-icon-container">
                      <img
                        src={getWeatherIconUrl(weatherData.weather[0].icon) || "/placeholder.svg"}
                        alt="Weather icon"
                        className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl animate-float"
                      />
                    </div>
                  </div>
                </div>

                {/* Weather Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 animate-fade-in-up">
                  <div className="premium-glass rounded-2xl p-4 flex items-center hover:bg-white/30 transition-all hover:scale-105">
                    <i className="fas fa-tint mr-3 text-blue-300 text-2xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Humidity</p>
                      <p className="font-semibold text-lg">{weatherData.main.humidity}%</p>
                    </div>
                  </div>

                  <div className="premium-glass rounded-2xl p-4 flex items-center hover:bg-white/30 transition-all hover:scale-105">
                    <i className="fas fa-wind mr-3 text-blue-300 text-2xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Wind</p>
                      <p className="font-semibold text-lg">
                        {Math.round(weatherData.wind.speed)} {unit === "metric" ? "m/s" : "mph"}
                      </p>
                    </div>
                  </div>

                  <div className="premium-glass rounded-2xl p-4 flex items-center hover:bg-white/30 transition-all hover:scale-105">
                    <i className="fas fa-cloud mr-3 text-blue-300 text-2xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Clouds</p>
                      <p className="font-semibold text-lg">{weatherData.clouds.all}%</p>
                    </div>
                  </div>

                  <div className="premium-glass rounded-2xl p-4 flex items-center hover:bg-white/30 transition-all hover:scale-105">
                    <i className="fas fa-compress-alt mr-3 text-blue-300 text-2xl"></i>
                    <div>
                      <p className="text-sm opacity-70">Pressure</p>
                      <p className="font-semibold text-lg">{weatherData.main.pressure} hPa</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Forecast */}
              {forecastData && forecastData.list && (
                <div className="premium-glass rounded-3xl p-6 shadow-2xl animate-fade-in-delay">
                  <h3 className="text-2xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-clock mr-3"></i>
                    Hourly Forecast
                  </h3>

                  <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-4 min-w-max">
                      {forecastData.list.slice(0, 8).map((hour, index) => (
                        <div
                          key={index}
                          className="premium-glass rounded-2xl p-4 flex flex-col items-center min-w-[100px] hover:bg-white/30 transition-all hover:scale-105 hover:shadow-xl"
                        >
                          <p className="text-sm font-medium">{index === 0 ? "Now" : formatTime(hour.dt)}</p>
                          <img
                            src={getWeatherIconUrl(hour.weather[0].icon) || "/placeholder.svg"}
                            alt="Weather icon"
                            className="w-16 h-16 my-2 drop-shadow-lg"
                          />
                          <p className="font-bold text-xl">{Math.round(hour.main.temp)}°</p>
                          <div className="flex items-center mt-2 bg-white/20 rounded-full px-2 py-1">
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
                <div className="premium-glass rounded-3xl p-6 shadow-2xl animate-fade-in-delay-2">
                  <h3 className="text-2xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-calendar-alt mr-3"></i>
                    5-Day Forecast
                  </h3>

                  <div className="space-y-3">
                    {getDailyForecast().map((day, index) => (
                      <div
                        key={index}
                        id="day-card"
                        className={`premium-glass rounded-2xl p-4 transition-all cursor-pointer
                          ${selectedDay === day.dt ? "bg-white/30 shadow-2xl scale-[1.02]" : "hover:bg-white/20 hover:shadow-xl group"}`}
                        onClick={() => handleDayClick(day)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <p className="font-medium w-20 text-lg">{index === 0 ? "Today" : formatDate(day.dt)}</p>
                            <img
                              src={getWeatherIconUrl(day.weather.icon) || "/placeholder.svg"}
                              alt="Weather icon"
                              className={`w-12 h-12 transition-transform ${selectedDay === day.dt ? "scale-110" : "group-hover:scale-110"}`}
                            />
                          </div>

                          <div className="hidden md:block text-sm capitalize">{day.weather.description}</div>

                          <div className="flex items-center space-x-6">
                            <div className="flex items-center">
                              <i className="fas fa-temperature-high text-red-300 mr-2"></i>
                              <span className="font-bold text-lg">{Math.round(day.temp.max)}°</span>
                            </div>

                            <div className="flex items-center">
                              <i className="fas fa-temperature-low text-blue-300 mr-2"></i>
                              <span className="opacity-70 text-lg">{Math.round(day.temp.min)}°</span>
                            </div>
                          </div>
                        </div>

                        {/* Precipitation bar */}
                        <div className="mt-3 flex items-center">
                          <i className="fas fa-tint text-blue-300 mr-2"></i>
                          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-300 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${day.pop * 100}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm font-medium">{Math.round(day.pop * 100)}%</span>
                        </div>

                        {/* Expand indicator */}
                        <div className="flex justify-center mt-2">
                          <i
                            className={`fas fa-chevron-${selectedDay === day.dt ? "up" : "down"} text-white/70 transition-transform`}
                          ></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Day Details Modal */}
              {selectedDay && selectedDayData && (
                <div
                  className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => {
                      setSelectedDay(null)
                      setSelectedDayData(null)
                    }}
                  ></div>

                  <div
                    ref={modalRef}
                    className="premium-glass rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-scale-in z-50"
                  >
                    {/* Close button */}
                    <button
                      className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all"
                      onClick={() => {
                        setSelectedDay(null)
                        setSelectedDayData(null)
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>

                    {/* Day details header */}
                    <div className="flex items-center justify-between mb-6 border-b border-white/20 pb-4">
                      <div>
                        <h3 className="text-3xl font-bold text-shadow-md">{formatFullDate(selectedDayData.dt)}</h3>
                        <p className="text-lg text-white/80">Detailed forecast</p>
                      </div>
                      <div className="flex items-center">
                        <img
                          src={getWeatherIconUrl(selectedDayData.weather.icon) || "/placeholder.svg"}
                          alt="Weather icon"
                          className="w-16 h-16 drop-shadow-lg"
                        />
                        <div className="ml-3">
                          <p className="text-xl font-semibold capitalize">{selectedDayData.weather.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Temperature overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="premium-glass rounded-2xl p-4 flex flex-col items-center justify-center">
                        <p className="text-sm text-white/70">High</p>
                        <div className="flex items-center">
                          <i className="fas fa-temperature-high text-red-300 mr-2 text-xl"></i>
                          <span className="text-3xl font-bold">{Math.round(selectedDayData.temp.max)}°</span>
                        </div>
                      </div>

                      <div className="premium-glass rounded-2xl p-4 flex flex-col items-center justify-center">
                        <p className="text-sm text-white/70">Average</p>
                        <div className="flex items-center">
                          <i className="fas fa-temperature-half text-yellow-300 mr-2 text-xl"></i>
                          <span className="text-3xl font-bold">
                            {Math.round((selectedDayData.temp.max + selectedDayData.temp.min) / 2)}°
                          </span>
                        </div>
                      </div>

                      <div className="premium-glass rounded-2xl p-4 flex flex-col items-center justify-center">
                        <p className="text-sm text-white/70">Low</p>
                        <div className="flex items-center">
                          <i className="fas fa-temperature-low text-blue-300 mr-2 text-xl"></i>
                          <span className="text-3xl font-bold">{Math.round(selectedDayData.temp.min)}°</span>
                        </div>
                      </div>
                    </div>

                    {/* Hourly forecast for the selected day */}
                    <div className="mb-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-clock mr-3"></i>
                        Hourly Breakdown
                      </h4>

                      <div className="overflow-x-auto pb-2">
                        <div className="flex space-x-4 min-w-max">
                          {selectedDayData.hourlyData.map((hour, index) => (
                            <div
                              key={index}
                              className="premium-glass rounded-2xl p-4 flex flex-col items-center min-w-[100px] hover:bg-white/30 transition-all"
                            >
                              <p className="text-sm font-medium">{formatTime(hour.dt)}</p>
                              <img
                                src={getWeatherIconUrl(hour.weather[0].icon) || "/placeholder.svg"}
                                alt="Weather icon"
                                className="w-14 h-14 my-2"
                              />
                              <p className="font-bold text-xl">{Math.round(hour.main.temp)}°</p>
                              <div className="flex items-center mt-2">
                                <i className="fas fa-tint text-xs text-blue-300 mr-1"></i>
                                <span className="text-xs">{Math.round((hour.pop || 0) * 100)}%</span>
                              </div>
                              <div className="flex items-center mt-1">
                                <i className="fas fa-wind text-xs text-blue-200 mr-1"></i>
                                <span className="text-xs">
                                  {Math.round(hour.wind.speed)} {unit === "metric" ? "m/s" : "mph"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Weather details */}
                    <div className="mb-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-info-circle mr-3"></i>
                        Weather Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* First sample hour data for details */}
                        {selectedDayData.hourlyData[0] && (
                          <>
                            {/* Wind */}
                            <div className="premium-glass rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-white/70">Wind</p>
                                  <p className="text-lg font-semibold">
                                    {Math.round(selectedDayData.hourlyData[0].wind.speed)}{" "}
                                    {unit === "metric" ? "m/s" : "mph"}
                                  </p>
                                </div>
                                <div className="wind-direction-indicator">
                                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <i
                                      className="fas fa-location-arrow text-lg"
                                      style={{
                                        transform: `rotate(${selectedDayData.hourlyData[0].wind.deg}deg)`,
                                        color: "white",
                                      }}
                                    ></i>
                                  </div>
                                  <p className="text-center mt-1 text-sm">
                                    {getWindDirection(selectedDayData.hourlyData[0].wind.deg)}
                                  </p>
                                </div>
                              </div>

                              {/* Wind gust if available */}
                              {selectedDayData.hourlyData[0].wind.gust && (
                                <div className="mt-2 text-sm">
                                  <span className="text-white/70">Gusts: </span>
                                  <span>
                                    {Math.round(selectedDayData.hourlyData[0].wind.gust)}{" "}
                                    {unit === "metric" ? "m/s" : "mph"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Humidity */}
                            <div className="premium-glass rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-white/70">Humidity</p>
                                  <p className="text-lg font-semibold">
                                    {selectedDayData.hourlyData[0].main.humidity}%
                                  </p>
                                </div>
                                <div className="humidity-indicator">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center">
                                    <i className="fas fa-tint text-white text-lg"></i>
                                  </div>
                                </div>
                              </div>

                              {/* Comfort level */}
                              <div className="mt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-white/70">Comfort level:</span>
                                  <span
                                    className={`text-sm font-medium text-${getComfortLevel(selectedDayData.hourlyData[0].main.humidity, selectedDayData.hourlyData[0].main.temp).color}`}
                                  >
                                    {
                                      getComfortLevel(
                                        selectedDayData.hourlyData[0].main.humidity,
                                        selectedDayData.hourlyData[0].main.temp,
                                      ).level
                                    }
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-${getComfortLevel(selectedDayData.hourlyData[0].main.humidity, selectedDayData.hourlyData[0].main.temp).color}`}
                                    style={{ width: `${selectedDayData.hourlyData[0].main.humidity}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Pressure */}
                            <div className="premium-glass rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-white/70">Pressure</p>
                                  <p className="text-lg font-semibold">
                                    {selectedDayData.hourlyData[0].main.pressure} hPa
                                  </p>
                                </div>
                                <div className="pressure-indicator">
                                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <i className="fas fa-compress-alt text-white text-lg"></i>
                                  </div>
                                </div>
                              </div>

                              {/* Pressure trend */}
                              <div className="mt-2 text-sm">
                                <span className="text-white/70">Condition: </span>
                                <span>
                                  {selectedDayData.hourlyData[0].main.pressure < 1000
                                    ? "Low pressure"
                                    : selectedDayData.hourlyData[0].main.pressure > 1020
                                      ? "High pressure"
                                      : "Normal pressure"}
                                </span>
                              </div>
                            </div>

                            {/* Visibility */}
                            <div className="premium-glass rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-white/70">Visibility</p>
                                  <p className="text-lg font-semibold">
                                    {(selectedDayData.hourlyData[0].visibility / 1000).toFixed(1)} km
                                  </p>
                                </div>
                                <div className="visibility-indicator">
                                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <i className="fas fa-eye text-white text-lg"></i>
                                  </div>
                                </div>
                              </div>

                              {/* Visibility condition */}
                              <div className="mt-2 text-sm">
                                <span className="text-white/70">Condition: </span>
                                <span>
                                  {selectedDayData.hourlyData[0].visibility >= 10000
                                    ? "Excellent"
                                    : selectedDayData.hourlyData[0].visibility >= 5000
                                      ? "Good"
                                      : selectedDayData.hourlyData[0].visibility >= 2000
                                        ? "Moderate"
                                        : "Poor"}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Precipitation details */}
                    <div className="mb-6">
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-cloud-rain mr-3"></i>
                        Precipitation
                      </h4>

                      <div className="premium-glass rounded-2xl p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold">Chance of precipitation</p>
                            <p className="text-3xl font-bold mt-1">{Math.round(selectedDayData.pop * 100)}%</p>
                          </div>

                          <div className="mt-4 md:mt-0">
                            <div className="precipitation-chart">
                              <div className="flex items-end h-24 space-x-2">
                                {selectedDayData.hourlyData.slice(0, 8).map((hour, index) => (
                                  <div key={index} className="flex flex-col items-center">
                                    <div
                                      className="w-8 bg-blue-400/80 rounded-t-lg"
                                      style={{ height: `${Math.max(4, Math.round(hour.pop * 100))}px` }}
                                    ></div>
                                    <p className="text-xs mt-1">{formatTime(hour.dt).replace(/\s/g, "")}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Precipitation type */}
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div
                            className={`p-3 rounded-xl text-center ${selectedDayData.weather.main === "Rain" ? "bg-blue-500/50" : "bg-white/10"}`}
                          >
                            <i className="fas fa-cloud-rain text-xl mb-1"></i>
                            <p className="text-sm">Rain</p>
                          </div>

                          <div
                            className={`p-3 rounded-xl text-center ${selectedDayData.weather.main === "Snow" ? "bg-blue-500/50" : "bg-white/10"}`}
                          >
                            <i className="fas fa-snowflake text-xl mb-1"></i>
                            <p className="text-sm">Snow</p>
                          </div>

                          <div
                            className={`p-3 rounded-xl text-center ${selectedDayData.weather.main === "Thunderstorm" ? "bg-blue-500/50" : "bg-white/10"}`}
                          >
                            <i className="fas fa-bolt text-xl mb-1"></i>
                            <p className="text-sm">Storm</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weather recommendations */}
                    <div>
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-lightbulb mr-3 text-yellow-300"></i>
                        Weather Tips
                      </h4>

                      <div className="premium-glass rounded-2xl p-5">
                        <div className="space-y-3">
                          {/* Dynamic recommendations based on weather */}
                          {selectedDayData.weather.main === "Rain" && (
                            <div className="flex items-start">
                              <i className="fas fa-umbrella mt-1 mr-3 text-blue-300"></i>
                              <p>Don't forget your umbrella! Expect rainfall throughout the day.</p>
                            </div>
                          )}

                          {selectedDayData.weather.main === "Snow" && (
                            <div className="flex items-start">
                              <i className="fas fa-mitten mt-1 mr-3 text-blue-200"></i>
                              <p>Bundle up! Snowy conditions expected. Wear warm clothing and appropriate footwear.</p>
                            </div>
                          )}

                          {selectedDayData.weather.main === "Clear" && (
                            <div className="flex items-start">
                              <i className="fas fa-sun mt-1 mr-3 text-yellow-300"></i>
                              <p>Great day to be outside! Clear skies and pleasant conditions expected.</p>
                            </div>
                          )}

                          {selectedDayData.temp.max > 30 && unit === "metric" && (
                            <div className="flex items-start">
                              <i className="fas fa-temperature-high mt-1 mr-3 text-red-400"></i>
                              <p>High temperatures expected. Stay hydrated and seek shade during peak hours.</p>
                            </div>
                          )}

                          {selectedDayData.temp.min < 5 && unit === "metric" && (
                            <div className="flex items-start">
                              <i className="fas fa-temperature-low mt-1 mr-3 text-blue-400"></i>
                              <p>Cold temperatures expected. Dress in layers and protect extremities.</p>
                            </div>
                          )}

                          {selectedDayData.pop > 0.5 && (
                            <div className="flex items-start">
                              <i className="fas fa-cloud-rain mt-1 mr-3 text-blue-300"></i>
                              <p>
                                High chance of precipitation. Plan indoor activities or be prepared for wet conditions.
                              </p>
                            </div>
                          )}

                          {/* Default recommendation */}
                          {!["Rain", "Snow", "Clear"].includes(selectedDayData.weather.main) &&
                            !(selectedDayData.temp.max > 30 && unit === "metric") &&
                            !(selectedDayData.temp.min < 5 && unit === "metric") &&
                            !(selectedDayData.pop > 0.5) && (
                              <div className="flex items-start">
                                <i className="fas fa-cloud mt-1 mr-3 text-blue-200"></i>
                                <p>Moderate weather conditions expected. Check the hourly forecast for any changes.</p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sunrise/Sunset */}
              <div className="premium-glass rounded-3xl p-6 shadow-2xl animate-fade-in-delay-3">
                <h3 className="text-2xl font-semibold mb-4 flex items-center">
                  <i className="fas fa-sun mr-3 text-yellow-300"></i>
                  Sun & Moon
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="premium-glass rounded-2xl p-5 hover:bg-white/20 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div className="sun-icon mr-3">
                          <i className="fas fa-sun text-yellow-300 text-3xl"></i>
                        </div>
                        <div>
                          <p className="text-sm opacity-70">Sunrise</p>
                          <p className="font-semibold text-xl">
                            {new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="sun-progress">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-orange-500 flex items-center justify-center shadow-lg">
                          <div className="w-12 h-12 rounded-full bg-yellow-300 animate-pulse-slow"></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-200 to-orange-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((new Date().getTime() / 1000 - weatherData.sys.sunrise) /
                                  (weatherData.sys.sunset - weatherData.sys.sunrise)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="premium-glass rounded-2xl p-5 hover:bg-white/20 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div className="moon-icon mr-3">
                          <i className="fas fa-moon text-blue-200 text-3xl"></i>
                        </div>
                        <div>
                          <p className="text-sm opacity-70">Sunset</p>
                          <p className="font-semibold text-xl">
                            {new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="moon-progress">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center shadow-lg">
                          <div className="w-12 h-12 rounded-full bg-blue-300 animate-pulse-slow"></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-200 to-blue-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((weatherData.sys.sunset - new Date().getTime() / 1000) /
                                  (weatherData.sys.sunset - weatherData.sys.sunrise)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="premium-glass rounded-2xl p-5 hover:bg-white/20 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-medium">Location Details</p>
                        <p className="text-sm opacity-70 mt-1">
                          Coordinates: {weatherData.coord.lat.toFixed(2)}°N, {weatherData.coord.lon.toFixed(2)}°E
                        </p>
                        <p className="text-sm opacity-70">
                          Timezone: GMT {weatherData.timezone / 3600 >= 0 ? "+" : ""}
                          {weatherData.timezone / 3600}
                        </p>
                      </div>
                      <div>
                        <i className="fas fa-map-marker-alt text-3xl text-red-400"></i>
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
            <p className="mt-1">© {new Date().getFullYear()} Premium Weather Forecast App</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App
