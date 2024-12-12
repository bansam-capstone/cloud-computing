import os
from flask import Flask, jsonify
import tensorflow as tf
import numpy as np
from google.cloud import firestore
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

# Load the model
model = tf.keras.models.load_model('../prediksi_banjir.keras')

# Initialize Firestore
db = firestore.Client()

# Define risk levels corresponding to model output indices
RISK_LEVELS = ["Aman", "Bahaya", "Waspada"]

# List of specific locations
locations = [
    "slamet-riyadi", "antasari", "simpang-agus-salim", "mugirejo", "simpang-lembuswana",
    "kapten-sudjono", "brigjend-katamso", "gatot-subroto", "cendana", "di-panjaitan",
    "damanhuri", "pertigaan-pramuka-perjuangan", "padat-karya-sempaja-simpang-wanyi",
    "simpang-sempaja", "ir-h-juanda", "tengkawang", "sukorejo"
]

@app.route('/')
def fetch_and_store_all_data():
    try:
        # Ambil dan simpan data umum untuk Samarinda
        general_docs = db.collection('weather_data').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
        general_data = next(general_docs, None)

        if general_data:
            general_data_dict = general_data.to_dict()
            prediction_result = make_prediction(general_data_dict)
            prediction_result['city'] = 'Samarinda'
            store_data_if_needed('general', prediction_result)  # Nama koleksi tetap predict_general

        # Ambil dan simpan data untuk setiap lokasi
        for location in locations:
            location_docs = db.collection(location).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
            latest_location_data = next(location_docs, None)
            
            if latest_location_data:
                location_data_dict = latest_location_data.to_dict()
                prediction_result = make_prediction(location_data_dict)
                prediction_result['location'] = location
                store_data_if_needed(location, prediction_result)  # Lokasi menentukan koleksi
            else:
                print(f"No data found for location: {location}")

        return jsonify({"status": "Data fetched and stored successfully"}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Function to store data only if needed (based on time interval)
def store_data_if_needed(location_name, new_data):
    collection_name = f"predict_{location_name}"
    # Fetch the last stored document in the specified collection
    last_doc = db.collection(collection_name).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
    last_data = next(last_doc, None)

    # If no previous data exists, store the new data
    if not last_data:
        print(f"No previous data found in {collection_name}. Storing new data.")
        db.collection(collection_name).add(new_data)
        return
    
    # Convert Firestore document to dictionary and get the timestamp
    last_data_dict = last_data.to_dict()
    last_timestamp = last_data_dict.get('timestamp')

    # Ensure `datetime.utcnow()` is timezone-aware for comparison
    current_time = datetime.utcnow().replace(tzinfo=timezone.utc)

    # Calculate the time difference 
    time_difference = current_time - last_timestamp

    # Check if the last data was stored more than 1 hour ago
    if time_difference >= timedelta(minutes=30):
        print(f"Storing new data in {collection_name}: {new_data}")
        db.collection(collection_name).add(new_data)
    else:
        print(f"Data not stored for {collection_name} (time difference too small).")

# Function to make predictions
def make_prediction(data):
    description = ['broken clouds', 'scattered clouds', 'few clouds', 'overcast clouds', 'light rain', 'clear sky', 'moderate rain']
    condition_type = ['Clouds', 'rain', 'Clear']

    # Prepare input data for the model
    input_data = np.array([[ 
        data['temperature'],
        data['humidity'],
        data['pressure'],
        data['wind_speed'],
        data['wind_direction'],
        data['rain'],
        data['cloudiness'],
        int(description.index(data['description'])),
        int(condition_type.index(data['condition_type']))
    ]], dtype=np.float32)

    # Make prediction
    predictions = model.predict(input_data)
    predicted_index = np.argmax(predictions, axis=1)[0]
    risk_level = RISK_LEVELS[predicted_index]

    # Prepare prediction result
    prediction_result = {
        'temperature': float(data['temperature']),
        'humidity': float(data['humidity']),
        'pressure': float(data['pressure']),
        'wind_speed': data['wind_speed'],
        'wind_direction': data['wind_direction'],
        'rain': data['rain'],
        'cloudiness': data['cloudiness'],
        'description': data['description'],
        'condition_type': data['condition_type'],
        'risk_level': risk_level,
        'timestamp': datetime.utcnow()
    }
    
    return prediction_result

# Function to handle general prediction for "samarinda"
@app.route('/samarinda', methods=['GET'])
def predict_general_data():
    try:
        # Fetch the latest general prediction data from Firestore
        docs = db.collection('predict_general').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
        latest_data = next(docs, None)

        if not latest_data:
            return jsonify({'error': "No general prediction data available for Samarinda."}), 404

        data = latest_data.to_dict()
        
        # Return the general prediction result for Samarinda
        return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Function to handle specific location predictions
def predict_location_data(location):
    try:
        # Nama koleksi khusus lokasi
        collection_name = f"predict_{location}"
        
        # Ambil prediksi terbaru dari koleksi lokasi
        location_docs = db.collection(collection_name).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
        latest_location_data = next(location_docs, None)

        if not latest_location_data:
            return jsonify({'error': f"No prediction data available for location {location}."}), 404

        data = latest_location_data.to_dict()

        return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tomorrow/<string:location>', methods=['GET'])
def forecast_tomorrow(location):
    try:
        # Fetch the latest weather data for the location from Firestore
        collection_name = f"forecast-{location}"
        forecast_docs = db.collection(collection_name).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).stream()
        latest_forecast = next(forecast_docs, None)

        if not latest_forecast:
            return jsonify({'error': f"No forecast data available for tomorrow at location {location}."}), 404

        data = latest_forecast.to_dict()

        # Use the make_prediction function to predict risk level
        prediction_result = make_prediction(data)

        # Return the prediction result with the calculated risk level
        return jsonify(prediction_result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register routes dynamically for each location
for location in locations:
    app.add_url_rule(f'/{location}', location, lambda loc=location: predict_location_data(loc), methods=['GET'])

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get("PORT", 8080)))
