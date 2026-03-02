function toLocalDateFromGraph(start) {
  if (!start || !start.dateTime) return null;
  if (start.timeZone === 'UTC') {
    return new Date(start.dateTime + 'Z');
  }
  return new Date(start.dateTime);
}

// Keyword-based emoji matching for events
const emojiKeywords = [
  { keywords: ['movie', 'film', 'cinema', 'theater'], emoji: '🎬' },
  { keywords: ['party', 'celebration', 'super bowl', 'game day'], emoji: '🎉' },
  { keywords: ['dinner', 'lunch', 'breakfast', 'restaurant', 'eat'], emoji: '🍽️' },
  { keywords: ['birthday'], emoji: '🎂' },
  { keywords: ['concert', 'music', 'show'], emoji: '🎵' },
  { keywords: ['travel', 'trip', 'vacation', 'flight', 'airport'], emoji: '✈️' },
  { keywords: ['meeting', 'work', 'office'], emoji: '💼' },
  { keywords: ['doctor', 'dentist', 'appointment', 'medical'], emoji: '🏥' },
  { keywords: ['school', 'class', 'graduation'], emoji: '🎓' },
  { keywords: ['wedding', 'anniversary'], emoji: '💍' },
  { keywords: ['camping', 'hike', 'outdoor'], emoji: '🏕️' },
  { keywords: ['game', 'play', 'sports'], emoji: '🏈' },
  { keywords: ['nail', 'salon', 'spa'], emoji: '💅' },
  { keywords: ['prom', 'dance'], emoji: '💃' },
];

const fallbackEmojis = ['🌟', '✨', '💫', '⭐', '🎯', '📌'];

function getEventEmoji(subject) {
  const lower = subject.toLowerCase();
  
  // Check for keyword matches
  for (const { keywords, emoji } of emojiKeywords) {
    if (keywords.some(kw => lower.includes(kw))) {
      return emoji;
    }
  }
  
  // Fallback: consistent emoji based on hash
  const hash = subject.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return fallbackEmojis[hash % fallbackEmojis.length];
}

// Animated weather icons by Bas Milius (MIT) — https://github.com/basmilius/weather-icons
// Maps dashboard icon keys to local SVG filenames in weather-icons/
const weatherIconFiles = {
  sunny:                'clear-day',
  clear:                'clear-day',
  'clear-night':        'clear-night',
  'partly-cloudy':      'partly-cloudy-day',
  'partly-cloudy-night':'partly-cloudy-night',
  cloudy:               'overcast',
  overcast:             'overcast',
  'overcast-day':       'overcast-day',
  drizzle:              'drizzle',
  rain:                 'rain',
  snow:                 'snow',
  thunderstorm:         'thunderstorms-rain',
  fog:                  'fog',
  mist:                 'mist',
  'uv-index-1':         'uv-index-1',
  'uv-index-2':         'uv-index-2',
  'uv-index-3':         'uv-index-3',
  'uv-index-4':         'uv-index-4',
  'uv-index-5':         'uv-index-5',
  'uv-index-6':         'uv-index-6',
  'uv-index-7':         'uv-index-7',
  'uv-index-8':         'uv-index-8',
  'uv-index-9':         'uv-index-9',
  'uv-index-10':        'uv-index-10',
  'uv-index-11':        'uv-index-11'
};

// SVG icon cache — fetched once per file, IDs scoped per instance
const svgRawCache = {};
let svgInstanceCounter = 0;

function scopeSvgIds(svgText, prefix) {
  // Find all id="..." values in the SVG
  const ids = new Set();
  svgText.replace(/\bid="([^"]+)"/g, (_, id) => { ids.add(id); });
  // Replace each id and all references to it
  let scoped = svgText;
  for (const id of ids) {
    const scId = prefix + id;
    // Replace id declarations: id="x" → id="pfx_x"
    scoped = scoped.split(`id="${id}"`).join(`id="${scId}"`);
    // Replace url(#x) references (gradient fills, clip-paths, etc.)
    scoped = scoped.split(`url(#${id})`).join(`url(#${scId})`);
    // Replace xlink:href="#x" references (symbol <use>)
    scoped = scoped.split(`xlink:href="#${id}"`).join(`xlink:href="#${scId}"`);
    scoped = scoped.split(`href="#${id}"`).join(`href="#${scId}"`);
    // Replace SMIL animation timing refs:
    //   begin="x.end+..." or begin="0s; x.end+..." or begin="-.33s; x.end+..."
    // ID can appear at start of begin value or after "; "
    scoped = scoped.split(`begin="${id}.`).join(`begin="${scId}.`);
    scoped = scoped.split(`; ${id}.`).join(`; ${scId}.`);
  }
  return scoped;
}

function injectSvg(target, svgText) {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg && svg.nodeName === 'svg') {
      target.innerHTML = '';
      target.appendChild(document.importNode(svg, true));
      return;
    }
  } catch (e) {}
  target.innerHTML = svgText;
}

function getWeatherIcon(iconName) {
  const file = weatherIconFiles[iconName] || 'not-available';
  const instanceId = 'wi' + (++svgInstanceCounter) + '_';
  const spanId = 'ws-' + Math.random().toString(36).slice(2, 8);

  if (svgRawCache[file]) {
    const scoped = scopeSvgIds(svgRawCache[file], instanceId);
    return `<span class="weather-icon-inner" id="${spanId}">${scoped}</span>`;
  }

  setTimeout(() => {
    const el = document.getElementById(spanId);
    if (!el) return;
    if (svgRawCache[file]) {
      injectSvg(el, scopeSvgIds(svgRawCache[file], instanceId));
      return;
    }
    fetch(`weather-icons/${file}.svg`)
      .then(r => r.ok ? r.text() : '')
      .then(svgText => {
        if (!svgText) return;
        svgRawCache[file] = svgText;
        const target = document.getElementById(spanId);
        if (!target) return;
        injectSvg(target, scopeSvgIds(svgText, instanceId));
      })
      .catch(() => {});
  }, 0);
  return `<span class="weather-icon-inner" id="${spanId}"></span>`;
}

function updateFromState(state) {
  // Weather
  const weatherGrid = document.getElementById('weather-grid');
  if (weatherGrid && state.weather && state.weather.days) {
    weatherGrid.innerHTML = '';
    const cur = state.weather.current;
    for (let i = 0; i < state.weather.days.length; i++) {
      const day = state.weather.days[i];
      const div = document.createElement('div');
      div.className = 'weather-day';

      // Today tile: use current conditions if available
      let icon = day.icon;
      let temp = `${day.high}° / ${day.low}°`;
      let desc = day.desc;
      let label = day.label;

      if (i === 0 && cur && cur.icon) {
        icon = cur.icon;
        desc = cur.desc || desc;
        // For sunny/clear current conditions with UV data, show UV icon
        if (cur.isDay && cur.uvIndex != null && cur.uvIndex >= 1 &&
            (cur.icon === 'sunny' || cur.icon === 'clear')) {
          const uvLevel = Math.min(cur.uvIndex, 11);
          icon = `uv-index-${uvLevel}`;
          desc = `UV ${cur.uvIndex} · ${cur.desc}`;
        }
        // Show current temp alongside daily range
        if (cur.temp != null) {
          temp = `${cur.temp}° (${day.high}°/${day.low}°)`;
        }
        label = 'Now';
      }

      div.innerHTML = `
        <div class="weather-label">${label}</div>
        <div class="weather-icon">${getWeatherIcon(icon)}</div>
        <div class="weather-temp">${temp}</div>
        <div class="weather-desc">${desc}</div>
      `;
      weatherGrid.appendChild(div);
    }
  }

  // Today
  const todayList = document.getElementById('today-events');
  if (todayList) {
    todayList.innerHTML = '';
    if (state.todayEvents && state.todayEvents.length) {
      for (const ev of state.todayEvents) {
        const li = document.createElement('li');
        const dt = toLocalDateFromGraph(ev.start);
        const timeStr = dt
          ? dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : '';
        const span = document.createElement('span');
        span.className = 'time';
        span.textContent = timeStr;
        li.appendChild(span);
        li.appendChild(document.createTextNode(getEventEmoji(ev.subject) + ' ' + ev.subject));
        todayList.appendChild(li);
      }
    } else {
      const li = document.createElement('li');
      li.textContent = 'nothing scheduled';
      todayList.appendChild(li);
    }
  }

  // Tomorrow
  const tomorrowList = document.getElementById('tomorrow-events');
  if (tomorrowList) {
    tomorrowList.innerHTML = '';
    if (state.tomorrowEvents && state.tomorrowEvents.length) {
      for (const ev of state.tomorrowEvents) {
        const li = document.createElement('li');
        const dt = toLocalDateFromGraph(ev.start);
        const timeStr = dt
          ? dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : '';
        const span = document.createElement('span');
        span.className = 'time';
        span.textContent = timeStr;
        li.appendChild(span);
        li.appendChild(document.createTextNode(getEventEmoji(ev.subject) + ' ' + ev.subject));
        tomorrowList.appendChild(li);
      }
    } else {
      const li = document.createElement('li');
      li.textContent = 'nothing scheduled';
      tomorrowList.appendChild(li);
    }
  }

  // Upcoming: next 5 days, day-after-tomorrow onward
  const upcomingList = document.getElementById('upcoming-events');
  if (upcomingList) {
    upcomingList.innerHTML = '';
    if (state.upcomingDays && state.upcomingDays.length) {
      for (const day of state.upcomingDays) {
        const dt = new Date(day.date);
        const dayStr = dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'dow';
        span.textContent = dayStr + ':';
        li.appendChild(span);
        const label = document.createElement('span');
        label.className = 'label';
        if (day.events && day.events.length) {
          label.textContent = day.events[0].subject;
        } else {
          label.textContent = '–';
          label.classList.add('empty');
        }
        li.appendChild(label);
        upcomingList.appendChild(li);
      }
    } else {
      const li = document.createElement('li');
      li.textContent = 'no upcoming events';
      upcomingList.appendChild(li);
    }
  }

  // Countdowns
  if (state.countdowns && state.countdowns.length) {
    const cards = document.getElementById('countdown-cards');
    if (cards) {
      cards.innerHTML = '';
      for (const cd of state.countdowns.slice(0, 3)) {
        const card = document.createElement('div');
        card.className = 'card';
        const label = document.createElement('div');
        label.className = 'card-label';
        label.textContent = cd.label;
        const days = document.createElement('div');
        days.className = 'card-days';
        days.textContent = cd.days;
        const sub = document.createElement('div');
        sub.className = 'card-sub';
        sub.textContent = 'days';
        card.appendChild(label);
        card.appendChild(days);
        card.appendChild(sub);
        cards.appendChild(card);
      }
    }
  }
}

function refreshFromState() {
  fetch('state.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) updateFromState(data);
    })
    .catch(() => {});
}

// Track which events we've already chimed for
const chimedEvents = new Set();

function checkEventReminders(state) {
  if (!state.todayEvents || !window.playReminderChime) return;
  
  const now = new Date();
  const fifteenMinutes = 15 * 60 * 1000;
  
  for (const ev of state.todayEvents) {
    const eventTime = toLocalDateFromGraph(ev.start);
    if (!eventTime) continue;
    
    const timeUntil = eventTime - now;
    const eventKey = ev.subject + '-' + eventTime.toISOString();
    
    // Chime if event is 10-15 minutes away and we haven't chimed yet
    if (timeUntil > 0 && timeUntil <= fifteenMinutes && !chimedEvents.has(eventKey)) {
      console.log('Reminder chime for:', ev.subject);
      window.playReminderChime();
      chimedEvents.add(eventKey);
    }
  }
}

function refreshAndCheckReminders() {
  fetch('state.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        updateFromState(data);
        checkEventReminders(data);
      }
    })
    .catch(() => {});
}

refreshAndCheckReminders();

// Check reminders every minute for precise timing
setInterval(() => {
  fetch('state.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        updateFromState(data);
        checkEventReminders(data);
      }
    })
    .catch(() => {});
}, 60 * 1000);

// Full page reload every 5 minutes to pick up code changes
// Uses Fully Kiosk API to clear WebView cache when available,
// then navigates with a timestamp param to bypass any remaining cache
setTimeout(() => {
  if (typeof fully !== 'undefined' && fully.clearCache) {
    try { fully.clearCache(); } catch (e) {}
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_t', Date.now());
  window.location.href = url.toString();
}, 5 * 60 * 1000);
