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
  mist:                 'mist'
};

// SVG icon cache — fetched once, reused across renders
const svgCache = {};

function getWeatherIcon(iconName) {
  const file = weatherIconFiles[iconName] || 'not-available';
  const id = 'wi-' + Math.random().toString(36).slice(2, 8);
  if (svgCache[file]) {
    return `<span class="weather-icon-inner" id="${id}">${svgCache[file]}</span>`;
  }
  // Return placeholder, then fetch + inject via DOMParser for SMIL activation
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    if (svgCache[file]) { el.innerHTML = svgCache[file]; return; }
    fetch(`weather-icons/${file}.svg`)
      .then(r => r.ok ? r.text() : '')
      .then(svgText => {
        if (!svgText) return;
        svgCache[file] = svgText;
        const target = document.getElementById(id);
        if (!target) return;
        // Parse as XML and adopt proper SVG DOM nodes (activates SMIL)
        try {
          const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
          const svg = doc.documentElement;
          if (svg && svg.nodeName === 'svg') {
            target.innerHTML = '';
            target.appendChild(document.importNode(svg, true));
            return;
          }
        } catch (e) {}
        // Fallback: innerHTML
        target.innerHTML = svgText;
      })
      .catch(() => {});
  }, 0);
  return `<span class="weather-icon-inner" id="${id}"></span>`;
}

function updateFromState(state) {
  // Weather
  const weatherGrid = document.getElementById('weather-grid');
  if (weatherGrid && state.weather && state.weather.days) {
    weatherGrid.innerHTML = '';
    for (const day of state.weather.days) {
      const div = document.createElement('div');
      div.className = 'weather-day';
      div.innerHTML = `
        <div class="weather-label">${day.label}</div>
        <div class="weather-icon">${getWeatherIcon(day.icon)}</div>
        <div class="weather-temp">${day.high}° / ${day.low}°</div>
        <div class="weather-desc">${day.desc}</div>
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
setTimeout(() => {
  window.location.reload();
}, 5 * 60 * 1000);
