const app = document.getElementById('app');
const nav = document.getElementById('nav');

let currentUser = null;

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function checkSession() {
  try {
    currentUser = await api('/auth/me');
  } catch {
    currentUser = null;
  }
  renderNav();
}

function renderNav() {
  nav.innerHTML = '';
  if (currentUser) {
    const dashLabel = currentUser.role === 'farmer' ? 'My Listings'
      : currentUser.role === 'admin' ? 'Admin' : 'My Orders';
    nav.innerHTML = `
      <button onclick="showBrowse()">Browse</button>
      <button onclick="showDashboard()">${dashLabel}</button>
      <button onclick="logout()">Logout (${currentUser.name})</button>
    `;
  } else {
    nav.innerHTML = `
      <button onclick="showBrowse()">Browse</button>
      <button onclick="showLogin()">Login</button>
      <button onclick="showRegister()">Register</button>
    `;
  }
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  currentUser = null;
  renderNav();
  showBrowse();
}

// ---------- Browse (public) ----------
async function showBrowse() {
  app.innerHTML = '<p>Loading products…</p>';
  const products = await api('/products');
  app.innerHTML = `
    <h2>Fresh from the farm</h2>
    <div class="product-grid">
      ${products.map(p => `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <p><strong>₹${p.price}</strong> / ${p.unit}</p>
          <span class="badge">${p.stock} ${p.unit} in stock</span><br>
          <small>Sold by ${p.farmer?.name || 'Unknown farmer'}</small>
          ${currentUser && currentUser.role === 'customer'
            ? `<div><input type="number" min="1" max="${p.stock}" value="1" id="qty-${p._id}" style="width:70px;display:inline-block;">
               <button class="primary" onclick="placeOrder('${p._id}')">Order</button></div>`
            : ''}
        </div>
      `).join('') || '<p>No products listed yet.</p>'}
    </div>
  `;
}

async function placeOrder(productId) {
  const qty = parseInt(document.getElementById(`qty-${productId}`).value, 10);
  try {
    await api('/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [{ productId, quantity: qty }] })
    });
    alert('Order placed!');
    showBrowse();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Auth forms ----------
function showLogin() {
  app.innerHTML = `
    <div class="card" style="max-width:400px;">
      <h2>Login</h2>
      <div class="error" id="err"></div>
      <input id="email" placeholder="Email">
      <input id="password" type="password" placeholder="Password">
      <button class="primary" onclick="doLogin()">Login</button>
    </div>
  `;
}

async function doLogin() {
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    currentUser = user;
    renderNav();
    showBrowse();
  } catch (err) {
    document.getElementById('err').textContent = err.message;
  }
}

function showRegister() {
  app.innerHTML = `
    <div class="card" style="max-width:400px;">
      <h2>Register</h2>
      <div class="error" id="err"></div>
      <input id="name" placeholder="Full name">
      <input id="email" placeholder="Email">
      <input id="password" type="password" placeholder="Password">
      <select id="role">
        <option value="customer">Customer</option>
        <option value="farmer">Farmer</option>
      </select>
      <button class="primary" onclick="doRegister()">Create account</button>
    </div>
  `;
}

async function doRegister() {
  try {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const { user } = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
    currentUser = user;
    renderNav();
    showBrowse();
  } catch (err) {
    document.getElementById('err').textContent = err.message;
  }
}

// ---------- Dashboard router ----------
function showDashboard() {
  if (!currentUser) return showLogin();
  if (currentUser.role === 'farmer') return showFarmerDashboard();
  if (currentUser.role === 'admin') return showAdminDashboard();
  return showCustomerOrders();
}

// ---------- Farmer dashboard ----------
async function showFarmerDashboard() {
  const products = await api('/products/mine');
  app.innerHTML = `
    <h2>My Listings</h2>
    <div class="card">
      <h3>Add a new listing</h3>
      <input id="p-name" placeholder="Product name">
      <input id="p-price" type="number" placeholder="Price">
      <input id="p-stock" type="number" placeholder="Stock">
      <input id="p-unit" placeholder="Unit (e.g. kg)" value="kg">
      <button class="primary" onclick="addProduct()">Add</button>
    </div>
    ${products.map(p => `
      <div class="card">
        <strong>${p.name}</strong> — ₹${p.price} / ${p.unit} — ${p.stock} in stock
        <div>
          <input type="number" id="stock-${p._id}" value="${p.stock}" style="width:80px;display:inline-block;">
          <button onclick="updateStock('${p._id}')">Update stock</button>
          <button onclick="deleteProduct('${p._id}')">Delete</button>
        </div>
      </div>
    `).join('') || '<p>No listings yet — add one above.</p>'}
  `;
}

async function addProduct() {
  const name = document.getElementById('p-name').value;
  const price = parseFloat(document.getElementById('p-price').value);
  const stock = parseInt(document.getElementById('p-stock').value, 10);
  const unit = document.getElementById('p-unit').value;
  try {
    await api('/products', { method: 'POST', body: JSON.stringify({ name, price, stock, unit }) });
    showFarmerDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function updateStock(id) {
  const stock = parseInt(document.getElementById(`stock-${id}`).value, 10);
  await api(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ stock }) });
  showFarmerDashboard();
}

async function deleteProduct(id) {
  await api(`/products/${id}`, { method: 'DELETE' });
  showFarmerDashboard();
}

// ---------- Customer order history ----------
async function showCustomerOrders() {
  const orders = await api('/orders/mine');
  app.innerHTML = `
    <h2>My Orders</h2>
    ${orders.map(o => `
      <div class="card">
        <strong>Order ${o._id.slice(-6)}</strong> — ₹${o.totalAmount} — <span class="badge">${o.status}</span>
        <ul>${o.items.map(i => `<li>${i.name} × ${i.quantity}</li>`).join('')}</ul>
      </div>
    `).join('') || '<p>No orders yet.</p>'}
  `;
}

// ---------- Admin dashboard ----------
async function showAdminDashboard() {
  const [users, products, orders] = await Promise.all([
    api('/admin/users'), api('/admin/products'), api('/admin/orders')
  ]);
  app.innerHTML = `
    <h2>Admin Dashboard</h2>
    <h3>Users (${users.length})</h3>
    ${users.map(u => `<div class="card">${u.name} — ${u.email} — <span class="badge">${u.role}</span>
      <button onclick="removeUser('${u._id}')">Remove</button></div>`).join('')}
    <h3>Listings (${products.length})</h3>
    ${products.map(p => `<div class="card">${p.name} by ${p.farmer?.name || '—'} — ₹${p.price}
      <button onclick="removeProduct('${p._id}')">Remove</button></div>`).join('')}
    <h3>Orders (${orders.length})</h3>
    ${orders.map(o => `<div class="card">${o.customer?.name || '—'} — ₹${o.totalAmount} — ${o.status}</div>`).join('')}
  `;
}

async function removeUser(id) {
  await api(`/admin/users/${id}`, { method: 'DELETE' });
  showAdminDashboard();
}

async function removeProduct(id) {
  await api(`/admin/products/${id}`, { method: 'DELETE' });
  showAdminDashboard();
}

// ---------- Init ----------
checkSession().then(showBrowse);
