import React, { useState, useEffect } from "react";
import axios from "axios";

// Define backend URL as a constant
const BACKEND_URL = "http://192.168.240.178:8000";

function App() {
  // State for device status and controls
  const [status, setStatus] = useState({
    current_lux: 400,
    target_lux: 500,
    brightness: 70,
    control_mode: "automatic",
  });
  const [luxTarget, setLuxTarget] = useState(500);
  const [pid, setPID] = useState({ Kp: 1.0, Ki: 0.1, Kd: 0.05 });
  const [controlMode, setControlMode] = useState("automatic");

  // Fetch current status every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios.get(`${BACKEND_URL}/status`);
        setStatus(result.data);
        setLuxTarget(result.data.target_lux);
        setControlMode(result.data.control_mode);
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Set a new target lux
  const updateTargetLux = async () => {
    try {
      await axios.post(`${BACKEND_URL}/set_target_lux`, {
        target_lux: luxTarget,
      });
      alert("Target Lux updated successfully");
    } catch (error) {
      console.error("Error updating target lux:", error);
      alert("Failed to update Target Lux");
    }
  };

  // Update PID parameters
  const updatePID = async () => {
    try {
      await axios.post(`${BACKEND_URL}/set_pid`, pid);
      alert("PID parameters updated successfully");
    } catch (error) {
      console.error("Error updating PID parameters:", error);
      alert("Failed to update PID parameters");
    }
  };

  // Set Control Mode
  const updateControlMode = async (mode) => {
    try {
      await axios.post(`${BACKEND_URL}/set_control_mode`, { mode });
      setControlMode(mode);
      alert(`Control mode set to ${mode}`);
    } catch (error) {
      console.error("Error setting control mode:", error);
      alert("Failed to set Control Mode");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-blue-600">
          Smart Lighting Control Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and control lighting intensity based on ambient lux levels
        </p>
      </header>

      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Current Status
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="text-lg text-gray-500">Current Lux</p>
            <p className="text-2xl font-bold text-blue-600">
              {status.current_lux} lx
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="text-lg text-gray-500">Target Lux</p>
            <p className="text-2xl font-bold text-blue-600">
              {status.target_lux} lx
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="text-lg text-gray-500">Brightness</p>
            <p className="text-2xl font-bold text-blue-600">
              {status.brightness}%
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="text-lg text-gray-500">Control Mode</p>
            <p className="text-2xl font-bold text-blue-600">
              {status.control_mode.charAt(0).toUpperCase() + status.control_mode.slice(1)}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Set Target Lux
        </h2>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={luxTarget}
            onChange={(e) => setLuxTarget(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Enter target lux"
            disabled={controlMode !== "manual"}
          />
          <button
            onClick={updateTargetLux}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 ${controlMode !== "manual" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={controlMode !== "manual"}
          >
            Set Target Lux
          </button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Adjust PID Parameters
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-gray-600">Kp</label>
            <input
              type="number"
              step="0.01"
              value={pid.Kp}
              onChange={(e) => setPID({ ...pid, Kp: Number(e.target.value) })}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-600">Ki</label>
            <input
              type="number"
              step="0.01"
              value={pid.Ki}
              onChange={(e) => setPID({ ...pid, Ki: Number(e.target.value) })}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-600">Kd</label>
            <input
              type="number"
              step="0.01"
              value={pid.Kd}
              onChange={(e) => setPID({ ...pid, Kd: Number(e.target.value) })}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <button
          onClick={updatePID}
          className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Update PID Parameters
        </button>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Control Mode
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => updateControlMode("automatic")}
            className={`bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ${controlMode === "automatic" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={controlMode === "automatic"}
          >
            Automatic
          </button>
          <button
            onClick={() => updateControlMode("manual")}
            className={`bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 ${controlMode === "manual" ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={controlMode === "manual"}
          >
            Manual
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;