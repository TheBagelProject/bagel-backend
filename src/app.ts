import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./config/dbConnection";

import { setupSwagger } from "./config/swagger";

const PORT = process.env.PORT || 5000;

// Routes
import userRoutes from "./routes/userRoutes";
import githubPatRoutes from "./routes/githubPatRoutes";
// import dockerRoutes from "./routes/dockerRoutes";
import projectRoutes from "./routes/projectRoutes"
import tofuRoutes from "./routes/tofuRoutes"
import deploymentRoutes from "./routes/deploymentRoutes"

const MONGO_URI = process.env.MONGO_URI;
const COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET || "dev-secret";

// Initialize express
const app = express();
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(
  cors({
    origin: "http://localhost:3000", // Next.js frontend
    credentials: true,
  })
);

// Root route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Setup Swagger after app is initialized
setupSwagger(app);

// Register routes
app.use("/api/users", userRoutes);
app.use("/api/github-pat", githubPatRoutes);
// app.use("/api/docker", dockerRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/tofu", tofuRoutes);
app.use("/api/deployment", deploymentRoutes); 

// Connect to MongoDB and start server
const startServer = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
  }

  await connectDB(MONGO_URI);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

export default app;
