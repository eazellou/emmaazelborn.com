import Fetch from '@11ty/eleventy-fetch';
import ical from 'node-ical';
import calendars from './calendars.js';

function getVal(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : (value.val ?? '');
}

function getRecurrenceLabel(rrule) {
  if (rrule == null) return 'Recurring';
  const str = typeof rrule === 'string' ? rrule : (rrule.toString?.() ?? String(rrule));
  const match = str.match(/FREQ=([A-Z]+)/i);
  const freq = match ? match[1].toLowerCase() : '';
  const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
  return labels[freq] || 'Recurring';
}

function toRecurringInstance(component, inst, calendarId) {
  return {
    calendar: calendarId,
    title: getVal(inst.summary),
    start: inst.start,
    end: inst.end,
    location: getVal(component.location),
    description: getVal(component.description),
    isFullDay: inst.isFullDay,
    isRecurring: true,
    recurrenceLabel: getRecurrenceLabel(component.rrule),
  };
}

function toOneOffInstance(component, start, end, isFullDay, calendarId) {
  return {
    calendar: calendarId,
    title: getVal(component.summary),
    start,
    end,
    location: getVal(component.location),
    description: getVal(component.description),
    isFullDay: !!isFullDay,
    isRecurring: false,
  };
}

function parseCalendar(icsText, calendarId, from, oneYearLater) {
  const data = ical.sync.parseICS(icsText);
  const instances = [];

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== 'VEVENT') continue;

    const start = component.start ? new Date(component.start) : null;
    if (!start) continue;

    if (component.rrule) {
      const expanded = ical.expandRecurringEvent(component, { from, to: oneYearLater });
      const inst = expanded[0];
      if (inst) {
        instances.push(toRecurringInstance(component, inst, calendarId));
      }
    } else {
      if (start > oneYearLater) continue;
      if (component.end && new Date(component.end) < from) continue;
      if (start < from) continue;
      const end = component.end ? new Date(component.end) : start;
      const isFullDay =
        component.datetype === 'date' || (component.start && component.start.dateOnly);
      instances.push(toOneOffInstance(component, start, end, isFullDay, calendarId));
    }
  }

  return instances;
}

function getDateRange() {
  const now = new Date();
  const from = process.env.CALENDAR_FROM_DATE
    ? new Date(process.env.CALENDAR_FROM_DATE + 'T00:00:00.000Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const oneYearLater = new Date(from);
  oneYearLater.setUTCFullYear(oneYearLater.getUTCFullYear() + 1);
  return { from, oneYearLater };
}

function enrichRecurringWithCalendar(events) {
  return events.map((ev) => {
    const cal = calendars.find((c) => c.id === ev.calendar);
    const calendarUrl = cal?.webUrl || '#';
    return {
      ...ev,
      linkUrl: cal?.projectPath || calendarUrl,
      linkText: cal?.projectPath ? 'View project' : null,
      calendarUrl,
    };
  });
}

const sortByStart = (a, b) => new Date(a.start) - new Date(b.start);

export default async function () {
  const { from, oneYearLater } = getDateRange();
  const allInstances = [];
  const isProd = process.env.PROD === '1';

  for (const { id, url } of calendars) {
    try {
      const raw = await Fetch(url, { duration: isProd ? '1d' : '0s', type: 'text' });
      const icsText = typeof raw === 'string' ? raw : (raw?.toString?.('utf8') ?? String(raw));
      allInstances.push(...parseCalendar(icsText, id, from, oneYearLater));
    } catch (err) {
      console.warn(`Calendar fetch failed (${id}):`, err.message);
    }
  }

  allInstances.sort(sortByStart);

  const oneOff = allInstances.filter((e) => !e.isRecurring).sort(sortByStart);
  const recurring = enrichRecurringWithCalendar(
    allInstances.filter((e) => e.isRecurring).sort(sortByStart)
  );

  return { oneOff, recurring };
}
