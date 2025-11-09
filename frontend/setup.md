# Frontend Setup Instructions

## 1. Install Dependencies
```bash
cd frontend
npm install
```

## 2. Configure Environment

The `.env` file should already be created with:
```
VITE_API_URL=http://localhost:5000/api/v1
```

## 3. Start Development Server
```bash
npm run dev
```

The application will start at `http://localhost:5173`

## 4. Login

Use these demo credentials:
- **Admin**: admin@acme.com / Admin@123
- **Compliance Manager**: jane.smith@acme.com / Admin@123
- **IT Manager**: john.doe@acme.com / Admin@123

## Features

✅ **Glassmorphism UI** - Modern, professional design
✅ **Responsive** - Works on all devices
✅ **Dark Theme** - Beautiful gradient background
✅ **Smooth Animations** - Framer Motion animations
✅ **Real-time Data** - Connected to backend API
✅ **Role-based Access** - Different views for different roles
✅ **Toast Notifications** - User-friendly feedback

## Build for Production
```bash
npm run build
```

The build will be in the `/frontend/dist` directory.