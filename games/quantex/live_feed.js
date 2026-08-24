/**
 * Quantex Live Data Enrichment Engine
 * Combines 1,074+ curated entities with live real-time API feeds across the 5 classic categories.
 * Zero telemetry, CORS-friendly open public endpoints.
 */

class QuantexLiveFeed {
    constructor() {
        this.cacheKey = "quantex_live_feed_cache_v3";
        this.cacheTTL = 3600 * 1000; // 1 hour
        this.status = "INITIALIZING";
        this.categories = typeof QUANTEX_DATASET !== "undefined" ? JSON.parse(JSON.stringify(QUANTEX_DATASET.categories)) : [];
        this.listeners = [];
    }

    onUpdate(callback) {
        this.listeners.push(callback);
    }

    notify(status, details) {
        this.status = status;
        this.listeners.forEach(cb => cb({ status, details, categories: this.categories }));
    }

    formatCurrency(num) {
        if (num >= 1000000000000) return `$${(num / 1000000000000).toFixed(2)} Trillion`;
        if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)} Billion`;
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)} Million`;
        if (num >= 1000) return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        if (num >= 1) return `$${num.toFixed(2)}`;
        return `$${num.toFixed(4)}`;
    }

    async fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    }

    /**
     * Category 1: Live Wikimedia Pageviews (feeds into Google Searches / Trends)
     */
    async fetchLiveTrends() {
        try {
            const yesterday = new Date(Date.now() - 86400000 * 2);
            const year = yesterday.getFullYear();
            const month = String(yesterday.getMonth() + 1).padStart(2, '0');
            const day = String(yesterday.getDate()).padStart(2, '0');
            
            const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${year}/${month}/${day}`;
            const data = await this.fetchWithTimeout(url, {}, 4000);
            
            if (!data.items || !data.items[0] || !data.items[0].articles) return [];
            
            const blacklist = new Set([
                "Main_Page", "Special:Search", "Wikipedia:Featured_pictures", "-", "Portal:Current_events",
                "Deaths_in_2024", "Deaths_in_2025", "Deaths_in_2026", "Special:CreateAccount", "Wiki"
            ]);

            return data.items[0].articles
                .filter(a => !blacklist.has(a.article) && !a.article.startsWith("Special:") && !a.article.startsWith("Wikipedia:"))
                .slice(0, 60)
                .map((a, index) => {
                    const cleanName = decodeURIComponent(a.article).replace(/_/g, ' ');
                    return {
                        id: `live_trend_${index + 1}`,
                        name: cleanName,
                        value: a.views * 30, // Normalize to approximate monthly scale
                        formatted: `${(a.views * 30).toLocaleString()} / mo (Trending)`,
                        subtitle: "Live global search trend",
                        icon: "globe"
                    };
                });
        } catch (e) {
            console.warn("Wiki Live Feed warning:", e);
            return [];
        }
    }

    /**
     * Category 4: Live Crypto Asset Caps (feeds into Prices & Valuations)
     */
    async fetchLiveCrypto() {
        try {
            const url = "https://api.coincap.io/v2/assets?limit=80";
            const data = await this.fetchWithTimeout(url, {}, 4000);
            
            if (!data.data || !Array.isArray(data.data)) return [];
            
            return data.data.map((c, index) => {
                const cap = parseFloat(c.marketCapUsd) || 0;
                const price = parseFloat(c.priceUsd) || 0;
                return {
                    id: `live_crypto_${c.id || index}`,
                    name: `${c.name} (${c.symbol}) Market Cap`,
                    value: Math.round(cap),
                    formatted: this.formatCurrency(cap),
                    subtitle: `Live Price: ${this.formatCurrency(price)} | Rank #${c.rank}`,
                    icon: "bitcoin"
                };
            });
        } catch (e) {
            console.warn("Crypto Live Feed warning:", e);
            return [];
        }
    }

    /**
     * Category 5: Live Country Populations & Areas (feeds into Trivia & Extremes)
     */
    async fetchLiveCountries() {
        try {
            const url = "https://restcountries.com/v3.1/all?fields=name,population,area,region";
            const data = await this.fetchWithTimeout(url, {}, 4000);
            
            if (!Array.isArray(data)) return [];
            
            return data
                .filter(c => c.population > 100000)
                .slice(0, 100)
                .map((c, index) => {
                    return {
                        id: `live_cnt_${index + 1}`,
                        name: `Population of ${c.name.common}`,
                        value: c.population,
                        formatted: `${c.population.toLocaleString()} Citizens`,
                        subtitle: `${c.region} | Area: ${(c.area || 0).toLocaleString()} km²`,
                        icon: "globe"
                    };
                });
        } catch (e) {
            console.warn("Countries Live Feed warning:", e);
            return [];
        }
    }

    /**
     * Category 5: Live Celestial & Planetary Metrics (feeds into Trivia & Extremes)
     */
    async fetchLiveCosmic() {
        try {
            const url = "https://api.le-systeme-solaire.net/rest/bodies/";
            const data = await this.fetchWithTimeout(url, {}, 4000);
            
            if (!data.bodies || !Array.isArray(data.bodies)) return [];
            
            return data.bodies
                .filter(b => b.meanRadius && b.meanRadius > 100)
                .slice(0, 60)
                .map((b, index) => {
                    const radius = Math.round(b.meanRadius);
                    return {
                        id: `live_cos_${b.id || index}`,
                        name: `Mean Radius of ${b.englishName || b.name}`,
                        value: radius,
                        formatted: `${radius.toLocaleString()} km Radius`,
                        subtitle: `${b.bodyType || 'Celestial Body'} | Gravity: ${b.gravity || '?'} m/s²`,
                        icon: "planet"
                    };
                });
        } catch (e) {
            console.warn("Cosmic Live Feed warning:", e);
            return [];
        }
    }

    async loadAllLiveFeeds(forceRefresh = false) {
        this.notify("SYNCING", "Connecting to live global open feeds...");

        // Ensure base categories are cloned from QUANTEX_DATASET
        if (typeof QUANTEX_DATASET !== "undefined") {
            this.categories = JSON.parse(JSON.stringify(QUANTEX_DATASET.categories));
        }

        const [trends, cryptos, countries, cosmic] = await Promise.allSettled([
            this.fetchLiveTrends(),
            this.fetchLiveCrypto(),
            this.fetchLiveCountries(),
            this.fetchLiveCosmic()
        ]);

        let liveAddedCount = 0;

        // 1. Enrich Google Searches (Cat 0)
        if (trends.status === "fulfilled" && trends.value && trends.value.length > 0) {
            this.categories[0].items = [...trends.value, ...this.categories[0].items];
            liveAddedCount += trends.value.length;
        }

        // 4. Enrich Prices & Valuations (Cat 3)
        if (cryptos.status === "fulfilled" && cryptos.value && cryptos.value.length > 0) {
            this.categories[3].items = [...cryptos.value, ...this.categories[3].items];
            liveAddedCount += cryptos.value.length;
        }

        // 5. Enrich Trivia & Extremes (Cat 4)
        const triviaAdditions = [];
        if (countries.status === "fulfilled" && countries.value) triviaAdditions.push(...countries.value);
        if (cosmic.status === "fulfilled" && cosmic.value) triviaAdditions.push(...cosmic.value);
        
        if (triviaAdditions.length > 0) {
            this.categories[4].items = [...triviaAdditions, ...this.categories[4].items];
            liveAddedCount += triviaAdditions.length;
        }

        const totalItems = this.categories.reduce((acc, cat) => acc + cat.items.length, 0);

        this.notify("READY", `Live Quantum Sync Active (${totalItems} entities ready)`);
        return this.categories;
    }
}

if (typeof window !== "undefined") {
    window.QuantexLiveFeed = QuantexLiveFeed;
    window.liveFeedEngine = new QuantexLiveFeed();
}
