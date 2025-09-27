# Vehicle Service Management System

A full-stack application for managing vehicle services with different user roles (Admin, Mechanic, Customer).

## Features

- User authentication with role-based access
- Service request management
- Vehicle management
- Real-time notifications
- Dashboard for each user role

## Tech Stack

- Backend:
  - Node.js
  - Express.js
  - MongoDB (with Mongoose)
  - JWT for authentication
  - bcryptjs for password hashing

- Frontend:
  - React (with Vite)
  - React Router for navigation
  - Tailwind CSS for styling
  - Axios for API calls
  - React-Toastify for notifications

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB installation)
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file based on .env.example and update the values:
   ```
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   FRONTEND_URL=http://localhost:5173
   ```

4. Seed the database with initial data:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Default Users

After running the seed script, you can login with these credentials:

1. Admin:
   - Email: admin@vsms.com
   - Password: admin123

2. Mechanic:
   - Email: mechanic@vsms.com
   - Password: mechanic123

3. Customer:
   - Email: customer@vsms.com
   - Password: customer123

## API Routes

### Authentication
- POST /api/auth/signup - Register new customer
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/me - Get current user

### Admin Routes
- GET /api/admin/users - Get all users
- POST /api/admin/users - Create new user
- GET /api/admin/statistics - Get system statistics
- POST /api/admin/assign-mechanic - Assign mechanic to service

### Mechanic Routes
- GET /api/mechanic/service-requests - Get assigned service requests
- PUT /api/mechanic/service-requests/:id - Update service request status
- GET /api/mechanic/statistics - Get mechanic's statistics

### Customer Routes
- GET /api/customer/vehicles - Get customer's vehicles
- POST /api/customer/vehicles - Add new vehicle
- GET /api/customer/service-requests - Get customer's service requests
- POST /api/customer/service-requests - Create new service request
- POST /api/customer/service-requests/:id/cancel - Cancel service request

### Notification Routes
- GET /api/notifications - Get user's notifications
- PUT /api/notifications/:id/read - Mark notification as read
- PUT /api/notifications/read-all - Mark all notifications as read
- DELETE /api/notifications/:id - Delete a notification