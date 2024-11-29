// src/components/SetTargetLux.js
import React, { useState } from "react";
import axios from "axios";

const SetTargetLux = ({ fetchStatus }) => {
  const [targetLux, setTargetLux] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/set_target_lux", { target_lux: parseFloat(targetLux) });
      fetchStatus();
      setTargetLux("");
    } catch (error) {
      console.error("Error setting target lux:", error);
    }
  };

  return (
    <div className="set-target-lux">
      <h2>Set Target Lux</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={targetLux}
          onChange={(e) => setTargetLux(e.target.value)}
          placeholder="Enter target lux"
          required
        />
        <button type="submit">Set Lux</button>
      </form>
    </div>
  );
};

export default SetTargetLux;
