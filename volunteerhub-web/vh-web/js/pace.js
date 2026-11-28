"use strict";

// Shared by the browser and the daily Firebase job. UTC day numbers make term
// progress independent of the length of a daylight-saving transition day.
const HourPace = (() => {
  const timeZone = "America/Chicago";
  const calendar = new Intl.DateTimeFormat("en-CA", {timeZone, year:"numeric", month:"2-digit", day:"2-digit"});
  const today = (now = new Date()) => calendar.format(now);
  const day = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const ms = Date.parse(value + "T00:00:00Z");
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms / 86400000 : NaN;
  };
  const format = value => Number(value.toFixed(2)).toString();
  const defaultGap = hours => Math.min(2, hours || 2);
  function progress(req, earned, date = today()){
    const start = day(req?.start), end = day(req?.end), current = day(date);
    const target = req?.hours, threshold = req?.alertGap ?? defaultGap(target);
    if (!(target > 0 && end > start && Number.isFinite(current) && Number.isFinite(earned) &&
          threshold > 0 && threshold <= target)) return {status:"No requirement", behind:false};
    const fraction = Math.max(0, Math.min(1, (current - start) / (end - start)));
    const expected = target * fraction, gap = Math.max(0, expected - earned);
    const behind = current >= start && current <= end && gap + 1e-9 >= threshold;
    const status = earned >= target ? "Complete" : current < start ? "Term upcoming" :
      current > end ? "Term ended" : behind ? "Behind pace" : "On track";
    return {status, behind, expected, gap, threshold};
  }

  // Return only club events actually attended and approved outside service in
  // this term. Index once so a full club can be checked without rescanning records per member.
  function totals(club, events, regs, logs, date = today()){
    const req = club.req, results = new Map();
    const inRange = d => d <= date && (!req?.start || (d >= req.start && d <= req.end));
    const eventIds = new Set(events.filter(e => e.clubId === club.id && inRange(e.date)).map(e => e.id));
    function add(uid, field, hours){
      if (!Number.isFinite(hours) || hours <= 0) return;
      const entry = results.get(uid) || {eventHours:0, approved:0, pending:0};
      entry[field] += hours;
      results.set(uid, entry);
    }
    for (const r of regs) if (r.status === "attended" && eventIds.has(r.eventId)) add(r.userId, "eventHours", r.hours);
    for (const l of logs) if (l.clubId === club.id && inRange(l.date) && ["approved","pending"].includes(l.status)) add(l.userId, l.status, l.hours);
    return results;
  }

  function message(club, name, earned, pace, site){
    const base = site.split("#")[0];
    const paths = /^https?:\/\//.test(base) ? "Volunteer hours: " + base + "#clubs\nAdviser view: " + base + "#manage" :
      "In VolunteerHub, open My clubs as a volunteer or People & clubs as an adviser.";
    const deadline = new Intl.DateTimeFormat("en-US", {dateStyle:"long", timeZone:"UTC"}).format(new Date(club.req.end + "T00:00:00Z"));
    return {
      subject: "Service hours check-in · " + club.short,
      body: [
        "Hi " + name + ",",
        "For " + club.name + " (" + club.req.label + "), you have " + format(earned) +
          " approved hours. The expected total today is " + format(pace.expected) +
          " hours, putting you " + format(pace.gap) + " hours behind pace.",
        "Your goal is " + format(club.req.hours) + " hours by " + deadline +
          ". Review your hours, log any completed outside service, or find your next shift.",
        paths,
        "Your club adviser receives this check-in too."
      ].join("\n\n")
    };
  }
  return {timeZone, today, day, format, defaultGap, progress, totals, message};
})();
if (typeof module !== "undefined" && module.exports) module.exports = HourPace;
