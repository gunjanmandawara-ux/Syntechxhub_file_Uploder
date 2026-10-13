require("dotenv").config();

const express = require("express");
const { connectDB } = require("./src/config/database.config");

const app = express();
const routes = require("./src/features/auth/routes/auth.routes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", routes);

const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err.message);
    });

app.listen(PORT, function () {
    console.log(`server is running on port ${PORT}`);
});
