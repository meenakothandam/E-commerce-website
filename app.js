/* ==========================================================================
   Shoply — app.js
   A localStorage-backed "backend" so the whole flow (registration, login,
   products, cart, orders, admin) works with plain static HTML pages.
   ========================================================================== */

const DB_KEYS = {
  users: 'shoply_users',
  products: 'shoply_products',
  carts: 'shoply_carts',       // { [userId]: [{productId, qty}] }
  orders: 'shoply_orders',
  session: 'shoply_session',
  seeded: 'shoply_seeded'
};

/* ---------------- low level storage helpers ---------------- */
function readDB(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function writeDB(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix){
  return prefix + '_' + Math.random().toString(36).slice(2,9);
}

/* ---------------- seed data (runs once) ---------------- */
function seedData(){
  if(localStorage.getItem(DB_KEYS.seeded)) return;

  const products = [
    { id:'p1', name:'Aalto Pour-Over Kettle', category:'Kitchen', price:2499, stock:14, art:'🫖', color:'#F3E7D8', description:'Gooseneck stainless kettle with a slow, even pour for hand-brewed coffee.' },
    { id:'p2', name:'Wovenlight Table Lamp', category:'Home', price:3299, stock:8, art:'💡', color:'#F0E4EE', description:'Rattan-shade lamp that casts a warm, diffused glow. Dimmable, oak base.' },
    { id:'p3', name:'Fieldnote Leather Journal', category:'Stationery', price:899, stock:32, art:'📓', color:'#E6EEE0', description:'A5 refillable journal, full-grain leather cover, 160gsm cream paper.' },
    { id:'p4', name:'Basalt Ceramic Mug Set', category:'Kitchen', price:1299, stock:20, art:'☕', color:'#E4E7F0', description:'Set of two matte-glazed stoneware mugs, 300ml each, dishwasher safe.' },
    { id:'p5', name:'Trail Ridge Daypack', category:'Bags', price:4599, stock:6, art:'🎒', color:'#F0E8DC', description:'20L water-resistant daypack with a padded 15" laptop sleeve.' },
    { id:'p6', name:'Meridian Wool Throw', category:'Home', price:3899, stock:11, art:'🧶', color:'#EDE1E1', description:'Merino wool throw blanket, woven in a soft herringbone pattern.' },
    { id:'p7', name:'Studio Desk Organizer', category:'Office', price:1599, stock:3, art:'🗂️', color:'#E2ECE8', description:'Solid oak organizer with three trays for pens, cards, and notes.' },
    { id:'p8', name:'Halcyon Table Clock', category:'Home', price:2199, stock:17, art:'🕰️', color:'#F2E9D9', description:'Silent-sweep table clock with a brushed brass frame.' },
    { id:'p9', name:'Marrow Chef\'s Knife', category:'Kitchen', price:3499, stock:9, art:'🔪', color:'#E6E6EE', description:'8" forged carbon-steel chef\'s knife with a walnut handle.' },
    { id:'p10', name:'Cordage Desk Mat', category:'Office', price:1199, stock:25, art:'🖥️', color:'#E8E4F0', description:'Water-resistant vegan-leather desk mat, 80x40cm, dual-tone.' },
    { id:'p11', name:'Loam Plant Pot Trio', category:'Home', price:1799, stock:0, art:'🪴', color:'#E1EAD9', description:'Three stoneware planters in graduated sizes with drainage trays.' },
    { id:'p12', name:'Overland Travel Duffel', category:'Bags', price:5299, stock:5, art:'🧳', color:'#EDE6DA', description:'Weatherproof canvas duffel with reinforced leather trim, 45L.' }
  ];

  const users = [
    { id:'u_admin', name:'Store Admin', email:'admin@shoply.com', password:'admin123', role:'admin', phone:'', address:'' }
  ];

  writeDB(DB_KEYS.products, products);
  writeDB(DB_KEYS.users, users);
  writeDB(DB_KEYS.carts, {});
  writeDB(DB_KEYS.orders, []);
  localStorage.setItem(DB_KEYS.seeded, '1');
}
seedData();

/* ---------------- data accessors ---------------- */
const Store = {
  getUsers(){ return readDB(DB_KEYS.users, []); },
  saveUsers(u){ writeDB(DB_KEYS.users, u); },

  getProducts(){ return readDB(DB_KEYS.products, []); },
  saveProducts(p){ writeDB(DB_KEYS.products, p); },
  getProduct(id){ return this.getProducts().find(p => p.id === id); },

  getCarts(){ return readDB(DB_KEYS.carts, {}); },
  saveCarts(c){ writeDB(DB_KEYS.carts, c); },
  getCartFor(userId){ return this.getCarts()[userId] || []; },
  saveCartFor(userId, items){
    const carts = this.getCarts();
    carts[userId] = items;
    this.saveCarts(carts);
  },

  getOrders(){ return readDB(DB_KEYS.orders, []); },
  saveOrders(o){ writeDB(DB_KEYS.orders, o); },
  getOrdersFor(userId){ return this.getOrders().filter(o => o.userId === userId); }
};

/* ---------------- session / auth ---------------- */
const Auth = {
  current(){ return readDB(DB_KEYS.session, null); },
  login(email, password){
    const user = Store.getUsers().find(u =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if(!user) return null;
    writeDB(DB_KEYS.session, { userId:user.id, role:user.role, name:user.name, email:user.email });
    return user;
  },
  register({name, email, password, phone, address}){
    const users = Store.getUsers();
    if(users.some(u => u.email.toLowerCase() === email.toLowerCase())){
      return { error:'An account with this email already exists.' };
    }
    const user = { id:uid('u'), name, email, password, role:'user', phone:phone||'', address:address||'' };
    users.push(user);
    Store.saveUsers(users);
    writeDB(DB_KEYS.session, { userId:user.id, role:'user', name:user.name, email:user.email });
    return { user };
  },
  logout(){
    localStorage.removeItem(DB_KEYS.session);
    window.location.href = 'login.html';
  },
  /** Redirects away if the visitor isn't logged in / wrong role. Returns the session. */
  requireRole(role){
    const session = this.current();
    if(!session){
      window.location.href = 'login.html';
      return null;
    }
    if(role && session.role !== role){
      window.location.href = session.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
      return null;
    }
    return session;
  }
};

/* ---------------- formatting helpers ---------------- */
function formatPrice(n){
  return '₹' + Number(n).toLocaleString('en-IN');
}
function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
         ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}
function orderCode(id){
  return '#SH-' + id.slice(-6).toUpperCase();
}
function escapeHtml(s){
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ---------------- toast notifications ---------------- */
function toast(message, kind){
  let root = document.getElementById('toast-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="icon">${kind === 'error' ? '!' : '✓'}</span><span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .25s ease';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

/* ---------------- shared nav rendering ---------------- */
function cartCount(){
  const session = Auth.current();
  if(!session || session.role !== 'user') return 0;
  return Store.getCartFor(session.userId).reduce((sum, i) => sum + i.qty, 0);
}

function renderUserNav(activePage){
  const mount = document.getElementById('topnav');
  if(!mount) return;
  const session = Auth.current();
  const count = cartCount();
  const link = (href, label, key) =>
    `<a href="${href}" class="${activePage===key ? 'active':''}">${label}</a>`;

  mount.innerHTML = `
    <div class="bar">
      <a href="dashboard.html" class="brand">Shoply<span class="dot">.</span></a>
      <div class="nav-links">
        ${link('dashboard.html','Shop','dashboard')}
        ${link('orders.html','My Orders','orders')}
        <a href="cart.html" class="cart-link ${activePage==='cart'?'active':''}">Cart${count ? `<span class="cart-badge">${count}</span>` : ''}</a>
        <span class="nav-role">${session ? escapeHtml(session.name) : ''}</span>
        <a href="#" id="logout-link">Logout</a>
      </div>
    </div>`;
  const logoutLink = document.getElementById('logout-link');
  if(logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
}

function renderAdminSidebar(activePage){
  const mount = document.getElementById('admin-side');
  if(!mount) return;
  const session = Auth.current();
  const link = (href, label, key) =>
    `<a href="${href}" class="${activePage===key ? 'active':''}">${label}</a>`;
  mount.innerHTML = `
    ${link('admin-dashboard.html','Overview','overview')}
    ${link('add-product.html','Add Product','add-product')}
    ${link('admin-orders.html','Orders','orders')}
    ${link('admin-customers.html','Customers','customers')}
  `;
  const roleTag = document.getElementById('admin-role-tag');
  if(roleTag && session) roleTag.textContent = session.name;
}

function renderAdminNav(){
  const mount = document.getElementById('topnav');
  if(!mount) return;
  mount.innerHTML = `
    <div class="bar">
      <a href="admin-dashboard.html" class="brand">Shoply<span class="dot">.</span> <span class="nav-role" style="margin-left:8px;">Admin</span></a>
      <div class="nav-links">
        <span class="nav-role" id="admin-role-tag"></span>
        <a href="#" id="logout-link">Logout</a>
      </div>
    </div>`;
  const logoutLink = document.getElementById('logout-link');
  if(logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
}
