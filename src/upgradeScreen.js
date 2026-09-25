// The Upgrade Tree screen: a full-page overlay with one column per branch.
// Opens with U or the panel button; the game pauses while it's open.
// Nodes for tables not reached yet are folded into one line per column.
// (A stand-in until the wiring-board constellation screen.)
class UpgradeScreen {
  constructor({ root, upgrades, scoring, onToggle }) {
    this.root = root;
    this.upgrades = upgrades;
    this.scoring = scoring;
    this.onToggle = onToggle;
    this.confirmingReset = false;

    this.root.addEventListener('click', (e) => {
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        this.upgrades.buy(buy.dataset.buy);
        this.render();
        return;
      }
      if (e.target.closest('[data-close]')) this.close();
      if (e.target.closest('[data-reset]')) this.handleReset();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open() {
    this.confirmingReset = false;
    this.render();
    this.root.hidden = false;
    this.root.querySelector('[data-close]').focus();
    this.onToggle(true);
  }

  close() {
    this.root.hidden = true;
    this.onToggle(false);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  // Two-step reset: the first click asks, the second wipes all saved
  // progress (Tickets, upgrades, rank) and reloads.
  handleReset() {
    if (!this.confirmingReset) {
      this.confirmingReset = true;
      this.render();
      return;
    }
    try {
      for (const key of [BANK_SAVE_KEY, UPGRADES_SAVE_KEY, MISSION_SAVE_KEY]) localStorage.removeItem(key);
    } catch (e) {
      // Nothing saved to clear.
    }
    location.reload();
  }

  render() {
    const up = this.upgrades;
    const reached = up.tablesReached();
    const spent = BRANCHES.reduce((s, b) => s + up.spentIn(b.id), 0);
    const columns = BRANCHES.map((b) => {
      const all = NODES.filter((u) => u.branch === b.id);
      const shown = all.filter((u) => (u.table || 1) <= reached || (u.pass && u.pass <= reached + 1));
      const later = all.length - shown.length;
      const next = TABLES[reached];
      const fold = later ? `<p class="later">🔒 ${later} more ${later === 1 ? 'node' : 'nodes'} from ${next ? next.name : 'later tables'} on</p>` : '';
      return `<section class="branch"><h3>${b.name}</h3><div class="spent">${formatPoints(up.spentIn(b.id))} spent</div>${shown.map((u) => this.node(u)).join('')}${fold}</section>`;
    }).join('');

    this.root.querySelector('.tickets').textContent = formatPoints(this.scoring.tickets);
    this.root.querySelector('.tree').innerHTML = columns;
    this.root.querySelector('.tree-total').textContent =
      `${formatPoints(spent)} of ${formatPoints(up.totalCost())} Tickets spent on the tree · Tables reached: ${reached} of ${TABLES.length}`;
    const reset = this.root.querySelector('[data-reset]');
    reset.textContent = this.confirmingReset ? 'Click again to erase all progress' : 'Reset all progress';
    reset.classList.toggle('armed', this.confirmingReset);
  }

  node(u) {
    const up = this.upgrades;
    const lvl = up.level(u.id);
    const st = up.status(u.id);
    const pips = u.costs.length > 1 ? u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('') : '';
    const desc = u.pass ? `Reach ${TABLES[u.pass - 1].name} (${TABLES[u.pass - 1].world}): unlocks its ring of nodes` : u.desc;
    const next = `<p class="next">${desc}${u.costs.length > 1 ? ` <span class="per">(per level)</span>` : ''}</p>`;
    const table = u.table > 1 ? `<span class="badge">${TABLES[u.table - 1].name}</span>` : '';
    let action;
    if (st.state === 'maxed') {
      action = '<div class="maxed">Maxed</div>';
    } else if (st.state === 'locked') {
      action = `<ul class="reasons">${st.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`;
    } else {
      const afford = this.scoring.tickets >= st.cost;
      action = `<button type="button" data-buy="${u.id}" ${afford ? '' : 'disabled'}>Buy · ${formatPoints(st.cost)} Tickets</button>`;
    }
    return `<article class="node ${u.pass ? 'capstone' : ''} ${st.state}">
      <header><h4>${u.name}</h4><span class="pips" aria-label="Level ${lvl} of ${u.costs.length}">${pips}</span></header>
      ${table}${next}${action}
    </article>`;
  }
}
