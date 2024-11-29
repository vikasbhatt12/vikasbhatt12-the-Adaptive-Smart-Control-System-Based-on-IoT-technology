import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './LightControl.css';
import { FaLightbulb } from 'react-icons/fa';
import axios from 'axios';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const backendURL = 'http://127.0.0.1:4000'; // Update this with your backend URL

const LightControl = () => {
  const { id } = useParams();
  const [lightState, setLightState] = useState("off");
  const [intensity, setIntensity] = useState(50);
  const [colorTemp, setColorTemp] = useState(2700); // Cool (2700K) to Warm (6500K)
  const [color, setColor] = useState("#f1c40f"); // Default color
  const [schedule, setSchedule] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);

  useEffect(() => {
    // Fetch usage history on component mount
    const fetchUsageHistory = async () => {
      try {
        const response = await axios.get(`${backendURL}/api/usage-history`, { params: { id } });
        setUsageHistory(response.data);
      } catch (error) {
        console.error(`Error fetching usage history:`, error);
      }
    };

    fetchUsageHistory();
  }, [id]);

  // Toggle light on/off
  const toggleLight = async () => {
    const newState = lightState === "off" ? "on" : "off";
    setLightState(newState);

    try {
      await axios.post(`${backendURL}/api/toggle-light`, { id, state: newState });
    } catch (error) {
      console.error(`Error toggling light:`, error);
    }
  };

  // Handle intensity change
  const handleIntensityChange = async (event) => {
    const newIntensity = parseInt(event.target.value);
    setIntensity(newIntensity);

    try {
      await axios.post(`${backendURL}/api/set-light-intensity`, { id, intensity: newIntensity });
    } catch (error) {
      console.error(`Error setting intensity:`, error);
    }
  };

  // Handle color temperature change
  const handleColorTempChange = async (event) => {
    const newColorTemp = parseInt(event.target.value);
    setColorTemp(newColorTemp);

    try {
      await axios.post(`${backendURL}/api/set-color-temp`, { id, colorTemp: newColorTemp });
    } catch (error) {
      console.error(`Error setting color temp:`, error);
    }
  };

  // Handle color change
  const handleColorChange = async (event) => {
    const newColor = event.target.value;
    setColor(newColor);

    try {
      await axios.post(`${backendURL}/api/set-light-color`, { id, color: newColor });
    } catch (error) {
      console.error(`Error setting color:`, error);
    }
  };

  // Handle schedule change
  const handleScheduleChange = async (date) => {
    setSchedule(date);

    try {
      await axios.post(`${backendURL}/api/set-schedule`, { id, schedule: date });
    } catch (error) {
      console.error(`Error setting schedule:`, error);
    }
  };

  return (
    <div className="light-control">
      <h2>Light Control</h2>
      <motion.div
        className={`lightbulb-icon ${lightState}`}
        style={{
          display: 'inline-block',
          color: color,
          opacity: lightState === "off" ? 0.2 : 1,
        }}
        animate={{ opacity: lightState === "off" ? 0.2 : 1, boxShadow: `0 0 ${intensity / 2}px ${color}` }}
        transition={{ duration: 0.5 }}
      >
        <FaLightbulb />
      </motion.div>
      <div className="controls">
        <button onClick={toggleLight} className="toggle-btn">
          {lightState === "off" ? "Turn On" : "Turn Off"}
        </button>

        <div className="slider-container">
          <label>Intensity: {intensity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={handleIntensityChange}
          />
        </div>

        <div className="slider-container">
          <label>Color Temperature: {colorTemp}K</label>
          <input
            type="range"
            min="2700"
            max="6500"
            value={colorTemp}
            onChange={handleColorTempChange}
          />
        </div>

        <div className="slider-container">
          <label>Color: </label>
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
          />
        </div>

        <div className="schedule-container">
          <label>Schedule: </label>
          <DatePicker
            selected={schedule}
            onChange={handleScheduleChange}
            showTimeSelect
            dateFormat="Pp"
          />
        </div>
      </div>

      <div className="usage-history">
        <h3>Usage History</h3>
        <ul>
          {usageHistory.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LightControl;
