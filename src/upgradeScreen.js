// The Upgrade Tree screen: a full-page overlay with one column per branch.
// Opens with U or the panel button; the game pauses while it's open.
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
    const spent = BRANCHES.reduce((s, b) => s + up.spentIn(b.id), 0);
    const columns = BRANCHES.map((b) => {
      const nodes = UPGRADES.filter((u) => u.branch === b.id).map((u) => this.node(u)).join('');
      return `<section class="branch"><h3>${b.name}</h3><div class="spent">${up.spentIn(b.id).toLocaleString()} spent</div>${nodes}</section>`;
    }).join('');

    this.root.querySelector('.tickets').textContent = this.scoring.tickets.toLocaleString();
    this.root.querySelector('.tree').innerHTML = columns;
    this.root.querySelector('.tree-total').textContent =
      `${spent.toLocaleString()} of ${up.totalCost().toLocaleString()} Tickets spent on the tree`;
    const reset = this.root.querySelector('[data-reset]');
    reset.textContent = this.confirmingReset ? 'Click again to erase all progress' : 'Reset all progress';
    reset.classList.toggle('armed', this.confirmingReset);
  }

  node(u) {
    const up = this.upgrades;
    const lvl = up.level(u.id);
    const st = up.status(u.id);
    const pips = u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
    const now = lvl > 0 ? `<p class="now">${u.levels[lvl - 1]}</p>` : '';
    const next = st.state === 'maxed' ? '' : `<p class="next">${lvl > 0 ? 'Next: ' : ''}${u.levels[lvl]}</p>`;
    let action;
    if (st.state === 'maxed') {
      action = '<div class="maxed">Maxed</div>';
    } else if (st.state === 'locked') {
      action = `<ul class="reasons">${st.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`;
    } else {
      const afford = this.scoring.tickets >= st.cost;
      action = `<button type="button" data-buy="${u.id}" ${afford ? '' : 'disabled'}>Buy · ${st.cost.toLocaleString()} Tickets</button>`;
    }
    return `<article class="node ${u.capstone ? 'capstone' : ''} ${st.state}">
      <header><h4>${u.name}</h4><span class="pips" aria-label="Level ${lvl} of ${u.costs.length}">${pips}</span></header>
      ${now}${next}${action}
    </article>`;
  }
}
