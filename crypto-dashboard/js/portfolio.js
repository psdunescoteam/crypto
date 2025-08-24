// DOM Elements
const dateElement = document.querySelector('.date');
const themeToggle = document.querySelector('.theme-toggle');
const assetSelect = document.getElementById('assetSelect');
const addAssetForm = document.getElementById('addAssetForm');
const assetsList = document.getElementById('assetsList');
const portfolioValue = document.querySelector('.portfolio-value');
const portfolioChange = document.querySelector('.portfolio-change .change');

// Constants
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const PORTFOLIO_STORAGE_KEY = 'cryptoPortfolio';

// Initialize portfolio page
async function initializePortfolio() {
    setDate();
    setupThemeToggle();
    await loadCryptocurrencies();
    loadPortfolio();
    initializeCharts();
    setupEventListeners();
}

// Set current date
function setDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('en-US', options);
}

// Theme toggle functionality
function setupThemeToggle() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        updateChartsTheme();
    });
}

// Load available cryptocurrencies for the select input
async function loadCryptocurrencies() {
    try {
        const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false`);
        const data = await response.json();

        assetSelect.innerHTML = '<option value="">Select cryptocurrency</option>' +
            data.map(coin => `<option value="${coin.id}" data-symbol="${coin.symbol}">${coin.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading cryptocurrencies:', error);
    }
}

// Load portfolio from localStorage
function loadPortfolio() {
    const portfolio = getPortfolio();
    updatePortfolioUI(portfolio);
}

// Get portfolio from localStorage
function getPortfolio() {
    return JSON.parse(localStorage.getItem(PORTFOLIO_STORAGE_KEY)) || [];
}

// Save portfolio to localStorage
function savePortfolio(portfolio) {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
}

// Update portfolio UI
async function updatePortfolioUI(portfolio) {
    if (portfolio.length === 0) {
        assetsList.innerHTML = '<p>No assets added yet.</p>';
        portfolioValue.textContent = '$0.00';
        portfolioChange.textContent = '0.00%';
        return;
    }

    try {
        const ids = portfolio.map(asset => asset.id).join(',');
        const response = await fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        const prices = await response.json();

        let totalValue = 0;
        let totalChange = 0;

        assetsList.innerHTML = portfolio.map(asset => {
            const price = prices[asset.id];
            const value = price.usd * asset.amount;
            totalValue += value;
            totalChange += price.usd_24h_change;

            return `
                <div class="asset-item">
                    <div class="asset-info">
                        <span class="asset-name">${asset.name}</span>
                        <span class="asset-amount">${asset.amount} ${asset.symbol.toUpperCase()}</span>
                    </div>
                    <div class="asset-value">
                        <div>$${value.toLocaleString()}</div>
                        <div class="change ${price.usd_24h_change < 0 ? 'negative' : ''}">${price.usd_24h_change.toFixed(2)}%</div>
                    </div>
                    <i class="fas fa-trash delete-asset" data-id="${asset.id}"></i>
                </div>
            `;
        }).join('');

        portfolioValue.textContent = `$${totalValue.toLocaleString()}`;
        const averageChange = totalChange / portfolio.length;
        portfolioChange.textContent = `${averageChange.toFixed(2)}%`;
        portfolioChange.classList.toggle('negative', averageChange < 0);

        updateCharts(portfolio, prices);
    } catch (error) {
        console.error('Error updating portfolio:', error);
    }
}

// Initialize charts
function initializeCharts() {
    const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
    const distributionCtx = document.getElementById('distributionChart').getContext('2d');

    window.portfolioChart = new Chart(portfolioCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#6c5ce7',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });

    window.distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6c5ce7',
                    '#a55eea',
                    '#fd79a8',
                    '#ffeaa7',
                    '#00b894',
                    '#00cec9',
                    '#0984e3',
                    '#6c5ce7'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update charts with portfolio data
function updateCharts(portfolio, prices) {
    // Update distribution chart
    const labels = portfolio.map(asset => asset.name);
    const data = portfolio.map(asset => prices[asset.id].usd * asset.amount);

    window.distributionChart.data.labels = labels;
    window.distributionChart.data.datasets[0].data = data;
    window.distributionChart.update();

    // Update portfolio chart (simplified version - you might want to fetch historical data)
    const today = new Date();
    const labels7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString();
    });

    window.portfolioChart.data.labels = labels7Days;
    window.portfolioChart.data.datasets[0].data = data;
    window.portfolioChart.update();
}

// Setup event listeners
function setupEventListeners() {
    // Add asset form submission
    addAssetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = assetSelect.value;
        const amount = parseFloat(document.getElementById('amount').value);
        const option = assetSelect.querySelector(`option[value="${id}"]`);
        
        if (id && amount > 0) {
            const portfolio = getPortfolio();
            const existingAsset = portfolio.find(asset => asset.id === id);

            if (existingAsset) {
                existingAsset.amount += amount;
            } else {
                portfolio.push({
                    id,
                    name: option.text,
                    symbol: option.dataset.symbol,
                    amount
                });
            }

            savePortfolio(portfolio);
            updatePortfolioUI(portfolio);
            addAssetForm.reset();
        }
    });

    // Delete asset
    assetsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-asset')) {
            const id = e.target.dataset.id;
            const portfolio = getPortfolio().filter(asset => asset.id !== id);
            savePortfolio(portfolio);
            updatePortfolioUI(portfolio);
        }
    });
}

// Update charts theme based on current theme
function updateChartsTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#ffffff' : '#666666';

    if (window.portfolioChart && window.distributionChart) {
        [window.portfolioChart, window.distributionChart].forEach(chart => {
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    scale.ticks.color = textColor;
                    if (scale.grid) {
                        scale.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                    }
                });
            }
            chart.options.plugins.legend.labels.color = textColor;
            chart.update();
        });
    }
}

// Initialize portfolio when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePortfolio);

// Auto-refresh portfolio data every minute
setInterval(() => {
    updatePortfolioUI(getPortfolio());
}, 60000);
