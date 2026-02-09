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

// SVG icons for weather conditions
const weatherIcons = {
  sunny: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#FFD86B"/><g stroke="#FFD86B" stroke-width="3"><line x1="32" y1="6" x2="32" y2="0"/><line x1="32" y1="64" x2="32" y2="58"/><line x1="6" y1="32" x2="0" y2="32"/><line x1="64" y1="32" x2="58" y2="32"/><line x1="50" y1="14" x2="55" y2="9"/><line x1="14" y1="50" x2="9" y2="55"/><line x1="50" y1="50" x2="55" y2="55"/><line x1="14" y1="14" x2="9" y2="9"/></g></svg>`,
  clear: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#FFD86B"/><g stroke="#FFD86B" stroke-width="3"><line x1="32" y1="6" x2="32" y2="0"/><line x1="32" y1="64" x2="32" y2="58"/><line x1="6" y1="32" x2="0" y2="32"/><line x1="64" y1="32" x2="58" y2="32"/><line x1="50" y1="14" x2="55" y2="9"/><line x1="14" y1="50" x2="9" y2="55"/><line x1="50" y1="50" x2="55" y2="55"/><line x1="14" y1="14" x2="9" y2="9"/></g></svg>`,
  'partly-cloudy': `<svg viewBox="0 0 64 64"><circle cx="22" cy="24" r="10" fill="#FFD86B"/><ellipse cx="38" cy="38" rx="16" ry="10" fill="#9BA4B4"/><ellipse cx="24" cy="40" rx="14" ry="9" fill="#9BA4B4"/></svg>`,
  'partly-cloudy-night': `<svg viewBox="0 0 64 64"><path d="M22 14 A12 12 0 1 0 22 38 A10 10 0 1 1 22 14" fill="#FFD86B"/><ellipse cx="38" cy="38" rx="16" ry="10" fill="#9BA4B4"/><ellipse cx="24" cy="40" rx="14" ry="9" fill="#9BA4B4"/></svg>`,
  cloudy: `<svg viewBox="0 0 64 64"><ellipse cx="36" cy="30" rx="16" ry="10" fill="#9BA4B4"/><ellipse cx="22" cy="32" rx="14" ry="9" fill="#9BA4B4"/><ellipse cx="40" cy="36" rx="12" ry="8" fill="#7A8494"/></svg>`,
  rain: `<svg viewBox="0 0 64 64"><ellipse cx="34" cy="26" rx="16" ry="10" fill="#9BA4B4"/><ellipse cx="20" cy="28" rx="14" ry="9" fill="#9BA4B4"/><line x1="20" y1="40" x2="16" y2="52" stroke="#4A90E2" stroke-width="3"/><line x1="32" y1="40" x2="28" y2="52" stroke="#4A90E2" stroke-width="3"/><line x1="44" y1="40" x2="40" y2="52" stroke="#4A90E2" stroke-width="3"/></svg>`,
  snow: `<svg viewBox="0 0 64 64"><ellipse cx="34" cy="26" rx="16" ry="10" fill="#9BA4B4"/><ellipse cx="20" cy="28" rx="14" ry="9" fill="#9BA4B4"/><circle cx="20" cy="46" r="3" fill="#E8F0FE"/><circle cx="32" cy="50" r="3" fill="#E8F0FE"/><circle cx="44" cy="46" r="3" fill="#E8F0FE"/></svg>`,
  thunderstorm: `<svg viewBox="0 0 64 64"><ellipse cx="34" cy="24" rx="16" ry="10" fill="#6B7280"/><ellipse cx="20" cy="26" rx="14" ry="9" fill="#6B7280"/><polygon points="30,36 24,48 32,48 28,60 38,44 30,44 36,36" fill="#FFD86B"/></svg>`,
  fog: `<svg viewBox="0 0 64 64"><rect x="8" y="24" width="48" height="4" rx="2" fill="#9BA4B4"/><rect x="12" y="34" width="40" height="4" rx="2" fill="#9BA4B4"/><rect x="8" y="44" width="48" height="4" rx="2" fill="#9BA4B4"/></svg>`
};

function getWeatherIcon(iconName) {
  return weatherIcons[iconName] || weatherIcons.cloudy;
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
