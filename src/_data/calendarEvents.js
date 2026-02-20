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

function parseCalendar(icsText, calendarId, from, oneYearLater) {
  const data = ical.sync.parseICS(icsText);
  const instances = [];

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== 'VEVENT') continue;

    const start = component.start ? new Date(component.start) : null;
    if (!start) continue;

    if (component.rrule) {
      const expanded = ical.expandRecurringEvent(component, {
        from,
        to: oneYearLater,
      });
      // Only show next 3 occurrences so the list doesn’t become a long scroll of the same event
      const inst = expanded[0];
      if (inst) {
        instances.push({
          calendar: calendarId,
          title: getVal(inst.summary),
          start: inst.start,
          end: inst.end,
          location: getVal(component.location),
          description: getVal(component.description),
          isFullDay: inst.isFullDay,
          isRecurring: true,
          recurrenceLabel: getRecurrenceLabel(component.rrule),
        });
      }
    } else {
      if (start > oneYearLater) continue;
      if (component.end && new Date(component.end) < from) continue;
      if (start < from) continue;
      const end = component.end ? new Date(component.end) : start;
      const isFullDay =
        component.datetype === 'date' ||
        (component.start && component.start.dateOnly);
      instances.push({
        calendar: calendarId,
        title: getVal(component.summary),
        start,
        end,
        location: getVal(component.location),
        description: getVal(component.description),
        isFullDay: !!isFullDay,
        isRecurring: false,
      });
    }
  }

  return instances;
}

export default async function () {
  const now = new Date();
  let from;
  if (process.env.CALENDAR_FROM_DATE) {
    from = new Date(process.env.CALENDAR_FROM_DATE + 'T00:00:00.000Z');
  } else {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const oneYearLater = new Date(from);
  oneYearLater.setUTCFullYear(oneYearLater.getUTCFullYear() + 1);

  const allInstances = [];

  const isProd = process.env.PROD === '1';
  for (const { id, url } of calendars) {
    try {
      const raw = await Fetch(url, {
        duration: isProd ? '1d' : '0s',
        type: 'text',
      });
      // Cache may return a Buffer; node-ical expects a string
      const icsText = typeof raw === 'string' ? raw : (raw?.toString?.('utf8') ?? String(raw));
      allInstances.push(...parseCalendar(icsText, id, from, oneYearLater));
    } catch (err) {
      console.warn(`Calendar fetch failed (${id}):`, err.message);
    }
  }

  allInstances.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Show recurring: at least 3 per series, or all that fall within the list’s date range (so we don’t imply they stop before other events)
  const oneOff = allInstances.filter((e) => !e.isRecurring).sort((a, b) => new Date(a.start) - new Date(b.start));
  const recurring = allInstances
    .filter((e) => e.isRecurring)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map((ev) => {
      const cal = calendars.find((c) => c.id === ev.calendar);
      const calendarUrl = cal?.webUrl || '#';
      return {
        ...ev,
        linkUrl: cal?.projectPath || calendarUrl,
        linkText: cal?.projectPath ? 'View project' : null,
        calendarUrl,
      };
    });

  return { oneOff, recurring };
}
