// src/components/AdjustPID.js
import React, { useState } from "react";
import axios from "axios";

const AdjustPID = ({ fetchStatus }) => {
  const [Kp, setKp] = useState("");
  const [Ki, setKi] = useState("");
  const [Kd, setKd] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/set_pid", { Kp: parseFloat(Kp), Ki: parseFloat(Ki), Kd: parseFloat(Kd) });
      fetchStatus();
      setKp("");
      setKi("");
      setKd("");
    } catch (error) {
      console.error("Error adjusting PID:", error);
    }
  };

  return (
    <div className="adjust-pid">
      <h2>Adjust PID Parameters</h2>
      <form onSubmit={handleSubmit}>
        <label>Kp: </label>
        <input
          type="number"
          value={Kp}
          onChange={(e) => setKp(e.target.value)}
          step="0.1"
          required
        />
        <label>Ki: </label>
        <input
          type="number"
          value={Ki}
          onChange={(e) => setKi(e.target.value)}
          step="0.01"
          required
        />
        <label>Kd: </label>
        <input
          type="number"
          value={Kd}
          onChange={(e) => setKd(e.target.value)}
          step="0.01"
          required
        />
        <button type="submit">Update PID</button>
      </form>
    </div>
  );
};

export default AdjustPID;
