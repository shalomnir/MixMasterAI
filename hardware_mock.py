import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HardwareMock")

def pour_ingredient(pump_id, duration):
    """
    Simulates pouring an ingredient by running a pump for a specific duration.
    
    Args:
        pump_id (int): The ID of the pump (1-8).
        duration (float): Duration in seconds to run the pump.
    """
    logger.info(f"START: Pump {pump_id} running for {duration} seconds.")
    time.sleep(duration)
    logger.info(f"STOP: Pump {pump_id} finished.")
    return True
