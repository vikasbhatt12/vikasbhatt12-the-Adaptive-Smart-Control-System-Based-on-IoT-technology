# Smart Lighting Control System

An adaptive and energy-efficient Smart Lighting Control System that adjusts LED brightness based on ambient light and occupancy. This system is built using a combination of backend services, sensor integration, and a frontend interface for real-time monitoring and control.

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Folder Structure](#folder-structure)
- [Setup and Installation](#setup-and-installation)
- [Usage](#usage)
- [Future Enhancements](#future-enhancements)

## Project Overview
This Smart Lighting Control System uses sensors to measure ambient light and detect occupancy, allowing it to dynamically adjust LED brightness and save energy. It combines a backend service using FastAPI with a React frontend for user interaction. Users can view current lux levels, control brightness manually, or switch to automatic mode where the system adjusts lighting based on real-time sensor data.

## Features
- Real-time lux level monitoring
- Adaptive brightness control using a PID algorithm
- Manual and automatic lighting modes
- Web-based dashboard for user interaction
- Energy usage analytics and data logging

## Technologies Used
- **Backend**: Python, FastAPI
- **Frontend**: React, JavaScript
- **Hardware**: Raspberry Pi, TCS34725 Ambient Light Sensor, PIR Motion Sensor, LED with PWM control
- **Data Logging**: openpyxl for Excel logging
- **Control Algorithm**: PID controller for brightness adjustment

## Folder Structure
S
