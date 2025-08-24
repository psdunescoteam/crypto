// DOM Elements
const dateElement = document.querySelector('.date');
const themeToggle = document.querySelector('.theme-toggle');
const marketDataBody = document.getElementById('market-data');
const timeframeSelect = document.getElementById('timeframe');
const cryptoSelect = document.getElementById('cryptoSelect');
const priceChart = document.getElementById('priceChart');

// Constants
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
let MAX_DATA_POINTS = 100; // Maximum number of points to show on chart

// Websocket and Chart variables
let webSocket;
let chart;
let priceData = [];

// Initialize the dashboard
async function initializeDashboard() {
    setDate();
    setupThemeToggle();
    await fetchAndDisplayPrices();
    await fetchAndDisplayMarketData();
    initializeChart();
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
        updateChartTheme();
    });
}

// Fetch and display crypto prices
async function fetchAndDisplayPrices() {
    try {
        const response = await fetch(`${COINGECKO_API}/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();

        updatePriceCard('bitcoin-card', data.bitcoin);
        updatePriceCard('ethereum-card', data.ethereum);
        updatePriceCard('bnb-card', data.binancecoin);
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

// Update individual price cards
function updatePriceCard(cardId, data) {
    const card = document.getElementById(cardId);
    const priceElement = card.querySelector('.price');
    const changeElement = card.querySelector('.change');

    priceElement.textContent = `$${data.usd.toLocaleString()}`;
    const change = data.usd_24h_change.toFixed(2);
    changeElement.textContent = `${change}%`;
    changeElement.classList.toggle('negative', change < 0);
}

// Fetch and display market data
async function fetchAndDisplayMarketData() {
    try {
        const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1`);
        const data = await response.json();

        marketDataBody.innerHTML = data.map(coin => `
            <tr>
                <td>
                    <img src="${coin.image}" alt="${coin.name}" style="width: 20px; height: 20px; margin-right: 10px;">
                    ${coin.name}
                </td>
                <td>$${coin.current_price.toLocaleString()}</td>
                <td class="${coin.price_change_percentage_24h < 0 ? 'negative' : ''}">${coin.price_change_percentage_24h.toFixed(2)}%</td>
                <td>$${coin.market_cap.toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

// Initialize and setup chart
function initializeChart() {
    const ctx = priceChart.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Price (USD)',
                data: [],
                borderColor: '#6c5ce7',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    ticks: {
                        source: 'auto',
                        maxRotation: 0
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
    
    initializeWebSocket();
}

// Initialize WebSocket connection
function initializeWebSocket() {
    const selectedCrypto = cryptoSelect.value;
    const symbol = `${selectedCrypto.toLowerCase()}usdt`;
    
    if (webSocket) {
        webSocket.close();
    }

    webSocket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);
    
    webSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        const timestamp = new Date(data.T);

        updateChartData(timestamp, price);
    };

    webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    webSocket.onclose = () => {
        console.log('WebSocket connection closed');
    };
}

// Update chart with new data
function updateChartData(timestamp, price) {
    priceData.push({
        x: timestamp,
        y: price
    });

    // Limit the number of data points
    if (priceData.length > MAX_DATA_POINTS) {
        priceData.shift();
    }

    chart.data.datasets[0].data = priceData;
    chart.update('quiet');
}

// Update chart theme based on current theme
function updateChartTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#ffffff' : '#666666';

    if (window.chart) {
        window.chart.options.scales.y.grid.color = gridColor;
        window.chart.options.scales.y.ticks.color = textColor;
        window.chart.options.scales.x.ticks.color = textColor;
        window.chart.update();
    }
}

// Event Listeners
cryptoSelect.addEventListener('change', () => {
    priceData = []; // Clear existing data
    chart.data.datasets[0].data = [];
    chart.update();
    initializeWebSocket();
});

timeframeSelect.addEventListener('change', () => {
    const selectedTime = timeframeSelect.value;
    const minutes = parseInt(selectedTime);
    MAX_DATA_POINTS = (minutes * 60); // Update max data points based on selected timeframe
    priceData = []; // Clear existing data
    chart.data.datasets[0].data = [];
    chart.update();
});

// Auto-refresh market data every minute
setInterval(() => {
    fetchAndDisplayPrices();
    fetchAndDisplayMarketData();
}, 60000);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
