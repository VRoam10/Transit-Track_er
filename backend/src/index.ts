import dotenv from "dotenv";
import express from "express";
import busRouter from "./routes/bus/mainRouter";
import { sendNotification } from "./routes/firebase.routes";
import metroRouter from "./routes/metro/mainRouter";
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

app.get("/test", (_req, res) => {
  sendNotification(
    "fcm_token_here",
    "Test Notification",
    "This is a test notification from Transit Track'er"
  );
  res.send("Notification sent");
});

app.post("/register-token", (req, res) => {
  const token = req.body.token;
  console.log("Received FCM token:", token);
  res.status(200).send("Token registered");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
