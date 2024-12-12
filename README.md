# BanSam API

Backend API for BanSam weather prediction application.

This API provides real-time and future weather prediction data for the BANSAM app. It supports retrieving general weather information for Samarinda, detailed weather data for specific locations, and predictions for the next day. These endpoints empower the BANSAM app to deliver accurate, location-based weather insights and risk level assessments to users.

---

## Installation

### 1. Install using NPM
```bash
npm install
npm install --save-dev
```

### 2. How to run by default
Start the server using the default script:
```bash
npm run start
```

### 3. Using Flask (Python)
This API is also implemented using Flask, a lightweight Python web framework. To run the Flask version:
1. Install Python and pip (Python package manager).
2. Install Flask and required dependencies:
   ```bash
   pip install flask
   ```
3. Run the application:
   ```bash
   flask run
   ```

---

## Endpoints

Base URL: `https://localhost:5050

### Get General Prediction Data
Retrieve general weather prediction data for Samarinda.
- **URL**: `/samarinda`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "city": "Samarinda",
    "cloudiness": 100,
    "condition_type": "Clouds",
    "description": "overcast clouds",
    "humidity": 100,
    "pressure": 1009,
    "rain": 0,
    "risk_level": "Aman",
    "temperature": 23.51,
    "timestamp": "Thu, 12 Dec 2024 14:00:11 GMT",
    "wind_direction": 142,
    "wind_speed": 1
  }
  ```

### Get Specific Location Prediction Data
Retrieve weather prediction data for a specific location in Samarinda.
- **URL**: `/location`
  
  Example: `/antasari`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "cloudiness": 100,
    "condition_type": "Clouds",
    "description": "overcast clouds",
    "humidity": 100,
    "location": "antasari",
    "pressure": 1009,
    "rain": 0,
    "risk_level": "Aman",
    "temperature": 23.62,
    "timestamp": "Thu, 12 Dec 2024 14:00:11 GMT",
    "wind_direction": 143,
    "wind_speed": 1
  }
  ```

### Get Specific Location Tomorrow Prediction Data
Retrieve weather prediction data for a specific location in Samarinda for the next day.
- **URL**: `/tomorrow/location`

  Example: `/tomorrow/tengkawang`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "cloudiness": 100,
    "condition_type": "Clouds",
    "description": "overcast clouds",
    "humidity": 98,
    "pressure": 1010,
    "rain": 0,
    "risk_level": "Aman",
    "temperature": 23.86,
    "timestamp": "Thu, 12 Dec 2024 14:31:01 GMT",
    "wind_direction": 246,
    "wind_speed": 0.57
  }
  ```

---

## License
This project is licensed under the [MIT License](LICENSE).

