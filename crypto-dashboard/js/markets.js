// DOM Elements
const dateElement = document.querySelector('.date');
const themeToggle = document.querySelector('.theme-toggle');
const marketTableBody = document.getElementById('marketTableBody');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const sortBySelect = document.getElementById('sortBy');
const showRowsSelect = document.getElementById('showRows');
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');

// Constants
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
let currentPage = 1;
let marketData = [];
let filteredData = [];

// Initialize the markets page
async function initializeMarkets() {
    setDate();
    setupThemeToggle();
    await fetchGlobalData();
    await fetchMarketData();
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
    });
}

// Fetch global market data
async function fetchGlobalData() {
    try {
        const response = await fetch(`${COINGECKO_API}/global`);
        const data = await response.json();

        document.getElementById('totalMarketCap').textContent = 
            `$${formatNumber(data.data.total_market_cap.usd)}`;
        document.getElementById('total24hVolume').textContent = 
            `$${formatNumber(data.data.total_volume.usd)}`;
        document.getElementById('btcDominance').textContent = 
            `${data.data.market_cap_percentage.btc.toFixed(1)}%`;
        document.getElementById('activeCryptos').textContent = 
            formatNumber(data.data.active_cryptocurrencies);
    } catch (error) {
        console.error('Error fetching global data:', error);
    }
}

// Fetch market data
async function fetchMarketData() {
    try {
        const perPage = parseInt(showRowsSelect.value);
        const response = await fetch(
            `${COINGECKO_API}/coins/markets?vs_currency=usd&order=${sortBySelect.value}&per_page=${perPage}&page=${currentPage}&sparkline=true&price_change_percentage=7d`
        );
        marketData = await response.json();
        filteredData = [...marketData];
        applyFilters();
        renderTable();
        renderPagination();
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

// Render market table
function renderTable() {
    const startIndex = (currentPage - 1) * parseInt(showRowsSelect.value);
    marketTableBody.innerHTML = filteredData
        .slice(startIndex, startIndex + parseInt(showRowsSelect.value))
        .map((coin, index) => `
            <tr>
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="coin-info">
                        <img src="${coin.image}" alt="${coin.name}">
                        <div>
                            <div class="coin-name">${coin.name}</div>
                            <div class="coin-symbol">${coin.symbol}</div>
                        </div>
                    </div>
                </td>
                <td>$${formatPrice(coin.current_price)}</td>
                <td class="${coin.price_change_percentage_24h < 0 ? 'negative' : ''}">${coin.price_change_percentage_24h?.toFixed(2)}%</td>
                <td class="${coin.price_change_percentage_7d_in_currency < 0 ? 'negative' : ''}">${coin.price_change_percentage_7d_in_currency?.toFixed(2)}%</td>
                <td>$${formatNumber(coin.market_cap)}</td>
                <td>$${formatNumber(coin.total_volume)}</td>
                <td>${formatNumber(coin.circulating_supply)} ${coin.symbol.toUpperCase()}</td>
                <td>
                    <canvas class="sparkline" data-prices='${JSON.stringify(coin.sparkline_in_7d.price)}'></canvas>
                </td>
            </tr>
        `).join('');

    // Initialize sparkline charts
    document.querySelectorAll('.sparkline').forEach(canvas => {
        const prices = JSON.parse(canvas.dataset.prices);
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(prices.length).fill(''),
                datasets: [{
                    data: prices,
                    borderColor: prices[0] > prices[prices.length - 1] ? '#d63031' : '#00b894',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                }
            }
        });
    });
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / parseInt(showRowsSelect.value));
    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            paginationHTML += `
                <button class="${i === currentPage ? 'current-page' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (
            i === currentPage - 3 ||
            i === currentPage + 3
        ) {
            paginationHTML += '<button disabled>...</button>';
        }
    }

    // Next button
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    renderTable();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Apply filters
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const minPrice = parseFloat(minPriceInput.value) || 0;
    const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

    filteredData = marketData.filter(coin => {
        const matchesSearch = 
            coin.name.toLowerCase().includes(searchTerm) ||
            coin.symbol.toLowerCase().includes(searchTerm);
        const matchesPrice = 
            coin.current_price >= minPrice &&
            coin.current_price <= maxPrice;
        return matchesSearch && matchesPrice;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    sortBySelect.addEventListener('change', fetchMarketData);
    showRowsSelect.addEventListener('change', () => {
        currentPage = 1;
        fetchMarketData();
    });
    minPriceInput.addEventListener('input', debounce(applyFilters, 300));
    maxPriceInput.addEventListener('input', debounce(applyFilters, 300));
}

// Utility functions
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatPrice(price) {
    if (price < 1) return price.toFixed(6);
    if (price < 10) return price.toFixed(4);
    return price.toFixed(2);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-refresh market data every minute
setInterval(() => {
    fetchGlobalData();
    fetchMarketData();
}, 60000);

// Initialize markets page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeMarkets);
