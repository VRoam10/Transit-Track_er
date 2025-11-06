import axios from 'axios';
import { CronExpressionParser } from 'cron-parser';
import { sendNotification } from "../services/firebase.services";

const { PrismaClient } = require("@prisma/client");
const moment = require("moment");
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

async function runScheduledTasks() {
    const now = new Date();
    const nowMinute = moment(now).format("YYYY-MM-DD HH:mm");

    const schedules = await prisma.savedTimetable.findMany({
        where: { enabled: true },
        include: { user: true }, // in case you need user.token or info
    });

    for (const schedule of schedules) {
        const task = schedule.timetable;
        try {
            const interval = CronExpressionParser.parse(task.cron, { currentDate: new Date() });

            const prev = interval.prev();
            const prevMinute = moment(prev.toDate()).format("YYYY-MM-DD HH:mm");

            console.log(`${task.cron} => prev: ${prevMinute}, now: ${nowMinute}`);
            if (prevMinute === nowMinute && schedule.user.token) {
                console.log(`Triggering ${task.api.toUpperCase()} - ${task.id}`);

                if (task.api === "data.explore.star.fr") {
                    try {
                        const response = await axios.get(`http://localhost:${PORT}/api/${task.mode}/nextpassages/${task.id}`);
                        const passages = response.data.data;

                        await sendNotification(
                            schedule.user.token,
                            task.message || "Scheduled task",
                            `Next Train at ${passages.name}: ${passages.nextTrain}`
                        );
                        break;
                    } catch (err) {
                        throw new Error(`Error fetching next passages from external API: ${err}`);
                    }
                }
            }
        } catch (err: Error | any) {
            console.error(
                `Invalid cron "${task.cron}" in schedule ID ${schedule.id}:`,
                err.message
            );
        }
    }
}

setInterval(runScheduledTasks, 60 * 1000);
console.log("Dynamic task scheduler started...");
