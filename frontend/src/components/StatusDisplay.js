// src/components/StatusDisplay.js
import React from "react";

const StatusDisplay = ({ status }) => (
  <div className="status-display">
    <h2>Current Status</h2>
    <p>Current Lux: {status.current_lux}</p>
    <p>Target Lux: {status.target_lux}</p>
    <p>Brightness Level (Duty Cycle): {status.brightness}%</p>
  </div>
);

export default StatusDisplay;
