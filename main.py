import time
import board
import busio
import adafruit_tcs34725
import RPi.GPIO as GPIO
import openpyxl
from openpyxl import Workbook
from datetime import datetime
import os
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import threading
import uvicorn
import logging
from pydantic import BaseModel
from fastapi.exceptions import RequestValidationError
from fastapi import status

# ============================
# 1. Configuration Parameters
# ============================

LED_PIN = 5           # GPIO pin connected to the LED (must support PWM, e.g., GPIO5)
FREQUENCY = 1000      # PWM frequency in Hz

PIR_PIN = 17          # GPIO pin connected to the PIR sensor

STEP_COUNT = 1000     # Total steps for increasing/decreasing brightness
DELAY = 0.005         # Delay between steps in seconds (adjust for smoothness and speed)

# ============================
# 2. GPIO Setup
# ============================

def setup_gpio():
    """
    Sets up the GPIO pins for PWM and PIR sensor.
    """
    try:
        GPIO.setmode(GPIO.BCM)        # Use Broadcom pin numbering
        GPIO.setup(LED_PIN, GPIO.OUT) # Set LED_PIN as an output for PWM
        GPIO.setup(PIR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN) # Set PIR_PIN as input with pull-down resistor
        pwm = GPIO.PWM(LED_PIN, FREQUENCY) # Initialize PWM on the LED_PIN
        pwm.start(0)                  # Start PWM with 0% duty cycle (LED off)
        logger.info("GPIO setup completed successfully.")
        return pwm
    except Exception as e:
        logger.error(f"Error during GPIO setup: {e}")
        raise

# ============================
# 3. Floating-Point Range Generator
# ============================

def frange(start, stop, step):
    """
    Generates a range of floating-point numbers.
    """
    while (step > 0 and start <= stop) or (step < 0 and start >= stop):
        yield round(start, 2)
        start += step

# ============================
# 4. PWM Dimming Function
# ============================

def pwm_dimming_smoothly(pwm, current, target, step=1, delay=0.005):
    """
    Smoothly transitions the LED brightness from current to target duty cycle.
    
    :param pwm: PWM object controlling the LED.
    :param current: Current duty cycle (0-100).
    :param target: Target duty cycle (0-100).
    :param step: Increment/decrement step size.
    :param delay: Delay between steps in seconds.
    """
    if current < target:
        for duty in frange(current, target, step):
            pwm.ChangeDutyCycle(duty)
            time.sleep(delay)
    elif current > target:
        for duty in frange(current, target, -step):
            pwm.ChangeDutyCycle(duty)
            time.sleep(delay)
    # Ensure target is set precisely
    pwm.ChangeDutyCycle(target)

# ============================
# 5. Pydantic Models for Request Validation
# ============================

class SetBrightness(BaseModel):
    brightness: float  # Percentage (0-100)

class ControlMode(BaseModel):
    mode: str  # 'automatic' or 'manual'

# ============================
# 6. Initialize FastAPI App
# ============================

app = FastAPI()

# Configure CORS to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

# ============================
# 7. Configure Logging
# ============================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================
# 8. Initialize Sensor and PWM
# ============================

# Setup I2C for TCS34725 sensor
try:
    i2c = busio.I2C(board.SCL, board.SDA)
    sensor = adafruit_tcs34725.TCS34725(i2c)
    sensor.integration_time = 50  # Adjust as needed (50ms default)
    sensor.gain = 4  # Adjust as needed
    logger.info("TCS34725 sensor initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize TCS34725 sensor: {e}")
    raise

# Initialize PWM
pwm = setup_gpio()
logger.info(f"LED PWM initialized on GPIO pin {LED_PIN} with frequency {FREQUENCY}Hz.")

# ============================
# 9. Excel Logging Setup
# ============================

file_path = "/home/iiitg/sensor_data.xlsx"

# Ensure the directory exists
directory = os.path.dirname(file_path)
if not os.path.exists(directory):
    os.makedirs(directory)
    logger.info(f"Created directory {directory} for Excel logging.")

# Try loading existing workbook or create a new one
try:
    workbook = openpyxl.load_workbook(file_path)
    sheet = workbook.active
    logger.info(f"Loaded existing Excel workbook from {file_path}.")
except FileNotFoundError:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Timestamp", "Lux", "Red", "Green", "Blue", "CCT (K)", "LED Duty Cycle (%)", "Power Consumption (W)"])
    workbook.save(file_path)
    logger.info(f"Created new Excel workbook at {file_path}.")

# ============================
# 10. Helper Functions
# ============================

def calculate_power_consumption(duty_cycle):
    """
    Calculates power consumption based on duty cycle.
    """
    LED_VOLTAGE = 5.0       # Voltage in volts
    LED_MAX_CURRENT = 0.02  # Max current in amperes (20mA)
    current = LED_MAX_CURRENT * (duty_cycle / 100)
    power = LED_VOLTAGE * current
    return power

def calculate_cct(r, g, b):
    """
    Calculates Correlated Color Temperature (CCT) from RGB values using McCamy's formula.
    """
    try:
        # Normalize RGB values
        r_norm = r / 65535
        g_norm = g / 65535
        b_norm = b / 65535

        # Calculate the chromaticity coordinates
        X = -0.14282 * r_norm + 1.54924 * g_norm + -0.95641 * b_norm
        Y = -0.32466 * r_norm + 1.57837 * g_norm + -0.73191 * b_norm
        Z = -0.68202 * r_norm + 0.77073 * g_norm + 0.56332 * b_norm

        # Avoid division by zero
        if (X + Y + Z) == 0:
            return None

        # Calculate chromaticity coordinates
        xc = X / (X + Y + Z)
        yc = Y / (X + Y + Z)

        # Calculate n
        n = (xc - 0.3320) / (0.1858 - yc)

        # Calculate CCT using McCamy's formula
        cct = -449 * (n ** 3) + 3525 * (n ** 2) - 6823.3 * n + 5520.33
        return round(cct, 2)
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Error calculating CCT: {e}")
        return None

# ============================
# 11. Control Modes and Brightness
# ============================

# Control Mode: 'automatic' or 'manual'
control_mode = "automatic"

# Current Duty Cycle
current_duty_cycle = 0

# Lock for thread-safe operations
brightness_lock = threading.Lock()

# ============================
# 12. API Endpoints
# ============================

@app.get("/")
def read_root():
    return {"message": "Backend server is running."}

@app.get("/status")
def get_status():
    status = {
        "current_lux": sensor.lux,
        "brightness": current_duty_cycle,
        "control_mode": control_mode
    }
    return JSONResponse(status)

@app.post("/set_brightness")
def set_brightness(set_brightness: SetBrightness):
    global current_duty_cycle, control_mode
    try:
        if control_mode != "manual":
            return JSONResponse({"status": "error", "message": "Cannot set brightness in automatic mode."}, status_code=400)
        
        brightness = set_brightness.brightness
        if not (0 <= brightness <= 100):
            return JSONResponse({"status": "error", "message": "Brightness must be between 0 and 100."}, status_code=400)
        
        with brightness_lock:
            pwm_dimming_smoothly(pwm, current_duty_cycle, brightness, step=1, delay=DELAY)
            current_duty_cycle = brightness
            logger.info(f"Manual Mode: Set brightness to {current_duty_cycle}%")
        
        return JSONResponse({"status": "success", "brightness": current_duty_cycle})
    except Exception as e:
        logger.error(f"Failed to set brightness: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post("/set_control_mode")
def set_control_mode(mode: ControlMode):
    global control_mode, current_duty_cycle
    try:
        mode_lower = mode.mode.lower()
        if mode_lower not in ["automatic", "manual"]:
            return JSONResponse({"status": "error", "message": "Invalid mode. Choose 'automatic' or 'manual'."}, status_code=400)
        
        with brightness_lock:
            control_mode = mode_lower
            logger.info(f"Control mode set to: {control_mode}")
            
            if control_mode == "automatic":
                # Reset brightness to 0%; control loop will adjust it based on lux
                pwm.ChangeDutyCycle(0)
                current_duty_cycle = 0
                logger.info("Switched to automatic mode. LED brightness will be controlled based on ambient light.")
            elif control_mode == "manual":
                # Optionally, keep the current brightness or set a default
                logger.info("Switched to manual mode. You can now set LED brightness manually.")
        
        return JSONResponse({"status": "success", "control_mode": control_mode})
    except Exception as e:
        logger.error(f"Failed to set control mode: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

# ============================
# 13. Motion Detection Handling (Polling-Based)
# ============================

# Timestamp of the last detected motion
last_motion_time = None

# Duration to keep LED on after last motion (10 seconds)
INACTIVITY_DURATION = 10

def detect_motion():
    """
    Polls the PIR sensor at regular intervals to detect motion.
    Updates the last_motion_time when motion is detected.
    """
    global last_motion_time
    while True:
        try:
            motion = GPIO.input(PIR_PIN)
            if motion:
                logger.info("Motion detected!")
                last_motion_time = time.time()
            time.sleep(0.5)  # Polling interval (adjust as needed)
        except Exception as e:
            logger.error(f"Error during motion detection polling: {e}")
            time.sleep(1)  # Wait before retrying in case of error

# ============================
# 14. Control Loop Function
# ============================

def control_loop():
    global current_duty_cycle, control_mode, last_motion_time
    while True:
        try:
            if control_mode == "automatic":
                motion_detected = False
                if last_motion_time:
                    elapsed_time = time.time() - last_motion_time
                    if elapsed_time <= INACTIVITY_DURATION:
                        motion_detected = True
                if motion_detected:
                    # Motion detected within the last 10 seconds
                    # Adjust brightness based on TCS sensor
                    current_lux = sensor.lux
                    if current_lux is None:
                        logger.warning("Current Lux is None, skipping this cycle.")
                        time.sleep(1)
                        continue  # Skip the rest of the loop if lux is None
                    logger.info(f"Current Lux: {current_lux}")
        
                    # Get RGB values
                    r, g, b = sensor.color_rgb_bytes
        
                    # Calculate CCT
                    cct = calculate_cct(r, g, b)
                    if cct is not None:
                        logger.info(f"Calculated CCT: {cct}K")
                    else:
                        logger.warning("CCT calculation failed (division by zero)")
        
                    # Determine target brightness based on lux
                    # Example logic: higher lux -> lower brightness
                    MAX_LUX = 1000  # Lux corresponding to 0% brightness
                    MIN_LUX = 0     # Lux corresponding to 100% brightness
        
                    # Clamp lux to the defined range
                    lux = max(MIN_LUX, min(MAX_LUX, current_lux))
        
                    # Map lux to duty cycle inversely
                    target_brightness = round(((MAX_LUX - lux) / MAX_LUX) * 100, 2)
        
                    # Smoothly transition to target brightness
                    with brightness_lock:
                        pwm_dimming_smoothly(pwm, current_duty_cycle, target_brightness, step=1, delay=DELAY)
                        current_duty_cycle = target_brightness
                        logger.info(f"Automatic Mode: Set brightness to {current_duty_cycle}% based on lux {lux} lx")
        
                    # Calculate power consumption
                    power_consumed = calculate_power_consumption(current_duty_cycle)
        
                    # Log data to Excel
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    sheet.append([timestamp, lux, r, g, b, cct, current_duty_cycle, power_consumed])
                    workbook.save(file_path)
                    logger.info("Logged data to Excel.")
        
                    # Log additional information
                    logger.info(f"Power Consumption: {power_consumed:.4f}W")
                    logger.info(f"CCT: {cct}K")
                else:
                    # No motion detected within the last 10 seconds
                    if current_duty_cycle > 0:
                        logger.info("No motion detected for 10 seconds. Dimming LED off smoothly.")
                        with brightness_lock:
                            pwm_dimming_smoothly(pwm, current_duty_cycle, 0, step=1, delay=DELAY)
                            current_duty_cycle = 0
                            logger.info("LED dimmed off.")
                    else:
                        logger.info("LED already off.")
        
            else:
                # In manual mode, do not adjust brightness automatically
                pass
        
            time.sleep(1)  # Adjust the interval as needed for smoother transitions
        
        except Exception as e:
            logger.error(f"Error in control loop: {e}")
            time.sleep(1)  # Wait before retrying

# ============================
# 15. Start Motion Detection and Control Loop Threads
# ============================

# Start motion detection thread
motion_thread = threading.Thread(target=detect_motion, daemon=True)
motion_thread.start()
logger.info("Motion detection thread started.")

# Start control loop in a separate thread
control_thread = threading.Thread(target=control_loop, daemon=True)
control_thread.start()
logger.info("Control loop thread started.")

# ============================
# 16. Run FastAPI App
# ============================

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run (app, host="0.0.0.0", port=8000)
