const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

const { server } = require("../app.js");

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.error(err.name, err);
    process.exit(1);
});

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.DATABASE);
        console.log(
            `Database connection successful with '${connection.connection.name}'`
        );
    } catch (err) {
        console.error("DB connection error:", err);
        process.exit(1);
    }
};

const startServer = async () => {
    try {
        const PORT = process.env.PORT;
        const serverListener = server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}/`);
        });

        process.on("unhandledRejection", (err) => {
            console.error("UNHANDLED REJECTION! 💥 Shutting down...");
            console.log(err);
            console.error(err.name, err.message);
            serverListener.close(() => {
                process.exit(1);
            });
        });
    } catch (err) {
        console.error("Error starting the server:", err);
        process.exit(1);
    }
};

const initializeApp = async () => {
    await connectDB();
    await startServer();
};

initializeApp();
