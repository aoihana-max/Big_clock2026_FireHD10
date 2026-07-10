"use strict";

/* ========================================
   お父さん時計
   Fire HD 10用
======================================== */

const WEEKDAYS = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日"
];

const WEEKDAY_SHORT = [
  "日",
  "月",
  "火",
  "水",
  "木",
  "金",
  "土"
];

/* ========================================
   お知らせの設定
======================================== */

const REMINDERS = {
  8: {
    displayTime: "08:00",
    message: "ゴミは出しましたか？",
    color: "#1976d2",
    background: "#eef6ff"
  },

  12: {
    displayTime: "12:00",
    message: "目薬は差しましたか？",
    color: "#d69a00",
    background: "#fff9df"
  },

  18: {
    displayTime: "18:00",
    message: "薬は飲みましたか？",
    color: "#f36c00",
    background: "#fff2e8"
  },

  22: {
    displayTime: "22:00",
    message: "目薬はさしましたか？",
    color: "#6a1b9a",
    background: "#f5ecff"
  }
};

/* ========================================
   日付関係
======================================== */

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  result.setDate(result.getDate() + days);

  return result;
}

function getNthWeekday(
  year,
  monthIndex,
  weekday,
  occurrence
) {
  const firstDay = new Date(year, monthIndex, 1);

  const difference =
    (weekday - firstDay.getDay() + 7) % 7;

  return 1 + difference + (occurrence - 1) * 7;
}

/* ========================================
   春分・秋分の日
   1980年から2099年までの計算
======================================== */

function getVernalEquinoxDay(year) {
  return Math.floor(
    20.8431 +
    0.242194 * (year - 1980) -
    Math.floor((year - 1980) / 4)
  );
}

function getAutumnalEquinoxDay(year) {
  return Math.floor(
    23.2488 +
    0.242194 * (year - 1980) -
    Math.floor((year - 1980) / 4)
  );
}

/* ========================================
   日本の祝日を自動計算
======================================== */

const holidayCache = new Map();

function createHolidayMap(year) {
  const holidays = new Map();

  function addHoliday(month, day, name) {
    const date = new Date(year, month - 1, day);
    holidays.set(formatDateKey(date), name);
  }

  /* 固定日の祝日 */

  addHoliday(1, 1, "元日");
  addHoliday(2, 11, "建国記念の日");
  addHoliday(2, 23, "天皇誕生日");
  addHoliday(4, 29, "昭和の日");
  addHoliday(5, 3, "憲法記念日");
  addHoliday(5, 4, "みどりの日");
  addHoliday(5, 5, "こどもの日");
  addHoliday(8, 11, "山の日");
  addHoliday(11, 3, "文化の日");
  addHoliday(11, 23, "勤労感謝の日");

  /* 第○月曜日の祝日 */

  addHoliday(
    1,
    getNthWeekday(year, 0, 1, 2),
    "成人の日"
  );

  addHoliday(
    7,
    getNthWeekday(year, 6, 1, 3),
    "海の日"
  );

  addHoliday(
    9,
    getNthWeekday(year, 8, 1, 3),
    "敬老の日"
  );

  addHoliday(
    10,
    getNthWeekday(year, 9, 1, 2),
    "スポーツの日"
  );

  /* 春分・秋分 */

  addHoliday(
    3,
    getVernalEquinoxDay(year),
    "春分の日"
  );

  addHoliday(
    9,
    getAutumnalEquinoxDay(year),
    "秋分の日"
  );

  /* 国民の休日 */

  const startDate = new Date(year, 0, 2);
  const endDate = new Date(year, 11, 30);

  for (
    let date = new Date(startDate);
    date <= endDate;
    date = addDays(date, 1)
  ) {
    const key = formatDateKey(date);

    if (holidays.has(key)) {
      continue;
    }

    const previousKey =
      formatDateKey(addDays(date, -1));

    const nextKey =
      formatDateKey(addDays(date, 1));

    if (
      holidays.has(previousKey) &&
      holidays.has(nextKey)
    ) {
      holidays.set(key, "国民の休日");
    }
  }

  /* 振替休日 */

  const originalHolidays =
    Array.from(holidays.entries());

  originalHolidays.forEach(([key]) => {
    const holidayDate =
      new Date(`${key}T00:00:00`);

    if (holidayDate.getDay() !== 0) {
      return;
    }

    let substituteDate =
      addDays(holidayDate, 1);

    while (
      holidays.has(formatDateKey(substituteDate))
    ) {
      substituteDate =
        addDays(substituteDate, 1);
    }

    holidays.set(
      formatDateKey(substituteDate),
      "振替休日"
    );
  });

  return holidays;
}

function getHolidayName(date) {
  const year = date.getFullYear();

  if (!holidayCache.has(year)) {
    holidayCache.set(
      year,
      createHolidayMap(year)
    );
  }

  const holidays =
    holidayCache.get(year);

  return holidays.get(formatDateKey(date)) || "";
}

/* ========================================
   音声読み上げ
======================================== */

let japaneseVoice = null;

function loadJapaneseVoice() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const voices =
    window.speechSynthesis.getVoices();

  japaneseVoice =
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith("ja")
    ) || null;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "ja-JP";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (japaneseVoice) {
    utterance.voice = japaneseVoice;
  }

  window.speechSynthesis.speak(utterance);
}

if ("speechSynthesis" in window) {
  loadJapaneseVoice();

  window.speechSynthesis.addEventListener(
    "voiceschanged",
    loadJapaneseVoice
  );
}

/* ========================================
   読み上げる文章
======================================== */

function getVoiceMessage(hour, weekdayNumber) {
  if (hour === 8) {
    let message =
      "おはようございます。" +
      "午前8時です。" +
      "ゴミは出しましたか？";

    if (
      weekdayNumber === 3 ||
      weekdayNumber === 6
    ) {
      message +=
        `今日は${WEEKDAYS[weekdayNumber]}です。` +
        "デイサービスです。";
    }

    return message;
  }

  if (hour === 12) {
    return (
      "正午になりました。" +
      "目薬は差しましたか？"
    );
  }

  if (hour === 18) {
    return (
      "午後6時になりました。" +
      "薬は飲みましたか？"
    );
  }

  if (hour === 22) {
    return (
      "午後10時です。" +
      "おやすみの時間です。" +
      "目薬はさしましたか？"
    );
  }

  return "";
}

/* ========================================
   音声は各時刻に1回だけ
======================================== */

function announceIfNeeded(now) {
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (!REMINDERS[hour]) {
    return;
  }

  if (minute !== 0) {
    return;
  }

  const announceKey =
    `${formatDateKey(now)}-${hour}`;

  const savedKey =
    localStorage.getItem(
      "otosanClockLastAnnouncement"
    );

  if (savedKey === announceKey) {
    return;
  }

  const voiceMessage =
    getVoiceMessage(hour, now.getDay());

  if (!voiceMessage) {
    return;
  }

  localStorage.setItem(
    "otosanClockLastAnnouncement",
    announceKey
  );

  speak(voiceMessage);
}

/* ========================================
   メッセージ表示
======================================== */

function updateReminder(hour) {
  const messageArea =
    document.getElementById("messageArea");

  const messageTime =
    document.getElementById("messageTime");

  const messageText =
    document.getElementById("messageText");

  const reminder = REMINDERS[hour];

  if (!reminder) {
    messageArea.classList.add("hidden");

    messageTime.textContent = "";
    messageText.textContent = "";

    messageArea.style.background = "";
    messageArea.style.border = "";

    return;
  }

  messageArea.classList.remove("hidden");

  messageTime.textContent =
    reminder.displayTime;

  messageText.textContent =
    reminder.message;

  messageArea.style.background =
    reminder.background;

  messageArea.style.border =
    `5px solid ${reminder.color}`;

  messageTime.style.color =
    reminder.color;

  messageText.style.color = "#111111";

  messageArea.style.padding =
    "1.5vh 2vw";
}

/* ========================================
   時計・日付の表示
======================================== */

function updateDisplay() {
  const now = new Date();

  const year = now.getFullYear();
  const reiwa = year - 2018;

  const month = now.getMonth() + 1;
  const day = now.getDate();

  const weekdayNumber = now.getDay();
  const weekday =
    WEEKDAY_SHORT[weekdayNumber];

  const holidayName =
    getHolidayName(now);

  const holidayMark =
    holidayName ? "・祝" : "";

  const hour24 = now.getHours();

  const ampm =
    hour24 < 12 ? "午前" : "午後";

  let hour12 = hour24 % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  const minute =
    String(now.getMinutes()).padStart(2, "0");

  document.getElementById(
    "year"
  ).textContent =
    `令和${reiwa}年（${year}年）`;

  const dateElement =
    document.getElementById("date");

  dateElement.textContent =
    `${month}月${day}日${weekday}${holidayMark}）`;

  if (holidayName || weekdayNumber === 0) {
    dateElement.style.color = "#ff4040";
  } else if (weekdayNumber === 6) {
    dateElement.style.color = "#40ffff";
  } else {
    dateElement.style.color = "#ffff00";
  }

  document.getElementById(
    "ampm"
  ).textContent = ampm;

  document.getElementById(
    "time"
  ).textContent =
    `${hour12}:${minute}`;

  updateReminder(hour24);
  announceIfNeeded(now);

  /* 夜22時から朝6時まで少し暗くする */

  if (hour24 >= 22 || hour24 < 6) {
    document.body.style.opacity = "0.58";
  } else {
    document.body.style.opacity = "1";
  }
}

/* ========================================
   焼き付き防止
   5分ごとに少し移動
======================================== */

const SHIFT_POSITIONS = [
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  { x: -12, y: 0 },
  { x: 0, y: 10 },
  { x: 0, y: -10 },
  { x: 10, y: 8 },
  { x: -10, y: 8 },
  { x: 10, y: -8 },
  { x: -10, y: -8 }
];

let shiftIndex = 0;

function moveDisplay() {
  const container =
    document.getElementById("container");

  const position =
    SHIFT_POSITIONS[shiftIndex];

  container.style.transform =
    `translate(${position.x}px, ${position.y}px)`;

  shiftIndex =
    (shiftIndex + 1) %
    SHIFT_POSITIONS.length;
}

/* ========================================
   初期起動
======================================== */

updateDisplay();
moveDisplay();

setInterval(updateDisplay, 1000);

setInterval(
  moveDisplay,
  5 * 60 * 1000
);

/* 画面を触ったときに音声を再開 */

document.addEventListener(
  "click",
  () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  }
);

document.addEventListener(
  "touchstart",
  () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  },
  { passive: true }
);
