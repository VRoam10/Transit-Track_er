import dotenv from "dotenv";
import express from "express";
import busRouter from "./routes/bus/mainRouter";
import metroRouter from "./routes/metro/mainRouter";
import timetablesRoutes from "./routes/timetables.routes";
import userRoutes from "./routes/users.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/timetables", timetablesRoutes);

app.use("/api/health", (req, res) => {
  res.status(200).send("OK");
});

// Metro Route
app.use("/api/metro", metroRouter);
// Bus Route
app.use("/api/bus", busRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
