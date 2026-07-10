require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

/////// Routes ///////
const countriesRoutes = require('./routes/countriesRoutes');
const programsRoutes = require('./routes/programsRoutes');
const subjectRoutes = require("./routes/subjectsRoutes");
const programSubjectRoutes = require("./routes/progSubRoutes");
const courseRoutes = require("./routes/coursesRoutes");
const userRoutes = require("./routes/usersRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const stripeRoutes = require('./routes/stripeRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const sessionRoutes = require("./routes/sessionRoutes.js");
const teacherProfileRoutes = require("./routes/teacherProfileRoutes.js");
const assistantRoutes = require("./routes/assistantRoutes.js");
const statsRoutes = require("./routes/statsRoutes.js");
const { initializeSocketServer } = require("./sockets/socketServer");

console.log("Starting application...");

const app = express();
const server = http.createServer(app);

// Initialize socket server
const io = initializeSocketServer(server);

const corsOptions = {
    origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://tafawoq-frontend-opal.vercel.app",
        "http://35.181.5.235",
        "https://tafawouk.com",
        "https://www.tafawouk.com",
        "https://api.tafawouk.com"
    ],
    methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
    allowedHeaders: "X-Requested-With, Content-Type, Authorization",
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
};

console.log("Setting up middleware");
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());

// NOTE: We intentionally do NOT statically serve the project root here.
// `tmp/` is only a transient local buffer before files are pushed to
// Cloudinary (see utils/Cloudinary.js) and controllers/models/config must
// never be reachable over HTTP. Publicly hosted files are served from
// Cloudinary's own URLs, not from this server.

// CHANGED: Increased limit from "10kb" to "5mb" for bulk operations
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

console.log("Setting up routes");
// Routes
app.use('/countries', countriesRoutes);
app.use('/programs', programsRoutes);
app.use("/subjects", subjectRoutes);
app.use("/program-subjects", programSubjectRoutes);
app.use("/courses", courseRoutes);
app.use("/users", userRoutes);
app.use("/password", forgotPasswordRoutes);
app.use("/stripe", stripeRoutes);
app.use('/assignments', assignmentRoutes);
app.use("/meetings", meetingRoutes);
app.use("/sessions", sessionRoutes);
app.use("/teachers", teacherProfileRoutes);
app.use("/assistant", assistantRoutes);
app.use("/stats", statsRoutes);

app.all("*", (req, res) => {
    const message = `Can't find ${req.originalUrl} on this server!`;
    console.log(message);
    res.status(404).json({
        status: "fail",
        message: message,
    });
});

// Global error handler — catches anything passed to next(err) or thrown in
// a synchronous route handler, so a bug in one controller returns a clean
// JSON error instead of crashing the request (or, in older Express, the
// whole process on an unhandled rejection).
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        status: "error",
        message: statusCode === 500 ? "Internal server error." : err.message
    });
});

console.log("Application setup complete");

module.exports = { app, server, io };
