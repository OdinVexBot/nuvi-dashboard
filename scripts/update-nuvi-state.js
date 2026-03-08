#!/usr/bin/env node

// update-nuvi-state.js
// Build state.json for the Nuvi kitchen dashboard:
// - Live weather from Open-Meteo (4-day forecast)
// - Calendar events from Family GROUP calendar
// - Countdowns from config rules
//
// Zero external dependencies — uses Node 22 built-in fetch + https.

const fs = require('fs');
const https = require('https');

const CONFIG_PATH = '/home/apps/nuvi-dashboard/countdowns-config.json';
const FAMILY_GROUP_ID = '1fb524c2-acd9-4251-b676-9530a4687aca';

// Bellevue, WA
const WEATHER_LAT = 47.6101;
const WEATHER_LON = -122.2015;
const WEATHER_TIMEZONE = 'America/Los_Angeles';

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { rules: [] };
  }
}

async function getAccessToken() {
  const clientId = process.env.FLUX_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.FLUX_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const tenantId = process.env.FLUX_TENANT_ID || process.env.TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing one of (FLUX_)CLIENT_ID / CLIENT_SECRET / TENANT_ID env vars');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'login.microsoftonline.com',
      path: '/' + encodeURIComponent(tenantId) + '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          if (!parsed.access_token) {
            reject(new Error('Token response missing access_token'));
          } else {
            resolve(parsed.access_token);
          }
        } else {
          reject(new Error('Token fetch failed: ' + res.statusCode + ' ' + data.slice(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + WEATHER_LAT + '&longitude=' + WEATHER_LON + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,weather_code,uv_index,is_day,relative_humidity_2m,apparent_temperature,wind_speed_10m&temperature_unit=fahrenheit&timezone=' + WEATHER_TIMEZONE + '&forecast_days=4';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed: ' + res.status);
    const data = await res.json();

    function getIconName(code) {
      if (code === 0) return 'sunny';
      if (code === 1) return 'sunny';
      if (code === 2) return 'partly-cloudy';
      if (code === 3) return 'overcast';
      if (code >= 45 && code <= 48) return 'fog';
      if (code >= 51 && code <= 55) return 'drizzle';
      if (code >= 56 && code <= 57) return 'drizzle';
      if (code >= 61 && code <= 67) return 'rain';
      if (code >= 71 && code <= 77) return 'snow';
      if (code >= 80 && code <= 82) return 'rain';
      if (code >= 85 && code <= 86) return 'snow';
      if (code >= 95 && code <= 99) return 'thunderstorm';
      return 'cloudy';
    }

    function getIconNameNight(code) {
      if (code === 0 || code === 1) return 'clear-night';
      if (code === 2) return 'partly-cloudy-night';
      return getIconName(code);
    }

    function getDescription(code) {
      if (code === 0) return 'Clear sky';
      if (code === 1) return 'Mainly clear';
      if (code === 2) return 'Partly cloudy';
      if (code === 3) return 'Overcast';
      if (code >= 45 && code <= 48) return 'Fog';
      if (code >= 51 && code <= 55) return 'Drizzle';
      if (code >= 56 && code <= 57) return 'Freezing drizzle';
      if (code >= 61 && code <= 65) return 'Rain';
      if (code === 66 || code === 67) return 'Freezing rain';
      if (code >= 71 && code <= 75) return 'Snow';
      if (code === 77) return 'Snow grains';
      if (code >= 80 && code <= 82) return 'Rain showers';
      if (code >= 85 && code <= 86) return 'Snow showers';
      if (code === 95) return 'Thunderstorm';
      if (code >= 96 && code <= 99) return 'Thunderstorm';
      return 'Unknown';
    }

    const daily = data.daily;
    const days = [];
    const dayLabels = ['Today', 'Tomorrow'];

    for (let i = 0; i < 4; i++) {
      const date = new Date(daily.time[i] + 'T12:00:00');
      let label = dayLabels[i];
      if (!label) {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      const code = daily.weather_code[i];
      days.push({
        label,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        icon: getIconName(code),
        desc: getDescription(code)
      });
    }

    const cur = data.current || {};
    const curCode = cur.weather_code ?? null;
    const isDay = cur.is_day ?? 1;

    function getMoonPhase(dateStr) {
      const d = new Date(dateStr + 'T12:00:00');
      const lp = 2551443;
      const ref = new Date(2000, 0, 6, 18, 14, 0).getTime() / 1000;
      const now = d.getTime() / 1000;
      const phase = ((now - ref) % lp) / lp;
      if (phase < 0.0625) return { name: 'New Moon', icon: 'moon-new' };
      if (phase < 0.1875) return { name: 'Waxing Crescent', icon: 'moon-waxing-crescent' };
      if (phase < 0.3125) return { name: 'First Quarter', icon: 'moon-first-quarter' };
      if (phase < 0.4375) return { name: 'Waxing Gibbous', icon: 'moon-waxing-gibbous' };
      if (phase < 0.5625) return { name: 'Full Moon', icon: 'moon-full' };
      if (phase < 0.6875) return { name: 'Waning Gibbous', icon: 'moon-waning-gibbous' };
      if (phase < 0.8125) return { name: 'Last Quarter', icon: 'moon-last-quarter' };
      if (phase < 0.9375) return { name: 'Waning Crescent', icon: 'moon-waning-crescent' };
      return { name: 'New Moon', icon: 'moon-new' };
    }

    function formatTime(iso) {
      if (!iso) return null;
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: WEATHER_TIMEZONE });
    }

    const todayDate = daily.time[0];
    const moon = getMoonPhase(todayDate);

    const current = {
      temp: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
      feelsLike: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
      humidity: cur.relative_humidity_2m ?? null,
      windMph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m * 0.621371) : null,
      icon: curCode != null
        ? (isDay ? getIconName(curCode) : getIconNameNight(curCode))
        : null,
      desc: curCode != null ? getDescription(curCode) : null,
      uvIndex: cur.uv_index != null ? Math.round(cur.uv_index) : null,
      uvMax: daily.uv_index_max ? Math.round(daily.uv_index_max[0] * 10) / 10 : null,
      isDay: !!isDay,
      sunrise: formatTime(daily.sunrise ? daily.sunrise[0] : null),
      sunset: formatTime(daily.sunset ? daily.sunset[0] : null),
      precipChance: daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null,
      windMaxMph: daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[0] * 0.621371) : null,
      moon: moon,
    };

    return { days, current };
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    return null;
  }
}

async function fetchEvents(start, end) {
  const accessToken = await getAccessToken();

  const url = new URL('https://graph.microsoft.com/v1.0/groups/' + FAMILY_GROUP_ID + '/calendarView');
  url.searchParams.set('startDateTime', start.toISOString());
  url.searchParams.set('endDateTime', end.toISOString());
  url.searchParams.set('$top', '200');
  url.searchParams.set('$orderby', 'start/dateTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer ' + accessToken },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Events listing failed ' + res.status + ': ' + text);
  }

  const data = await res.json();
  return data.value || [];
}

function isSameDay(d, target) {
  return d.getFullYear() === target.getFullYear() &&
         d.getMonth() === target.getMonth() &&
         d.getDate() === target.getDate();
}

function toLocalDate(dateTime, timeZone, isAllDay) {
  if (isAllDay) {
    const datePart = dateTime.split('T')[0];
    const parts = datePart.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  if (timeZone === 'UTC') {
    return new Date(dateTime + 'Z');
  }
  return new Date(dateTime);
}

function buildCountdowns(events, rules, today) {
  const countdowns = [];

  for (const rule of rules || []) {
    if (rule.kind === 'subjectContains') {
      const match = (rule.match || '').toLowerCase();
      const ev = events.find(function(e) { return e.subject && e.subject.toLowerCase().includes(match); });
      if (!ev || !ev.start) continue;
      const startRaw = toLocalDate(ev.start.dateTime, ev.start.timeZone);
      const start = new Date(startRaw.getFullYear(), startRaw.getMonth(), startRaw.getDate());
      const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const days = Math.round((start - todayMid) / (24 * 60 * 60 * 1000));
      countdowns.push({
        key: rule.key,
        label: rule.label || ev.subject,
        days: days,
        eventId: ev.id,
        start: ev.start,
        end: ev.end,
      });
    } else if (rule.kind === 'anniversary') {
      if (!rule.baseDate) continue;
      const base = new Date(rule.baseDate);
      const year = today.getFullYear();
      const thisYearAnniv = new Date(year, base.getMonth(), base.getDate());
      const todayMid2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const days = Math.round((thisYearAnniv - todayMid2) / (24 * 60 * 60 * 1000));
      const years = year - base.getFullYear();
      countdowns.push({
        key: rule.key,
        label: (rule.label || 'Anniversary') + ' \u2013 ' + years + ' years',
        days: days,
        eventId: null,
        start: { dateTime: thisYearAnniv.toISOString(), timeZone: 'UTC' },
        end: null,
      });
    }
  }

  countdowns.sort(function(a, b) { return a.days - b.days; });

  return countdowns.filter(function(cd) {
    if (cd.days >= 0) return true;
    if (cd.days < -1) {
      console.log('Removing expired countdown: ' + cd.label + ' (' + cd.days + ' days)');
      return false;
    }
    return true;
  });
}

async function main() {
  try {
    const cfg = loadConfig();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    console.log('Fetching weather from Open-Meteo...');
    const weather = await fetchWeather();
    if (weather) {
      console.log('Weather: ' + weather.days.length + ' days forecast');
    }

    const startWindow = new Date(today.getTime());
    const endWindow = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);

    console.log('Fetching events from Family group calendar...');
    const events = await fetchEvents(startWindow, endWindow);
    console.log('Found ' + events.length + ' events');

    const todayEvents = [];
    const tomorrowEvents = [];

    for (const e of events) {
      if (!e.start || !e.subject) continue;
      const dt = toLocalDate(e.start.dateTime, e.start.timeZone, e.isAllDay);
      if (isSameDay(dt, today)) {
        todayEvents.push({ subject: e.subject, start: e.start, isAllDay: e.isAllDay });
      } else if (isSameDay(dt, tomorrow)) {
        tomorrowEvents.push({ subject: e.subject, start: e.start, isAllDay: e.isAllDay });
      }
    }

    const upcomingDays = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(dayAfterTomorrow.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEvents = [];
      for (const e of events) {
        if (!e.start || !e.subject) continue;
        const dt = toLocalDate(e.start.dateTime, e.start.timeZone, e.isAllDay);
        if (isSameDay(dt, day)) {
          dayEvents.push({ subject: e.subject, start: e.start, isAllDay: e.isAllDay });
        }
      }
      upcomingDays.push({ date: day.toISOString(), events: dayEvents });
    }

    const countdowns = buildCountdowns(events, cfg.rules, today);

    const state = {
      weather: weather,
      todayEvents: todayEvents,
      tomorrowEvents: tomorrowEvents,
      upcomingDays: upcomingDays,
      countdowns: countdowns,
      updatedAt: new Date().toISOString(),
    };

    const outPath = '/home/apps/nuvi-dashboard/state.json';
    fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
    console.log('Wrote Nuvi state to ' + outPath);
  } catch (err) {
    console.error('Error updating Nuvi state:', err.message || err);
    process.exit(1);
  }
}

main();
