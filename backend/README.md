# User Access Review - Backend API

Production-ready Node.js + Express backend with PostgreSQL integration for User Access Review application.

## Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Complete CRUD operations for all entities
- ✅ Campaign management and lifecycle
- ✅ Review workflow with approval/rejection
- ✅ SOD rule engine and violation tracking
- ✅ Comprehensive reporting and analytics
- ✅ Audit logging for compliance
- ✅ Rate limiting and security middleware
- ✅ Input validation and sanitization
- ✅ Error handling and logging
- ✅ Database connection pooling
- ✅ Transaction support

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** express-validator, Joi
- **Security:** helmet, bcrypt, cors
- **Logging:** Winston, Morgan
- **Rate Limiting:** express-rate-limit

## Project Structure
```
/backend
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   └── app.js           # Express app setup
├── logs/                # Application logs
├── .env                 # Environment variables
├── package.json
└── server.js            # Server entry point
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the `/backend` directory:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uar_app
DB_USER=postgres
DB_PASSWORD=Admin@123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=24h

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Ensure Database is Setup

Make sure you've run the database setup scripts from `/database`:
```bash
cd ../database
./setup-windows.bat  # or setup.sh on Linux/Mac
```

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
```
POST   /api/v1/auth/login          - Login user
GET    /api/v1/auth/me             - Get current user
POST   /api/v1/auth/logout         - Logout user
POST   /api/v1/auth/refresh        - Refresh token
```

### Users
```
GET    /api/v1/users               - Get all users
GET    /api/v1/users/:id           - Get user by ID
POST   /api/v1/users               - Create user
PUT    /api/v1/users/:id           - Update user
DELETE /api/v1/users/:id           - Delete user
GET    /api/v1/users/:id/access    - Get user's access
```

### Applications
```
GET    /api/v1/applications        - Get all applications
GET    /api/v1/applications/:id    - Get application by ID
POST   /api/v1/applications        - Create application
PUT    /api/v1/applications/:id    - Update application
GET    /api/v1/applications/:id/roles   - Get application roles
GET    /api/v1/applications/:id/users   - Get application users
```

### Campaigns
```
GET    /api/v1/campaigns           - Get all campaigns
GET    /api/v1/campaigns/:id       - Get campaign by ID
POST   /api/v1/campaigns           - Create campaign
PUT    /api/v1/campaigns/:id       - Update campaign
POST   /api/v1/campaigns/:id/launch     - Launch campaign
GET    /api/v1/campaigns/:id/reviewers  - Get campaign reviewers
GET    /api/v1/campaigns/:id/stats      - Get campaign statistics
DELETE /api/v1/campaigns/:id       - Delete campaign
```

### Reviews
```
GET    /api/v1/reviews/pending     - Get pending reviews
GET    /api/v1/reviews/stats       - Get reviewer statistics
GET    /api/v1/reviews/:id         - Get review item
POST   /api/v1/reviews/:id/decision     - Submit review decision
POST   /api/v1/reviews/bulk-approve     - Bulk approve reviews
POST   /api/v1/reviews/:id/comments     - Add comment
```

### Dashboard
```
GET    /api/v1/dashboard/stats              - Dashboard statistics
GET    /api/v1/dashboard/activity           - Recent activity
GET    /api/v1/dashboard/campaign-progress  - Campaign progress
GET    /api/v1/dashboard/compliance         - Compliance overview
GET    /api/v1/dashboard/trends             - Access trends
GET    /api/v1/dashboard/high-risk-users    - High-risk users
GET    /api/v1/dashboard/application-usage  - Application usage
GET    /api/v1/dashboard/my-reviews         - My review summary
```

### Reports
```
GET    /api/v1/reports/campaign/:id         - Campaign report
GET    /api/v1/reports/sod-violations       - SOD violations report
GET    /api/v1/reports/dormant-accounts     - Dormant accounts report
GET    /api/v1/reports/recertification-summary  - Recertification summary
GET    /api/v1/reports/user-access/:userId  - User access report
GET    /api/v1/reports/audit-logs           - Audit log report
POST   /api/v1/reports/export               - Export report
```

### SOD (Separation of Duties)
```
GET    /api/v1/sod/rules           - Get all SOD rules
GET    /api/v1/sod/rules/:id       - Get SOD rule by ID
POST   /api/v1/sod/rules           - Create SOD rule
PUT    /api/v1/sod/rules/:id       - Update SOD rule
DELETE /api/v1/sod/rules/:id       - Delete SOD rule
GET    /api/v1/sod/violations      - Get SOD violations
POST   /api/v1/sod/violations/:id/resolve  - Resolve violation
POST   /api/v1/sod/detect/:userId  - Detect user violations
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```bash
Authorization: Bearer <your-jwt-token>
```

### Login Example
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "admin@acme.com",
      "role": "admin",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

## Testing the API

### Using cURL
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin@123"}'

# Get dashboard stats (with token)
curl -X GET http://localhost:5000/api/v1/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get pending reviews
curl -X GET http://localhost:5000/api/v1/reviews/pending \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the API collection (if provided)
2. Set environment variables for base URL and token
3. Test endpoints with sample data

## Error Handling

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## Logging

Logs are written to:
- `logs/app.log` - All logs
- `logs/error.log` - Error logs only
- Console (development only)

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection

## Performance

- Connection pooling (20 max connections)
- Database query optimization
- Indexed database queries
- Response caching (where applicable)

## Troubleshooting

### Database connection errors
```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d uar_app -c "SELECT 1"
```

### Port already in use
```bash
# Change PORT in .env file
PORT=5001
```

### Module not found errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong JWT secrets
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up process manager (PM2)
6. Configure reverse proxy (Nginx)
7. Enable database SSL connections
8. Set up monitoring and alerting

### PM2 Example
```bash
npm install -g pm2
pm2 start server.js --name uar-api
pm2 save
pm2 startup
```

## License

MIT

## Support

For issues or questions, please refer to the main project documentation.