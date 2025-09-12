import dotenv from "dotenv";
import express from "express";
import metroRouter from "./routes/metro/mainRouter";
import busRouter from "./routes/bus/mainRouter";
import timetablesRoutes from "./routes/timetables.routes";
import userRoutes from "./routes/users.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/timetables", timetablesRoutes);

// Metro Route
app.use("/api/metro", metroRouter);
app.use("/api/bus", busRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
