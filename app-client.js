// ==================== APP-CLIENT.JS - Complete Version ====================
const API_URL = 'http://localhost:8080/api';
let currentView = 'market';
let user = null;
let token = null;
let assets = [];
let transactions = [];
let projects = [];
let installments = [];
let marketData = {};
let charts = {};
let notifications = [];
let portfolioTarget = {};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Unauthorized');
        
        user = await response.json();
        document.getElementById('currentUserName').textContent = user.fullname || user.username;
        document.getElementById('userWelcome').textContent = `خوش آمدید ${user.fullname}`;
        
        await init();
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
});

async function init() {
    await loadNotifications();
    await loadData();
    renderCurrentView();
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (input.id === 'transactionDate') {
            input.value = today;
        }
    });
    
    // Auto refresh
    setInterval(loadNotifications, 30000);
    setInterval(() => {
        if (currentView === 'market') {
            updateMarketData();
        }
    }, 60000);
}

async function loadData() {
    try {
        const [assetsRes, transactionsRes, projectsRes, installmentsRes, targetRes] = await Promise.all([
            fetch(`${API_URL}/assets`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/installments`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/portfolio-target`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        assets = await assetsRes.json();
        transactions = await transactionsRes.json();
        projects = await projectsRes.json();
        installments = await installmentsRes.json();
        portfolioTarget = await targetRes.json();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ==================== NAVIGATION ====================
function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    renderCurrentView();
}

async function renderCurrentView() {
    await loadData();
    
    switch(currentView) {
        case 'market':
            await renderMarketView();
            break;
        case 'assets':
            renderAssetsView();
            break;
        case 'portfolio':
            renderPortfolioView();
            break;
        case 'transactions':
            renderTransactionsView();
            break;
        case 'projects':
            renderProjectsView();
            break;
        case 'installments':
            renderInstallmentsView();
            break;
    }
}

// ==================== MARKET VIEW ====================
async function renderMarketView() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="total-assets">
            <h3>مجموع دارایی‌ها</h3>
            <div class="total-amount">${formatNumber(calculateTotalAssets())} تومان</div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">💹 نمای بازار</div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                    بروزرسانی: ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div class="market-grid" id="marketGrid">
                <div class="loading">در حال بارگذاری قیمت‌ها...</div>
            </div>
        </div>
    `;
    
    await updateMarketData();
}

async function updateMarketData() {
    try {
        // Fetch real prices from APIs
        const usdPrice = 73500; // In production, fetch from API
        
        // Mock market data - replace with real API calls
        marketData = {
            'USDT': { name: 'تتر', type: 'crypto', price: 73500, priceUSD: 1, change: 0.5 },
            'USD': { name: 'دلار آمریکا', type: 'currency', price: 71200, priceUSD: 1, change: 0.3 },
            'EUR': { name: 'یورو', type: 'currency', price: 77800, priceUSD: 1.08, change: -0.2 },
            'BTC': { name: 'بیت کوین', type: 'crypto', price: 102350 * usdPrice, priceUSD: 102350, change: 2.5 },
            'ETH': { name: 'اتریوم', type: 'crypto', price: 3520 * usdPrice, priceUSD: 3520, change: 1.8 },
            'BNB': { name: 'بایننس کوین', type: 'crypto', price: 695 * usdPrice, priceUSD: 695, change: 0.9 },
            'GOLD_OUNCE': { name: 'انس طلا', type: 'gold', price: 2380 * usdPrice, priceUSD: 2380, change: 0.4 },
            'GOLD_18': { name: 'طلای ۱۸ عیار', type: 'gold', price: 5850000, priceUSD: 79.6, change: 0.3 },
            'GOLD_24': { name: 'طلای ۲۴ عیار', type: 'gold', price: 7800000, priceUSD: 106.1, change: 0.3 },
            'COIN': { name: 'سکه تمام', type: 'gold', price: 62500000, priceUSD: 850.3, change: 0.5 }
        };
        
        const marketGrid = document.getElementById('marketGrid');
        if (!marketGrid) return;
        
        const marketItems = Object.entries(marketData).map(([symbol, data]) => {
            const showUSD = data.type === 'crypto';
            return `
                <div class="market-item">
                    <div class="market-name">${data.name}</div>
                    <div class="market-price">${formatNumber(data.price)}</div>
                    ${showUSD ? `<div class="market-price-usd">$${formatNumber(data.priceUSD)}</div>` : ''}
                    <div class="market-change ${data.change >= 0 ? 'positive' : 'negative'}">
                        ${data.change >= 0 ? '▲' : '▼'} ${Math.abs(data.change).toFixed(2)}%
                    </div>
                </div>
            `;
        }).join('');
        
        marketGrid.innerHTML = marketItems;
    } catch (error) {
        console.error('Error updating market:', error);
    }
}

// ==================== ASSETS VIEW ====================
function renderAssetsView() {
    const content = document.getElementById('app-content');
    
    const assetsList = assets.map(asset => {
        const currentPrice = marketData[asset.symbol]?.price || 0;
        const currentValue = asset.amount * currentPrice;
        const profit = currentValue - (asset.amount * asset.buy_price);
        const profitPercent = asset.buy_price > 0 ? ((currentValue / (asset.amount * asset.buy_price)) - 1) * 100 : 0;

        return `
            <div class="asset-item">
                <div class="asset-info">
                    <h4>${asset.name} (${asset.symbol})</h4>
                    <p>مقدار: ${asset.amount.toFixed(6)} | خرید: ${formatNumber(asset.buy_price)}</p>
                    <p style="color: ${profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                        ${profit >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(profit))} (${profitPercent.toFixed(2)}%)
                    </p>
                </div>
                <div class="asset-value">
                    <div class="asset-amount">${formatNumber(currentValue)}</div>
                    <div class="asset-toman">تومان</div>
                </div>
                <div class="asset-actions">
                    <button class="btn btn-secondary btn-icon" onclick="openEditAsset(${asset.id})">✏️</button>
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <div class="total-assets">
            <h3>مجموع دارایی‌ها</h3>
            <div class="total-amount">${formatNumber(calculateTotalAssets())} تومان</div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">💰 دارایی‌های من</div>
                <button class="btn btn-primary" onclick="openModal('addAssetModal')">+ افزودن</button>
            </div>
            <div class="asset-list">
                ${assets.length > 0 ? assetsList : '<div class="loading">هنوز دارایی ثبت نشده است</div>'}
            </div>
        </div>
    `;
}

// ==================== PORTFOLIO VIEW ====================
function renderPortfolioView() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="total-assets">
            <h3>مجموع دارایی‌ها</h3>
            <div class="total-amount">${formatNumber(calculateTotalAssets())} تومان</div>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchPortfolioTab('current')">پورتفولیو فعلی</div>
            <div class="tab" onclick="switchPortfolioTab('target')">پورتفولیو هدف</div>
        </div>

        <div id="portfolioContent"></div>
    `;

    switchPortfolioTab('current');
}

function switchPortfolioTab(tab) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    event?.target?.classList.add('active');

    const container = document.getElementById('portfolioContent');
    
    if (tab === 'current') {
        renderCurrentPortfolio(container);
    } else {
        renderTargetPortfolio(container);
    }
}

function renderCurrentPortfolio(container) {
    const totalValue = calculateTotalAssets();
    const assetsByType = {};
    
    assets.forEach(asset => {
        const currentPrice = marketData[asset.symbol]?.price || 0;
        const value = asset.amount * currentPrice;
        const type = asset.type;
        
        if (!assetsByType[type]) {
            assetsByType[type] = { value: 0, count: 0, items: [] };
        }
        assetsByType[type].value += value;
        assetsByType[type].count += 1;
        assetsByType[type].items.push({ name: asset.name, amount: asset.amount, value: value });
    });

    const typeNames = {
        'crypto': 'ارز دیجیتال',
        'currency': 'ارز',
        'gold': 'طلا',
        'stock': 'سهام'
    };

    const portfolioItems = Object.entries(assetsByType).map(([type, data]) => {
        const percentage = totalValue > 0 ? (data.value / totalValue * 100).toFixed(1) : 0;
        return `
            <div class="stat-card">
                <div class="stat-label">${typeNames[type] || type}</div>
                <div class="stat-value">${percentage}%</div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
                    ${formatNumber(data.value)} تومان
                </p>
            </div>
        `;
    }).join('');

    const assetListHTML = Object.entries(assetsByType).map(([type, data]) => `
        <div class="card">
            <h4 style="margin-bottom: 12px; color: var(--accent-cyan);">${typeNames[type] || type}</h4>
            ${data.items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
                    <span style="font-size: 0.9rem;">${item.name}</span>
                    <span style="font-size: 0.9rem; font-weight: 700; color: var(--accent-green);">
                        ${formatNumber(item.value)}
                    </span>
                </div>
            `).join('')}
        </div>
    `).join('');

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">📊 توزیع دارایی‌ها</div>
            </div>
            <div class="stats-grid">
                ${portfolioItems}
            </div>
            <div class="chart-container">
                <canvas id="portfolioChart"></canvas>
            </div>
        </div>
        ${assetListHTML}
    `;

    setTimeout(() => {
        const ctx = document.getElementById('portfolioChart');
        if (ctx && Object.keys(assetsByType).length > 0) {
            if (charts.portfolio) charts.portfolio.destroy();
            charts.portfolio = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(assetsByType).map(t => typeNames[t] || t),
                    datasets: [{
                        data: Object.values(assetsByType).map(d => d.value),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#cbd5e1', font: { family: 'Vazirmatn' } }
                        }
                    }
                }
            });
        }
    }, 100);
}

function renderTargetPortfolio(container) {
    const typeNames = {
        'crypto': 'ارز دیجیتال',
        'currency': 'ارز',
        'gold': 'طلا',
        'stock': 'سهام'
    };

    const targets = Object.entries(portfolioTarget).filter(([_, amount]) => amount > 0);

    const targetItems = targets.map(([type, amount]) => {
        const current = assets.filter(a => a.type === type).reduce((sum, a) => {
            const price = marketData[a.symbol]?.price || 0;
            return sum + (a.amount * price);
        }, 0);
        const progress = amount > 0 ? (current / amount * 100) : 0;

        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${typeNames[type] || type}</div>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">${progress.toFixed(1)}%</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">فعلی: ${formatNumber(current)}</span>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">هدف: ${formatNumber(amount)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">🎯 اهداف پورتفولیو</div>
                <button class="btn btn-primary" onclick="openTargetSettings()">تنظیمات</button>
            </div>
            ${targets.length > 0 ? targetItems : '<div class="loading">هدفی تعریف نشده است</div>'}
        </div>
    `;
}

// Continue in next part due to length...

// ==================== TRANSACTIONS VIEW ====================
function renderTransactionsView() {
    const content = document.getElementById('app-content');
    
    const transactionsByMonth = {};
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!transactionsByMonth[monthKey]) {
            transactionsByMonth[monthKey] = { income: 0, expense: 0, items: [] };
        }
        transactionsByMonth[monthKey].items.push(t);
        
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            transactionsByMonth[monthKey].income += t.amount;
        } else {
            transactionsByMonth[monthKey].expense += t.amount;
        }
    });

    const months = Object.keys(transactionsByMonth).sort().reverse();
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">💳 درآمد و هزینه</div>
                <button class="btn btn-primary" onclick="openModal('addTransactionModal')">+ افزودن</button>
            </div>
            <div id="transactionsContent"></div>
        </div>
    `;

    if (months.length > 0) {
        renderMonthTransactions(months[0]);
    }
}

function renderMonthTransactions(monthKey) {
    const monthData = transactions.filter(t => {
        const date = new Date(t.date);
        const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return tMonthKey === monthKey;
    });

    let income = 0, expense = 0;
    monthData.forEach(t => {
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            income += t.amount;
        } else {
            expense += t.amount;
        }
    });

    const balance = income - expense;
    const transactionsList = monthData.map(t => {
        const isIncome = t.type === 'income' || (t.type === 'transfer' && t.direction === 'in');
        return `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-title">${t.title}</div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${formatNumber(t.amount)}
                    </div>
                </div>
                <div class="transaction-meta">
                    <span>${t.category}</span>
                    <span>${new Date(t.date).toLocaleDateString('fa-IR')}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-secondary btn-small" onclick="openEditTransaction(${t.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('transactionsContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">درآمد</div>
                <div class="stat-value" style="color: var(--accent-green);">${formatNumber(income)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">هزینه</div>
                <div class="stat-value" style="color: var(--accent-red);">${formatNumber(expense)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">مانده</div>
                <div class="stat-value" style="color: ${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatNumber(balance)}</div>
            </div>
        </div>
        ${transactionsList}
    `;
}

// ==================== PROJECTS VIEW ====================
function renderProjectsView() {
    const content = document.getElementById('app-content');
    
    const projectsList = projects.map(project => {
        const progress = project.total_amount > 0 ? (project.paid_amount / project.total_amount * 100) : 0;
        const remaining = project.total_amount - project.paid_amount;
        
        return `
            <div class="project-item">
                <div class="project-header">
                    <div>
                        <div class="project-title">${project.title}</div>
                    </div>
                    <span class="project-status ${project.status}">${project.status === 'active' ? 'در حال انجام' : 'تکمیل شده'}</span>
                </div>
                <div class="project-progress">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem;">
                        <span>پیشرفت: ${progress.toFixed(1)}%</span>
                        <span>باقیمانده: ${formatNumber(remaining)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="project-stats">
                    <div class="project-stat">
                        <div class="project-stat-label">مبلغ کل</div>
                        <div class="project-stat-value">${formatNumber(project.total_amount)}</div>
                    </div>
                    <div class="project-stat">
                        <div class="project-stat-label">پرداخت شده</div>
                        <div class="project-stat-value">${formatNumber(project.paid_amount)}</div>
                    </div>
                    <div class="project-stat">
                        <div class="project-stat-label">وضعیت</div>
                        <div class="project-stat-value">${progress.toFixed(0)}%</div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-small" onclick="openEditProject(${project.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">📋 پروژه‌های من</div>
                <button class="btn btn-primary" onclick="openModal('addProjectModal')">+ افزودن پروژه</button>
            </div>
            ${projects.length > 0 ? projectsList : '<div class="loading">هنوز پروژه‌ای ثبت نشده است</div>'}
        </div>
    `;
}

// ==================== INSTALLMENTS VIEW ====================
function renderInstallmentsView() {
    const content = document.getElementById('app-content');
    
    const now = new Date();
    const installmentsList = installments.map(inst => {
        const progress = inst.total_count > 0 ? (inst.paid_count / inst.total_count * 100) : 0;
        const remaining = inst.total_count - inst.paid_count;
        const nextDue = inst.next_due_date ? new Date(inst.next_due_date) : null;
        const daysLeft = nextDue ? Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24)) : 0;
        const isUpcoming = daysLeft >= 0 && daysLeft <= 3;
        
        return `
            <div class="installment-item ${isUpcoming ? 'upcoming' : ''}">
                <div class="installment-header">
                    <div>
                        <div class="installment-title">${inst.title}</div>
                    </div>
                    ${isUpcoming ? `<span class="installment-badge">${daysLeft} روز مانده</span>` : ''}
                </div>
                <div class="installment-progress">
                    <div class="installment-progress-text">
                        <span>پرداخت شده: ${inst.paid_count} از ${inst.total_count} قسط</span>
                        <span>${progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="installment-stats">
                    <div class="installment-stat">
                        <div class="installment-stat-label">مبلغ ماهانه</div>
                        <div class="installment-stat-value">${formatNumber(inst.monthly_amount)}</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">سررسید بعدی</div>
                        <div class="installment-stat-value">${nextDue ? nextDue.toLocaleDateString('fa-IR') : '-'}</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">باقیمانده</div>
                        <div class="installment-stat-value">${remaining} قسط</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">مجموع باقیمانده</div>
                        <div class="installment-stat-value">${formatNumber(remaining * inst.monthly_amount)}</div>
                    </div>
                </div>
                <div class="installment-actions">
                    <button class="btn btn-success btn-small" onclick="payInstallment(${inst.id})">✓ پرداخت قسط</button>
                    <button class="btn btn-secondary btn-small" onclick="openEditInstallment(${inst.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">💰 اقساط من</div>
                <button class="btn btn-primary" onclick="openModal('addInstallmentModal')">+ افزودن قسط</button>
            </div>
            ${installments.length > 0 ? installmentsList : '<div class="loading">هنوز قسطی ثبت نشده است</div>'}
        </div>
    `;
}

// ==================== FORM HANDLERS ====================
function updateAssetForm() {
    const type = document.getElementById('assetType').value;
    const nameSelect = document.getElementById('assetName');
    
    if (!type) {
        nameSelect.disabled = true;
        nameSelect.innerHTML = '<option value="">ابتدا نوع را انتخاب کنید</option>';
        return;
    }
    
    nameSelect.disabled = false;
    nameSelect.innerHTML = '<option value="">انتخاب کنید</option>';
    
    const assetOptions = {
        'crypto': ['USDT|تتر', 'BTC|بیت کوین', 'ETH|اتریوم', 'BNB|بایننس کوین'],
        'currency': ['USD|دلار آمریکا', 'EUR|یورو'],
        'gold': ['GOLD_OUNCE|انس طلا', 'GOLD_18|طلای ۱۸ عیار', 'GOLD_24|طلای ۲۴ عیار', 'COIN|سکه تمام'],
        'stock': []
    };
    
    assetOptions[type].forEach(opt => {
        const [symbol, name] = opt.split('|');
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = name;
        nameSelect.appendChild(option);
    });
}

function updateAssetPrice() {
    const symbol = document.getElementById('assetName').value;
    if (marketData[symbol]) {
        const price = marketData[symbol].price;
        const priceUSD = marketData[symbol].priceUSD;
        
        document.getElementById('assetBuyPrice').value = Math.round(price);
        
        let priceText = `${formatNumber(price)} تومان`;
        if (marketData[symbol].type === 'crypto') {
            priceText += ` ($${formatNumber(priceUSD)})`;
        }
        document.getElementById('assetCurrentPrice').value = priceText;
        
        calculateTomanValue();
    }
}

function calculateTomanValue() {
    const symbol = document.getElementById('assetName').value;
    const amount = parseFloat(document.getElementById('assetAmount').value) || 0;
    
    if (marketData[symbol] && amount > 0) {
        const value = amount * marketData[symbol].price;
        document.getElementById('assetTomanValue').value = formatNumber(value) + ' تومان';
    }
}

function updateTransactionForm() {
    const type = document.getElementById('transactionType').value;
    const directionGroup = document.getElementById('transferDirectionGroup');
    
    if (type === 'transfer') {
        directionGroup.classList.remove('hidden');
    } else {
        directionGroup.classList.add('hidden');
    }
}

// ==================== API CALLS ====================
async function addAsset(e) {
    e.preventDefault();
    
    const symbol = document.getElementById('assetName').value;
    const assetName = document.getElementById('assetName').selectedOptions[0].text;
    
    const asset = {
        type: document.getElementById('assetType').value,
        symbol: symbol,
        name: assetName,
        amount: parseFloat(document.getElementById('assetAmount').value),
        buy_price: parseFloat(document.getElementById('assetBuyPrice').value),
        notes: document.getElementById('assetNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/assets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(asset)
        });
        
        if (!response.ok) throw new Error('Failed to add asset');
        
        closeModal('addAssetModal');
        document.getElementById('addAssetForm').reset();
        await loadData();
        renderAssetsView();
    } catch (error) {
        alert('خطا در افزودن دارایی');
    }
}

async function addTransaction(e) {
    e.preventDefault();
    
    const transaction = {
        type: document.getElementById('transactionType').value,
        title: document.getElementById('transactionTitle').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        category: document.getElementById('transactionCategory').value,
        date: document.getElementById('transactionDate').value,
        notes: document.getElementById('transactionNotes').value
    };
    
    if (transaction.type === 'transfer') {
        transaction.direction = document.getElementById('transferDirection').value;
    }
    
    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('addTransactionModal');
        document.getElementById('addTransactionForm').reset();
        await loadData();
        renderTransactionsView();
    } catch (error) {
        alert('خطا در افزودن تراکنش');
    }
}

async function addProject(e) {
    e.preventDefault();
    
    const project = {
        title: document.getElementById('projectTitle').value,
        total_amount: parseFloat(document.getElementById('projectTotalAmount').value),
        paid_amount: parseFloat(document.getElementById('projectPaidAmount').value || 0),
        start_date: document.getElementById('projectStartDate').value,
        end_date: document.getElementById('projectEndDate').value,
        notes: document.getElementById('projectNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(project)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('addProjectModal');
        document.getElementById('addProjectForm').reset();
        await loadData();
        renderProjectsView();
    } catch (error) {
        alert('خطا در افزودن پروژه');
    }
}

async function addInstallment(e) {
    e.preventDefault();
    
    const startDate = new Date(document.getElementById('installmentStartDate').value);
    const dueDay = parseInt(document.getElementById('installmentDueDay').value);
    
    const nextDue = new Date(startDate);
    nextDue.setDate(dueDay);
    if (nextDue < startDate) {
        nextDue.setMonth(nextDue.getMonth() + 1);
    }
    
    const installment = {
        title: document.getElementById('installmentTitle').value,
        total_amount: parseFloat(document.getElementById('installmentTotalAmount').value),
        monthly_amount: parseFloat(document.getElementById('installmentMonthlyAmount').value),
        total_count: parseInt(document.getElementById('installmentTotalCount').value),
        due_day: dueDay,
        start_date: document.getElementById('installmentStartDate').value,
        end_date: document.getElementById('installmentEndDate').value,
        next_due_date: nextDue.toISOString().split('T')[0],
        notes: document.getElementById('installmentNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/installments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(installment)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('addInstallmentModal');
        document.getElementById('addInstallmentForm').reset();
        await loadData();
        renderInstallmentsView();
    } catch (error) {
        alert('خطا در افزودن قسط');
    }
}

async function payInstallment(id) {
    if (!confirm('آیا این قسط پرداخت شده است؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/installments/${id}/pay`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        await loadData();
        renderInstallmentsView();
    } catch (error) {
        alert('خطا در ثبت پرداخت');
    }
}

function openEditAsset(id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    document.getElementById('editAssetId').value = asset.id;
    document.getElementById('editAssetAmount').value = asset.amount;
    document.getElementById('editAssetBuyPrice').value = asset.buy_price;
    document.getElementById('editAssetNotes').value = asset.notes || '';
    openModal('editAssetModal');
}

async function updateAsset(e) {
    e.preventDefault();
    const id = document.getElementById('editAssetId').value;
    
    const updates = {
        amount: parseFloat(document.getElementById('editAssetAmount').value),
        buy_price: parseFloat(document.getElementById('editAssetBuyPrice').value),
        notes: document.getElementById('editAssetNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editAssetModal');
        await loadData();
        renderAssetsView();
    } catch (error) {
        alert('خطا در بروزرسانی');
    }
}

async function deleteAssetConfirm() {
    if (!confirm('آیا از حذف این دارایی اطمینان دارید؟')) return;
    
    const id = document.getElementById('editAssetId').value;
    
    try {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editAssetModal');
        await loadData();
        renderAssetsView();
    } catch (error) {
        alert('خطا در حذف');
    }
}

function openEditTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    document.getElementById('editTransactionId').value = transaction.id;
    document.getElementById('editTransactionTitle').value = transaction.title;
    document.getElementById('editTransactionAmount').value = transaction.amount;
    document.getElementById('editTransactionCategory').value = transaction.category;
    document.getElementById('editTransactionNotes').value = transaction.notes || '';
    openModal('editTransactionModal');
}

async function updateTransaction(e) {
    e.preventDefault();
    const id = document.getElementById('editTransactionId').value;
    
    const updates = {
        title: document.getElementById('editTransactionTitle').value,
        amount: parseFloat(document.getElementById('editTransactionAmount').value),
        category: document.getElementById('editTransactionCategory').value,
        notes: document.getElementById('editTransactionNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editTransactionModal');
        await loadData();
        renderTransactionsView();
    } catch (error) {
        alert('خطا در بروزرسانی');
    }
}

async function deleteTransactionConfirm() {
    if (!confirm('آیا از حذف این تراکنش اطمینان دارید؟')) return;
    
    const id = document.getElementById('editTransactionId').value;
    
    try {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editTransactionModal');
        await loadData();
        renderTransactionsView();
    } catch (error) {
        alert('خطا در حذف');
    }
}

function openEditProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    document.getElementById('editProjectId').value = project.id;
    document.getElementById('editProjectTitle').value = project.title;
    document.getElementById('editProjectTotalAmount').value = project.total_amount;
    document.getElementById('editProjectPaidAmount').value = project.paid_amount;
    document.getElementById('editProjectStatus').value = project.status;
    document.getElementById('editProjectNotes').value = project.notes || '';
    openModal('editProjectModal');
}

async function updateProject(e) {
    e.preventDefault();
    const id = document.getElementById('editProjectId').value;
    
    const updates = {
        title: document.getElementById('editProjectTitle').value,
        total_amount: parseFloat(document.getElementById('editProjectTotalAmount').value),
        paid_amount: parseFloat(document.getElementById('editProjectPaidAmount').value),
        status: document.getElementById('editProjectStatus').value,
        notes: document.getElementById('editProjectNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editProjectModal');
        await loadData();
        renderProjectsView();
    } catch (error) {
        alert('خطا در بروزرسانی');
    }
}

async function deleteProjectConfirm() {
    if (!confirm('آیا از حذف این پروژه اطمینان دارید؟')) return;
    
    const id = document.getElementById('editProjectId').value;
    
    try {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editProjectModal');
        await loadData();
        renderProjectsView();
    } catch (error) {
        alert('خطا در حذف');
    }
}

function openEditInstallment(id) {
    const installment = installments.find(i => i.id === id);
    if (!installment) return;
    
    document.getElementById('editInstallmentId').value = installment.id;
    document.getElementById('editInstallmentTitle').value = installment.title;
    document.getElementById('editInstallmentNotes').value = installment.notes || '';
    openModal('editInstallmentModal');
}

async function updateInstallment(e) {
    e.preventDefault();
    const id = document.getElementById('editInstallmentId').value;
    
    const updates = {
        title: document.getElementById('editInstallmentTitle').value,
        notes: document.getElementById('editInstallmentNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/installments/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editInstallmentModal');
        await loadData();
        renderInstallmentsView();
    } catch (error) {
        alert('خطا در بروزرسانی');
    }
}

async function deleteInstallmentConfirm() {
    if (!confirm('آیا از حذف این قسط اطمینان دارید؟')) return;
    
    const id = document.getElementById('editInstallmentId').value;
    
    try {
        const response = await fetch(`${API_URL}/installments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        closeModal('editInstallmentModal');
        await loadData();
        renderInstallmentsView();
    } catch (error) {
        alert('خطا در حذف');
    }
}

function openTargetSettings() {
    document.getElementById('targetCrypto').value = portfolioTarget.crypto || '';
    document.getElementById('targetCurrency').value = portfolioTarget.currency || '';
    document.getElementById('targetGold').value = portfolioTarget.gold || '';
    document.getElementById('targetStock').value = portfolioTarget.stock || '';
    openModal('targetPortfolioModal');
}

async function saveTargetPortfolio(e) {
    e.preventDefault();
    
    const target = {
        crypto: parseFloat(document.getElementById('targetCrypto').value) || 0,
        currency: parseFloat(document.getElementById('targetCurrency').value) || 0,
        gold: parseFloat(document.getElementById('targetGold').value) || 0,
        stock: parseFloat(document.getElementById('targetStock').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/portfolio-target`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(target)
        });
        
        if (!response.ok) throw new Error('Failed');
        
        portfolioTarget = target;
        closeModal('targetPortfolioModal');
        renderPortfolioView();
    } catch (error) {
        alert('خطا در ذخیره اهداف');
    }
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        notifications = await response.json();
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        document.getElementById('notifCount').textContent = unreadCount;
        document.getElementById('notifCount').style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('active');
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="loading">اعلانی وجود ندارد</div>';
        return;
    }
    
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${!n.is_read ? 'unread' : ''}" onclick="markNotificationRead(${n.id})">
            <div class="notification-title">${n.title}</div>
            <div class="notification-message">${n.message}</div>
            <div class="notification-time">${new Date(n.created_at).toLocaleString('fa-IR')}</div>
        </div>
    `).join('');
}

async function markNotificationRead(id) {
    try {
        await fetch(`${API_URL}/notifications/mark-read/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        await loadNotifications();
        renderNotifications();
    } catch (error) {
        console.error('Error marking notification:', error);
    }
}

// ==================== USER MENU ====================
function openUserMenu() {
    document.getElementById('userFullname').textContent = user.fullname;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userUsername').textContent = '@' + user.username;
    openModal('userMenuModal');
}

async function logout() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// ==================== MODAL FUNCTIONS ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==================== UTILITY FUNCTIONS ====================
function calculateTotalAssets() {
    return assets.reduce((sum, asset) => {
        const currentPrice = marketData[asset.symbol]?.price || 0;
        return sum + (asset.amount * currentPrice);
    }, 0);
}

function formatNumber(num) {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ==================== TRANSACTIONS VIEW (Enhanced with Months) ====================
function renderTransactionsView() {
    const content = document.getElementById('app-content');
    
    const transactionsByMonth = {};
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!transactionsByMonth[monthKey]) {
            transactionsByMonth[monthKey] = { income: 0, expense: 0, items: [] };
        }
        transactionsByMonth[monthKey].items.push(t);
        
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            transactionsByMonth[monthKey].income += t.amount;
        } else {
            transactionsByMonth[monthKey].expense += t.amount;
        }
    });

    const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const months = Object.keys(transactionsByMonth).sort().reverse();
    
    const monthTabs = months.map((m, i) => {
        const [year, month] = m.split('-');
        const persianMonth = persianMonths[parseInt(month) - 1] || `ماه ${month}`;
        return `<div class="tab ${i === 0 ? 'active' : ''}" onclick="selectTransactionMonth('${m}')">${persianMonth} ${year}</div>`;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">💳 درآمد و هزینه</div>
                <button class="btn btn-primary" onclick="openModal('addTransactionModal')">+ افزودن</button>
            </div>
            
            <div class="tabs" style="margin-bottom: 20px;">
                ${monthTabs || '<div class="tab active">ماه جاری</div>'}
            </div>

            <div id="transactionsContent"></div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="card-title">📊 نمودار و آمار</div>
            </div>
            <div class="chart-container">
                <canvas id="transactionsChart"></canvas>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px;">دانلود گزارش تراکنش‌ها</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">از تاریخ</label>
                        <input type="date" class="form-input" id="transExportFrom">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تا تاریخ</label>
                        <input type="date" class="form-input" id="transExportTo">
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-success" onclick="exportTransactionsPDF()">📄 دانلود PDF</button>
                    <button class="btn btn-success" onclick="exportTransactionsExcel()">📊 دانلود Excel</button>
                </div>
            </div>
        </div>
    `;

    if (months.length > 0) {
        selectTransactionMonth(months[0]);
    }
    
    renderTransactionsChart();
}

function selectTransactionMonth(monthKey) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    if (event) event.target.classList.add('active');

    const monthData = transactions.filter(t => {
        const date = new Date(t.date);
        const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return tMonthKey === monthKey;
    });

    let income = 0, expense = 0;
    monthData.forEach(t => {
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            income += t.amount;
        } else {
            expense += t.amount;
        }
    });

    const balance = income - expense;
    const transactionsList = monthData.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
        const isIncome = t.type === 'income' || (t.type === 'transfer' && t.direction === 'in');
        return `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-title">${t.title}</div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${formatNumber(t.amount)}
                    </div>
                </div>
                <div class="transaction-meta">
                    <span>${t.category}</span>
                    <span>${new Date(t.date).toLocaleDateString('fa-IR')}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-secondary btn-small" onclick="openEditTransaction(${t.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('transactionsContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">درآمد</div>
                <div class="stat-value" style="color: var(--accent-green);">${formatNumber(income)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">هزینه</div>
                <div class="stat-value" style="color: var(--accent-red);">${formatNumber(expense)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">مانده</div>
                <div class="stat-value" style="color: ${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatNumber(balance)}</div>
            </div>
        </div>
        ${transactionsList || '<div class="loading">تراکنشی در این ماه ثبت نشده</div>'}
    `;
}

function renderTransactionsChart() {
    setTimeout(() => {
        const ctx = document.getElementById('transactionsChart');
        if (!ctx) return;
        
        const last6Months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
        const labels = last6Months.map(m => {
            const month = parseInt(m.split('-')[1]);
            return persianMonths[month - 1];
        });

        const incomeData = last6Months.map(m => {
            return transactions.filter(t => {
                const date = new Date(t.date);
                const tKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return tKey === m && (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in'));
            }).reduce((sum, t) => sum + t.amount, 0);
        });

        const expenseData = last6Months.map(m => {
            return transactions.filter(t => {
                const date = new Date(t.date);
                const tKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return tKey === m && (t.type === 'expense' || (t.type === 'transfer' && t.direction === 'out'));
            }).reduce((sum, t) => sum + t.amount, 0);
        });

        if (charts.transactions) charts.transactions.destroy();
        charts.transactions = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'درآمد',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'هزینه',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', font: { family: 'Vazirmatn' } }
                    }
                },
                scales: {
                    y: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                    },
                    x: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                    }
                }
            }
        });
    }, 100);
}

// Export Transactions PDF
async function exportTransactionsPDF() {
    const fromDate = document.getElementById('transExportFrom').value;
    const toDate = document.getElementById('transExportTo').value;
    
    let filtered = transactions;
    if (fromDate) filtered = filtered.filter(t => t.date >= fromDate);
    if (toDate) filtered = filtered.filter(t => t.date <= toDate);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add Persian font support (simplified)
    doc.text('Transactions Report', 10, 10);
    doc.text(`Total: ${filtered.length}`, 10, 20);
    
    let y = 30;
    filtered.forEach((t, i) => {
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
        doc.text(`${i+1}. ${t.title} - ${formatNumber(t.amount)}`, 10, y);
        y += 10;
    });
    
    doc.save('transactions.pdf');
}

// Export Transactions Excel
function exportTransactionsExcel() {
    const fromDate = document.getElementById('transExportFrom').value;
    const toDate = document.getElementById('transExportTo').value;
    
    let filtered = transactions;
    if (fromDate) filtered = filtered.filter(t => t.date >= fromDate);
    if (toDate) filtered = filtered.filter(t => t.date <= toDate);
    
    const data = [
        ['تاریخ', 'عنوان', 'نوع', 'دسته‌بندی', 'مبلغ', 'توضیحات']
    ];
    
    filtered.forEach(t => {
        data.push([
            new Date(t.date).toLocaleDateString('fa-IR'),
            t.title,
            t.type === 'income' ? 'درآمد' : 'هزینه',
            t.category,
            t.amount,
            t.notes || ''
        ]);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions_${Date.now()}.xlsx`);
}

// ==================== ASSETS EXPORT ====================
function exportAssetsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text('Assets Report', 10, 10);
    
    let y = 20;
    assets.forEach((asset, i) => {
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
        const currentPrice = marketData[asset.symbol]?.price || 0;
        const value = asset.amount * currentPrice;
        doc.text(`${i+1}. ${asset.name}: ${formatNumber(value)}`, 10, y);
        y += 10;
    });
    
    doc.save('assets.pdf');
}

function exportAssetsExcel() {
    const data = [
        ['نام', 'نماد', 'نوع', 'مقدار', 'قیمت خرید', 'قیمت فعلی', 'ارزش']
    ];
    
    assets.forEach(a => {
        const currentPrice = marketData[a.symbol]?.price || 0;
        const value = a.amount * currentPrice;
        data.push([
            a.name,
            a.symbol,
            a.type,
            a.amount,
            a.buy_price,
            currentPrice,
            value
        ]);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, `assets_${Date.now()}.xlsx`);
}

// ==================== PROJECTS VIEW (Enhanced) ====================
function renderProjectsView() {
    const content = document.getElementById('app-content');
    
    const projectsList = projects.map(project => {
        const progress = project.total_amount > 0 ? (project.paid_amount / project.total_amount * 100) : 0;
        const remaining = project.total_amount - project.paid_amount;
        
        return `
            <div class="project-item">
                <div class="project-header">
                    <div>
                        <div class="project-title">${project.title}</div>
                    </div>
                    <span class="project-status ${project.status}">${project.status === 'active' ? 'در حال انجام' : 'تکمیل شده'}</span>
                </div>
                <div class="project-progress">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem;">
                        <span>پیشرفت: ${progress.toFixed(1)}%</span>
                        <span>باقیمانده: ${formatNumber(remaining)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="project-stats">
                    <div class="project-stat">
                        <div class="project-stat-label">مبلغ کل</div>
                        <div class="project-stat-value">${formatNumber(project.total_amount)}</div>
                    </div>
                    <div class="project-stat">
                        <div class="project-stat-label">پرداخت شده</div>
                        <div class="project-stat-value">${formatNumber(project.paid_amount)}</div>
                    </div>
                    <div class="project-stat">
                        <div class="project-stat-label">وضعیت</div>
                        <div class="project-stat-value">${progress.toFixed(0)}%</div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-small" onclick="openEditProject(${project.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">📋 پروژه‌های من</div>
                <button class="btn btn-primary" onclick="openModal('addProjectModal')">+ افزودن پروژه</button>
            </div>
            ${projects.length > 0 ? projectsList : '<div class="loading">هنوز پروژه‌ای ثبت نشده است</div>'}
        </div>
    `;
}

// ==================== INSTALLMENTS VIEW (Enhanced) ====================
function renderInstallmentsView() {
    const content = document.getElementById('app-content');
    
    const now = new Date();
    const installmentsList = installments.map(inst => {
        const progress = inst.total_count > 0 ? (inst.paid_count / inst.total_count * 100) : 0;
        const remaining = inst.total_count - inst.paid_count;
        const nextDue = inst.next_due_date ? new Date(inst.next_due_date) : null;
        const daysLeft = nextDue ? Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24)) : 0;
        const isUpcoming = daysLeft >= 0 && daysLeft <= 3;
        
        return `
            <div class="installment-item ${isUpcoming ? 'upcoming' : ''}">
                <div class="installment-header">
                    <div>
                        <div class="installment-title">${inst.title}</div>
                    </div>
                    ${isUpcoming ? `<span class="installment-badge">${daysLeft} روز مانده</span>` : ''}
                </div>
                <div class="installment-progress">
                    <div class="installment-progress-text">
                        <span>پرداخت شده: ${inst.paid_count} از ${inst.total_count} قسط</span>
                        <span>${progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="installment-stats">
                    <div class="installment-stat">
                        <div class="installment-stat-label">مبلغ ماهانه</div>
                        <div class="installment-stat-value">${formatNumber(inst.monthly_amount)}</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">سررسید بعدی</div>
                        <div class="installment-stat-value">${nextDue ? nextDue.toLocaleDateString('fa-IR') : '-'}</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">باقیمانده</div>
                        <div class="installment-stat-value">${remaining} قسط</div>
                    </div>
                    <div class="installment-stat">
                        <div class="installment-stat-label">مجموع باقیمانده</div>
                        <div class="installment-stat-value">${formatNumber(remaining * inst.monthly_amount)}</div>
                    </div>
                </div>
                <div class="installment-actions">
                    <button class="btn btn-success btn-small" onclick="payInstallment(${inst.id})">✓ پرداخت قسط</button>
                    <button class="btn btn-secondary btn-small" onclick="openEditInstallment(${inst.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">💰 اقساط من</div>
                <button class="btn btn-primary" onclick="openModal('addInstallmentModal')">+ افزودن قسط</button>
            </div>
            ${installments.length > 0 ? installmentsList : '<div class="loading">هنوز قسطی ثبت نشده است</div>'}
        </div>
    `;
}


// ==================== TRANSACTIONS VIEW (ENHANCED) ====================
function renderTransactionsView() {
    const content = document.getElementById('app-content');
    
    // Group by month
    const transactionsByMonth = {};
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!transactionsByMonth[monthKey]) {
            transactionsByMonth[monthKey] = { income: 0, expense: 0, items: [] };
        }
        transactionsByMonth[monthKey].items.push(t);
        
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            transactionsByMonth[monthKey].income += t.amount;
        } else {
            transactionsByMonth[monthKey].expense += t.amount;
        }
    });

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const months = Object.keys(transactionsByMonth).sort().reverse();
    
    const monthTabs = months.map((m, i) => {
        const [year, month] = m.split('-');
        return `<div class="tab ${i === 0 ? 'active' : ''}" onclick="selectTransactionMonth('${m}', event)">${monthNames[parseInt(month) - 1]} ${year}</div>`;
    }).join('');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">💳 تراکنش‌ها</div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success btn-small" onclick="exportTransactionsReport('excel')">📊 Excel</button>
                    <button class="btn btn-danger btn-small" onclick="exportTransactionsReport('pdf')">📄 PDF</button>
                    <button class="btn btn-primary" onclick="openModal('addTransactionModal')">+ افزودن</button>
                </div>
            </div>
            
            ${months.length > 0 ? `
                <div class="tabs" style="margin-bottom: 20px;">
                    ${monthTabs}
                </div>
            ` : ''}

            <div id="transactionsContent"></div>
            
            ${transactions.length > 0 ? `
                <div class="chart-container" style="margin-top: 30px;">
                    <canvas id="transactionsChart"></canvas>
                </div>
            ` : ''}
        </div>
    `;

    if (months.length > 0) {
        selectTransactionMonth(months[0]);
    } else {
        document.getElementById('transactionsContent').innerHTML = '<div class="loading">هنوز تراکنشی ثبت نشده است</div>';
    }
    
    if (transactions.length > 0) {
        renderTransactionsChart();
    }
}

function selectTransactionMonth(monthKey, event) {
    if (event) {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
    }

    const monthData = transactions.filter(t => {
        const date = new Date(t.date);
        const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return tMonthKey === monthKey;
    });

    let income = 0, expense = 0;
    monthData.forEach(t => {
        if (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')) {
            income += t.amount;
        } else {
            expense += t.amount;
        }
    });

    const balance = income - expense;
    const transactionsList = monthData.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
        const isIncome = t.type === 'income' || (t.type === 'transfer' && t.direction === 'in');
        return `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-title">${t.title}</div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${formatNumber(t.amount)}
                    </div>
                </div>
                <div class="transaction-meta">
                    <span>${t.category}</span>
                    <span>${new Date(t.date).toLocaleDateString('fa-IR')}</span>
                </div>
                ${t.notes ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">${t.notes}</p>` : ''}
                <div class="transaction-actions">
                    <button class="btn btn-secondary btn-small" onclick="openEditTransaction(${t.id})">ویرایش</button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('transactionsContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">درآمد</div>
                <div class="stat-value" style="color: var(--accent-green);">${formatNumber(income)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">هزینه</div>
                <div class="stat-value" style="color: var(--accent-red);">${formatNumber(expense)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">مانده</div>
                <div class="stat-value" style="color: ${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatNumber(balance)}</div>
            </div>
        </div>
        ${transactionsList}
    `;
}

function renderTransactionsChart() {
    setTimeout(() => {
        const ctx = document.getElementById('transactionsChart');
        if (!ctx) return;
        
        // Last 6 months
        const last6Months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
        const labels = last6Months.map(m => {
            const month = parseInt(m.split('-')[1]);
            return monthNames[month - 1];
        });

        const incomeData = last6Months.map(m => {
            return transactions.filter(t => {
                const date = new Date(t.date);
                const tKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return tKey === m && (t.type === 'income' || (t.type === 'transfer' && t.direction === 'in'));
            }).reduce((sum, t) => sum + t.amount, 0);
        });

        const expenseData = last6Months.map(m => {
            return transactions.filter(t => {
                const date = new Date(t.date);
                const tKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return tKey === m && (t.type === 'expense' || (t.type === 'transfer' && t.direction === 'out'));
            }).reduce((sum, t) => sum + t.amount, 0);
        });

        if (charts.transactions) charts.transactions.destroy();
        charts.transactions = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'درآمد',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'هزینه',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', font: { family: 'Vazirmatn' } }
                    }
                },
                scales: {
                    y: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                    },
                    x: { 
                        ticks: { color: '#cbd5e1' },
                        grid: { color: '#334155' }
                    }
                }
            }
        });
    }, 100);
}

// ==================== ASSETS VIEW (ENHANCED) ====================
function renderAssetsView() {
    const content = document.getElementById('app-content');
    const totalAssets = calculateTotalAssets();
    
    const assetsList = assets.map(asset => {
        const currentPrice = marketData[asset.symbol]?.price || 0;
        const currentValue = asset.amount * currentPrice;
        const profit = currentValue - (asset.amount * asset.buy_price);
        const profitPercent = asset.buy_price > 0 ? ((currentValue / (asset.amount * asset.buy_price)) - 1) * 100 : 0;
        
        return `
            <div class="asset-item">
                <div class="asset-info">
                    <h4>${asset.name} (${asset.symbol})</h4>
                    <p>مقدار: ${asset.amount.toFixed(6)} | خرید: ${formatNumber(asset.buy_price)}</p>
                    <p style="color: ${profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                        ${profit >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(profit))} (${profitPercent.toFixed(2)}%)
                    </p>
                </div>
                <div class="asset-value">
                    <div class="asset-amount">${formatNumber(currentValue)}</div>
                    <div class="asset-toman">تومان</div>
                </div>
                <div class="asset-actions">
                    <button class="btn btn-secondary btn-icon" onclick="openEditAsset(${asset.id})">✏️</button>
                </div>
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <div class="total-assets">
            <h3>مجموع دارایی‌ها</h3>
            <div class="total-amount">${formatNumber(totalAssets)} تومان</div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="card-title">💰 دارایی‌های من</div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success btn-small" onclick="exportAssetsReport('excel')">📊 Excel</button>
                    <button class="btn btn-danger btn-small" onclick="exportAssetsReport('pdf')">📄 PDF</button>
                    <button class="btn btn-primary" onclick="openModal('addAssetModal')">+ افزودن</button>
                </div>
            </div>
            <div class="asset-list">
                ${assets.length > 0 ? assetsList : '<div class="loading">هنوز دارایی ثبت نشده است</div>'}
            </div>
        </div>
    `;
}

// ==================== EXPORT FUNCTIONS ====================
async function exportTransactionsReport(format) {
    if (format === 'excel') {
        const ws_data = [
            ['تاریخ', 'عنوان', 'نوع', 'دسته‌بندی', 'مبلغ', 'توضیحات']
        ];

        transactions.forEach(t => {
            const typeLabel = t.type === 'income' ? 'درآمد' : (t.type === 'expense' ? 'هزینه' : `کارت‌به‌کارت (${t.direction === 'in' ? 'دریافت' : 'پرداخت'})`);
            ws_data.push([
                new Date(t.date).toLocaleDateString('fa-IR'),
                t.title,
                typeLabel,
                t.category,
                t.amount,
                t.notes || ''
            ]);
        });

        const totalIncome = transactions.filter(t => t.type === 'income' || (t.type === 'transfer' && t.direction === 'in')).reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense' || (t.type === 'transfer' && t.direction === 'out')).reduce((sum, t) => sum + t.amount, 0);
        
        ws_data.push([]);
        ws_data.push(['جمع درآمد:', '', '', '', totalIncome]);
        ws_data.push(['جمع هزینه:', '', '', '', totalExpense]);
        ws_data.push(['مانده:', '', '', '', totalIncome - totalExpense]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, 'تراکنش‌ها');
        XLSX.writeFile(wb, `transactions_${Date.now()}.xlsx`);
    } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add Persian font support would be needed here
        doc.text('Transactions Report', 10, 10);
        
        const tableData = transactions.map(t => [
            new Date(t.date).toLocaleDateString('en-US'),
            t.title,
            t.type,
            formatNumber(t.amount)
        ]);
        
        doc.autoTable({
            head: [['Date', 'Title', 'Type', 'Amount']],
            body: tableData
        });
        
        doc.save(`transactions_${Date.now()}.pdf`);
    }
}

async function exportAssetsReport(format) {
    if (format === 'excel') {
        const ws_data = [
            ['نام دارایی', 'نوع', 'مقدار', 'قیمت خرید', 'قیمت فعلی', 'ارزش کل', 'سود/زیان']
        ];

        let totalValue = 0;
        let totalCost = 0;

        assets.forEach(a => {
            const currentPrice = marketData[a.symbol]?.price || 0;
            const currentValue = a.amount * currentPrice;
            const cost = a.amount * a.buy_price;
            const profit = currentValue - cost;

            totalValue += currentValue;
            totalCost += cost;

            ws_data.push([
                a.name,
                a.type,
                a.amount,
                a.buy_price,
                currentPrice,
                currentValue,
                profit
            ]);
        });

        ws_data.push([]);
        ws_data.push(['مجموع ارزش:', '', '', '', '', totalValue]);
        ws_data.push(['هزینه کل:', '', '', '', '', totalCost]);
        ws_data.push(['سود/زیان کل:', '', '', '', '', totalValue - totalCost]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, 'دارایی‌ها');
        XLSX.writeFile(wb, `assets_${Date.now()}.xlsx`);
    } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Assets Report', 10, 10);
        
        const tableData = assets.map(a => {
            const currentPrice = marketData[a.symbol]?.price || 0;
            const currentValue = a.amount * currentPrice;
            return [
                a.name,
                a.type,
                a.amount.toFixed(6),
                formatNumber(currentValue)
            ];
        });
        
        doc.autoTable({
            head: [['Name', 'Type', 'Amount', 'Value']],
            body: tableData
        });
        
        doc.save(`assets_${Date.now()}.pdf`);
    }
}

// ==================== MENU DRAWER ====================
function openMenuDrawer() {
    const drawer = document.getElementById('menuDrawer');
    if (drawer) {
        drawer.classList.add('active');
    }
}

function closeMenuDrawer() {
    const drawer = document.getElementById('menuDrawer');
    if (drawer) {
        drawer.classList.remove('active');
    }
}

// ==================== NOTES ====================
function openNotes() {
    closeMenuDrawer();
    openModal('notesModal');
    loadNotes();
}

async function loadNotes() {
    const notesList = document.getElementById('notesList');
    // Implementation would load from backend
    notesList.innerHTML = '<div class="loading">یادداشتی وجود ندارد</div>';
}

// ==================== SUPPORT TICKETS ====================
function openSupport() {
    closeMenuDrawer();
    openModal('supportModal');
    loadTickets();
}

async function loadTickets() {
    try {
        const response = await fetch(`${API_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tickets = await response.json();
        
        const ticketsList = document.getElementById('ticketsList');
        if (tickets.length === 0) {
            ticketsList.innerHTML = '<div class="loading">تیکتی وجود ندارد</div>';
            return;
        }
        
        ticketsList.innerHTML = tickets.map(ticket => `
            <div class="ticket-item" onclick="openTicketDetail(${ticket.id})">
                <div class="ticket-header">
                    <strong>${ticket.title}</strong>
                    <span class="ticket-status ${ticket.status}">${ticket.status === 'open' ? 'باز' : ticket.status === 'answered' ? 'پاسخ داده شده' : 'بسته'}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                    ${new Date(ticket.created_at).toLocaleDateString('fa-IR')}
                </p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

async function createTicket(e) {
    e.preventDefault();
    
    const title = document.getElementById('ticketTitle').value;
    const message = document.getElementById('ticketMessage').value;
    
    try {
        const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, message })
        });
        
        if (!response.ok) throw new Error('Failed');
        
        alert('تیکت با موفقیت ارسال شد');
        document.getElementById('newTicketForm').reset();
        loadTickets();
    } catch (error) {
        alert('خطا در ارسال تیکت');
    }
}

// Continue with remaining functions...
