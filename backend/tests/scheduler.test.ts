import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const db = vi.hoisted(() => ({
  savedTimetable: { findMany: vi.fn() },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(function () { return db; }) }));
const axiosGet = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { get: axiosGet } }));
const sendNotification = vi.hoisted(() => vi.fn());
vi.mock('../src/services/firebase.services', () => ({ sendNotification }));

// The module schedules itself with setInterval on import; keep timers fake so
// it never fires on its own during the tests.
vi.useFakeTimers();
vi.setSystemTime(new Date(2026, 10, 9, 8, 15, 20)); // Mon 9 Nov 2026, 08:15:20 local
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

const { runScheduledTasks } = await import('../src/worker/scheduler');

afterAll(() => vi.useRealTimers());

function schedule(cron: string, extra: Record<string, unknown> = {}, token: string | null = 'fcm') {
  return {
    id: `s-${cron}`,
    user: { token },
    timetable: { cron, api: 'data.explore.star.fr', id: 'B5', mode: 'metro', ...extra },
  };
}

describe('runScheduledTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosGet.mockResolvedValue({ data: { data: { name: 'République', nextTrain: '08:19' } } });
  });

  it('only loads enabled timetables, with their user', async () => {
    db.savedTimetable.findMany.mockResolvedValue([]);
    await runScheduledTasks();
    expect(db.savedTimetable.findMany).toHaveBeenCalledWith({ where: { enabled: true }, include: { user: true } });
  });

  it('sends a notification when the cron matches the current minute', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('15 8 * * 1')]);

    await runScheduledTasks();

    expect(axiosGet).toHaveBeenCalledWith(expect.stringMatching(/\/api\/metro\/nextpassages\/B5$/));
    expect(sendNotification).toHaveBeenCalledWith('fcm', 'Scheduled task', 'Next Train at République: 08:19');
  });

  it('notifies every schedule that is due in the same minute', async () => {
    db.savedTimetable.findMany.mockResolvedValue([
      { ...schedule('15 8 * * 1'), id: 'a', user: { token: 'fcm-a' } },
      { ...schedule('15 8 * * 1'), id: 'b', user: { token: 'fcm-b' } },
      { ...schedule('15 8 * * 1'), id: 'c', user: { token: 'fcm-c' } },
    ]);

    await runScheduledTasks();

    expect(sendNotification.mock.calls.map((c) => c[0])).toEqual(['fcm-a', 'fcm-b', 'fcm-c']);
  });

  it('keeps notifying the others when one schedule fails', async () => {
    axiosGet
      .mockRejectedValueOnce(new Error('upstream down'))
      .mockResolvedValue({ data: { data: { name: 'Gares', nextTrain: '08:20' } } });
    db.savedTimetable.findMany.mockResolvedValue([
      { ...schedule('15 8 * * 1'), id: 'a', user: { token: 'fcm-a' } },
      { ...schedule('15 8 * * 1'), id: 'b', user: { token: 'fcm-b' } },
    ]);

    await runScheduledTasks();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0][0]).toBe('fcm-b');
  });

  it('uses the timetable message as the notification title when set', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('15 8 * * 1', { message: 'Leave now' })]);

    await runScheduledTasks();

    expect(sendNotification).toHaveBeenCalledWith('fcm', 'Leave now', expect.any(String));
  });

  it('does nothing when the cron is for another minute or day', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('16 8 * * 1'), schedule('15 8 * * 2')]);

    await runScheduledTasks();

    expect(axiosGet).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('skips users without a push token', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('15 8 * * 1', {}, null)]);

    await runScheduledTasks();

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('skips timetables for other APIs', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('15 8 * * 1', { api: 'other.api' })]);

    await runScheduledTasks();

    expect(axiosGet).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('logs an invalid cron and keeps going with the next schedule', async () => {
    db.savedTimetable.findMany.mockResolvedValue([schedule('not a cron'), schedule('15 8 * * 1')]);

    await runScheduledTasks();

    expect(console.error).toHaveBeenCalled();
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('does not notify when fetching the next passage fails', async () => {
    axiosGet.mockRejectedValue(new Error('upstream down'));
    db.savedTimetable.findMany.mockResolvedValue([schedule('15 8 * * 1')]);

    await expect(runScheduledTasks()).resolves.toBeUndefined();
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
