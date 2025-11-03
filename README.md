# Millionaire Game App

A modern "Who Wants to Be a Millionaire" game application built with Next.js frontend and NestJS backend, featuring real-time multiplayer functionality and PWA capabilities.

## Features

- 🎮 **Multi-role Support**: Participants, Audience, and Game Master roles
- 🔄 **Real-time Communication**: WebSocket-based live updates
- 📱 **PWA Support**: Installable mobile app experience
- 🎨 **Modern UI**: Beautiful interface with orange, dark red, and teal blue theme
- 🔐 **Secure Authentication**: JWT-based authentication system
- 🏆 **Live Scoring**: Real-time score tracking and winner announcements
- 📊 **Game Management**: Complete game session control for game masters

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **ShadcnUI** - Modern component library
- **Zustand** - State management
- **Socket.io Client** - Real-time communication
- **PWA** - Progressive Web App capabilities

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type-safe development
- **Prisma** - Modern database ORM
- **PostgreSQL** - Production-ready database
- **JWT** - Authentication
- **Socket.io** - WebSocket server
- **Class Validator** - Input validation

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PostgreSQL** - Database container

## Project Structure

```
gameshow/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── game/           # Game logic and WebSocket
│   │   ├── user/           # User management
│   │   └── main.ts         # Application entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   ├── lib/          # Utilities and API
│   │   ├── store/        # Zustand stores
│   │   └── types/        # TypeScript types
│   ├── public/           # Static assets
│   └── package.json
├── bantefun.jpg          # App logo
├── favicon.jpg           # App favicon
└── README.md
```

## 🚀 Quick Deployment (NEW!)

**The app now works on ANY system!** Deploy in minutes:

```bash
./quick-deploy.sh
```

Choose your deployment type:
1. **Local Machine** - Test on your computer
2. **Local Network** - Access from any device on your WiFi (phones, tablets, etc.)
3. **Public Server** - Deploy to cloud (AWS, DigitalOcean, etc.)

**That's it!** The script will:
- ✅ Auto-detect your system
- ✅ Configure everything
- ✅ Build and start all services
- ✅ Validate the deployment

### Access from Mobile Devices 📱

Once deployed, access from **any device**:
- Same WiFi: `http://YOUR_LOCAL_IP:3000`
- Internet: `http://YOUR_PUBLIC_IP:3000`

Works on: Phones, tablets, laptops, desktops - any device with a browser!

📖 **Full Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- npm or yarn

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gameshow
   ```

2. **Quick Deploy (Easiest)**
   ```bash
   ./quick-deploy.sh
   ```

3. **Or Manual Start**
   ```bash
   # For development
   docker-compose -f docker-compose.dev.yml up --build

   # For production
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Local Development Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**
   
   Backend (`backend/env.example` → `backend/.env`):
   ```env
   DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/millionaire_game?schema=public
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

   Frontend (`frontend/env.example` → `frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_APP_NAME=Millionaire Game
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

3. **Start PostgreSQL database**
   ```bash
   # Using Docker
   docker run --name millionaire-postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=millionaire_game -p 5432:5432 -d postgres:15-alpine
   ```

4. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

### Docker Commands

- **Start development environment**: `docker-compose -f docker-compose.dev.yml up --build`
- **Start production environment**: `docker-compose up --build`
- **Stop all containers**: `docker-compose down`
- **View logs**: `docker-compose logs -f [service-name]`
- **Rebuild specific service**: `docker-compose up --build [service-name]`

## Usage

### User Roles

1. **Game Master**
   - Host and control the game
   - Start/end game sessions
   - Control question flow
   - View all participants and audience

2. **Participant**
   - Answer questions in real-time
   - See immediate feedback (green/red screen)
   - Track personal score
   - View winners

3. **Audience**
   - Watch the game live
   - See questions and answers
   - View participants and winners
   - No interaction with questions

### Game Flow

1. **Registration**: Users register with their preferred role
2. **Game Setup**: Game master starts a new game session
3. **Question Display**: Questions appear to all connected users
4. **Answer Submission**: Participants submit answers
5. **Real-time Feedback**: Immediate visual feedback for answers
6. **Winner Announcement**: Correct answers trigger winner modals
7. **Next Question**: Game master controls question progression

## PWA Installation

The app is fully PWA-enabled:

1. **Mobile**: Open in browser, tap "Add to Home Screen"
2. **Desktop**: Use browser's "Install App" option
3. **Offline**: Basic functionality works offline

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile

### Game
- `POST /game/start` - Start new game session
- `POST /game/sessions/:id/next-question` - Get next question
- `POST /game/submit-answer` - Submit answer
- `POST /game/sessions/:id/end` - End game session

### WebSocket Events
- `join_game` - Join game session
- `start_game` - Start game
- `next_question` - Get next question
- `submit_answer` - Submit answer
- `end_game` - End game
- `winner_announced` - Winner notification

## Security Features

- JWT-based authentication
- Input validation with class-validator
- CORS protection
- SQL injection prevention with TypeORM
- Password hashing with bcrypt

## Customization

### Theme Colors
The app uses a custom color scheme defined in `tailwind.config.js`:
- **Orange**: Primary brand color
- **Dark Red**: Secondary accent
- **Teal Blue**: Tertiary accent

### Adding Questions
Questions can be added through the API or directly in the database. Each question includes:
- Question text
- 4 answer options
- Correct answer index (0-3)
- Difficulty level (1-15)

## Deployment

### Backend Deployment
1. Set production environment variables
2. Build: `npm run build:backend`
3. Start: `npm run start:prod`

### Frontend Deployment
1. Set production API URL
2. Build: `npm run build:frontend`
3. Deploy to Vercel, Netlify, or similar

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
