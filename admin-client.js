// ==================== ADMIN CLIENT - COMPLETE VERSION ====================
const API_URL = 'http://localhost:8080/api';
let token = localStorage.getItem('token');
let currentTab = 'dashboard';
let users = [];
let marketAssets = [];
let adminSettings = {};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const user = await response.json();
        
        if (!user.isAdmin) {
            alert('دسترسی غیرمجاز - فقط ادمین');
            window.location.href = '/app.html';
            return;
        }
        
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
    }
});

async function loadAdminData() {
    try {
        const [usersRes, assetsRes, settingsRes] = await Promise.all([
            fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/market-assets`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        users = await usersRes.json();
        marketAssets = await assetsRes.json();
        adminSettings = await settingsRes.json();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function switchAdminTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderAdminContent();
}

function renderAdminContent() {
    const content = document.getElementById('admin-content');
    
    switch(currentTab) {
        case 'dashboard':
            renderDashboard(content);
            break;
        case 'users':
            renderUsers(content);
            break;
        case 'market':
            renderMarketAssets(content);
            break;
        case 'broadcast':
            renderBroadcast(content);
            break;
        case 'settings':
            renderSettings(content);
            break;
    }
}

// ==================== DASHBOARD ====================
function renderDashboard(content) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.is_admin).length;
    const enabledAssets = marketAssets.filter(a => a.enabled).length;
    
    content.innerHTML = `
        <div class="stats-dashboard">
            <div class="stat-box">
                <h3>تعداد کل کاربران</h3>
                <div class="stat-number">${totalUsers}</div>
            </div>
            <div class="stat-box">
                <h3>کاربران عادی</h3>
                <div class="stat-number">${activeUsers}</div>
            </div>
            <div class="stat-box">
                <h3>نمادهای فعال</h3>
                <div class="stat-number">${enabledAssets}</div>
            </div>
            <div class="stat-box">
                <h3>مدیران سیستم</h3>
                <div class="stat-number">${users.filter(u => u.is_admin).length}</div>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 20px;">فعالیت‌های اخیر</h3>
            <p style="color: var(--text-muted);">آمار فعالیت‌ها به زودی اضافه می‌شود...</p>
        </div>
    `;
}

// ==================== USERS MANAGEMENT ====================
function renderUsers(content) {
    const usersList = users.map(user => `
        <tr>
            <td>${user.fullname || user.username}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
                <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; 
                             background: ${user.is_admin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
                             color: ${user.is_admin ? '#ef4444' : '#10b981'};">
                    ${user.is_admin ? 'مدیر' : 'کاربر'}
                </span>
            </td>
            <td>${new Date(user.created_at).toLocaleDateString('fa-IR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-small" onclick="editUser(${user.id})">ویرایش</button>
                    ${!user.is_admin ? `<button class="btn btn-danger btn-small" onclick="deleteUser(${user.id})">حذف</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>مدیریت کاربران</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>نام کامل</th>
                            <th>نام کاربری</th>
                            <th>ایمیل</th>
                            <th>نقش</th>
                            <th>تاریخ عضویت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usersList}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function deleteUser(userId) {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete user');
        
        alert('کاربر با موفقیت حذف شد');
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در حذف کاربر');
        console.error(error);
    }
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newName = prompt('نام جدید:', user.fullname);
    if (!newName) return;
    
    updateUser(userId, { fullname: newName });
}

async function updateUser(userId, updates) {
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed to update user');
        
        alert('کاربر بروزرسانی شد');
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در بروزرسانی کاربر');
        console.error(error);
    }
}

// ==================== MARKET ASSETS ====================
function renderMarketAssets(content) {
    const assetsList = marketAssets.map(asset => `
        <tr>
            <td>${asset.symbol}</td>
            <td>${asset.name}</td>
            <td>
                <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; 
                             background: rgba(59, 130, 246, 0.2); color: #3b82f6;">
                    ${asset.type}
                </span>
            </td>
            <td style="font-family: monospace; font-size: 0.85rem;">${asset.api_key || '-'}</td>
            <td>${asset.api_source || '-'}</td>
            <td>
                <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; 
                             background: ${asset.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
                             color: ${asset.enabled ? '#10b981' : '#ef4444'};">
                    ${asset.enabled ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-small" onclick="toggleAsset(${asset.id})">
                        ${asset.enabled ? 'غیرفعال' : 'فعال'}
                    </button>
                    <button class="btn btn-primary btn-small" onclick="editAsset(${asset.id})">ویرایش</button>
                    <button class="btn btn-danger btn-small" onclick="deleteAsset(${asset.id})">حذف</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>مدیریت نمادهای بازار</h3>
                <button class="btn btn-primary" onclick="addNewAsset()">+ افزودن نماد جدید</button>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>نماد</th>
                            <th>نام</th>
                            <th>نوع</th>
                            <th>API Key</th>
                            <th>منبع API</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assetsList}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h4 style="margin-bottom: 15px;">راهنمای افزودن نماد</h4>
            <p style="color: var(--text-secondary); margin-bottom: 10px;">برای افزودن نماد جدید:</p>
            <ul style="color: var(--text-muted); padding-right: 20px;">
                <li>نماد: کد یکتای دارایی (مثل BTC)</li>
                <li>نوع: crypto / currency / gold / stock</li>
                <li>API Key: برای Binance از فرمت BTCUSDT استفاده کنید</li>
                <li>منبع API: binance / coingecko / tgju</li>
            </ul>
        </div>
    `;
}

function addNewAsset() {
    const symbol = prompt('نماد (مثل: BTC):');
    if (!symbol) return;
    
    const name = prompt('نام (مثل: بیت کوین):');
    if (!name) return;
    
    const type = prompt('نوع (crypto/currency/gold/stock):');
    if (!type) return;
    
    const apiKey = prompt('API Key (مثل: BTCUSDT):');
    const apiSource = prompt('منبع API (مثل: binance):');
    
    createAsset({
        symbol: symbol.toUpperCase(),
        name,
        type,
        api_key: apiKey,
        api_source: apiSource,
        enabled: 1
    });
}

async function createAsset(assetData) {
    try {
        const response = await fetch(`${API_URL}/admin/market-assets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assetData)
        });
        
        if (!response.ok) throw new Error('Failed to create asset');
        
        alert('نماد با موفقیت اضافه شد');
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در افزودن نماد');
        console.error(error);
    }
}

function editAsset(assetId) {
    const asset = marketAssets.find(a => a.id === assetId);
    if (!asset) return;
    
    const name = prompt('نام جدید:', asset.name);
    if (!name) return;
    
    const apiKey = prompt('API Key جدید:', asset.api_key);
    const apiSource = prompt('منبع API جدید:', asset.api_source);
    
    updateAsset(assetId, {
        name,
        api_key: apiKey || asset.api_key,
        api_source: apiSource || asset.api_source
    });
}

async function updateAsset(assetId, updates) {
    try {
        const response = await fetch(`${API_URL}/admin/market-assets/${assetId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed to update asset');
        
        alert('نماد بروزرسانی شد');
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در بروزرسانی نماد');
        console.error(error);
    }
}

async function toggleAsset(assetId) {
    const asset = marketAssets.find(a => a.id === assetId);
    if (!asset) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/market-assets/${assetId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: asset.enabled ? 0 : 1 })
        });
        
        if (!response.ok) throw new Error('Failed to toggle asset');
        
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در تغییر وضعیت');
        console.error(error);
    }
}

async function deleteAsset(assetId) {
    if (!confirm('آیا از حذف این نماد اطمینان دارید؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/market-assets/${assetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete asset');
        
        alert('نماد حذف شد');
        await loadAdminData();
        renderAdminContent();
    } catch (error) {
        alert('خطا در حذف نماد');
        console.error(error);
    }
}

// ==================== BROADCAST ====================
function renderBroadcast(content) {
    content.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom: 20px;">📢 ارسال پیام همگانی</h3>
            
            <div class="broadcast-box">
                <div class="form-group">
                    <label class="form-label">عنوان پیام *</label>
                    <input type="text" class="form-input" id="broadcastTitle" placeholder="مثال: اطلاعیه مهم">
                </div>
                
                <div class="form-group">
                    <label class="form-label">متن پیام *</label>
                    <textarea class="form-textarea" id="broadcastMessage" rows="5" 
                              placeholder="پیام خود را اینجا بنویسید..."></textarea>
                </div>
                
                <button class="btn btn-primary" onclick="sendBroadcast()" style="width: 100%;">
                    📨 ارسال به همه کاربران
                </button>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 12px;">
                <p style="color: #ef4444; font-weight: 600;">⚠️ توجه:</p>
                <p style="color: var(--text-secondary); margin-top: 5px;">
                    این پیام برای تمام کاربران سیستم ارسال خواهد شد و در بخش اعلان‌های آنها نمایش داده می‌شود.
                </p>
            </div>
        </div>
    `;
}

async function sendBroadcast() {
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    
    if (!title || !message) {
        alert('لطفاً عنوان و متن پیام را وارد کنید');
        return;
    }
    
    if (!confirm('آیا از ارسال این پیام به همه کاربران اطمینان دارید؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/broadcast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, message })
        });
        
        if (!response.ok) throw new Error('Failed to send broadcast');
        
        alert('پیام با موفقیت ارسال شد!');
        document.getElementById('broadcastTitle').value = '';
        document.getElementById('broadcastMessage').value = '';
    } catch (error) {
        alert('خطا در ارسال پیام');
        console.error(error);
    }
}

// ==================== SETTINGS ====================
function renderSettings(content) {
    content.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom: 20px;">⚙️ تنظیمات سیستم</h3>
            
            <div style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--accent-cyan);">تغییر رمز مدیر</h4>
                <div class="broadcast-box">
                    <div class="form-group">
                        <label class="form-label">نام کاربری جدید</label>
                        <input type="text" class="form-input" id="newAdminUsername" value="esyadmin">
                    </div>
                    <div class="form-group">
                        <label class="form-label">رمز عبور جدید</label>
                        <input type="password" class="form-input" id="newAdminPassword">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تکرار رمز عبور</label>
                        <input type="password" class="form-input" id="confirmAdminPassword">
                    </div>
                    <button class="btn btn-primary" onclick="updateAdminCredentials()">ذخیره تغییرات</button>
                </div>
            </div>
            
            <div>
                <h4 style="margin-bottom: 15px; color: var(--accent-cyan);">اطلاعات سیستم</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">نسخه سیستم</div>
                        <div class="stat-value">2.0.0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">تعداد کاربران</div>
                        <div class="stat-value">${users.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">نمادهای بازار</div>
                        <div class="stat-value">${marketAssets.length}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function updateAdminCredentials() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const confirm = document.getElementById('confirmAdminPassword').value;
    
    if (!username || !password) {
        alert('لطفاً همه فیلدها را پر کنید');
        return;
    }
    
    if (password !== confirm) {
        alert('رمز عبور و تکرار آن یکسان نیستند');
        return;
    }
    
    if (password.length < 6) {
        alert('رمز عبور باید حداقل 6 کاراکتر باشد');
        return;
    }
    
    if (!confirm('آیا از تغییر اطلاعات ورود مدیر اطمینان دارید؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/credentials`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Failed to update credentials');
        
        alert('اطلاعات مدیر با موفقیت بروزرسانی شد!\nلطفاً با اطلاعات جدید وارد شوید.');
        logout();
    } catch (error) {
        alert('خطا در بروزرسانی اطلاعات');
        console.error(error);
    }
}

// ==================== UTILITY ====================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}
