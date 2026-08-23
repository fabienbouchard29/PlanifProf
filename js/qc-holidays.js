(function () {
  function iso(d) {
    return d.toISOString().slice(0, 10);
  }

  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
  function computeEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function nthWeekdayOfMonth(year, month, weekday, n) {
    const first = new Date(year, month, 1);
    const day = 1 + ((7 + weekday - first.getDay()) % 7) + (n - 1) * 7;
    return new Date(year, month, day);
  }

  function mondayOnOrBefore(date) {
    const d = new Date(date);
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  function computeQuebecHolidays(year) {
    const easter = computeEasterSunday(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const patriotes = mondayOnOrBefore(new Date(year, 4, 24));
    const labourDay = nthWeekdayOfMonth(year, 8, 1, 1);
    const thanksgiving = nthWeekdayOfMonth(year, 9, 1, 2);

    return [
      { date: iso(new Date(year, 0, 1)), label: "Jour de l'An" },
      { date: iso(goodFriday), label: "Vendredi saint" },
      { date: iso(patriotes), label: "Journée nationale des patriotes" },
      { date: iso(new Date(year, 5, 24)), label: "Fête nationale du Québec" },
      { date: iso(new Date(year, 6, 1)), label: "Fête du Canada" },
      { date: iso(labourDay), label: "Fête du Travail" },
      { date: iso(thanksgiving), label: "Action de grâce" },
      { date: iso(new Date(year, 11, 25)), label: "Noël" },
    ];
  }

  window.QcHolidays = { computeQuebecHolidays };
})();
