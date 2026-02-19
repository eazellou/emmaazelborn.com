import ical from 'node-ical';

const CALENDAR_ICAL_URL =
  'https://calendar.google.com/calendar/ical/2ee6f899173bf6d69fe65d129ec875d2fe2877771d621d81712603b6ac477c5e%40group.calendar.google.com/public/basic.ics';

function getVal(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : (value.val ?? '');
}

export default async function () {
  // Use start of today UTC so the list is stable. Optional: set CALENDAR_FROM_DATE=YYYY-MM-DD if your build date is wrong (e.g. CI).
  const now = new Date();
  let from;
  if (process.env.CALENDAR_FROM_DATE) {
    from = new Date(process.env.CALENDAR_FROM_DATE + 'T00:00:00.000Z');
  } else {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const sixMonthsLater = new Date(from);
  sixMonthsLater.setUTCMonth(sixMonthsLater.getUTCMonth() + 6);

  try {
    const data = await ical.async.fromURL(CALENDAR_ICAL_URL);
    const instances = [];

    for (const key of Object.keys(data)) {
      const component = data[key];
      if (!component || component.type !== 'VEVENT') continue;

      const start = component.start ? new Date(component.start) : null;
      if (!start) continue;

      if (component.rrule) {
        // Recurring: expand into range; don't skip based on base event's end date
        const expanded = ical.expandRecurringEvent(component, {
          from,
          to: sixMonthsLater,
        });
        for (const inst of expanded) {
          instances.push({
            title: getVal(inst.summary),
            start: inst.start,
            end: inst.end,
            location: getVal(component.location),
            description: getVal(component.description),
            isFullDay: inst.isFullDay,
          });
        }
      } else {
        // Non-recurring: must be in [from, sixMonthsLater]
        if (start > sixMonthsLater) continue;
        if (component.end && new Date(component.end) < from) continue;
        if (start < from) continue;
        const end = component.end ? new Date(component.end) : start;
        const isFullDay =
          component.datetype === 'date' ||
          (component.start && component.start.dateOnly);
        instances.push({
          title: getVal(component.summary),
          start,
          end,
          location: getVal(component.location),
          description: getVal(component.description),
          isFullDay: !!isFullDay,
        });
      }
    }

    instances.sort((a, b) => new Date(a.start) - new Date(b.start));
    return instances;
  } catch (err) {
    console.warn('Calendar fetch failed:', err.message);
    return [];
  }
}
