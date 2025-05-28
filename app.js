require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
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
const { initializeSocketServer } = require("./sockets/socketServer");

console.log("Starting application...");

const app = express();
const server = http.createServer(app);

// Initialize socket server
const io = initializeSocketServer(server);

const corsOptions = {
    origin: ["http://localhost:3000", "https://tafawoq-frontend-opal.vercel.app"],
    methods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
    allowedHeaders: "X-Requested-With, Content-Type, Authorization",
    exposedHeaders: ['Content-Disposition'],
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
app.use("/users", userRoutes);
app.use("/password", forgotPasswordRoutes);
app.use("/stripe", stripeRoutes);
app.use('/assignments', assignmentRoutes);
app.use("/meetings", meetingRoutes);

app.all("*", (req, res) => {
    const message = `Can't find ${req.originalUrl} on this server!`;
    console.log(message);
    res.status(404).json({
        status: "fail",
        message: message,
    });
});

console.log("Application setup complete");
module.exports = { app, server,io  };
