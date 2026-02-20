import Fetch from '@11ty/eleventy-fetch';
import ical from 'node-ical';
import calendars from './calendars.js';

function getVal(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : (value.val ?? '');
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
      for (const inst of expanded) {
        instances.push({
          calendar: calendarId,
          title: getVal(inst.summary),
          start: inst.start,
          end: inst.end,
          location: getVal(component.location),
          description: getVal(component.description),
          isFullDay: inst.isFullDay,
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
  return allInstances;
}
