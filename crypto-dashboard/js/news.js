// DOM Elements
const dateElement = document.querySelector('.date');
const themeToggle = document.querySelector('.theme-toggle');
const newsContainer = document.getElementById('newsContainer');
const loadMoreButton = document.getElementById('loadMore');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('category');
const sortBySelect = document.getElementById('sortBy');

// Constants
const CRYPTOPANIC_API = 'https://cryptopanic.com/api/v1/posts';
const CRYPTOPANIC_KEY = 'YOUR_API_KEY'; // Replace with your API key
let currentPage = 1;
let isLoading = false;

// Initialize the news page
async function initializeNews() {
    setDate();
    setupThemeToggle();
    await fetchNews();
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

// Fetch news articles
async function fetchNews(resetContent = false) {
    if (isLoading) return;
    isLoading = true;

    // Show loading state
    if (resetContent) {
        newsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i></div>';
    }

    try {
        // For demonstration, we'll use a sample news data structure
        // In production, replace this with actual API call
        const newsData = await fetchSampleNews();
        
        if (resetContent) {
            newsContainer.innerHTML = '';
        }

        renderNews(newsData);
        currentPage++;

        // Hide load more button if no more news
        loadMoreButton.style.display = newsData.length < 10 ? 'none' : 'block';
    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML += '<div>Error loading news. Please try again later.</div>';
    } finally {
        isLoading = false;
    }
}

// Render news articles
function renderNews(newsArticles) {
    const newsHTML = newsArticles.map(article => `
        <div class="news-card">
            <img src="${article.image}" alt="${article.title}" class="news-image">
            <div class="news-content">
                <div class="news-source">
                    <img src="${article.sourceImage}" alt="${article.source}" class="source-image">
                    <span class="source-name">${article.source}</span>
                </div>
                <h3 class="news-title">${article.title}</h3>
                <div class="news-tags">
                    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p class="news-description">${article.description}</p>
                <div class="news-meta">
                    <span>${formatDate(article.date)}</span>
                    <a href="${article.url}" target="_blank" class="read-more">Read More</a>
                </div>
            </div>
        </div>
    `).join('');

    newsContainer.innerHTML += newsHTML;
}

// Setup event listeners
function setupEventListeners() {
    loadMoreButton.addEventListener('click', () => fetchNews());
    
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        fetchNews(true);
    }, 300));

    categorySelect.addEventListener('change', () => {
        currentPage = 1;
        fetchNews(true);
    });

    sortBySelect.addEventListener('change', () => {
        currentPage = 1;
        fetchNews(true);
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } else if (days > 0) {
        return `${days}d ago`;
    } else if (hours > 0) {
        return `${hours}h ago`;
    } else if (minutes > 0) {
        return `${minutes}m ago`;
    } else {
        return 'Just now';
    }
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

// Sample news data (replace with actual API call)
async function fetchSampleNews() {
    // Simulated API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
        {
            title: "Bitcoin Surges Past $50,000 as Institutional Interest Grows",
            description: "Bitcoin has reached a new milestone as major institutions continue to show interest in cryptocurrency investments...",
            source: "CryptoNews",
            sourceImage: "https://example.com/cryptonews-logo.png",
            image: "https://example.com/bitcoin-image.jpg",
            date: new Date(Date.now() - 3600000).toISOString(),
            url: "https://example.com/news/1",
            tags: ["Bitcoin", "Markets"]
        },
        {
            title: "New DeFi Protocol Launches with Innovative Yield Farming Strategy",
            description: "A new decentralized finance protocol has launched, offering unique yield farming opportunities...",
            source: "DeFi Daily",
            sourceImage: "https://example.com/defi-daily-logo.png",
            image: "https://example.com/defi-image.jpg",
            date: new Date(Date.now() - 7200000).toISOString(),
            url: "https://example.com/news/2",
            tags: ["DeFi", "Yield Farming"]
        },
        // Add more sample news articles as needed
    ];
}

// Initialize news page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNews);
