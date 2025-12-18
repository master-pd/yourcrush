const axios = require('axios');

module.exports = {
    config: {
        name: "weather",
        aliases: ["wthr", "forecast"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "utility",
        shortDescription: {
            en: "Check weather forecast",
            bn: "আবহাওয়ার পূর্বাভাস চেক করুন"
        },
        longDescription: {
            en: "Get current weather and forecast for any city",
            bn: "যে কোনো শহরের জন্য বর্তমান আবহাওয়া এবং পূর্বাভাস পান"
        },
        guide: {
            en: "{pn} [city name]",
            bn: "{pn} [শহরের নাম]"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "🌤️ **Weather Forecast**\n\n" +
                    "Please specify a city name.\n" +
                    `Example: ${global.config.prefix}weather Dhaka\n` +
                    `Example: ${global.config.prefix}weather New York\n\n` +
                    "🌍 You can also use:\n" +
                    `• ${global.config.prefix}weather [city], [country]\n` +
                    `• ${global.config.prefix}weather [zip code]\n` +
                    `• ${global.config.prefix}weather [latitude], [longitude]`,
                    threadID,
                    messageID
                );
            }
            
            const location = args.join(" ");
            
            // Send typing indicator
            api.sendTypingIndicator(threadID, true);
            
            // Get weather data
            const weatherData = await getWeatherData(location);
            
            api.sendTypingIndicator(threadID, false);
            
            if (!weatherData.success) {
                return api.sendMessage(
                    `❌ ${weatherData.message}\n\n` +
                    `💡 Try:\n` +
                    `• Checking the city name spelling\n` +
                    `• Adding country code: ${global.config.prefix}weather London, UK\n` +
                    `• Using a major city nearby`,
                    threadID,
                    messageID
                );
            }
            
            // Build weather message
            const message = buildWeatherMessage(weatherData);
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to get weather information.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function getWeatherData(location) {
    try {
        // Try multiple weather APIs
        const apiKeys = [
            "", // You can add your API keys here
            "",
            ""
        ];
        
        for (const apiKey of apiKeys) {
            if (!apiKey) continue;
            
            try {
                // OpenWeatherMap API
                const response = await axios.get(
                    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
                );
                
                if (response.data && response.data.main) {
                    return {
                        success: true,
                        data: response.data
                    };
                }
            } catch (error) {
                // Try next API key
                continue;
            }
        }
        
        // If no API keys work, use fallback API
        try {
            const fallbackResponse = await axios.get(
                `https://wttr.in/${encodeURIComponent(location)}?format=j1`
            );
            
            if (fallbackResponse.data && fallbackResponse.data.current_condition) {
                return {
                    success: true,
                    data: processFallbackData(fallbackResponse.data, location)
                };
            }
        } catch (error) {
            // Fallback also failed
        }
        
        return {
            success: false,
            message: "Location not found or weather service unavailable."
        };
        
    } catch (error) {
        console.error('Weather API error:', error.message);
        return {
            success: false,
            message: "Weather service temporarily unavailable."
        };
    }
}

function processFallbackData(data, location) {
    const current = data.current_condition[0];
    const area = data.nearest_area[0];
    
    return {
        name: location,
        sys: {
            country: area.country[0].value || "Unknown"
        },
        main: {
            temp: parseFloat(current.temp_C),
            feels_like: parseFloat(current.FeelsLikeC),
            temp_min: parseFloat(current.temp_C) - 2,
            temp_max: parseFloat(current.temp_C) + 2,
            pressure: parseFloat(current.pressure),
            humidity: parseFloat(current.humidity)
        },
        weather: [{
            main: getWeatherCondition(current.weatherCode),
            description: current.weatherDesc[0].value,
            icon: getWeatherIcon(current.weatherCode)
        }],
        wind: {
            speed: parseFloat(current.windspeedKmph) * 0.27778, // Convert to m/s
            deg: parseInt(current.winddirDegree)
        },
        clouds: {
            all: parseInt(current.cloudcover)
        },
        visibility: parseInt(current.visibility) * 1000 // Convert to meters
    };
}

function buildWeatherMessage(weatherData) {
    const data = weatherData.data;
    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    
    // Get emoji for weather
    const weatherEmoji = getWeatherEmoji(weather.main);
    
    // Format temperature
    const temp = Math.round(main.temp);
    const feelsLike = Math.round(main.feels_like);
    const tempMin = Math.round(main.temp_min);
    const tempMax = Math.round(main.temp_max);
    
    // Format wind speed
    const windSpeed = Math.round(wind.speed * 3.6); // Convert to km/h
    
    // Get wind direction
    const windDirection = getWindDirection(wind.deg);
    
    // Format pressure
    const pressure = main.pressure;
    
    // Format humidity
    const humidity = main.humidity;
    
    // Format visibility
    const visibility = data.visibility ? Math.round(data.visibility / 1000) : "N/A";
    
    // Get location name
    const location = `${data.name}, ${data.sys.country}`;
    
    // Get current time
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString();
    
    // Build message
    let message = `${weatherEmoji} **WEATHER FORECAST** ${weatherEmoji}\n\n`;
    
    message += `📍 **Location:** ${location}\n`;
    message += `📅 **Date:** ${dateString}\n`;
    message += `⏰ **Time:** ${timeString}\n\n`;
    
    message += `🌡️ **Temperature:**\n`;
    message += `• Current: ${temp}°C\n`;
    message += `• Feels Like: ${feelsLike}°C\n`;
    message += `• Min/Max: ${tempMin}°C / ${tempMax}°C\n\n`;
    
    message += `🌤️ **Conditions:**\n`;
    message += `• ${weather.description}\n`;
    message += `• Humidity: ${humidity}%\n`;
    message += `• Pressure: ${pressure} hPa\n\n`;
    
    message += `💨 **Wind:**\n`;
    message += `• Speed: ${windSpeed} km/h\n`;
    message += `• Direction: ${windDirection}\n\n`;
    
    if (visibility !== "N/A") {
        message += `👁️ **Visibility:** ${visibility} km\n\n`;
    }
    
    // Add weather advice
    message += `📝 **Advice:**\n`;
    message += getWeatherAdvice(weather.main, temp, windSpeed);
    
    return message;
}

function getWeatherEmoji(condition) {
    const emojis = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Smoke': '💨',
        'Haze': '😶‍🌫️',
        'Dust': '💨',
        'Fog': '🌁',
        'Sand': '💨',
        'Ash': '🌋',
        'Squall': '💨',
        'Tornado': '🌪️'
    };
    
    return emojis[condition] || '🌤️';
}

function getWeatherCondition(code) {
    // wttr.in weather codes to OpenWeatherMap conditions
    const conditions = {
        113: 'Clear',
        116: 'Clouds',
        119: 'Clouds',
        122: 'Clouds',
        143: 'Mist',
        176: 'Rain',
        179: 'Snow',
        182: 'Snow',
        185: 'Rain',
        200: 'Thunderstorm',
        227: 'Snow',
        230: 'Snow',
        248: 'Fog',
        260: 'Fog',
        263: 'Rain',
        266: 'Rain',
        281: 'Rain',
        284: 'Rain',
        293: 'Rain',
        296: 'Rain',
        299: 'Rain',
        302: 'Rain',
        305: 'Rain',
        308: 'Rain',
        311: 'Snow',
        314: 'Snow',
        317: 'Snow',
        320: 'Snow',
        323: 'Snow',
        326: 'Snow',
        329: 'Snow',
        332: 'Snow',
        335: 'Snow',
        338: 'Snow',
        350: 'Snow',
        353: 'Rain',
        356: 'Rain',
        359: 'Rain',
        362: 'Rain',
        365: 'Rain',
        368: 'Snow',
        371: 'Snow',
        374: 'Snow',
        377: 'Snow',
        386: 'Thunderstorm',
        389: 'Thunderstorm',
        392: 'Thunderstorm',
        395: 'Snow'
    };
    
    return conditions[code] || 'Clouds';
}

function getWeatherIcon(code) {
    // Simplified icon mapping
    if (code >= 200 && code < 300) return '11d'; // Thunderstorm
    if (code >= 300 && code < 400) return '09d'; // Drizzle
    if (code >= 500 && code < 600) return '10d'; // Rain
    if (code >= 600 && code < 700) return '13d'; // Snow
    if (code >= 700 && code < 800) return '50d'; // Atmosphere
    if (code === 800) return '01d'; // Clear
    if (code > 800) return '02d'; // Clouds
    
    return '02d';
}

function getWindDirection(degrees) {
    if (degrees >= 337.5 || degrees < 22.5) return 'North';
    if (degrees >= 22.5 && degrees < 67.5) return 'Northeast';
    if (degrees >= 67.5 && degrees < 112.5) return 'East';
    if (degrees >= 112.5 && degrees < 157.5) return 'Southeast';
    if (degrees >= 157.5 && degrees < 202.5) return 'South';
    if (degrees >= 202.5 && degrees < 247.5) return 'Southwest';
    if (degrees >= 247.5 && degrees < 292.5) return 'West';
    if (degrees >= 292.5 && degrees < 337.5) return 'Northwest';
    return 'Unknown';
}

function getWeatherAdvice(condition, temp, windSpeed) {
    let advice = '';
    
    // Temperature advice
    if (temp >= 30) {
        advice += '• Stay hydrated and avoid direct sunlight\n';
    } else if (temp <= 10) {
        advice += '• Wear warm clothing\n';
    } else {
        advice += '• Pleasant weather for outdoor activities\n';
    }
    
    // Condition advice
    switch (condition) {
        case 'Rain':
        case 'Drizzle':
            advice += '• Carry an umbrella or raincoat\n';
            advice += '• Drive carefully on wet roads\n';
            break;
        case 'Thunderstorm':
            advice += '• Avoid outdoor activities\n';
            advice += '• Stay away from tall objects\n';
            advice += '• Unplug electrical appliances\n';
            break;
        case 'Snow':
            advice += '• Wear warm, waterproof clothing\n';
            advice += '• Drive carefully on icy roads\n';
            break;
        case 'Clear':
            if (temp >= 25) {
                advice += '• Use sunscreen if going outside\n';
            }
            break;
    }
    
    // Wind advice
    if (windSpeed > 30) {
        advice += '• Be careful of strong winds\n';
        advice += '• Secure loose objects outdoors\n';
    }
    
    if (advice === '') {
        advice = '• Enjoy the weather!';
    }
    
    return advice;
}