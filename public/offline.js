(function () {
  var PRINCIPLES = [
    {
      number: 1,
      title: 'Write the pull request description before hitting submit.',
      lines: [
        'Not for the reviewer. For yourself. Half the bugs I have caught in my own code showed up the moment I had to explain in plain English why the change existed.',
        'If a paragraph feels awkward to write, the diff is usually doing two jobs at once.'
      ]
    },
    {
      number: 2,
      title: 'Boring code is a gift to your future self at 2am.',
      lines: [
        'Cleverness has a maintenance tax. When the pager goes off in the middle of the night, nobody wants to untangle a five-layer generic abstraction.',
        'Write the obvious loop. Name the intermediate variable. Leave the breadcrumbs.'
      ]
    },
    {
      number: 3,
      title: 'Delete code with the same pride you felt writing it.',
      lines: [
        'Every line in the repository is a line that has to be read, tested, upgraded, and reasoned about.',
        'A net-negative diff that removes a dead branch or collapses an unused flag is one of the highest-leverage commits you can ship.'
      ]
    },
    {
      number: 4,
      title: 'Make the error message tell the next person what to do.',
      lines: [
        '"Invalid state" is a riddle, not a diagnostic. State what value arrived, what invariant failed, and where to look next.',
        'Good error messages turn a forty-minute Slack thread into a thirty-second fix.'
      ]
    },
    {
      number: 5,
      title: 'Treat warnings as bugs or silence them with a reason.',
      lines: [
        'Once a terminal scrolls past forty yellow warnings on every build, the forty-first warning—the one that actually matters—is invisible.',
        'Keep the console quiet enough that a new line means something.'
      ]
    },
    {
      number: 6,
      title: 'Name things for the reader who has zero context.',
      lines: [
        'Encode the unit, the boundary, and the side effect right on the identifier: timeoutMs instead of t, fetchAndCacheUserProfile instead of handleData.',
        'Good names eliminate half the comments you thought you needed.'
      ]
    },
    {
      number: 7,
      title: 'Ship the smallest slice that proves the assumption.',
      lines: [
        'Long-lived branches gather merge conflicts and anxiety at the same rate.',
        'Put a thin vertical slice in front of real traffic early while the cost of being wrong is still small.'
      ]
    },
    {
      number: 8,
      title: 'Automate the checklist, keep the human judgment.',
      lines: [
        'Formatting, type checks, bundle budgets, and accessibility audits belong in CI so code review can focus on architecture, trade-offs, and clarity.',
        'Never spend human goodwill enforcing a rule a linter can check in 200ms.'
      ]
    },
    {
      number: 9,
      title: 'Protect uninterrupted blocks of quiet focus.',
      lines: [
        'Deep systems work rarely happens in twelve-minute fragments between notifications.',
        'Close the tabs, mute the channel for an hour, and finish one coherent thought from start to test.'
      ]
    },
    {
      number: 10,
      title: 'Leave the file a little clearer than you found it.',
      lines: [
        'You do not need permission for a three-Week rewrite to make a module better today.',
        'Tighten one type, clarify one test assertion, remove one stale comment, and move on.'
      ]
    }
  ];

  var index = 0;
  var pathEl = document.getElementById('offline-path');
  var quoteEl = document.getElementById('offline-quote');
  var kickerEl = document.getElementById('principle-kicker');
  var headingEl = document.getElementById('principle-heading');
  var bodyEl = document.getElementById('principle-paragraphs');
  var nextBtn = document.getElementById('next-principle-btn');
  var retryBtn = document.getElementById('retry-btn');
  var dotEl = document.getElementById('connection-dot');
  var badgeEl = document.getElementById('connection-badge');
  var statusEl = document.getElementById('panel-status');

  if (pathEl && quoteEl && window.location && window.location.pathname) {
    var requestedPath = window.location.pathname;
    pathEl.textContent = requestedPath;
    quoteEl.textContent = '\u201c' + requestedPath + '\u201d';
  }

  function renderPrinciple(idx) {
    var item = PRINCIPLES[idx] || PRINCIPLES[0];
    var numStr = item.number < 10 ? '0' + item.number : String(item.number);
    if (kickerEl) {
      kickerEl.textContent = 'while you are offline \u00b7 principle ' + numStr;
    }
    if (headingEl) {
      headingEl.textContent = item.number + '. ' + item.title;
    }
    if (bodyEl) {
      bodyEl.textContent = '';
      for (var i = 0; i < item.lines.length; i++) {
        var p = document.createElement('p');
        p.textContent = item.lines[i];
        bodyEl.appendChild(p);
      }
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      index = (index + 1) % PRINCIPLES.length;
      renderPrinciple(index);
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      window.location.reload();
    });
  }

  window.addEventListener('online', function () {
    if (dotEl) dotEl.style.backgroundColor = '#6ec49c';
    if (badgeEl) {
      badgeEl.style.color = '#6ec49c';
      badgeEl.textContent = 'connection restored \u00b7 online';
    }
    if (statusEl) {
      statusEl.style.color = '#6ec49c';
      statusEl.textContent = '\u2713 socket online \u00b7 ready to reload';
    }
  });
})();
