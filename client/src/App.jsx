import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
  TrendingUp, Home, DollarSign, Layers, Search, Download, RefreshCw, Moon, Sun,
  MapPin, BedDouble, Bath, Maximize, ArrowUpDown, ChevronLeft, ChevronRight, X,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, Info, ExternalLink, Menu, Link
} from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

const LOCATIONS = [
  { slug: 'kuala-lumpur', name: 'Kuala Lumpur' },
  { slug: 'petaling-jaya', name: 'Petaling Jaya' },
  { slug: 'subang-jaya', name: 'Subang Jaya' },
  { slug: 'shah-alam', name: 'Shah Alam' },
  { slug: 'penang', name: 'Penang' }
];

const PROPERTY_TYPES = [
  { slug: 'HIGHRISE', name: 'High-Rise Condo' },
  { slug: 'LANDED', name: 'Landed House' },
  { slug: 'STUDIO', name: 'Studio' }
];

const FURNISHING_TYPES = [
  { slug: 'FULL', name: 'Fully Furnished' },
  { slug: 'PARTIAL', name: 'Partially Furnished' },
  { slug: 'NONE', name: 'Unfurnished' }
];

const BEDROOMS = [1, 2, 3, 4]; // 4 represents 4+

// Rental type constants
const RENTAL_TYPES = [
  { slug: 'DAILY',   name: 'Daily',   suffix: '/day',   icon: '☀️' },
  { slug: 'MONTHLY', name: 'Monthly', suffix: '/month', icon: '📅' },
  { slug: 'YEARLY',  name: 'Yearly',  suffix: '/year',  icon: '📆' }
];

// Get price period suffix from a property's rentalType field
function priceLabel(rentalType) {
  switch ((rentalType || 'MONTHLY').toUpperCase()) {
    case 'DAILY':  return '/day';
    case 'YEARLY': return '/year';
    default:       return '/month';
  }
}

// ==========================================
// PRICE SUMMARY PURE COMPUTATION HELPER
// ==========================================
function formatRM(value) {
  if (!value && value !== 0) return '-';
  return `RM ${value.toLocaleString('en-MY')}`;
}

// ==========================================
// PRICE SUMMARY TABLE CARD COMPONENT
// ==========================================
function PriceSummaryCard({ data, loading }) {
  const unitIcons = {
    'Studio': '🏢',
    '1 Bedroom': '🛏️',
    '2 Bedrooms': '🛏️🛏️',
    '3 Bedrooms': '🏠',
    '4+ Bedrooms': '🏡'
  };

  const fairPriceBadge = (fairPrice, avgPrice) => {
    if (!fairPrice || !avgPrice) return null;
    const diff = ((fairPrice - avgPrice) / avgPrice) * 100;
    if (Math.abs(diff) < 3) return <span className="ps-badge ps-badge-neutral">Market Rate</span>;
    if (diff < 0) return <span className="ps-badge ps-badge-good">Below Avg</span>;
    return <span className="ps-badge ps-badge-high">Above Avg</span>;
  };

  return (
    <div className="chart-card price-summary-card">
      <div className="chart-title">
        <DollarSign size={18} className="text-primary-color" />
        <span>Price Summary by Unit Type</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
          Based on filtered data · Median used as Fair Price
        </span>
      </div>

      {loading ? (
        <div className="ps-skeleton-wrap">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px', marginBottom: '8px' }} />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="ps-empty">
          <AlertCircle size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p>No properties found. Try changing your filters.</p>
        </div>
      ) : (
        <div className="ps-table-wrapper">
          <table className="ps-table">
            <thead>
              <tr>
                <th>Unit Type</th>
                <th className="ps-num">Total Units</th>
                <th className="ps-num">Avg Price</th>
                <th className="ps-num">Median Price</th>
                <th className="ps-num">Mode Price</th>
                <th className="ps-num ps-highlight">Fair Price ✦</th>
                <th className="ps-num">Avg Size</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="ps-row">
                  <td className="ps-unit-type">
                    <span className="ps-unit-icon">{unitIcons[row.unitType] || '🏠'}</span>
                    {row.unitType}
                  </td>
                  <td className="ps-num">
                    <span className="ps-count">{row.totalUnits.toLocaleString()}</span>
                  </td>
                  <td className="ps-num">{formatRM(row.avgPrice)}</td>
                  <td className="ps-num">{formatRM(row.medianPrice)}</td>
                  <td className="ps-num ps-mode">
                    {row.modePrice ? formatRM(row.modePrice) : <span className="ps-na">—</span>}
                  </td>
                  <td className="ps-num ps-fair">
                    <span className="ps-fair-value">{formatRM(row.fairPrice)}</span>
                    {fairPriceBadge(row.fairPrice, row.avgPrice)}
                  </td>
                  <td className="ps-num ps-sqft">{row.avgSqft > 0 ? `${row.avgSqft.toLocaleString()} sqft` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SMART SEARCH ENGINE COMPONENT
// ==========================================
const SPEEDHOME_URL_REGEX = /speedhome\.com\/(?:[a-z]{2}\/)?(?:rent|sewa)\/([a-z0-9-]+)/i;

function SmartSearch({ onLocationSelect, onUrlScrape, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState({ locations: [], properties: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const isUrl = SPEEDHOME_URL_REGEX.test(query);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (isUrl || query.length < 2) {
      setSuggestions({ locations: [], properties: [] });
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`${API_BASE}/autocomplete?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          const hasResults = data.locations.length > 0 || data.properties.length > 0;
          setShowDropdown(hasResults);
          setHighlighted(-1);
        }
      } catch (e) {
        // silent fail
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, isUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build flat list for keyboard navigation
  const flatItems = [
    ...suggestions.locations.map(l => ({ ...l, _type: 'location' })),
    ...suggestions.properties.map(p => ({ ...p, _type: 'property' }))
  ];

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && flatItems[highlighted]) {
        selectItem(flatItems[highlighted]);
      } else if (isUrl) {
        handleUrlSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectItem = (item) => {
    setShowDropdown(false);
    if (item._type === 'location') {
      setQuery(item.label);
      onLocationSelect && onLocationSelect(item.label, 'city');
    } else {
      setQuery(item.label);
      onLocationSelect && onLocationSelect(item.label, 'search');
    }
  };

  const handleUrlSearch = () => {
    const match = query.match(SPEEDHOME_URL_REGEX);
    if (match && match[1]) {
      onUrlScrape && onUrlScrape(match[1]);
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions({ locations: [], properties: [] });
    setShowDropdown(false);
    onLocationSelect && onLocationSelect('', 'clear');
    inputRef.current && inputRef.current.focus();
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!isUrl && e.target.value.length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <div className="smart-search-container" ref={containerRef}>
      <div className={`smart-search-wrapper${isUrl ? ' url-mode' : ''}`}>
        <span className="smart-search-icon">
          {isUrl ? <Link size={18} /> : <Search size={18} />}
        </span>
        <input
          ref={inputRef}
          id="smart-search-input"
          type="text"
          className="smart-search-input"
          placeholder="Ketik nama area/apartemen atau tempel URL SPEEDHOME..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!isUrl && query.length >= 2 && (suggestions.locations.length > 0 || suggestions.properties.length > 0)) {
              setShowDropdown(true);
            }
          }}
          autoComplete="off"
        />
        {isUrl && (
          <span className="url-mode-badge">URL</span>
        )}
        {query && (
          <button className="smart-search-clear" onClick={handleClear} title="Hapus pencarian">
            <X size={16} />
          </button>
        )}
        {isUrl && (
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={handleUrlSearch}
          >
            Ikis Lokasi
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="autocomplete-dropdown">
          {suggestions.locations.length > 0 && (
            <>
              <div className="autocomplete-section-header">
                <MapPin size={12} /> Lokasi
              </div>
              {suggestions.locations.map((item, idx) => (
                <div
                  key={`loc-${idx}`}
                  className={`autocomplete-item${highlighted === idx ? ' highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => selectItem({ ...item, _type: 'location' })}
                >
                  <span className="autocomplete-item-icon location">📍</span>
                  <div className="autocomplete-item-content">
                    <div className="autocomplete-item-label">{item.label}</div>
                    <div className="autocomplete-item-sub">{item.count} listing aktif</div>
                  </div>
                  <span className="autocomplete-item-badge location">Lokasi</span>
                </div>
              ))}
            </>
          )}

          {suggestions.properties.length > 0 && (
            <>
              <div className="autocomplete-section-header">
                <Home size={12} /> Properti
              </div>
              {suggestions.properties.map((item, idx) => {
                const globalIdx = suggestions.locations.length + idx;
                return (
                  <div
                    key={`prop-${idx}`}
                    className={`autocomplete-item${highlighted === globalIdx ? ' highlighted' : ''}`}
                    onMouseEnter={() => setHighlighted(globalIdx)}
                    onClick={() => selectItem({ ...item, _type: 'property' })}
                  >
                    <span className="autocomplete-item-icon property">🏠</span>
                    <div className="autocomplete-item-content">
                      <div className="autocomplete-item-label">{item.label}</div>
                      <div className="autocomplete-item-sub">{item.city}</div>
                    </div>
                    <span className="autocomplete-item-badge property">Properti</span>
                  </div>
                );
              })}
            </>
          )}

          {!isFetchingSuggestions && flatItems.length === 0 && (
            <div className="autocomplete-empty">Tidak ada saran yang ditemukan untuk "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');

  // Tab navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Core Data States
  const [properties, setProperties] = useState([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scraper & Export States
  const [scraperStatus, setScraperStatus] = useState({ isScraping: false, lastUpdated: '', totalItems: 0 });
  const [exportLoading, setExportLoading] = useState(false);

  // URL Scraper States (for smart search engine)
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');
  const [scrapeError, setScrapeError] = useState('');

  // Modal Detail State
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedFurnish, setSelectedFurnish] = useState([]);
  const [selectedBeds, setSelectedBeds] = useState([]);

  // Sliders/Ranges
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSqft, setMinSqft] = useState('');
  const [maxSqft, setMaxSqft] = useState('');

  // Sorting and Pagination
  const [sortBy, setSortBy] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  // Rental Type filter — used on Data Explorer tab
  const [selectedRentalType, setSelectedRentalType] = useState('ALL');

  // Set theme data attribute on html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Build query string for API calls based on active filters
  const buildQueryString = useCallback((pageNum = page) => {
    const params = new URLSearchParams();

    if (search) params.append('search', search);
    selectedCities.forEach(c => params.append('city', c));
    selectedTypes.forEach(t => params.append('type', t));
    selectedFurnish.forEach(f => params.append('furnishType', f));
    selectedBeds.forEach(b => params.append('bedroom', b));
    if (selectedRentalType !== 'ALL') params.append('rentalType', selectedRentalType);

    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (minSqft) params.append('minSqft', minSqft);
    if (maxSqft) params.append('maxSqft', maxSqft);

    params.append('sortBy', sortBy);
    params.append('order', sortOrder);
    params.append('page', pageNum);
    params.append('limit', '12'); // 12 items per page is perfect for grid
    params.append('_t', Date.now().toString()); // Cache-buster parameter

    return params.toString();
  }, [search, selectedCities, selectedTypes, selectedFurnish, selectedBeds, minPrice, maxPrice, minSqft, maxSqft, sortBy, sortOrder, selectedRentalType, page]);

  // Fetch properties and analytics from Express backend
  const fetchData = useCallback(async (pageNum = page) => {
    setLoading(true);
    try {
      const query = buildQueryString(pageNum);

      // Fetch both concurrently
      const [propsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/properties?${query}`),
        fetch(`${API_BASE}/analytics?${query}`)
      ]);

      if (propsRes.ok && analyticsRes.ok) {
        const propsData = await propsRes.json();
        const analyticsData = await analyticsRes.json();

        setProperties(propsData.data);
        setTotalProperties(propsData.total);
        setTotalPages(propsData.totalPages);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Failed to fetch data from backend server:', err);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, page]);

  // Fetch scraper status
  const fetchScraperStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scraper/status`);
      if (res.ok) {
        const data = await res.json();
        setScraperStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch scraper status:', err);
    }
  }, []);

  // Poll scraper status if it is currently running
  useEffect(() => {
    fetchScraperStatus();
    let interval = null;
    if (scraperStatus.isScraping) {
      interval = setInterval(() => {
        fetchScraperStatus();
        // Also reload data to show progress in real-time
        fetchData();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scraperStatus.isScraping, fetchScraperStatus, fetchData]);

  // Initial fetch and fetch on filter changes
  useEffect(() => {
    fetchData(1);
    setPage(1);
  }, [search, selectedCities, selectedTypes, selectedFurnish, selectedBeds, minPrice, maxPrice, minSqft, maxSqft, sortBy, sortOrder, selectedRentalType]);

  // Fetch data specifically when page changes
  useEffect(() => {
    fetchData(page);
  }, [page]);

  // Handle manual scraper trigger
  const runScraper = async () => {
    try {
      const res = await fetch(`${API_BASE}/scraper/run`, { method: 'POST' });
      if (res.ok) {
        setScraperStatus(prev => ({ ...prev, isScraping: true }));
        fetchScraperStatus();
      }
    } catch (err) {
      alert('Error triggering scraper: ' + err.message);
    }
  };

  // Handle CSV/JSON export downloads
  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const query = buildQueryString();
      const exportUrl = `${API_BASE}/export?${query}&format=${format}`;

      // Resolve Area Name on frontend
      let areaName = 'All_Areas';
      if (selectedCities && selectedCities.length > 0) {
        areaName = selectedCities[0].replace(/[^a-zA-Z0-9]+/g, '_');
      } else if (search) {
        areaName = search.trim().replace(/[^a-zA-Z0-9]+/g, '_');
      }
      areaName = areaName.replace(/^_+|_+$/g, '');
      if (!areaName) areaName = 'All_Areas';

      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyymmdd = `${yyyy}${mm}${dd}`;

      const filename = `SPEEDHOME_${areaName}_${yyyymmdd}.${format}`;

      // Create element and trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  // Helper selectors toggling
  const toggleSelection = (val, list, setList) => {
    if (list.includes(val)) {
      setList(list.filter(item => item !== val));
    } else {
      setList([...list, val]);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setSelectedCities([]);
    setSelectedTypes([]);
    setSelectedFurnish([]);
    setSelectedBeds([]);
    setMinPrice('');
    setMaxPrice('');
    setMinSqft('');
    setMaxSqft('');
    setSortBy('price');
    setSortOrder('asc');
    setSelectedRentalType('ALL');
    setPage(1);
  };

  // Handle selection from SmartSearch autocomplete
  const handleSearchSelect = (value, mode) => {
    if (mode === 'city') {
      // Filter by city
      setSelectedCities([value]);
      setSearch('');
    } else if (mode === 'search') {
      // Filter by property name keyword
      setSearch(value);
      setSelectedCities([]);
    } else if (mode === 'clear') {
      setSearch('');
      setSelectedCities([]);
    }
    setPage(1);
  };

  // Handle URL-based scraping from SmartSearch
  const handleUrlScrape = async (slug) => {
    setScrapeMessage('');
    setScrapeError('');
    setIsScrapingUrl(true);
    try {
      const res = await fetch(`${API_BASE}/scraper/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScrapeMessage(data.message);
        // Auto-filter to the newly scraped city
        if (data.cityName) {
          setSelectedCities([data.cityName]);
          setSearch('');
        }
        await fetchData(1);
      } else {
        setScrapeError(data.error || 'Gagal mengikis data dari SPEEDHOME.');
      }
    } catch (err) {
      setScrapeError('Terjadi kesalahan saat menghubungi server: ' + err.message);
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Theme-dependent colors for Recharts
  const chartColors = theme === 'dark' ? {
    primary: '#3b82f6',     // Blue
    secondary: '#a855f7',   // Purple
    success: '#10b981',     // Emerald
    warning: '#f59e0b',     // Amber
    text: '#e2e8f0',
    grid: '#334155'
  } : {
    primary: '#2563eb',     // Darker Blue
    secondary: '#8b5cf6',   // Purple
    success: '#059669',     // Green
    warning: '#d97706',     // Darker Amber
    text: '#334155',
    grid: '#cbd5e1'
  };

  return (
    <div className="app-container">
      {/* Mesh background Blobs */}
      <div className="bg-gradient-mesh">
        <div className="mesh-blob-1"></div>
        <div className="mesh-blob-2"></div>
      </div>

      {/* 1. SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileSidebar ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <TrendingUp size={24} className="text-primary-color" />
            <span>PropIntel MY</span>
          </div>
          {mobileSidebar && (
            <button className="modal-close" style={{ position: 'static' }} onClick={() => setMobileSidebar(false)}>
              <X size={18} />
            </button>
          )}
        </div>

        <ul className="sidebar-menu">
          <li>
            <div
              className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setMobileSidebar(false); }}
            >
              <Layers size={18} />
              <span>Analisis Dashboard</span>
            </div>
          </li>
          <li>
            <div
              className={`menu-item ${activeTab === 'listings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('listings'); setMobileSidebar(false); }}
            >
              <Home size={18} />
              <span>Data Explorer</span>
            </div>
          </li>
        </ul>

        <div className="sidebar-footer">
          {/* Theme Switcher */}
          <div className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <span className="flex-center gap-8">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <div className="theme-toggle-switch"></div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            CEO Office Tech Assessment
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION PAGE */}
      <main className="main-layout">
        {/* Mobile Navbar Toggle Bar */}
        <div style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="mobile-nav-bar">
          <button className="btn btn-secondary btn-icon" onClick={() => setMobileSidebar(true)}>
            <Menu size={20} />
          </button>
          <div className="sidebar-logo" style={{ fontSize: '1.2rem' }}>
            <TrendingUp size={20} className="text-primary-color" />
            <span>PropIntel MY</span>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>
        <style>{`
          @media (max-width: 1024px) {
            .mobile-nav-bar { display: flex !important; }
          }
        `}</style>

        {/* Dynamic App Tab rendering */}
        {activeTab === 'dashboard' ? (
          /* ==================== TAB 1: ANALYTICS DASHBOARD ==================== */
          <>
            <div className="dashboard-header">
              <div className="header-title-section">
                <h1>Property Price Intelligence</h1>
                <p className="header-subtitle">SPEEDHOME Malaysia Managed Rentals Analytics Portal</p>
              </div>

              <div className="header-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExport('csv')}
                  disabled={exportLoading || properties.length === 0}
                >
                  <Download size={16} />
                  <span>Download CSV</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={runScraper}
                  disabled={scraperStatus.isScraping}
                >
                  <RefreshCw size={16} className={scraperStatus.isScraping ? 'spin-anim' : ''} />
                  <span>{scraperStatus.isScraping ? 'Scraping...' : 'Sync SPEEDHOME'}</span>
                </button>
                <style>{`
                  .spin-anim { animation: spin 2s linear infinite; }
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
              </div>
            </div>

            {/* A. SCRAPER MONITOR PANEL */}
            <div className="scraper-panel">
              <div className="scraper-info">
                <div className={`scraper-status-dot ${scraperStatus.isScraping ? 'status-running' : 'status-success'}`}></div>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>
                    Status Sistem: {scraperStatus.isScraping ? 'Sedang melakukan sinkronisasi...' : 'Terkoneksi & Siap'}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Terakhir diperbarui: {scraperStatus.lastUpdated !== 'Never' ? new Date(scraperStatus.lastUpdated).toLocaleString('id-ID') : 'Belum pernah'} | Total properti: <strong>{scraperStatus.totalItems}</strong> active listings
                  </p>
                </div>
              </div>

              {scraperStatus.isScraping && (
                <div className="scraper-progress-container">
                  <div className="flex-between" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    <span>Proses sinkronisasi: {scraperStatus.progress?.progress}%</span>
                    <span>Mengikis data dari SPEEDHOME API</span>
                  </div>
                  <div className="scraper-progress-bar">
                    <div className="scraper-progress-fill" style={{ width: `${scraperStatus.progress?.progress || 20}%` }}></div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '2px' }}>
                    {scraperStatus.progress?.message}
                  </p>
                </div>
              )}
            </div>

            {/* B. DYNAMIC FILTERS PANEL */}
            <div className="filter-panel">
              <div className="flex-between" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={18} className="text-primary-color" /> Panel Penyaringan Cerdas
                </h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={resetFilters}>
                  Reset Filter
                </button>
              </div>

              <div className="filter-grid" style={{ marginBottom: '16px' }}>
                <div className="filter-group">
                  <span className="filter-label">Cari Nama Properti</span>
                  <div className="search-container">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      className="form-input search-input"
                      placeholder="Masukkan nama properti..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Rentang Harga (RM)</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Ukuran (SQFT)</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Min"
                      value={minSqft}
                      onChange={(e) => setMinSqft(e.target.value)}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Max"
                      value={maxSqft}
                      onChange={(e) => setMaxSqft(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div className="filter-group">
                  <span className="filter-label">Pilih Lokasi Utama</span>
                  <div className="tag-selector">
                    {LOCATIONS.map(l => (
                      <span
                        key={l.slug}
                        className={`tag-pill ${selectedCities.includes(l.name) ? 'active' : ''}`}
                        onClick={() => toggleSelection(l.name, selectedCities, setSelectedCities)}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Tipe Properti</span>
                  <div className="tag-selector">
                    {PROPERTY_TYPES.map(t => (
                      <span
                        key={t.slug}
                        className={`tag-pill ${selectedTypes.includes(t.slug) ? 'active' : ''}`}
                        onClick={() => toggleSelection(t.slug, selectedTypes, setSelectedTypes)}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Jumlah Kamar Tidur</span>
                  <div className="tag-selector">
                    {BEDROOMS.map(b => (
                      <span
                        key={b}
                        className={`tag-pill ${selectedBeds.includes(b) ? 'active' : ''}`}
                        onClick={() => toggleSelection(b, selectedBeds, setSelectedBeds)}
                      >
                        {b === 4 ? '4+ Bed' : `${b} Bed`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Tingkat Perabotan</span>
                  <div className="tag-selector">
                    {FURNISHING_TYPES.map(f => (
                      <span
                        key={f.slug}
                        className={`tag-pill ${selectedFurnish.includes(f.slug) ? 'active' : ''}`}
                        onClick={() => toggleSelection(f.slug, selectedFurnish, setSelectedFurnish)}
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* C. MAIN STATISTICS KPI CARDS */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Properti Teranalisis</span>
                  <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' }}>
                    <Home size={18} />
                  </div>
                </div>
                {loading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '2rem' }}></div> : <span className="kpi-val">{totalProperties}</span>}
                <span className="kpi-footer">
                  <Info size={12} /> Properti memenuhi filter aktif
                </span>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Rata-rata Harga</span>
                  <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--secondary)' }}>
                    <DollarSign size={18} />
                  </div>
                </div>
                {loading ? <div className="skeleton skeleton-text" style={{ width: '120px', height: '2rem' }}></div> : <span className="kpi-val">RM {analytics?.avgPrice || 0}</span>}
                <span className="kpi-footer">
                  Rata-rata harga rental per bulan
                </span>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Median Harga Sewa</span>
                  <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                    <DollarSign size={18} />
                  </div>
                </div>
                {loading ? <div className="skeleton skeleton-text" style={{ width: '120px', height: '2rem' }}></div> : <span className="kpi-val">RM {analytics?.medianPrice || 0}</span>}
                <span className="kpi-footer">
                  Nilai tengah pasar sewa properti
                </span>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Rata-rata RM / SQFT</span>
                  <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                {loading ? <div className="skeleton skeleton-text" style={{ width: '100px', height: '2rem' }}></div> : <span className="kpi-val">RM {analytics?.avgPricePerSqft || 0}</span>}
                <span className="kpi-footer">
                  Nilai unit efisiensi properti
                </span>
              </div>
            </div>

            {/* D. PRICE SUMMARY TABLE */}
            <PriceSummaryCard
              data={analytics?.priceSummaryByUnitType}
              loading={loading}
            />

            {/* E. INTERACTIVE CHART GRID */}
            {loading ? (
              <div className="charts-grid">
                <div className="chart-card skeleton" style={{ minHeight: '380px' }}></div>
                <div className="chart-card skeleton" style={{ minHeight: '380px' }}></div>
                <div className="chart-card skeleton" style={{ minHeight: '380px' }}></div>
                <div className="chart-card skeleton" style={{ minHeight: '380px' }}></div>
              </div>
            ) : totalProperties === 0 ? (
              <div className="chart-card flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
                <AlertCircle size={48} style={{ color: 'var(--text-tertiary)' }} />
                <h3>Tidak Ada Data yang Cocok</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Sesuaikan filter pencarian Anda untuk melihat visualisasi analitik.</p>
              </div>
            ) : (
              <div className="charts-grid">
                {/* Chart 1: Price Distribution (Histogram) */}
                <div className="chart-card">
                  <div className="chart-title">
                    <TrendingUp size={18} className="text-primary-color" />
                    <span>Distribusi Harga Sewa Properti</span>
                  </div>
                  <div className="chart-container-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.priceDistribution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="label" stroke={chartColors.text} fontSize={10} tickLine={false} />
                        <YAxis stroke={chartColors.text} fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          formatter={(value) => [`${value} Properti`, 'Kepadatan']}
                        />
                        <Bar dataKey="count" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Konsentrasi listings terbanyak di pasar properti Malaysia.
                  </p>
                </div>

                {/* Chart 2: Average Price by Location */}
                <div className="chart-card">
                  <div className="chart-title">
                    <MapPin size={18} className="text-secondary-color" />
                    <span>Perbandingan Rata-rata Harga per Lokasi</span>
                  </div>
                  <div className="chart-container-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.priceByLocation} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="city" stroke={chartColors.text} fontSize={11} tickLine={false} />
                        <YAxis stroke={chartColors.text} fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          formatter={(value) => [`RM ${value}`, 'Rata-rata Harga']}
                        />
                        <Bar dataKey="avgPrice" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Perbandingan rent harga rata-rata antar kota utama di Malaysia.
                  </p>
                </div>

                {/* Chart 3: Price vs Size correlation (Scatter Plot) */}
                <div className="chart-card">
                  <div className="chart-title">
                    <Maximize size={18} style={{ color: 'var(--success)' }} />
                    <span>Korelasi Harga Sewa vs Ukuran Properti (SQFT)</span>
                  </div>
                  <div className="chart-container-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 15, right: 15, bottom: 0, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis type="number" dataKey="sqft" name="Ukuran" unit=" sqft" stroke={chartColors.text} fontSize={11} />
                        <YAxis type="number" dataKey="price" name="Harga" unit=" RM" stroke={chartColors.text} fontSize={11} />
                        <ZAxis type="category" dataKey="name" name="Nama" />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          formatter={(value, name) => {
                            if (name === 'Harga') return [`RM ${value}`, 'Harga Sewa'];
                            if (name === 'Ukuran') return [`${value} sqft`, 'Ukuran'];
                            return [value, name];
                          }}
                        />
                        <Scatter name="Properti" data={analytics.priceVsSize} fill={chartColors.success} opacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Tren visualisasi korelasi ukuran ruang dengan harga sewa.
                  </p>
                </div>

                {/* Chart 4: Price by Property Type */}
                <div className="chart-card">
                  <div className="chart-title">
                    <Layers size={18} style={{ color: 'var(--warning)' }} />
                    <span>Harga Rata-rata Berdasarkan Tipe Properti</span>
                  </div>
                  <div className="chart-container-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.priceByType} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="type" stroke={chartColors.text} fontSize={11} tickLine={false} />
                        <YAxis stroke={chartColors.text} fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          formatter={(value) => [`RM ${value}`, 'Rata-rata Harga']}
                        />
                        <Bar dataKey="avgPrice" fill={chartColors.warning} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Variasi harga sewa berdasarkan tipe hunian (High-rise, Landed, Studio).
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ==================== TAB 2: DATA EXPLORER & LISTINGS ==================== */
          <>
            <div className="dashboard-header">
              <div className="header-title-section">
                <h1>Properti Data Explorer</h1>
                <p className="header-subtitle">Jelajahi dan saring {totalProperties} listings SPEEDHOME secara detail</p>
              </div>

              <div className="header-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExport('json')}
                  disabled={properties.length === 0}
                >
                  <FileText size={16} />
                  <span>Export JSON</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleExport('csv')}
                  disabled={properties.length === 0}
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* URL SCRAPE LOADER OVERLAY */}
            {isScrapingUrl && (
              <div className="url-loader-overlay">
                <div className="url-loader-card">
                  <div className="url-loader-spinner" />
                  <h3 className="url-loader-title">Mengikis Data SPEEDHOME</h3>
                  <p className="url-loader-subtitle">
                    Sedang mengambil listing properti dari lokasi baru...<br />
                    Proses ini memerlukan waktu 15–30 detik.
                  </p>
                  <div className="url-loader-progress-bar">
                    <div className="url-loader-progress-fill" />
                  </div>
                  <p className="url-loader-hint">⚙️ Mengikis data dengan menghormati delay robots.txt</p>
                </div>
              </div>
            )}

            {/* SCRAPE SUCCESS/ERROR MESSAGES */}
            {(scrapeMessage || scrapeError) && !isScrapingUrl && (
              <div
                className="scraper-panel"
                style={{
                  borderColor: scrapeError ? 'var(--danger)' : 'var(--success)',
                  background: scrapeError
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(16,185,129,0.06)'
                }}
              >
                <div className="scraper-info">
                  {scrapeError
                    ? <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                    : <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                      {scrapeError || scrapeMessage}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  onClick={() => { setScrapeMessage(''); setScrapeError(''); }}
                >
                  Tutup
                </button>
              </div>
            )}

            {/* SMART SEARCH ENGINE */}
            <div style={{ margin: '0 0 4px 0' }}>
              <SmartSearch
                onLocationSelect={handleSearchSelect}
                onUrlScrape={handleUrlScrape}
                initialQuery={search}
              />
            </div>

            {/* A. SORTING & METADATA BAR */}
            <div className="section-title-bar">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Menampilkan {properties.length} dari {totalProperties} Properti
              </h3>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Urutkan:</span>
                <select
                  className="form-input"
                  style={{ width: '160px', padding: '6px 12px' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="price">Harga Sewa</option>
                  <option value="sqft">Ukuran (Sqft)</option>
                  <option value="bedroom">Jumlah Kamar</option>
                  <option value="dateCreated">Terbaru</option>
                </select>
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ width: '34px', height: '34px' }}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>
            </div>

            {/* RENTAL TYPE FILTER BAR */}
            <div className="rental-filter-bar">
              <span className="rental-filter-label">
                <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>🏷️</span> Tipe Sewa:
              </span>
              <div className="rental-filter-pills">
                <button
                  className={`rental-pill ${selectedRentalType === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedRentalType('ALL')}
                >
                  Semua
                  <span className="rental-pill-count">{analytics?.totalCount ?? totalProperties}</span>
                </button>
                {RENTAL_TYPES.map(rt => {
                  const available = analytics?.availableRentalTypes?.includes(rt.slug) ?? true;
                  return (
                    <button
                      key={rt.slug}
                      className={`rental-pill rental-pill-${rt.slug.toLowerCase()} ${selectedRentalType === rt.slug ? 'active' : ''} ${!available ? 'rental-pill-disabled' : ''}`}
                      onClick={() => available && setSelectedRentalType(rt.slug)}
                      disabled={!available}
                      title={!available ? 'Tidak ada data untuk tipe sewa ini' : `Filter ${rt.name} listings`}
                    >
                      {rt.icon} {rt.name}
                      {!available && <span style={{ marginLeft: '4px', fontSize: '0.6rem' }}>✕</span>}
                    </button>
                  );
                })}
              </div>
              {selectedRentalType !== 'ALL' && !loading && totalProperties === 0 && (
                <span className="rental-no-data">⚠️ No data available for this rental type</span>
              )}
            </div>

            {/* B. LISTINGS GRID */}
            {loading ? (
              <div className="properties-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="property-card skeleton-card skeleton"></div>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="chart-card flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
                <AlertCircle size={48} style={{ color: 'var(--text-tertiary)' }} />
                <h3>Tidak Ada Hasil yang Ditemukan</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Silakan longgarkan kriteria filter Anda di bilah penyaringan samping.</p>
              </div>
            ) : (
              <div className="properties-grid">
                {properties.map(prop => (
                  <div key={prop.id} className="property-card hover-scale" onClick={() => setSelectedProperty(prop)}>
                    <div className="property-img-wrapper">
                      <img
                        src={prop.images?.[0]?.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80'}
                        alt={prop.name}
                        className="property-img"
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80'; }}
                      />
                      <span className={`property-badge badge-${prop.type?.toLowerCase()}`}>
                        {prop.type === 'HIGHRISE' ? 'Condo' : prop.type === 'LANDED' ? 'Landed' : 'Studio'}
                      </span>
                      <span className="property-price-tag">
                        RM {prop.price?.toLocaleString('en-MY')} <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>{priceLabel(prop.rentalType)}</span>
                      </span>
                    </div>

                    <div className="property-info">
                      <h4 className="property-name">{prop.name}</h4>

                      <div className="property-location">
                        <MapPin size={14} className="text-primary-color" />
                        <span>{prop.city}, {prop.postcode}</span>
                      </div>

                      {/* Multi-Price Rental Type List */}
                      <div className="card-rental-prices">
                        <div className="card-rental-price-row">
                          <span className="rental-label">Daily Price:</span>
                          <span className={`rental-value ${!prop.rentalPrices?.DAILY ? 'no-owner-data' : ''}`}>
                            {prop.rentalPrices?.DAILY ? `RM ${prop.rentalPrices.DAILY.toLocaleString('en-MY')}/day` : 'Data not available from Owner'}
                          </span>
                        </div>
                        <div className="card-rental-price-row">
                          <span className="rental-label">Monthly Price:</span>
                          <span className={`rental-value ${!prop.rentalPrices?.MONTHLY ? 'no-owner-data' : ''}`}>
                            {prop.rentalPrices?.MONTHLY ? `RM ${prop.rentalPrices.MONTHLY.toLocaleString('en-MY')}/month` : 'Data not available from Owner'}
                          </span>
                        </div>
                        <div className="card-rental-price-row">
                          <span className="rental-label">Yearly Price:</span>
                          <span className={`rental-value ${!prop.rentalPrices?.YEARLY ? 'no-owner-data' : ''}`}>
                            {prop.rentalPrices?.YEARLY ? `RM ${prop.rentalPrices.YEARLY.toLocaleString('en-MY')}/year` : 'Data not available from Owner'}
                          </span>
                        </div>
                      </div>

                      <div className="property-specs">
                        <span className="spec-item">
                          <BedDouble size={14} />
                          <span>{prop.bedroom} Bed</span>
                        </span>
                        <span className="spec-item">
                          <Bath size={14} />
                          <span>{prop.bathroom} Bath</span>
                        </span>
                        <span className="spec-item">
                          <Maximize size={14} />
                          <span>{prop.sqft} sqft</span>
                        </span>
                      </div>
                    </div>

                    <div className="property-footer">
                      <span className="furnish-badge">
                        {prop.furnishType === 'FULL' ? 'Fully Furnished' : prop.furnishType === 'PARTIAL' ? 'Partially Furnished' : 'Unfurnished'}
                      </span>
                      <span className={`rental-type-badge rental-type-${(prop.rentalType || 'MONTHLY').toLowerCase()}`}>
                        {prop.rentalType === 'DAILY' ? '☀️ Daily' : prop.rentalType === 'YEARLY' ? '📆 Yearly' : '📅 Monthly'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. PAGINATION BAR */}
            {!loading && totalProperties > 0 && (
              <div className="pagination-bar">
                <button
                  className={`page-btn ${page === 1 ? 'disabled' : ''}`}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={18} />
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Only render first few, last few, and current range
                  if (totalPages > 6 && pageNum > 3 && pageNum < totalPages - 2 && Math.abs(pageNum - page) > 1) {
                    if (pageNum === 4 || pageNum === totalPages - 3) {
                      return <span key={pageNum} style={{ color: 'var(--text-tertiary)' }}>...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  className={`page-btn ${page === totalPages ? 'disabled' : ''}`}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. DETAIL MODAL POPUP */}
      {selectedProperty && (
        <div className="modal-overlay" onClick={() => setSelectedProperty(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProperty(null)}>
              <X size={20} />
            </button>

            <div className="modal-hero">
              <img
                src={selectedProperty.images?.[0]?.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'}
                alt={selectedProperty.name}
                className="modal-hero-img"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'; }}
              />
            </div>

            <div className="modal-body">
              <div className="modal-title-section">
                <div>
                  <span
                    className={`property-badge badge-${selectedProperty.type?.toLowerCase()}`}
                    style={{ position: 'static', display: 'inline-block', marginBottom: '8px' }}
                  >
                    {selectedProperty.type === 'HIGHRISE' ? 'Condo' : selectedProperty.type === 'LANDED' ? 'Landed' : 'Studio'}
                  </span>
                  <h2 className="modal-title">{selectedProperty.name}</h2>
                  <div className="property-location" style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                    <MapPin size={16} className="text-primary-color" />
                    <span>{selectedProperty.city}, {selectedProperty.postcode}, {selectedProperty.state}, Malaysia</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="modal-price">RM {selectedProperty.price?.toLocaleString('en-MY')}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    per {selectedProperty.rentalType === 'DAILY' ? 'hari' : selectedProperty.rentalType === 'YEARLY' ? 'tahun' : 'bulan'}
                  </span>
                  <span className={`rental-type-badge rental-type-${(selectedProperty.rentalType || 'MONTHLY').toLowerCase()}`} style={{ display: 'inline-block', marginTop: '4px' }}>
                    {selectedProperty.rentalType === 'DAILY' ? '☀️ Daily' : selectedProperty.rentalType === 'YEARLY' ? '📆 Yearly' : '📅 Monthly'}
                  </span>
                </div>
              </div>

              <div className="modal-specs-grid">
                <div>
                  <span className="modal-spec-label">Kamar Tidur</span>
                  <div className="modal-spec-val flex-center gap-8 text-primary-color">
                    <BedDouble size={18} />
                    <span>{selectedProperty.bedroom}</span>
                  </div>
                </div>
                <div>
                  <span className="modal-spec-label">Kamar Mandi</span>
                  <div className="modal-spec-val flex-center gap-8 text-secondary-color">
                    <Bath size={18} />
                    <span>{selectedProperty.bathroom}</span>
                  </div>
                </div>
                <div>
                  <span className="modal-spec-label">Parkir Mobil</span>
                  <div className="modal-spec-val flex-center gap-8" style={{ color: 'var(--success)' }}>
                    <Layers size={18} />
                    <span>{selectedProperty.carpark} Car</span>
                  </div>
                </div>
                <div>
                  <span className="modal-spec-label">Ukuran Ruang</span>
                  <div className="modal-spec-val flex-center gap-8" style={{ color: 'var(--warning)' }}>
                    <Maximize size={18} />
                    <span>{selectedProperty.sqft} sqft</span>
                  </div>
                </div>
              </div>

              <div className="modal-section" style={{ marginTop: '20px' }}>
                <h4 className="modal-section-title">Informasi & Tipe Harga Sewa</h4>
                <div className="card-rental-prices" style={{ margin: '8px 0 0 0' }}>
                  <div className="card-rental-price-row">
                    <span className="rental-label">Daily Price:</span>
                    <span className={`rental-value ${!selectedProperty.rentalPrices?.DAILY ? 'no-owner-data' : ''}`}>
                      {selectedProperty.rentalPrices?.DAILY ? `RM ${selectedProperty.rentalPrices.DAILY.toLocaleString('en-MY')}/day` : 'Data not available from Owner'}
                    </span>
                  </div>
                  <div className="card-rental-price-row">
                    <span className="rental-label">Monthly Price:</span>
                    <span className={`rental-value ${!selectedProperty.rentalPrices?.MONTHLY ? 'no-owner-data' : ''}`}>
                      {selectedProperty.rentalPrices?.MONTHLY ? `RM ${selectedProperty.rentalPrices.MONTHLY.toLocaleString('en-MY')}/month` : 'Data not available from Owner'}
                    </span>
                  </div>
                  <div className="card-rental-price-row">
                    <span className="rental-label">Yearly Price:</span>
                    <span className={`rental-value ${!selectedProperty.rentalPrices?.YEARLY ? 'no-owner-data' : ''}`}>
                      {selectedProperty.rentalPrices?.YEARLY ? `RM ${selectedProperty.rentalPrices.YEARLY.toLocaleString('en-MY')}/year` : 'Data not available from Owner'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Kelengkapan Perabotan (Furnishing)</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Properti ini disewakan dalam kondisi <strong>
                    {selectedProperty.furnishType === 'FULL' ? 'Fully Furnished (Penuh Perabotan)' : selectedProperty.furnishType === 'PARTIAL' ? 'Partially Furnished (Sebagian Perabotan)' : 'Unfurnished (Kosong)'}
                  </strong>.
                </p>
                {selectedProperty.furnishes && selectedProperty.furnishes.length > 0 && (
                  <div className="features-list" style={{ marginTop: '8px' }}>
                    {selectedProperty.furnishes.map(f => (
                      <span key={f} className="feature-pill">
                        {f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedProperty.facilities && selectedProperty.facilities.length > 0 && (
                <div className="modal-section">
                  <h4 className="modal-section-title">Fasilitas Kompleks</h4>
                  <div className="features-list">
                    {selectedProperty.facilities.map(fac => (
                      <span key={fac} className="feature-pill" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--success)' }}>
                        {fac.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <a
                  href={`https://speedhome.com/ads/${selectedProperty.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ flexGrow: 1 }}
                >
                  <ExternalLink size={16} />
                  <span>Lihat di SPEEDHOME</span>
                </a>
                <button className="btn btn-secondary" onClick={() => setSelectedProperty(null)} style={{ flexGrow: 1 }}>
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
