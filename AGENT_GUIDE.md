# AI Cocktail Mixer - Agent Usage Guide

This document provides important information for AI agents on how to interact with and use the AI Cocktail Mixer application.

## Authentication & User Management

### Admin Access
- **Admin Password**: To log in as admin, type `Admin2001` in the login page
- The admin panel provides access to:
  - Recipe management
  - Pump configuration
  - Global settings (category volumes, tasting amount, etc.)
  - User management

### Logging Out
- **Important**: There is no traditional "logout" feature in this application
- **To switch users**: You must delete the current user account
- This is a design choice of the current implementation

## Application Features

### Drink Categories
The application supports three drink categories, each with configurable target volumes:
- **Classic**: Standard cocktails
- **Highball**: Tall drinks with more mixer
- **Shot**: Small, concentrated drinks

Target volumes for each category are defined in the Admin Settings panel.

### Drink Modes

#### Strong Mode
- Increases alcohol content by 50% for each alcoholic ingredient
- Adds to total volume without changing the overall ingredient ratio
- Points are adjusted accordingly (1 point per 1ml of alcohol)

#### Tasting Mode
- Scales the entire drink to a smaller "tasting" size
- The tasting amount (ml) is configured in Admin Settings
- Points are scaled proportionally to the reduced volume

### Points System
- **Base Rule**: 1 point = 1ml of alcohol poured
- Points are automatically calculated based on actual alcohol volume
- Strong Mode increases points proportionally
- Tasting Mode decreases points proportionally

### Pump Configuration
- Pumps can be configured in the Admin Dashboard
- Each pump is assigned to a specific ingredient
- Admins can toggle pumps on/off
- Flow rate (ml/s) can be configured per pump

### Virtual Pumps
- Virtual pumps represent ingredients without physical dispensers
- They are included in duration and points calculations
- GPIO activation is skipped for virtual pumps
- Users receive a notification to manually add these ingredients after pouring

## Technical Notes

### Parallel Pouring
- The system pours from multiple pumps simultaneously (non-blocking)
- Total pour duration = maximum individual pump duration
- All pumps start at the same time

### Recipe Scaling
- Recipes are scaled based on the selected category's target volume
- Original recipe ratios are preserved during scaling
- Strong Mode and Tasting Mode apply additional scaling on top of category scaling

## API Endpoints (for reference)

- `/api/menu` - Get available drinks
- `/api/pour` - Initiate a pour operation
- `/api/user/rank` - Get current user's leaderboard ranking
- `/admin` - Admin login page
- `/admin/dashboard` - Main admin panel
- `/admin/settings` - Global application settings

## Database Schema Notes

### Key Models
- **User**: Stores user data, points, strong mode preference
- **Pump**: Physical pump configuration and ingredient assignment
- **Drink**: Recipe data including category, ingredients, and proportions
- **DrinkHistory**: Log of all poured drinks for analytics and leaderboard

## Testing & Verification

When testing the application:
1. Verify Strong Mode applies 50% increase to alcohol only
2. Check that Tasting Mode scales entire drink correctly
3. Ensure points calculation matches actual alcohol poured
4. Confirm parallel pouring calculations (max duration, not sum)
5. Test category-based volume scaling for all three categories
6. Verify virtual pump notifications appear correctly

## Common Issues & Solutions

### "Machine Busy" Button Stuck
- This can occur if the `is_pouring` state is not properly reset
- Check server logs for errors during pour operation
- Restart the Flask server if needed

### Points Not Calculating Correctly
- Verify pump flow rates are configured correctly in Admin Dashboard
- Check that alcohol pumps are properly marked in settings
- Ensure recipe ingredients are properly linked to configured pumps

## Running the Application

```bash
# Start the Flask server
python app.py
```

The application runs on `http://127.0.0.1:5000` by default.

---

**Last Updated**: 2026-01-19
