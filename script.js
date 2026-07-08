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

/* ==========================================================================
   SECTION TABS — switches between Demand / Flash Sales / Reviews / Sellers
   ========================================================================== */
const sectionMeta = {
  demand:  {title:"Product Demand",        sub:"What's actually showing real buying demand right now — not just trending ads"},
  flash:   {title:"Flash Sales",           sub:"Live stock depletion across active flash-sale listings"},
  reviews: {title:"Recent Reviews",        sub:"Newest verified reviews, feeding your demand-velocity signal"},
  sellers: {title:"Sellers to Watch",      sub:"Sellers with repeated, sustained flash-sale placement"},
};

document.querySelectorAll('.section-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.section-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));

    const key = tab.dataset.section;
    document.getElementById('view-' + key).classList.add('active');
    document.getElementById('topbar-title').textContent = sectionMeta[key].title;
    document.getElementById('topbar-sub').textContent = sectionMeta[key].sub;
  });
});

/* ==========================================================================
   FLASH SALES — mock data, shaped like scrape_output/flash_sales_listing.json
   would look once the scraper (parsers.py: parse_listing_cards) is wired in.
   Real swap-in later: fetch('/api/flash-sales') -> replace flashSales array.
   ========================================================================== */
const flashSales = [
  {name:"Xiaomi Redmi Buds 6 Play", cat:"Écouteurs Bluetooth", icon:"🎧", price:99, oldPrice:110, claimedPct:82, seller:"Jumia"},
  {name:"Magnetic Car Phone Holder 360°", cat:"Auto Accessories", icon:"📱", price:79, oldPrice:120, claimedPct:91, seller:"AutoStyle MA"},
  {name:"LED Galaxy Projector Lamp", cat:"Home Decor", icon:"💡", price:129, oldPrice:180, claimedPct:64, seller:"HomeGlow Store"},
  {name:"Portable Mini Fan Neck Strap", cat:"Personal Care", icon:"🌀", price:55, oldPrice:80, claimedPct:73, seller:"CoolBreeze"},
  {name:"Wireless Ring Light Tripod Kit", cat:"Electronics", icon:"💡", price:169, oldPrice:220, claimedPct:38, seller:"PhotoPro MA"},
  {name:"Anti-Slip Yoga Mat Premium", cat:"Personal Care", icon:"🧘", price:99, oldPrice:135, claimedPct:55, seller:"FitZone"},
];

function renderFlashSales(){
  const grid = document.getElementById('flash-grid');
  grid.innerHTML = flashSales.map(f=>{
    const barClass = f.claimedPct >= 75 ? 'hot' : '';
    return `
      <div class="flash-card">
        <div class="flash-card-top">
          <div class="prod-thumb">${f.icon}</div>
          <div>
            <div class="flash-card-name">${f.name}</div>
            <div class="flash-card-cat">${f.cat}</div>
          </div>
        </div>
        <div class="flash-card-prices">
          <span class="flash-card-price">${f.price} MAD</span>
          <span class="flash-card-oldprice">${f.oldPrice} MAD</span>
        </div>
        <div class="flash-stock-row">
          <div class="flash-stock-label"><span>Claimed</span><span>${f.claimedPct}%</span></div>
          <div class="flash-stock-bar"><i class="${barClass}" style="width:${f.claimedPct}%"></i></div>
        </div>
        <div class="flash-seller">Sold by <b>${f.seller}</b></div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   RECENT REVIEWS — mock data, shaped like the `reviews` array returned per
   product from parsers.py: parse_product_page(). Real swap-in later:
   fetch('/api/reviews-feed') -> replace reviewsFeed array.
   ========================================================================== */
const reviewsFeed = [
  {product:"Xiaomi Redmi Buds 6 Play", icon:"🎧", reviewer:"Yassine", rating:5, date:"2 hours ago", verified:true,
    text:"Qualité son top pour ce prix, la batterie tient toute la journée."},
  {product:"Magnetic Car Phone Holder 360°", icon:"📱", reviewer:"Salma", rating:4, date:"5 hours ago", verified:true,
    text:"Tient bien même sur route défoncée, montage facile."},
  {product:"Portable Mini Fan Neck Strap", icon:"🌀", reviewer:"Hamza", rating:5, date:"9 hours ago", verified:true,
    text:"Parfait pour l'été, silencieux et léger."},
  {product:"LED Galaxy Projector Lamp", icon:"💡", reviewer:"Imane", rating:3, date:"1 day ago", verified:true,
    text:"Joli effet mais l'app de contrôle plante parfois."},
  {product:"Anti-Slip Yoga Mat Premium", icon:"🧘", reviewer:"Nabil", rating:5, date:"1 day ago", verified:false,
    text:"Bon grip, épaisseur confortable pour les genoux."},
  {product:"Wireless Ring Light Tripod Kit", icon:"💡", reviewer:"Fatima Z.", rating:4, date:"2 days ago", verified:true,
    text:"Bon rapport qualité prix pour du contenu réseaux sociaux."},
];

function renderReviewsFeed(){
  const feed = document.getElementById('reviews-feed');
  feed.innerHTML = reviewsFeed.map(r=>{
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    return `
      <div class="review-row">
        <div class="review-thumb">${r.icon}</div>
        <div class="review-body">
          <div class="review-top">
            <span class="review-prod">${r.product}${r.verified ? '<span class="review-badge">Achat vérifié</span>' : ''}</span>
            <span class="review-meta">${r.date}</span>
          </div>
          <div class="review-stars">${stars}</div>
          <div class="review-text">${r.text}</div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   SELLERS TO WATCH — mock data, shaped like a rollup query over the
   `sellers` / `product_snapshots` tables in storage.py once populated by
   repeated scraper runs. Real swap-in later: fetch('/api/sellers').
   ========================================================================== */
const sellers = [
  {name:"AutoStyle MA", flashNow:6, appearances30d:22, depletion:"fast", depletionLabel:"91%/day", categorySpread:"Auto, Electronics", rating:"98%"},
  {name:"HomeGlow Store", flashNow:4, appearances30d:17, depletion:"med", depletionLabel:"58%/day", categorySpread:"Home Decor", rating:"96%"},
  {name:"CoolBreeze", flashNow:3, appearances30d:14, depletion:"fast", depletionLabel:"79%/day", categorySpread:"Personal Care", rating:"100%"},
  {name:"PhotoPro MA", flashNow:2, appearances30d:6, depletion:"slow", depletionLabel:"31%/day", categorySpread:"Electronics", rating:"93%"},
  {name:"FitZone", flashNow:2, appearances30d:9, depletion:"med", depletionLabel:"52%/day", categorySpread:"Personal Care, Home Decor", rating:"97%"},
];

function renderSellers(){
  const tbody = document.getElementById('sellers-body');
  tbody.innerHTML = sellers.map(s=>`
    <tr>
      <td class="seller-name-cell">${s.name}</td>
      <td class="mono">${s.flashNow}</td>
      <td class="mono">${s.appearances30d}</td>
      <td class="depletion-${s.depletion}">${s.depletionLabel}</td>
      <td>${s.categorySpread}</td>
      <td class="mono">${s.rating}</td>
    </tr>
  `).join('');
}

renderFlashSales();
renderReviewsFeed();
renderSellers();
