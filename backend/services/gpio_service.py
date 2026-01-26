# GPIO Service for Cocktail Machine
# Handles all hardware GPIO operations for pump control

import time

# --- GPIO Configuration ---
# Active-High Relay Logic: GPIO.HIGH = Relay ON (pump running), GPIO.LOW = Relay OFF (pump stopped)
GPIO_AVAILABLE = False
GPIO = None

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    print("✅ RPi.GPIO module loaded. Hardware control enabled.")
except ImportError:
    print("⚠️ RPi.GPIO not found. Running in SIMULATION mode.")


class GPIOService:
    """
    Service class for GPIO hardware control.
    Handles pump initialization and pouring operations.
    Supports both real hardware (Raspberry Pi) and simulation mode.
    """
    
    def __init__(self):
        self.gpio_available = GPIO_AVAILABLE
        self.initialized_pins = set()
    
    def initialize_pin(self, pin_number):
        """
        Initialize a GPIO pin for pump control (Active-High relay).
        Sets pin as OUTPUT and immediately sets LOW to ensure pump is OFF.
        
        Args:
            pin_number (int): The BCM GPIO pin number
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        if not pin_number:
            return False
            
        if self.gpio_available:
            try:
                GPIO.setup(pin_number, GPIO.OUT)
                GPIO.output(pin_number, GPIO.LOW)  # LOW = OFF for Active-High relay
                self.initialized_pins.add(pin_number)
                print(f"📌 Pin {pin_number} initialized as OUTPUT (set LOW - pump OFF)")
                return True
            except Exception as e:
                print(f"❌ Failed to initialize pin {pin_number}: {str(e)}")
                return False
        else:
            print(f"🧪 [SIMULATION] Pin {pin_number} initialized (simulated)")
            self.initialized_pins.add(pin_number)
            return True
    
    def pour(self, pin_number, duration, pump_id=None):
        """
        Control the pump to pour ingredient using Active-High relay logic.
        Handles both Simulation Mode and Real GPIO Mode.
        
        Active-High Logic:
            - GPIO.HIGH = Relay activated = Pump ON (pouring)
            - GPIO.LOW  = Relay deactivated = Pump OFF (stopped)
        
        Args:
            pin_number (int): The BCM GPIO pin number (from Pump.pin_number in database)
            duration (float): How long to run the pump in seconds
            pump_id (int, optional): The pump ID for logging purposes
        
        Returns:
            bool: True if pour completed successfully, False otherwise
        """
        pump_label = f"Pump {pump_id}" if pump_id else f"Pin {pin_number}"
        
        if not self.gpio_available:
            # --- SIMULATION MODE ---
            print(f"🧪 [SIMULATION] START: {pump_label} (Pin {pin_number}) running for {duration:.2f}s")
            time.sleep(duration)
            print(f"🧪 [SIMULATION] STOP: {pump_label} finished")
            return True
        
        # --- REAL HARDWARE MODE (Active-High relay) ---
        if not pin_number:
            print(f"❌ {pump_label} has no pin assigned - SKIPPED")
            return False
        
        try:
            # Ensure pin is configured as output with initial LOW state (OFF)
            GPIO.setup(pin_number, GPIO.OUT, initial=GPIO.LOW)
            
            # ACTIVE-HIGH: Set pin HIGH to turn pump ON
            GPIO.output(pin_number, GPIO.HIGH)
            print(f"⚡ [HARDWARE] {pump_label} (Pin {pin_number}) ON - Pouring...")
            
            time.sleep(duration)
            
            # ACTIVE-HIGH: Set pin LOW to turn pump OFF
            GPIO.output(pin_number, GPIO.LOW)
            print(f"⚡ [HARDWARE] {pump_label} (Pin {pin_number}) OFF - Complete")
            return True
            
        except Exception as e:
            # Safety: Ensure pin is set LOW (OFF) on any error
            try:
                GPIO.output(pin_number, GPIO.LOW)
            except:
                pass
            print(f"❌ [ERROR] {pump_label} (Pin {pin_number}): {str(e)}")
            return False
    
    def stop_all(self):
        """
        Emergency stop - set all initialized pins to LOW (OFF).
        """
        for pin in self.initialized_pins:
            try:
                if self.gpio_available:
                    GPIO.output(pin, GPIO.LOW)
                print(f"🛑 Pin {pin} set to LOW (OFF)")
            except Exception as e:
                print(f"❌ Failed to stop pin {pin}: {str(e)}")
    
    def cleanup(self):
        """
        Clean up GPIO resources on shutdown.
        """
        if self.gpio_available:
            try:
                GPIO.cleanup()
                print("🧹 GPIO cleanup completed")
            except Exception as e:
                print(f"❌ GPIO cleanup error: {str(e)}")


# Singleton instance for use across the application
gpio_service = GPIOService()
