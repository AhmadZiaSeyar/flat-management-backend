export function getDayRange(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getWeekRange(referenceDate: Date) {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getMonthRange(referenceDate: Date) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getYearMonth(referenceDate: Date) {
  return {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
  };
}
