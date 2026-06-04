# Tafawooq Backend — REST API

Node.js/Express backend for the Tafawooq online tutoring platform.

## 🚀 Live API
https://tafawooq-backend.vercel.app

## 🛠️ Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (Real-time chat)
- JWT Authentication
- Stripe (Payments)
- Cloudinary (File uploads)
- Gmail OAuth (Email/OTP)
- Jitsi Meet (Video calls)

## 📡 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /users/register | Register user |
| POST | /users/login | Login user |
| GET | /countries | Get all countries |
| GET | /courses | Get all courses |
| GET | /teachers | Get all teachers |
| POST | /sessions | Book a session |
| POST | /stripe/payment | Process payment |

## ⚙️ Setup Locally
- Clone the repo
- Run `npm install`
- Create `.env` file with required variables
- Run `npm run dev`
