# AI Cocktail Mixer - REST API Documentation

## Base URL
```
# Development (local)
http://localhost:5000

# Production (via Cloudflare Tunnel)
https://your-tunnel.trycloudflare.com
```

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "nickname": "JohnDoe"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Welcome, JohnDoe!",
  "token": "eyJhbG...",
  "user": {
    "id": 1,
    "nickname": "JohnDoe",
    "points": 0,
    "recovery_key": "ABC123"
  }
}
```

---

### POST /api/auth/login
Login with existing nickname or admin credentials.

**Request (Regular User):**
```json
{
  "nickname": "JohnDoe"
}
```

**Request (Admin):**
```json
{
  "nickname": "Admin2001",
  "password": "COCKTAIL2026"
}
```

---

### POST /api/auth/recovery
Recover account using recovery key.

**Request:**
```json
{
  "recovery_key": "ABC123"
}
```

---

### GET /api/auth/me
Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "status": "success",
  "user": {
    "id": 1,
    "nickname": "JohnDoe",
    "points": 150
  }
}
```

---

## Recipe Endpoints

### GET /api/recipes
Get all recipes grouped by category.

**Response:**
```json
{
  "status": "success",
  "recipes": {
    "classic": [...],
    "highball": [...],
    "shot": [...]
  }
}
```

### GET /api/recipes/:id
Get a single recipe by ID.

---

## Pump Endpoints

### GET /api/pumps
Get all pump configurations and machine state.

**Response:**
```json
{
  "status": "success",
  "pumps": {
    "1": {
      "id": 1,
      "pin_number": 17,
      "ingredient_name": "Vodka",
      "is_alcohol": true,
      "seconds_per_50ml": 3.0
    }
  },
  "machine_state": {
    "is_pouring": false,
    "classic_target_vol": 110
  }
}
```

---

## Pour Endpoint

### POST /api/pour/:recipe_id
Pour a cocktail (requires authentication).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "is_strong": false,
  "is_taste": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Cheers! 45 points earned.",
  "points_earned": 45,
  "new_total_points": 195,
  "total_duration": 5.2,
  "is_highball": false
}
```

---

## Status Endpoint

### GET /api/status
Get machine status.

**Response:**
```json
{
  "status": "success",
  "machine": {
    "is_pouring": false
  }
}
```

---

## Leaderboard Endpoints

### GET /api/leaderboard
Get top 10 users.

### GET /api/user/:id/statistics
Get user statistics.

### GET /api/statistics/global
Get global platform statistics.

---

## Admin Endpoints

All admin endpoints require admin JWT token.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/pumps` | GET | Get all pumps |
| `/api/admin/pumps/:id` | PUT | Update pump |
| `/api/admin/recipes` | GET | Get all recipes |
| `/api/admin/recipes` | POST | Create recipe |
| `/api/admin/recipes/:id` | PUT | Update recipe |
| `/api/admin/recipes/:id` | DELETE | Delete recipe |
| `/api/admin/users` | GET | Get all users |
| `/api/admin/users/:id` | DELETE | Delete user |
| `/api/admin/machine-state` | GET | Get machine state |
| `/api/admin/machine-state` | PUT | Update machine state |

---

## Error Responses

All errors follow this format:
```json
{
  "status": "error",
  "message": "Description of the error"
}
```

Common HTTP status codes:
- `400` - Bad request / validation error
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (admin access required)
- `404` - Resource not found
- `500` - Internal server error
