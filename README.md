# 🌱 **AirWatch – Real-Time Air Quality Monitoring Dashboard**

AirWatch is a fully responsive and interactive dashboard designed to visualize **real-time air quality metrics** such as **AQI, PM2.5, PM10, NO₂, and O₃**. It provides users with live trends, forecasts, health recommendations, and alert notifications, making air-quality insights simple and accessible.

## 🚀 **Features**

### 🔹 **Dashboard**

* Displays current AQI, PM2.5, and PM10
* Live updates every few seconds
* Interactive charts (Line / Bar)
* City-wise snapshot comparison

### 🔹 **Forecast**

* 24-hour predicted AQI timeline
* Weekly trend prediction chart

### 🔹 **Analytics**

* Monthly AQI statistics
* Radar chart for pollutant comparison
* Hourly AQI variation analysis

### 🔹 **Health Section**

* Health Risk Calculator (Age, exposure, conditions)
* Personalized health advice
* AQI-based recommendations

### 🔹 **Alerts**

* Custom thresholds for AQI, PM2.5, PM10
* Auto alert banner when limits are crossed
* Alert history log
  
## 🧠 **How Data Works**

The project currently uses **simulated demo data** generated in JavaScript for AQI and pollutant readings.
This allows full UI interaction without requiring a backend.

You can easily replace this with:

* IoT sensor outputs
* Public AQI APIs (WAQI, IQAir, OpenWeather, etc.)
* Your own server or database

---

## 🛠 **Tech Stack**

| Component | Technology                        |
| --------- | --------------------------------- |
| Frontend  | HTML, CSS, JavaScript             |
| Charts    | Chart.js                          |
| Icons     | FontAwesome                       |
| Data Mode | Simulated (real API can be added) |


## 📁 **Project Structure**

```
/index.html       → Main UI  
/style.css        → Styling  
/script.js        → Charts, logic, data simulation  
/assets/          → Images & icons  
```



## 🧩 **How to Run**

1. Download or clone the repository
2. Open **index.html** in your browser
3. No server required (pure frontend)

## 🔮 Future Improvements

* Connect to live IoT AQI sensors
* Add database & authentication
* Deploy on GitHub Pages or Firebase Hosting

## 🤝 **Contributions**

Feel free to fork the project, raise issues, or submit pull requests!



