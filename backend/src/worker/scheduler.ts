import { CronExpressionParser } from 'cron-parser';
import { sendNotification } from "../services/firebase.services";

const { PrismaClient } = require("@prisma/client");
const moment = require("moment");
const prisma = new PrismaClient();

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
            if (prevMinute === nowMinute) {
                console.log(`Triggering ${task.api.toUpperCase()} - ${task.id}`);

                if (schedule.user.token) {
                    await sendNotification(
                        schedule.user.token,
                        task.message || "Scheduled task",
                        `It's time for your scheduled task: ${task.api} - ${task.id}`
                    );
                }
            }
        } catch (err: Error | any) {
            console.error(
                `❌ Invalid cron "${task.cron}" in schedule ID ${schedule.id}:`,
                err.message
            );
        }
    }
}

setInterval(runScheduledTasks, 60 * 1000);
console.log("Dynamic task scheduler started...");
