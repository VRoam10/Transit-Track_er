import dotenv from "dotenv";
import express from "express";
import userRoutes from "./routes/users.routes";
import timetablesRoutes from "./routes/timetables.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/timetables", timetablesRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
