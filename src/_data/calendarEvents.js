import Fetch from '@11ty/eleventy-fetch';
import ical from 'node-ical';

// Calendars to fetch: id is used for filtering and CSS (event-item--{id})
const CALENDARS = [
  {
    id: 'violet-folk-sings',
    url: 'https://calendar.google.com/calendar/ical/2ee6f899173bf6d69fe65d129ec875d2fe2877771d621d81712603b6ac477c5e%40group.calendar.google.com/public/basic.ics',
  },
  {
    id: 'paper-plane',
    url: 'https://calendar.google.com/calendar/ical/5b06a18463f6f333ed3564e67000574cd27300424afbcbe6d38d0153ebb6de8c%40group.calendar.google.com/public/basic.ics',
  },
];

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

  for (const { id, url } of CALENDARS) {
    try {
      const icsText = await Fetch(url, {
        duration: '1d',
        type: 'text',
      });
      allInstances.push(...parseCalendar(icsText, id, from, oneYearLater));
    } catch (err) {
      console.warn(`Calendar fetch failed (${id}):`, err.message);
    }
  }

  allInstances.sort((a, b) => new Date(a.start) - new Date(b.start));
  return allInstances;
}
