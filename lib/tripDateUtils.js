// lib/tripDateUtils.js

/**
 * Formats start and end dates in a clean, human-friendly travel format:
 * - Single-day: "12 OCTOBER 2026"
 * - Multi-day same month: "12 — 15 OCTOBER 2026"
 * - Cross-month same year: "28 OCTOBER — 2 NOVEMBER 2026"
 * - Cross-year: "30 DECEMBER 2026 — 2 JANUARY 2027"
 */
export function formatTripDates(startDate, endDate) {
  if (!startDate) return null;

  try {
    const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
    if (!sYear || !sMonth || !sDay) return null;

    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];

    if (!endDate || startDate === endDate) {
      return `${sDay} ${monthNames[sMonth - 1]} ${sYear}`;
    }

    const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
    if (!eYear || !eMonth || !eDay) {
      return `${sDay} ${monthNames[sMonth - 1]} ${sYear}`;
    }

    // Same month and year
    if (sYear === eYear && sMonth === eMonth) {
      return `${sDay} — ${eDay} ${monthNames[sMonth - 1]} ${sYear}`;
    }

    // Same year, cross-month
    if (sYear === eYear) {
      return `${sDay} ${monthNames[sMonth - 1]} — ${eDay} ${monthNames[eMonth - 1]} ${sYear}`;
    }

    // Cross-year
    return `${sDay} ${monthNames[sMonth - 1]} ${sYear} — ${eDay} ${monthNames[eMonth - 1]} ${eYear}`;
  } catch (err) {
    return null;
  }
}

/**
 * Formats registration deadline e.g. "25 SEPTEMBER 2026"
 */
export function formatRegistrationDeadline(deadline) {
  if (!deadline) return null;

  try {
    const [year, month, day] = deadline.split("-").map(Number);
    if (!year || !month || !day) return null;

    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];

    return `${day} ${monthNames[month - 1]} ${year}`;
  } catch (err) {
    return null;
  }
}
