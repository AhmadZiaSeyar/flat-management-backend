import { getWeekRange } from './date.utils';

describe('getWeekRange', () => {
  it('starts the shared week on Friday for midweek references', () => {
    const range = getWeekRange(new Date(2026, 3, 21, 12, 0, 0));

    expectDate(range.start, 2026, 4, 17, 0, 0, 0, 0);
    expectDate(range.end, 2026, 4, 23, 23, 59, 59, 999);
  });

  it('keeps Friday as the first day of the current week', () => {
    const range = getWeekRange(new Date(2026, 3, 24, 12, 0, 0));

    expectDate(range.start, 2026, 4, 24, 0, 0, 0, 0);
    expectDate(range.end, 2026, 4, 30, 23, 59, 59, 999);
  });

  it('keeps Thursday as the last day of the current week', () => {
    const range = getWeekRange(new Date(2026, 3, 23, 12, 0, 0));

    expectDate(range.start, 2026, 4, 17, 0, 0, 0, 0);
    expectDate(range.end, 2026, 4, 23, 23, 59, 59, 999);
  });
});

function expectDate(
  date: Date,
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
) {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month - 1);
  expect(date.getDate()).toBe(day);
  expect(date.getHours()).toBe(hours);
  expect(date.getMinutes()).toBe(minutes);
  expect(date.getSeconds()).toBe(seconds);
  expect(date.getMilliseconds()).toBe(milliseconds);
}
