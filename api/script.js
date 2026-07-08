const products = [
  {name:"Magnetic Car Phone Holder 360°", cat:"Auto Accessories", icon:"📱", price:89, demand:91, trend:"up", trendVal:18, reviews:412, stock:"in",
    rating:4.6, weeklyUnits:"~340", priceChange30d:"-6%", firstSeen:"58 days ago", competitorCount:14, returnRate:"2.1%",
    spark:[40,42,45,48,52,58,55,60,66,70,74,80,86,91]},
  {name:"LED Galaxy Projector Lamp", cat:"Home Decor", icon:"💡", price:149, demand:86, trend:"up", trendVal:12, reviews:298, stock:"low",
    rating:4.4, weeklyUnits:"~210", priceChange30d:"+3%", firstSeen:"41 days ago", competitorCount:11, returnRate:"3.4%",
    spark:[55,54,58,60,59,63,68,70,74,76,79,82,84,86]},
  {name:"Portable Mini Fan Neck Strap", cat:"Personal Care", icon:"🌀", price:65, demand:82, trend:"up", trendVal:9, reviews:540, stock:"in",
    rating:4.5, weeklyUnits:"~395", priceChange30d:"-2%", firstSeen:"70 days ago", competitorCount:9, returnRate:"1.8%",
    spark:[60,61,64,63,66,68,70,72,75,76,78,79,80,82]},
  {name:"Wireless Ring Light Tripod Kit", cat:"Electronics", icon:"💡", price:199, demand:77, trend:"flat", trendVal:1, reviews:176, stock:"in",
    rating:4.2, weeklyUnits:"~120", priceChange30d:"0%", firstSeen:"35 days ago", competitorCount:6, returnRate:"4.0%",
    spark:[75,76,74,77,76,78,77,76,78,77,76,77,78,77]},
  {name:"Anti-Slip Yoga Mat Premium", cat:"Personal Care", icon:"🧘", price:120, demand:71, trend:"up", trendVal:6, reviews:233, stock:"in",
    rating:4.3, weeklyUnits:"~160", priceChange30d:"-1%", firstSeen:"90 days ago", competitorCount:8, returnRate:"2.5%",
    spark:[60,61,63,62,64,65,66,65,67,68,69,70,71,71]},
  {name:"Smart Posture Corrector Belt", cat:"Personal Care", icon:"🩺", price:99, demand:65, trend:"down", trendVal:-4, reviews:142, stock:"low",
    rating:4.0, weeklyUnits:"~90", priceChange30d:"+5%", firstSeen:"50 days ago", competitorCount:5, returnRate:"5.2%",
    spark:[72,71,70,69,70,68,67,68,66,65,66,65,64,65]},
  {name:"Mini Sewing Machine Handheld", cat:"Electronics", icon:"🧵", price:159, demand:58, trend:"up", trendVal:3, reviews:88, stock:"in",
    rating:4.1, weeklyUnits:"~55", priceChange30d:"-4%", firstSeen:"22 days ago", competitorCount:4, returnRate:"3.0%",
    spark:[50,51,52,51,53,54,53,55,56,55,57,58,57,58]},
  {name:"Stainless Steel Vegetable Cutter Set", cat:"Home Decor", icon:"🔪", price:79, demand:52, trend:"down", trendVal:-7, reviews:64, stock:"out",
    rating:3.9, weeklyUnits:"~35", priceChange30d:"+8%", firstSeen:"110 days ago", competitorCount:7, returnRate:"4.6%",
    spark:[62,61,59,58,57,55,56,54,53,52,53,51,52,52]},
  {name:"USB Rechargeable Desk Lamp", cat:"Electronics", icon:"🪔", price:135, demand:48, trend:"flat", trendVal:0, reviews:51, stock:"in",
    rating:4.0, weeklyUnits:"~30", priceChange30d:"0%", firstSeen:"65 days ago", competitorCount:6, returnRate:"2.9%",
    spark:[48,49,47,48,49,48,47,48,49,48,47,48,49,48]},
  {name:"Moroccan Tile Print Throw Pillow", cat:"Home Decor", icon:"🛋️", price:69, demand:45, trend:"up", trendVal:5, reviews:39, stock:"in",
    rating:4.2, weeklyUnits:"~28", priceChange30d:"-3%", firstSeen:"18 days ago", competitorCount:3, returnRate:"2.0%",
    spark:[38,39,38,40,41,40,42,43,42,44,43,45,44,45]},
];

let activeFilter = "all";
let searchTerm = "";

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

  const max = Math.max(...p.spark);
  document.getElementById('modal-spark').innerHTML = p.spark.map(v=>
    `<i style="height:${Math.max(8,(v/max)*100)}%"></i>`
  ).join('');

  document.getElementById('modal-details').innerHTML = `
    <div class="metric-list-row"><span>Est. weekly units sold</span><b>${p.weeklyUnits}</b></div>
    <div class="metric-list-row"><span>Price change (30d)</span><b>${p.priceChange30d}</b></div>
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

renderProducts();
