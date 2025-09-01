import dotenv from "dotenv";
import express from "express";
import directionsRoutes from "./routes/directions.routes";
import linesRoutes from "./routes/lines.routes";
import nextPassagesRoutes from "./routes/nextpassages.routes";
import stopsRoutes from "./routes/stops.routes";
import timetablesRoutes from "./routes/timetables.routes";
import userRoutes from "./routes/users.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/timetables", timetablesRoutes);

// Default Route
app.use("/api/directions", directionsRoutes);
app.use("/api/stops", stopsRoutes);
app.use("/api/nextpassages", nextPassagesRoutes);
app.use("/api/lines", linesRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
