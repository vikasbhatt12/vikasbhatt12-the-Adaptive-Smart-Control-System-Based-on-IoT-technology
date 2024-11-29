import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const lights = [
    { id: 1, name: "Living Room Light" },
    { id: 2, name: "Bedroom Light" },
    { id: 3, name: "Kitchen Light" },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="devices">
        {lights.map(light => (
          <Link key={light.id} to={`/light/${light.id}`} className="device">
            <h2>{light.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
