(function () {
  'use strict';

  var nInput = document.getElementById('n-input');
  var nNum = document.getElementById('n-num');
  var pInput = document.getElementById('p-input');
  var pNum = document.getElementById('p-num');

  var rateOut = document.getElementById('rate-out');
  var loOut = document.getElementById('lo-out');
  var hiOut = document.getElementById('hi-out');
  var ciBar = document.getElementById('ci-bar');
  var ciMarker = document.getElementById('ci-marker');

  var verdictDot = document.getElementById('verdict-dot');
  var verdictTitle = document.getElementById('verdict-title');
  var verdictText = document.getElementById('verdict-text');
  var verdictCard = document.getElementById('verdict-card');

  var breakpointsEl = document.getElementById('breakpoints');

  var Z = 1.96;

  function wilson(p, n) {
    if (n === 0) return { lo: 0, hi: 0 };
    var denom = 1 + Z * Z / n;
    var center = (p + Z * Z / (2 * n)) / denom;
    var half = (Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n))) / denom;
    return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
  }

  function neededN(p, marginPP) {
    var m = marginPP / 100;
    var pp = (p <= 0 || p >= 1) ? 0.5 : p;
    return Math.ceil((Z * Z * pp * (1 - pp)) / (m * m));
  }

  function fmtNum(x) {
    return Math.round(x).toLocaleString('ru-RU');
  }

  function update(source) {
    var n = parseInt(source === 'n-num' ? nNum.value : nInput.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 100000) n = 100000;
    nNum.value = n;
    nInput.value = Math.min(n, 3000);

    var pPct = parseFloat(source === 'p-num' ? pNum.value : (pInput.value / 10));
    if (isNaN(pPct) || pPct < 0) pPct = 0;
    if (pPct > 100) pPct = 100;
    pNum.value = pPct;
    pInput.value = Math.round(pPct * 10);

    var p = pPct / 100;
    var ci = wilson(p, n);
    var margin = ((ci.hi - ci.lo) / 2) * 100;

    rateOut.textContent = pPct.toFixed(1) + '%';
    loOut.textContent = (ci.lo * 100).toFixed(1) + '%';
    hiOut.textContent = (ci.hi * 100).toFixed(1) + '%';

    ciBar.style.left = (ci.lo * 100) + '%';
    ciBar.style.width = ((ci.hi - ci.lo) * 100) + '%';
    ciMarker.style.left = 'calc(' + pPct + '% - 1px)';

    var title, text, color, bg;

    var relError = p > 0 ? (ci.hi - ci.lo) / p : Infinity;

    // Verdict by worst of: absolute margin OR relative error
    if (n < 100) {
      title = 'Данных мало \u2014 масштабировать нельзя';
      text = 'Только для решения \u00abпродолжать тест или закрыть гипотезу\u00bb. Добери минимум до 300 диалогов.';
      color = 'var(--danger-text)';
      bg = 'var(--danger-bg)';
    } else if (margin > 8 || relError > 1.0) {
      title = 'Грубая прикидка';
      text = 'Видно, работает ли воронка в принципе. Решений о масштабе ещё рано \u2014 продолжай набирать объём.';
      color = 'var(--danger-text)';
      bg = 'var(--danger-bg)';
    } else if (margin > 5 || relError > 0.6) {
      title = 'Можно масштабировать в 3\u20135 раз';
      text = 'Считай экономику от минимума ' + (ci.lo * 100).toFixed(1) + '%. Если сходится \u2014 масштабируй. На каждой ступени пересчитывай.';
      color = 'var(--warning-text)';
      bg = 'var(--warning-bg)';
    } else if (margin > 3.5 || relError > 0.4) {
      title = 'Можно масштабировать в 5\u201310 раз';
      text = 'Точность рабочая. Закладывай в экономику ' + (ci.lo * 100).toFixed(1) + '% и масштабируй ступенями.';
      color = 'var(--warning-text)';
      bg = 'var(--warning-bg)';
    } else if (margin > 2.5 || relError > 0.25) {
      title = 'Уверенно можно масштабировать в 10+ раз';
      text = 'Точность высокая. Главный риск теперь \u2014 внешний: истощение базы, смена сегмента, время суток.';
      color = 'var(--success-text)';
      bg = 'var(--success-bg)';
    } else {
      title = 'Высокая точность \u2014 лимит уже не в данных';
      text = 'Дальнейшее увеличение выборки почти не сужает диапазон. Следи за качеством базы и сегментом.';
      color = 'var(--success-text)';
      bg = 'var(--success-bg)';
    }

    verdictDot.style.background = color;
    verdictTitle.textContent = title;
    verdictText.textContent = text;
    verdictCard.style.background = bg;

    // Breakpoints
    var targets = [5, 3, 2, 1];

    breakpointsEl.textContent = '';

    targets.forEach(function (t) {
      var need = neededN(p || 0.2, t);
      var done = n >= need;
      var remaining = Math.max(0, need - n);
      var projected = wilson(p, Math.max(n, need));
      var rangeText = (projected.lo * 100).toFixed(1) + '% \u2013 ' + (projected.hi * 100).toFixed(1) + '%';

      var row = document.createElement('div');
      row.className = 'bp-row ' + (done ? 'bp-row--done' : 'bp-row--pending');

      var left = document.createElement('div');
      left.className = 'bp-left';

      var dot = document.createElement('div');
      dot.className = 'bp-dot ' + (done ? 'bp-dot--done' : 'bp-dot--pending');

      var leftInfo = document.createElement('div');

      var label = document.createElement('div');
      label.className = 'bp-label ' + (done ? 'bp-label--done' : 'bp-label--pending');
      label.textContent = done ? 'Уже достигнуто' : '+' + fmtNum(remaining) + ' диалогов';

      var sub = document.createElement('div');
      sub.className = 'bp-sub';
      sub.textContent = 'всего ' + fmtNum(Math.max(n, need)) + ' диалогов';

      leftInfo.appendChild(label);
      leftInfo.appendChild(sub);
      left.appendChild(dot);
      left.appendChild(leftInfo);

      var right = document.createElement('div');
      right.className = 'bp-right';

      var range = document.createElement('div');
      range.className = 'bp-range ' + (done ? 'bp-range--done' : 'bp-range--pending');
      range.textContent = rangeText;

      var rangeSub = document.createElement('div');
      rangeSub.className = 'bp-range-sub';
      rangeSub.textContent = 'диапазон конверсии';

      right.appendChild(range);
      right.appendChild(rangeSub);

      row.appendChild(left);
      row.appendChild(right);
      breakpointsEl.appendChild(row);
    });
  }

  nInput.addEventListener('input', function () { update('n-input'); });
  nNum.addEventListener('input', function () { update('n-num'); });
  pInput.addEventListener('input', function () { update('p-input'); });
  pNum.addEventListener('input', function () { update('p-num'); });

  update();
})();
