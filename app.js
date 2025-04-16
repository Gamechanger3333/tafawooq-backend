const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const socketIO = require("socket.io");
const socketSetup = require("./utils/socketSetup");

/////// Routes ///////
const countriesRoutes = require('./routes/countriesRoutes');
const programsRoutes = require('./routes/programsRoutes');
const subjectRoutes = require("./routes/subjectsRoutes");
const programSubjectRoutes = require("./routes/progSubRoutes");
const courseRoutes = require("./routes/coursesRoutes");
const studentProgressRoutes = require("./routes/studProgRoutes");
const reviewRoutes = require("./routes/reviewsRoutes");
const userRoutes = require("./routes/usersRoutes");
const tutorPayoutRoutes = require("./routes/tutorPayRoutes");
const notificationRoutes = require("./routes/notifRoutes");
const supportRoutes = require("./routes/supportRoutes");
const bookingRoutes = require('./routes/bookingsRoutes');
const paymentRoutes = require('./routes/paymentsRoutes');
const sessionRoutes = require('./routes/sessionsRoutes');
const assessmentRoutes = require('./routes/assessRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const messageRoutes = require('./routes/messagesRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

console.log("Starting application...");

const app = express();
const server = http.createServer(app);

// Setup Socket.io
console.log("Setting up Socket.IO");
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000", "https://tafawoq-frontend-opal.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

console.log("Initializing socket handlers");
// Initialize socket handlers
socketSetup(io);

const corsOptions = {
    origin: ["http://localhost:3000", "https://tafawoq-frontend-opal.vercel.app"],
    methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
    allowedHeaders: "X-Requested-With, Content-Type, Authorization",
    credentials: true,
};

console.log("Setting up middleware");
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "")));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

console.log("Setting up routes");
// Routes
app.use('/countries', countriesRoutes);
app.use('/programs', programsRoutes);
app.use("/subjects", subjectRoutes);
app.use("/program-subjects", programSubjectRoutes);
app.use("/courses", courseRoutes);
app.use("/progress", studentProgressRoutes);
app.use("/reviews", reviewRoutes);
app.use("/users", userRoutes);
app.use("/payouts", tutorPayoutRoutes);
app.use("/notifications", notificationRoutes);
app.use("/support", supportRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);
app.use('/sessions', sessionRoutes);
app.use('/assessments', assessmentRoutes);
app.use("/stripe", stripeRoutes);
app.use("/messages", messageRoutes);
app.use('/assignments', assignmentRoutes);

app.all("*", (req, res) => {
    const message = `Can't find ${req.originalUrl} on this server!`;
    console.log(message);
    res.status(404).json({
        status: "fail",
        message: message,
    });
});

console.log("Application setup complete");
module.exports = { app, server, io };