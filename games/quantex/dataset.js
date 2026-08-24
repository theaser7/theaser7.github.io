/**
 * Quantex Game Dataset
 * 5 Categories: Google Searches, YouTube Subscribers, Movie Ratings/Gross, Prices, Trivia Extremes.
 * Each entry has:
 * - id: unique identifier
 * - name: display title
 * - value: raw numeric value for comparison
 * - formatted: formatted string with unit for reveal
 * - subtitle: brief context / description
 * - icon: visual icon or emoji
 */

const QUANTEX_DATASET = {
    categories: [
        {
            id: "google_searches",
            name: "Google Searches",
            icon: "🔍",
            unitLabel: "Monthly Global Searches",
            description: "Which term receives more monthly global searches on Google?",
            items: [
                { id: "gs_youtube", name: "YouTube", value: 1300000000, formatted: "1.30 Billion / mo", subtitle: "Video platform", icon: "▶️" },
                { id: "gs_facebook", name: "Facebook", value: 1100000000, formatted: "1.10 Billion / mo", subtitle: "Social network", icon: "🌐" },
                { id: "gs_whatsapp", name: "WhatsApp Web", value: 750000000, formatted: "750 Million / mo", subtitle: "Messaging web client", icon: "💬" },
                { id: "gs_weather", name: "Weather", value: 680000000, formatted: "680 Million / mo", subtitle: "Daily weather forecast", icon: "⛅" },
                { id: "gs_translate", name: "Google Translate", value: 620000000, formatted: "620 Million / mo", subtitle: "Language translation", icon: "🔤" },
                { id: "gs_amazon", name: "Amazon", value: 580000000, formatted: "580 Million / mo", subtitle: "E-commerce giant", icon: "📦" },
                { id: "gs_chatgpt", name: "ChatGPT", value: 490000000, formatted: "490 Million / mo", subtitle: "AI conversational model", icon: "🤖" },
                { id: "gs_instagram", name: "Instagram", value: 460000000, formatted: "460 Million / mo", subtitle: "Photo & video sharing", icon: "📸" },
                { id: "gs_netflix", name: "Netflix", value: 390000000, formatted: "390 Million / mo", subtitle: "Streaming service", icon: "🎬" },
                { id: "gs_gmail", name: "Gmail", value: 370000000, formatted: "370 Million / mo", subtitle: "Email service", icon: "✉️" },
                { id: "gs_roblox", name: "Roblox", value: 240000000, formatted: "240 Million / mo", subtitle: "User-created gaming platform", icon: "🎮" },
                { id: "gs_minecraft", name: "Minecraft", value: 195000000, formatted: "195 Million / mo", subtitle: "Sandbox video game", icon: "⛏️" },
                { id: "gs_tiktok", name: "TikTok", value: 180000000, formatted: "180 Million / mo", subtitle: "Short video platform", icon: "🎵" },
                { id: "gs_spotify", name: "Spotify", value: 165000000, formatted: "165 Million / mo", subtitle: "Music streaming", icon: "🎧" },
                { id: "gs_twitter", name: "Twitter / X", value: 155000000, formatted: "155 Million / mo", subtitle: "Microblogging platform", icon: "✖️" },
                { id: "gs_wordle", name: "Wordle", value: 140000000, formatted: "140 Million / mo", subtitle: "Daily word puzzle", icon: "🟩" },
                { id: "gs_fortnite", name: "Fortnite", value: 125000000, formatted: "125 Million / mo", subtitle: "Battle royale game", icon: "🪂" },
                { id: "gs_crypto", name: "Bitcoin", value: 110000000, formatted: "110 Million / mo", subtitle: "Cryptocurrency", icon: "🪙" },
                { id: "gs_reddit", name: "Reddit", value: 105000000, formatted: "105 Million / mo", subtitle: "Community discussions", icon: "👽" },
                { id: "gs_gta6", name: "GTA 6", value: 95000000, formatted: "95 Million / mo", subtitle: "Anticipated open-world game", icon: "🚗" },
                { id: "gs_taylor", name: "Taylor Swift", value: 88000000, formatted: "88 Million / mo", subtitle: "Pop music superstar", icon: "🎤" },
                { id: "gs_ronaldo", name: "Cristiano Ronaldo", value: 82000000, formatted: "82 Million / mo", subtitle: "Football legend", icon: "⚽" },
                { id: "gs_elon", name: "Elon Musk", value: 74000000, formatted: "74 Million / mo", subtitle: "Tech billionaire & CEO", icon: "🚀" },
                { id: "gs_messi", name: "Lionel Messi", value: 68000000, formatted: "68 Million / mo", subtitle: "World Cup football champion", icon: "🏆" },
                { id: "gs_pokemon", name: "Pokemon", value: 60000000, formatted: "60 Million / mo", subtitle: "Gaming & anime franchise", icon: "⚡" },
                { id: "gs_marvel", name: "Marvel", value: 55000000, formatted: "55 Million / mo", subtitle: "Superhero universe", icon: "🦸" },
                { id: "gs_steam", name: "Steam", value: 50000000, formatted: "50 Million / mo", subtitle: "PC gaming storefront", icon: "🕹️" },
                { id: "gs_twitch", name: "Twitch", value: 45000000, formatted: "45 Million / mo", subtitle: "Live streaming platform", icon: "🟣" },
                { id: "gs_chess", name: "Chess.com", value: 38000000, formatted: "38 Million / mo", subtitle: "Online chess hub", icon: "♟️" },
                { id: "gs_nasa", name: "NASA", value: 32000000, formatted: "32 Million / mo", subtitle: "Space exploration agency", icon: "🌌" },
                { id: "gs_discord", name: "Discord", value: 29000000, formatted: "29 Million / mo", subtitle: "VoIP & community chat", icon: "🎙️" },
                { id: "gs_zelda", name: "Zelda: Tears of Kingdom", value: 22000000, formatted: "22 Million / mo", subtitle: "Nintendo adventure game", icon: "🗡️" }
            ]
        },
        {
            id: "youtube_subscribers",
            name: "YouTube Subscribers",
            icon: "▶️",
            unitLabel: "Total Subscriber Count",
            description: "Which YouTube channel has more subscribers?",
            items: [
                { id: "yt_mrbeast", name: "MrBeast", value: 365000000, formatted: "365 Million", subtitle: "Superstar creator & philanthropy", icon: "🐯" },
                { id: "yt_tseries", name: "T-Series", value: 285000000, formatted: "285 Million", subtitle: "Indian music & film label", icon: "🎵" },
                { id: "yt_cocomelon", name: "Cocomelon", value: 188000000, formatted: "188 Million", subtitle: "3D Nursery rhymes & songs", icon: "🍉" },
                { id: "yt_setindia", name: "SET India", value: 180000000, formatted: "180 Million", subtitle: "Sony Entertainment Television", icon: "📺" },
                { id: "yt_vladnnik", name: "Vlad and Niki", value: 132000000, formatted: "132 Million", subtitle: "Kids entertainment vlog", icon: "👦" },
                { id: "yt_dianashow", name: "Kids Diana Show", value: 129000000, formatted: "129 Million", subtitle: "Children entertainment series", icon: "🎀" },
                { id: "yt_nastya", name: "Like Nastya", value: 124000000, formatted: "124 Million", subtitle: "Family & children content", icon: "👧" },
                { id: "yt_pewdiepie", name: "PewDiePie", value: 111000000, formatted: "111 Million", subtitle: "Iconic gaming & commentary pioneer", icon: "👊" },
                { id: "yt_zeemusic", name: "Zee Music Company", value: 113000000, formatted: "113 Million", subtitle: "Bollywood music label", icon: "🎶" },
                { id: "yt_wwe", name: "WWE", value: 106000000, formatted: "106 Million", subtitle: "World Wrestling Entertainment", icon: "🤼" },
                { id: "yt_goldmines", name: "Goldmines Telefilms", value: 101000000, formatted: "101 Million", subtitle: "Hindi dubbed cinema", icon: "🎞️" },
                { id: "yt_sonysab", name: "Sony SAB", value: 97000000, formatted: "97 Million", subtitle: "Hindi comedy television", icon: "🎭" },
                { id: "yt_blackpink", name: "BLACKPINK", value: 95000000, formatted: "95 Million", subtitle: "K-pop sensation group", icon: "💖" },
                { id: "yt_5mincrafts", name: "5-Minute Crafts", value: 81000000, formatted: "81 Million", subtitle: "DIY life hacks channel", icon: "✂️" },
                { id: "yt_bts", name: "BANGTANTV (BTS)", value: 79000000, formatted: "79 Million", subtitle: "Global K-pop group channel", icon: "💜" },
                { id: "yt_justin", name: "Justin Bieber", value: 74000000, formatted: "74 Million", subtitle: "Pop recording artist", icon: "🎤" },
                { id: "yt_hybe", name: "HYBE LABELS", value: 76000000, formatted: "76 Million", subtitle: "Korean entertainment agency", icon: "🏢" },
                { id: "yt_eminem", name: "EminemMusic", value: 62000000, formatted: "62 Million", subtitle: "Legendary hip-hop artist", icon: "🧢" },
                { id: "yt_dudeperfect", name: "Dude Perfect", value: 60500000, formatted: "60.5 Million", subtitle: "Trick shots & comedy team", icon: "🏀" },
                { id: "yt_taylorswift", name: "Taylor Swift", value: 60000000, formatted: "60 Million", subtitle: "Grammy-winning singer-songwriter", icon: "✨" },
                { id: "yt_marshmello", name: "Marshmello", value: 57000000, formatted: "57 Million", subtitle: "Electronic dance music producer", icon: "🎧" },
                { id: "yt_edsheeran", name: "Ed Sheeran", value: 55000000, formatted: "55 Million", subtitle: "British singer-songwriter", icon: "🎸" },
                { id: "yt_ariana", name: "Ariana Grande", value: 54000000, formatted: "54 Million", subtitle: "Pop star & vocalist", icon: "🌙" },
                { id: "yt_billie", name: "Billie Eilish", value: 50000000, formatted: "50 Million", subtitle: "Alternative pop artist", icon: "🥑" },
                { id: "yt_alanwalker", name: "Alan Walker", value: 46000000, formatted: "46 Million", subtitle: "Faded producer & DJ", icon: "🎛️" },
                { id: "yt_markiplier", name: "Markiplier", value: 37000000, formatted: "37 Million", subtitle: "Gaming & cinematic content", icon: "🎙️" },
                { id: "yt_jacksepticeye", name: "jacksepticeye", value: 31000000, formatted: "31 Million", subtitle: "Irish gaming personality", icon: "🟢" },
                { id: "yt_veritasium", name: "Veritasium", value: 17000000, formatted: "17 Million", subtitle: "Science & physics exploration", icon: "🧪" },
                { id: "yt_mkbhd", name: "Marques Brownlee (MKBHD)", value: 19500000, formatted: "19.5 Million", subtitle: "Tech review maestro", icon: "📱" },
                { id: "yt_kurzgesagt", name: "Kurzgesagt – In a Nutshell", value: 23000000, formatted: "23 Million", subtitle: "Animated science & philosophy", icon: "🦆" }
            ]
        },
        {
            id: "movie_ratings",
            name: "Movie Box Office",
            icon: "🎬",
            unitLabel: "Global Box Office Gross",
            description: "Which movie generated more global box office revenue?",
            items: [
                { id: "mov_avatar", name: "Avatar (2009)", value: 2923000000, formatted: "$2.92 Billion", subtitle: "James Cameron sci-fi epic", icon: "🪐" },
                { id: "mov_endgame", name: "Avengers: Endgame (2019)", value: 2799000000, formatted: "$2.80 Billion", subtitle: "Marvel cinematic culmination", icon: "🛡️" },
                { id: "mov_avatar2", name: "Avatar: The Way of Water", value: 2320000000, formatted: "$2.32 Billion", subtitle: "Pandora oceanic spectacle", icon: "🌊" },
                { id: "mov_titanic", name: "Titanic (1997)", value: 2264000000, formatted: "$2.26 Billion", subtitle: "Romantic historical drama", icon: "🚢" },
                { id: "mov_starwars7", name: "Star Wars: The Force Awakens", value: 2071000000, formatted: "$2.07 Billion", subtitle: "Sequel trilogy launch", icon: "⚔️" },
                { id: "mov_infinitywar", name: "Avengers: Infinity War", value: 2052000000, formatted: "$2.05 Billion", subtitle: "Thanos snap cliffhanger", icon: "🧤" },
                { id: "mov_nowayhome", name: "Spider-Man: No Way Home", value: 1922000000, formatted: "$1.92 Billion", subtitle: "Multiverse crossover triumph", icon: "🕷️" },
                { id: "mov_insideout2", name: "Inside Out 2 (2024)", value: 1698000000, formatted: "$1.70 Billion", subtitle: "Pixar emotional adventure", icon: "🧠" },
                { id: "mov_jurassicworld", name: "Jurassic World (2015)", value: 1671000000, formatted: "$1.67 Billion", subtitle: "Dinosaur park resurrected", icon: "🦖" },
                { id: "mov_lionking", name: "The Lion King (2019)", value: 1663000000, formatted: "$1.66 Billion", subtitle: "Photorealistic Disney remake", icon: "🦁" },
                { id: "mov_avengers1", name: "The Avengers (2012)", value: 1520000000, formatted: "$1.52 Billion", subtitle: "First assembly of Earth's heroes", icon: "⚡" },
                { id: "mov_furious7", name: "Furious 7 (2015)", value: 1515000000, formatted: "$1.51 Billion", subtitle: "High-octane tribute chapter", icon: "🏎️" },
                { id: "mov_topgun", name: "Top Gun: Maverick (2022)", value: 1495000000, formatted: "$1.49 Billion", subtitle: "Aviation blockbusting sequel", icon: "✈️" },
                { id: "mov_frozen2", name: "Frozen II (2019)", value: 1453000000, formatted: "$1.45 Billion", subtitle: "Enchanted forest musical", icon: "❄️" },
                { id: "mov_barbie", name: "Barbie (2023)", value: 1445000000, formatted: "$1.44 Billion", subtitle: "Greta Gerwig comedy blockbuster", icon: "💖" },
                { id: "mov_mario", name: "The Super Mario Bros. Movie", value: 1361000000, formatted: "$1.36 Billion", subtitle: "Illumination gaming adaptation", icon: "🍄" },
                { id: "mov_blackpanther", name: "Black Panther (2018)", value: 1349000000, formatted: "$1.35 Billion", subtitle: "Wakanda forever cultural titan", icon: "🐾" },
                { id: "mov_harrypotter8", name: "Harry Potter & Deathly Hallows 2", value: 1342000000, formatted: "$1.34 Billion", subtitle: "Wizarding finale at Hogwarts", icon: "🧙‍♂️" },
                { id: "mov_oppenheimer", name: "Oppenheimer (2023)", value: 976000000, formatted: "$976 Million", subtitle: "Christopher Nolan atomic drama", icon: "💣" },
                { id: "mov_darkknight", name: "The Dark Knight (2008)", value: 1006000000, formatted: "$1.00 Billion", subtitle: "Heath Ledger's iconic Joker", icon: "🦇" },
                { id: "mov_interstellar", name: "Interstellar (2014)", value: 733000000, formatted: "$733 Million", subtitle: "Black hole space odyssey", icon: "🌌" },
                { id: "mov_dune2", name: "Dune: Part Two (2024)", value: 714000000, formatted: "$714 Million", subtitle: "Arrakis desert conquest", icon: "🪱" },
                { id: "mov_matrix", name: "The Matrix (1999)", value: 467000000, formatted: "$467 Million", subtitle: "Cyberpunk sci-fi masterpiece", icon: "🕶️" },
                { id: "mov_gladiator", name: "Gladiator (2000)", value: 465000000, formatted: "$465 Million", subtitle: "Ridley Scott Roman epic", icon: "⚔️" },
                { id: "mov_pulpfiction", name: "Pulp Fiction (1994)", value: 213000000, formatted: "$213 Million", subtitle: "Quentin Tarantino indie cult hit", icon: "🍔" }
            ]
        },
        {
            id: "prices",
            name: "Prices & Valuations",
            icon: "🏷️",
            unitLabel: "Price / Market Value in USD",
            description: "Which object or asset has a higher price or valuation?",
            items: [
                { id: "pr_apple", name: "Apple Inc. Market Cap", value: 3450000000000, formatted: "$3.45 Trillion", subtitle: "Tech company valuation", icon: "🍎" },
                { id: "pr_microsoft", name: "Microsoft Market Cap", value: 3150000000000, formatted: "$3.15 Trillion", subtitle: "Software & cloud corporation", icon: "🪟" },
                { id: "pr_nvidia", name: "NVIDIA Market Cap", value: 3100000000000, formatted: "$3.10 Trillion", subtitle: "AI chipmaker valuation", icon: "🟩" },
                { id: "pr_iss", name: "International Space Station", value: 150000000000, formatted: "$150 Billion", subtitle: "Most expensive human structure", icon: "🛰️" },
                { id: "pr_twitter", name: "Twitter Purchase by Elon Musk", value: 44000000000, formatted: "$44 Billion", subtitle: "Social platform acquisition", icon: "✖️" },
                { id: "pr_burj", name: "Burj Khalifa Construction Cost", value: 1500000000, formatted: "$1.5 Billion", subtitle: "Tallest skyscraper in Dubai", icon: "🏙️" },
                { id: "pr_monalisa", name: "Mona Lisa (Insurance Value)", value: 900000000, formatted: "$900 Million", subtitle: "Louvre masterpiece valuation", icon: "🖼️" },
                { id: "pr_salvatormundi", name: "Salvator Mundi (Da Vinci Painting)", value: 450300000, formatted: "$450.3 Million", subtitle: "Most expensive auction painting", icon: "🎨" },
                { id: "pr_airbus380", name: "Airbus A380 Superjumbo", value: 445000000, formatted: "$445 Million", subtitle: "Double-deck passenger airliner", icon: "✈️" },
                { id: "pr_f35", name: "F-35 Lightning II Jet", value: 82000000, formatted: "$82 Million", subtitle: "Fifth-gen stealth combat fighter", icon: "🛩️" },
                { id: "pr_falcon9", name: "SpaceX Falcon 9 Launch Cost", value: 67000000, formatted: "$67 Million", subtitle: "Commercial orbital rocket mission", icon: "🚀" },
                { id: "pr_ferrari250", name: "1962 Ferrari 250 GTO", value: 51700000, formatted: "$51.7 Million", subtitle: "Most expensive classic car sold", icon: "🏎️" },
                { id: "pr_pinkstar", name: "Pink Star Diamond (59.6 carats)", value: 71200000, formatted: "$71.2 Million", subtitle: "World's most expensive gemstone", icon: "💎" },
                { id: "pr_domain_voice", name: "Voice.com Domain Name Sale", value: 30000000, formatted: "$30 Million", subtitle: "Top single web domain purchase", icon: "🌐" },
                { id: "pr_bugatti", name: "Bugatti La Voiture Noire", value: 18700000, formatted: "$18.7 Million", subtitle: "Bespoke hypercar creation", icon: "🚗" },
                { id: "pr_stradivarius", name: "Stradivarius 'Lady Blunt' Violin", value: 15900000, formatted: "$15.9 Million", subtitle: "Legendary 1721 string instrument", icon: "🎻" },
                { id: "pr_chiron", name: "Bugatti Chiron Super Sport", value: 3900000, formatted: "$3.9 Million", subtitle: "300+ mph production hypercar", icon: "🏁" },
                { id: "pr_hermes", name: "Hermès Birkin Diamond Bag", value: 450000, formatted: "$450,000", subtitle: "Himalaya Niloticus crocodile bag", icon: "👜" },
                { id: "pr_patek", name: "Patek Philippe Grandmaster Chime", value: 31000000, formatted: "$31 Million", subtitle: "Most expensive wristwatch auctioned", icon: "⌚" },
                { id: "pr_btc", name: "1 Bitcoin (approximate)", value: 65000, formatted: "$65,000", subtitle: "Cryptocurrency token unit", icon: "🪙" },
                { id: "pr_goldbar", name: "1 Kilogram 24k Gold Bar", value: 80000, formatted: "$80,000", subtitle: "Standard bullion ingot", icon: "🧈" },
                { id: "pr_rolex", name: "Rolex Submariner Date", value: 10250, formatted: "$10,250", subtitle: "Iconic luxury dive watch", icon: "⏱️" },
                { id: "pr_visionpro", name: "Apple Vision Pro (512GB)", value: 3699, formatted: "$3,699", subtitle: "Spatial computing headset", icon: "🥽" },
                { id: "pr_rtx4090", name: "NVIDIA GeForce RTX 4090 GPU", value: 1799, formatted: "$1,799", subtitle: "Flagship gaming graphics card", icon: "🖥️" },
                { id: "pr_iphone16pro", name: "iPhone 16 Pro Max (1TB)", value: 1599, formatted: "$1,599", subtitle: "Flagship Apple smartphone", icon: "📱" },
                { id: "pr_ps5pro", name: "PlayStation 5 Pro", value: 699, formatted: "$699", subtitle: "Sony 4K gaming console", icon: "🎮" },
                { id: "pr_nintendoswitch", name: "Nintendo Switch OLED", value: 349, formatted: "$349", subtitle: "Hybrid handheld console", icon: "🕹️" }
            ]
        },
        {
            id: "trivia",
            name: "Trivia & Extremes",
            icon: "🧠",
            unitLabel: "Scientific / Metric Extreme Value",
            description: "Which extreme fact or entity has the larger numeric measure?",
            items: [
                { id: "tr_c", name: "Speed of Light (m/s)", value: 299792458, formatted: "299,792,458 m/s", subtitle: "Universal cosmic speed limit", icon: "✨" },
                { id: "tr_sundist", name: "Distance Earth to Sun (km)", value: 149600000, formatted: "149.6 Million km", subtitle: "1 Astronomical Unit (AU)", icon: "☀️" },
                { id: "tr_moondist", name: "Distance Earth to Moon (km)", value: 384400, formatted: "384,400 km", subtitle: "Average lunar orbit distance", icon: "🌕" },
                { id: "tr_everest", name: "Height of Mount Everest (m)", value: 8848, formatted: "8,848 meters", subtitle: "Highest peak above sea level", icon: "🏔️" },
                { id: "tr_marianatrench", name: "Mariana Trench Depth (m)", value: 11034, formatted: "11,034 meters", subtitle: "Challenger Deep oceanic abyss", icon: "🌊" },
                { id: "tr_burjheight", name: "Height of Burj Khalifa (m)", value: 828, formatted: "828 meters", subtitle: "Tallest architectural building", icon: "🏙️" },
                { id: "tr_eiffel", name: "Height of Eiffel Tower (m)", value: 330, formatted: "330 meters", subtitle: "Parisian iron landmark", icon: "🗼" },
                { id: "tr_sound", name: "Speed of Sound in Air (m/s)", value: 343, formatted: "343 m/s (1,235 km/h)", subtitle: "Mach 1 at 20°C in sea level air", icon: "🔊" },
                { id: "tr_cheetah", name: "Top Speed of Cheetah (km/h)", value: 120, formatted: "120 km/h", subtitle: "Fastest terrestrial mammal sprint", icon: "🐆" },
                { id: "tr_peregrine", name: "Peregrine Falcon Dive (km/h)", value: 389, formatted: "389 km/h", subtitle: "Fastest animal hunting dive", icon: "🦅" },
                { id: "tr_bluewhale", name: "Weight of Blue Whale (kg)", value: 190000, formatted: "190,000 kg (190 Tons)", subtitle: "Largest living creature on Earth", icon: "🐋" },
                { id: "tr_trex", name: "Weight of Tyrannosaurus Rex (kg)", value: 8800, formatted: "8,800 kg (8.8 Tons)", subtitle: "Apex Cretaceous dinosaur", icon: "🦖" },
                { id: "tr_elephant", name: "Weight of African Elephant (kg)", value: 6000, formatted: "6,000 kg (6 Tons)", subtitle: "Largest extant land mammal", icon: "🐘" },
                { id: "tr_tokyo", name: "Population of Greater Tokyo", value: 37400000, formatted: "37.4 Million", subtitle: "World's most populous metropolitan area", icon: "🏙️" },
                { id: "tr_iceland", name: "Population of Iceland", value: 395000, formatted: "395,000", subtitle: "Nordic island nation population", icon: "🇮🇸" },
                { id: "tr_monaco", name: "Population of Monaco", value: 39000, formatted: "39,000", subtitle: "Mediterranean microstate", icon: "🇲🇨" },
                { id: "tr_sahara", name: "Area of Sahara Desert (sq km)", value: 9200000, formatted: "9.2 Million sq km", subtitle: "Largest hot desert on Earth", icon: "🏜️" },
                { id: "tr_amazon_basin", name: "Area of Amazon Basin (sq km)", value: 7000000, formatted: "7.0 Million sq km", subtitle: "Vast rainforest river drainage", icon: "🌳" },
                { id: "tr_humanbrain", name: "Neurons in Human Brain", value: 86000000000, formatted: "86 Billion", subtitle: "Neural computing cells", icon: "🧠" },
                { id: "tr_stars_milkyway", name: "Stars in Milky Way Galaxy", value: 250000000000, formatted: "250 Billion", subtitle: "Galactic stellar population estimate", icon: "🌌" },
                { id: "tr_bigmac_cal", name: "Calories in a Big Mac (kcal)", value: 590, formatted: "590 kcal", subtitle: "McDonald's signature burger energy", icon: "🍔" },
                { id: "tr_avocado_cal", name: "Calories in a Whole Avocado (kcal)", value: 320, formatted: "320 kcal", subtitle: "Nutrient-dense fruit energy", icon: "🥑" },
                { id: "tr_apple_cal", name: "Calories in a Medium Apple (kcal)", value: 95, formatted: "95 kcal", subtitle: "Fresh crisp fruit energy", icon: "🍎" }
            ]
        }
    ]
};

// Expose globally in window or module export
if (typeof window !== "undefined") {
    window.QUANTEX_DATASET = QUANTEX_DATASET;
}
