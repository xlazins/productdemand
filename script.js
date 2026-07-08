let products = [];
let activeFilter = "all";
let searchTerm = "";

// Real scraped data has different fields than the old mock data (no historical
// demand score, trend, or 14-day spark chart yet — that needs repeated scrapes
// over time, which we haven't set up). This maps what we DO have from a single
// scrape into something the existing UI can render, with honest placeholders
// for anything that genuinely requires history we don't have yet.
function mapProduct(p) {
  // Rough placeholder "demand" score from today's discount + flash-sale
  // depletion, just so the bar isn't empty. NOT a real demand score yet —
  // swap this out once you're tracking review/rank changes over time.
  const discountScore = p.discountAmount ? Math.min(p.discountAmount * 2, 50) : 0;
  const depletionScore = p.flashSaleStockClaimedPct || 0;
  const demand = Math.round(Math.min(discountScore + depletionScore * 0.5, 100));

  let stock = "in";
  if (p.flashSaleStockClaimedPct !== null && p.flashSaleStockClaimedPct !== undefined) {
    if (p.flashSaleStockClaimedPct >= 90) stock = "low";
  }

  return {
    name: p.name || "Unnamed product",
    cat: p.category || "Uncategorized",
    icon: "🛍️",
    price: p.price ?? 0,
    demand,
    trend: "flat", // no history yet
    trendVal: 0,   // no history yet
    reviews: p.reviewCount ?? 0,
    stock,
    rating: p.rating ?? 0,
    weeklyUnits: "—",       // requires repeated scrapes over time
    priceChange30d: p.discountLabel ? `-${p.discountLabel}` : "0%",
    firstSeen: "—",         // requires repeated scrapes over time
    competitorCount: "—",
    returnRate: "—",
    spark: Array(14).fill(demand), // flat line placeholder until real history exists
    productUrl: p.productUrl || null,
  };
}

async function loadProducts() {
  const tbody = document.getElementById('demand-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--fg-dim);padding:30px;">Loading products…</td></tr>`;
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const raw = await res.json();
    products = raw.map(mapProduct);
  } catch (err) {
    console.error("Failed to load products:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--fg-dim);padding:30px;">Couldn't load products: ${err.message}</td></tr>`;
    return;
  }
  renderProducts();
}

function renderProducts(){
  const tbody = document.getElementById('demand-body');
  tbody.innerHTML = '';
  const filtered = products.filter(p=>{
    const matchCat = activeFilter === 'all' || p.cat === activeFilter;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a,b)=> b.demand - a.demand);

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--fg-dim);padding:30px;">No products match this filter</td></tr>`;
    return;
  }

  filtered.forEach(p=>{
    const row = document.createElement('tr');
    row.className = 'clickable';
    row.innerHTML = `
      <td>
        <div class="prod-cell">
          <div class="prod-thumb">${p.icon}</div>
          <div>
            <div class="prod-name">${p.name}</div>
            <div class="prod-cat">${p.cat}</div>
          </div>
        </div>
      </td>
      <td class="price">${p.price} MAD</td>
      <td>
        <div class="demand-bar-wrap">
          <div class="demand-bar"><i style="width:${p.demand}%"></i></div>
          <span class="demand-num">${p.demand}</span>
        </div>
      </td>
      <td><span class="trend ${p.trend}">${p.trendVal > 0 ? '+' : ''}${p.trendVal}%</span></td>
      <td class="mono">${p.reviews}</td>
      <td>
        <span class="stock-dot ${p.stock}"></span>${p.stock === 'in' ? 'In stock' : p.stock === 'low' ? 'Low stock' : 'Out of stock'}
      </td>
    `;
    row.addEventListener('click', ()=> openModal(p));
    tbody.appendChild(row);
  });
}

document.querySelectorAll('.filter-group .btn-ghost').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.filter-group .btn-ghost').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderProducts();
  });
});

document.getElementById('search-box').addEventListener('input', (e)=>{
  searchTerm = e.target.value;
  renderProducts();
});

/* ---------- PRODUCT DETAIL MODAL ---------- */
function openModal(p){
  document.getElementById('modal-icon').textContent = p.icon;
  document.getElementById('modal-title').textContent = p.name;
  document.getElementById('modal-cat').textContent = p.cat;

  document.getElementById('modal-stats').innerHTML = `
    <div class="modal-stat"><div class="modal-stat-label">Demand Score</div><div class="modal-stat-value">${p.demand}</div></div>
    <div class="modal-stat"><div class="modal-stat-label">Price</div><div class="modal-stat-value">${p.price} MAD</div></div>
    <div class="modal-stat"><div class="modal-stat-label">Rating</div><div class="modal-stat-value">${p.rating} ★</div></div>
  `;

  const max = Math.max(...p.spark, 1);
  document.getElementById('modal-spark').innerHTML = p.spark.map(v=>
    `<i style="height:${Math.max(8,(v/max)*100)}%"></i>`
  ).join('');

  document.getElementById('modal-details').innerHTML = `
    <div class="metric-list-row"><span>Est. weekly units sold</span><b>${p.weeklyUnits}</b></div>
    <div class="metric-list-row"><span>Today's discount</span><b>${p.priceChange30d}</b></div>
    <div class="metric-list-row"><span>Reviews</span><b>${p.reviews}</b></div>
    <div class="metric-list-row"><span>Return rate</span><b>${p.returnRate}</b></div>
    <div class="metric-list-row"><span>Listings tracked for this product</span><b>${p.competitorCount}</b></div>
    <div class="metric-list-row"><span>First seen</span><b>${p.firstSeen}</b></div>
    <div class="metric-list-row"><span>Stock status</span><b>${p.stock === 'in' ? 'In stock' : p.stock === 'low' ? 'Low stock' : 'Out of stock'}</b></div>
  `;

  document.getElementById('modal-overlay').classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', ()=>{
  document.getElementById('modal-overlay').classList.remove('open');
});
document.getElementById('modal-overlay').addEventListener('click', (e)=>{
  if(e.target.id === 'modal-overlay') document.getElementById('modal-overlay').classList.remove('open');
});

loadProducts();
