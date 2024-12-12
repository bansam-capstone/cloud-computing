const express = require('express');
const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');

// Configure Express and port for Cloud Run
const app = express();
const PORT = 5500;

// Weather API configuration
const API_KEY = process.env.API_KEY; // API key stored as an environment variable
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const forecastBaseUrl = 'https://api.openweathermap.org/data/2.5/forecast';

// Initialize Firestore
const firestore = new Firestore();

// Coordinates for General Samarinda Data
const SAMARINDA_COORDINATES = { lat: -0.494823, lon: 117.143616 };

// Define the locations with coordinates
const locations = [
    { name: 'slamet-riyadi', lat: -0.5098581857545632, lon: 117.1178542019155 },
    { name: 'antasari', lat: -0.49186601488572806, lon: 117.12722378180521 },
    { name: 'simpang-agus-salim', lat: -0.4957041096360274, lon: 117.14971318603816 },
    { name: 'mugirejo', lat: -0.4687086559524597, lon: 117.19277093628588 },
    { name: 'simpang-lembuswana', lat: -0.4754107332727611, lon: 117.14615018774853 },
    { name: 'kapten-sudjono', lat: -0.5259576904539937, lon: 117.16653946879711 },
    { name: 'brigjend-katamso', lat: -0.4821629316468126, lon: 117.16130648629576 },
    { name: 'gatot-subroto', lat: -0.484634868556901, lon: 117.15525241253552 },
    { name: 'cendana', lat: -0.4987184574034962, lon: 117.12151672396949 },
    { name: 'di-panjaitan', lat: -0.4616283811244264, lon: 117.18572338299191 },
    { name: 'damanhuri', lat: -0.4726480049586589, lon: 117.18089748709794 },
    { name: 'pertigaan-pramuka-perjuangan', lat: -0.4648328326253432, lon: 117.15584721398068 },
    { name: 'padat-karya-sempaja-simpang-wanyi', lat: -0.424829289116985, lon: 117.15882745064134 },
    { name: 'simpang-sempaja', lat: -0.4500742226015745, lon: 117.15303878168255 },
    { name: 'ir-h-juanda', lat: -0.472740909178976, lon: 117.13824418741677 },
    { name: 'tengkawang', lat: -0.5016990420031888, lon: 117.11437249596959 },
    { name: 'sukorejo', lat: -0.4317621005498969, lon: 117.19535493819562 }
];

// Helper function to check if weather data has changed
const hasWeatherDataChanged = (newData, existingData) => {
    return (
        newData.temperature !== existingData.temperature ||
        newData.humidity !== existingData.humidity ||
        newData.pressure !== existingData.pressure ||
        newData.wind_speed !== existingData.wind_speed ||
        newData.wind_direction !== existingData.wind_direction ||
        newData.rain !== existingData.rain ||
        newData.snow !== existingData.snow ||
        newData.cloudiness !== existingData.cloudiness ||
        newData.visibility !== existingData.visibility ||
        newData.description !== existingData.description ||
        newData.condition_type !== existingData.condition_type
    );
};

// Fetch and store general weather data for Samarinda
const fetchSamarindaWeatherData = async () => {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                lat: SAMARINDA_COORDINATES.lat,
                lon: SAMARINDA_COORDINATES.lon,
                appid: API_KEY,
                units: 'metric'
            }
        });

        const data = response.data;
        const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Makassar' });

        const newWeatherData = {
            city: "Samarinda",
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            wind_speed: data.wind.speed,
            wind_direction: data.wind.deg || 0,
            rain: data.rain ? data.rain['1h'] : 0,
            snow: data.snow ? data.snow['1h'] : 0,
            cloudiness: data.clouds.all || 0,
            visibility: data.visibility || 0,
            description: data.weather[0].description,
            condition_type: data.rain ? 'rain' : data.snow ? 'snow' : data.weather[0].main,
            timestamp
        };

        // Compare with latest document
        const latestSnapshot = await firestore.collection('weather_data').orderBy('timestamp', 'desc').limit(1).get();

        if (!latestSnapshot.empty) {
            const latestData = latestSnapshot.docs[0].data();
            if (!hasWeatherDataChanged(newWeatherData, latestData)) {
                console.log('No changes in general weather data for Samarinda.');
                return;
            }
        }

        // Store general Samarinda data if changed
        await firestore.collection('weather_data').add(newWeatherData);
        console.log(`General weather data stored for Samarinda at ${timestamp}`);
    } catch (error) {
        console.error(`Failed to fetch general weather data: ${error.message}`);
    }
};

// Fetch and store weather data for each specific location
const fetchLocationWeatherData = async () => {
    try {
        for (const location of locations) {
            const response = await axios.get(BASE_URL, {
                params: {
                    lat: location.lat,
                    lon: location.lon,
                    appid: API_KEY,
                    units: 'metric'
                }
            });

            const data = response.data;
            const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Makassar' });

            const newWeatherData = {
                city: location.name,
                temperature: data.main.temp,
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                wind_speed: data.wind.speed,
                wind_direction: data.wind.deg || 0,
                rain: data.rain ? data.rain['1h'] : 0,
                snow: data.snow ? data.snow['1h'] : 0,
                cloudiness: data.clouds.all || 0,
                visibility: data.visibility || 0,
                description: data.weather[0].description,
                condition_type: data.rain ? 'rain' : data.snow ? 'snow' : data.weather[0].main,
                timestamp
            };

            // Check for latest document in location collection
            const latestSnapshot = await firestore.collection(location.name).orderBy('timestamp', 'desc').limit(1).get();

            if (!latestSnapshot.empty) {
                const latestData = latestSnapshot.docs[0].data();
                if (!hasWeatherDataChanged(newWeatherData, latestData)) {
                    console.log(`No changes in weather data for ${location.name}.`);
                    continue;
                }
            }

            // Store data if it has changed
            await firestore.collection(location.name).add(newWeatherData);
            console.log(`Weather data stored for ${location.name} at ${timestamp}`);
        }
    } catch (error) {
        console.error(`Failed to fetch weather data for locations: ${error.message}`);
    }
};

const fetchTomorrowWeatherData = async () => {
    try {
        for (const location of locations) {
            const response = await axios.get(forecastBaseUrl, {
                params: {
                    lat: location.lat,
                    lon: location.lon,
                    appid: API_KEY,
                    units: 'metric'
                }
            });

            const forecastData = response.data;
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1); // Set date to tomorrow
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0]; // Get only the date (yyyy-mm-dd)

            // Find the first forecast entry for tomorrow
            const tomorrowForecast = forecastData.list.find(item => {
                const itemDate = item.dt_txt.split(' ')[0]; // Get the date part (yyyy-mm-dd)
                return itemDate === tomorrowStr; // Compare with tomorrow's date
            });

            if (tomorrowForecast) {
                const data = tomorrowForecast;
                const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Makassar' });

                const forecastDataToStore = {
                    city: location.name,
                    temperature: data.main.temp,
                    humidity: data.main.humidity,
                    pressure: data.main.pressure,
                    wind_speed: data.wind.speed,
                    wind_direction: data.wind.deg || 0,
                    rain: data.rain ? data.rain['3h'] : 0,  // Forecast may use '3h' for rainfall
                    snow: data.snow ? data.snow['3h'] : 0,  // Same for snow
                    cloudiness: data.clouds.all || 0,
                    visibility: data.visibility || 0,
                    description: data.weather[0].description,
                    condition_type: data.rain ? 'rain' : data.snow ? 'snow' : data.weather[0].main,
                    timestamp
                };

                const forecastCollectionName = `forecast-${location.name}`;

                // Store forecast data to Firestore in the respective collection
                await firestore.collection(forecastCollectionName).add(forecastDataToStore);
                console.log(`Forecast data for ${location.name} stored in collection '${forecastCollectionName}' at ${timestamp}`);
            }
        }
    } catch (error) {
        console.error(`Failed to fetch and store tomorrow's forecast data: ${error.message}`);
    }
};

// Endpoint to trigger fetching of general and location-specific weather data
app.get('/', async (req, res) => {
    await fetchSamarindaWeatherData();
    await fetchLocationWeatherData();
    await fetchTomorrowWeatherData();
    res.send("Weather data for Samarinda and specific locations has been fetched and stored.");
});

// Endpoint to retrieve latest general weather data for Samarinda
app.get('/weather', async (req, res) => {
    try {
        const snapshot = await firestore.collection('weather_data').orderBy('timestamp', 'desc').limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: "No weather data found for Samarinda" });
        res.json(snapshot.docs[0].data());
    } catch (error) {
        res.status(500).json({ error: `Failed to retrieve general weather data: ${error.message}` });
    }
});

// Endpoint to get latest weather data for a specific location
app.get('/weather/:location', async (req, res) => {
    try {
        const location = req.params.location;

        // Validate location
        if (!locations.some(loc => loc.name === location)) {
            return res.status(400).json({ error: `Invalid location: ${location}` });
        }

        const snapshot = await firestore.collection(location).orderBy('timestamp', 'desc').limit(1).get();
        if (snapshot.empty) {
            return res.status(404).json({ error: `No weather data found for location: ${location}` });
        }

        res.json(snapshot.docs[0].data());
    } catch (error) {
        res.status(500).json({ error: `Failed to retrieve weather data: ${error.message}` });
    }
});

app.get('/tomorrow/:location', async (req, res) => {
    try {
        const location = req.params.location;

        // Validate location
        if (!locations.some(loc => loc.name === location)) {
            return res.status(400).json({ error: `Invalid location: ${location}` });
        }

        const forecastCollectionName = `forecast-${location}`;
        const snapshot = await firestore.collection(forecastCollectionName).orderBy('timestamp', 'desc').limit(1).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: `No forecast data found for tomorrow at location: ${location}` });
        }

        res.json(snapshot.docs[0].data());
    } catch (error) {
        res.status(500).json({ error: `Failed to retrieve forecast data: ${error.message}` });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
