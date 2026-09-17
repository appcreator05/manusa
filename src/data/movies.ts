import { Movie, AdCreative } from '../types';

export const SAMPLE_MOVIES: Movie[] = [
  {
    id: 'ragini-mms-2',
    title: 'Ragini MMS 2',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    rating: '4.713',
    year: 2014,
    duration: '1h 59m',
    category: 'bollywood-hindi',
    categoryLabel: 'Bollywood Hindi Movie',
    genres: ['Horror', 'Thriller', 'Mystery'],
    description: 'A film crew shoots an adult horror movie inside a notoriously haunted mansion where gruesome real-life incidents previously transpired.',
    cast: ['Sunny Leone', 'Saahil Prem', 'Parvin Dabas', 'Sandhya Mridul'],
    director: 'Bhushan Patel',
    audioLanguages: ['Hindi (Original)', 'Bengali Dubbed'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'FastCDN Server 1 (Ad-Free)', quality: '1080p HD', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
      { name: 'Direct Stream Server 2', quality: '720p HD', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
      { name: 'Cloud Backup Server 3', quality: '480p SD', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Full HD', size: '1.9 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p HD Ready', size: '980 MB', resolution: '1280x720', url: '#' },
      { quality: '480p Mobile Quality', size: '420 MB', resolution: '854x480', url: '#' }
    ],
    isFeatured: true
  },
  {
    id: 'welcome-to-the-jungle',
    title: 'Welcome to the Jungle',
    poster: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80',
    rating: '5.080',
    year: 2025,
    duration: '2h 28m',
    category: 'bollywood-hindi',
    categoryLabel: 'Bollywood Hindi Movie',
    genres: ['Comedy', 'Adventure', 'Action'],
    description: 'A chaotic, hilarious expedition into an uncharted dangerous rainforest filled with unexpected rivalries, wild creatures, and relentless humor.',
    cast: ['Akshay Kumar', 'Sanjay Dutt', 'Suniel Shetty', 'Arshad Warsi', 'Disha Patani'],
    director: 'Ahmed Khan',
    audioLanguages: ['Hindi [DD 5.1]', 'Bengali Subtitles'],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    streamServers: [
      { name: 'Express Server 1 (Recommended)', quality: '1080p Ultra', url: 'https://vjs.zencdn.net/v/oceans.mp4' },
      { name: 'HyperCDN Server 2', quality: '720p HD', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Full HD', size: '2.4 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p HD', size: '1.2 GB', resolution: '1280x720', url: '#' },
      { quality: '480p Mobile Rip', size: '510 MB', resolution: '854x480', url: '#' }
    ],
    isFeatured: true
  },
  {
    id: 'krrish-3',
    title: 'Krrish 3',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    rating: '4.650',
    year: 2013,
    duration: '2h 32m',
    category: 'bollywood-hindi',
    categoryLabel: 'Bollywood Hindi Movie',
    genres: ['Action', 'Sci-Fi', 'Superhero'],
    description: 'Krrish faces off against Kaal, an evil mutant mastermind spreading a deadly bio-chemical virus across society with his army of humanoid creatures.',
    cast: ['Hrithik Roshan', 'Priyanka Chopra', 'Vivek Oberoi', 'Kangana Ranaut'],
    director: 'Rakesh Roshan',
    audioLanguages: ['Hindi DD5.1', 'Tamil', 'Telugu'],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    streamServers: [
      { name: 'HD Master 1080p', quality: '1080p', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p BluRay', size: '2.8 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p WebRip', size: '1.1 GB', resolution: '1280x720', url: '#' }
    ]
  },
  {
    id: 'night-bus',
    title: 'Night Bus',
    poster: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&auto=format&fit=crop&q=80',
    rating: '4.820',
    year: 2024,
    duration: '2h 05m',
    category: 'trending',
    categoryLabel: 'Trending Now',
    genres: ['Suspense', 'Thriller', 'Mystery'],
    description: 'Strangers aboard a desolate midnight interstate bus realise that one of the passengers is harboring a dangerous stolen bioweapon.',
    cast: ['Abhay Deol', 'Radhika Apte', 'Nawazuddin Siddiqui'],
    director: 'Anurag Kashyap',
    audioLanguages: ['Hindi', 'English Sub'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'Default Stream 1080p', quality: '1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p WEB-DL', size: '1.8 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p HD', size: '920 MB', resolution: '1280x720', url: '#' }
    ],
    isFeatured: true
  },
  {
    id: 'terror-midnight',
    title: 'Reign of Terror',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1200&auto=format&fit=crop&q=80',
    rating: '4.590',
    year: 2023,
    duration: '1h 50m',
    category: 'trending',
    categoryLabel: 'Trending Now',
    genres: ['Action', 'Thriller'],
    description: 'An elite commando unit is sent behind enemy territory on an undercover mission to rescue hostages from a high-security mountain fortress.',
    cast: ['Vidyut Jammwal', 'Manoj Bajpayee', 'Kay Kay Menon'],
    director: 'Nikhil Advani',
    audioLanguages: ['Hindi', 'Bengali'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'UltraStream 1', quality: '1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p HDR', size: '2.1 GB', resolution: '1920x1080', url: '#' }
    ]
  },
  {
    id: 'sholay-classic',
    title: 'Sholay (Restored HD)',
    poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop&q=80',
    rating: '4.982',
    year: 1975,
    duration: '3h 24m',
    category: 'bollywood-90s',
    categoryLabel: 'Bollywood 90s & Classic Movie',
    genres: ['Action', 'Adventure', 'Drama'],
    description: 'After his family is murdered by a ruthless bandit and his hands severed, a retired police officer enlists the aid of two ex-convicts to bring him in.',
    cast: ['Amitabh Bachchan', 'Dharmendra', 'Sanjeev Kumar', 'Hema Malini', 'Amjad Khan'],
    director: 'Ramesh Sippy',
    audioLanguages: ['Hindi (Remastered Audio)', 'Bengali Dubbed'],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    streamServers: [
      { name: 'Remastered 4K Source', quality: '1080p Remastered', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Remastered', size: '3.2 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p Classic', size: '1.4 GB', resolution: '1280x720', url: '#' }
    ]
  },
  {
    id: 'ddlj-classic',
    title: 'Dilwale Dulhania Le Jayenge',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80',
    rating: '4.910',
    year: 1995,
    duration: '3h 09m',
    category: 'bollywood-90s',
    categoryLabel: 'Bollywood 90s & Classic Movie',
    genres: ['Romance', 'Drama', 'Musical'],
    description: 'When Raj and Simran meet on a European trip, love blossoms against expectations. But winning Simran\'s traditional father\'s approval is the true test.',
    cast: ['Shah Rukh Khan', 'Kajol', 'Amrish Puri', 'Anupam Kher'],
    director: 'Aditya Chopra',
    audioLanguages: ['Hindi Original', 'English Subtitles'],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    streamServers: [
      { name: 'YRF Ultra Stream', quality: '1080p', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p HD', size: '2.5 GB', resolution: '1920x1080', url: '#' }
    ]
  },
  {
    id: 'pushpa-2',
    title: 'Pushpa 2: The Rule',
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
    rating: '4.890',
    year: 2024,
    duration: '3h 20m',
    category: 'south-dubbed',
    categoryLabel: 'South Indian Hindi Dubbed',
    genres: ['Action', 'Crime', 'Drama'],
    description: 'Pushpa Raj expands his red sandalwood smuggling empire while confronting ruthless police inspector Bhanwar Singh Shekhawat in an explosive clash.',
    cast: ['Allu Arjun', 'Rashmika Mandanna', 'Fahadh Faasil'],
    director: 'Sukumar',
    audioLanguages: ['Hindi Dubbed', 'Telugu', 'Bengali Dubbed'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'South Cinema CDN 1', quality: '1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Dual Audio', size: '2.9 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p HD', size: '1.3 GB', resolution: '1280x720', url: '#' }
    ]
  },
  {
    id: 'baahubali-2',
    title: 'Baahubali 2: The Conclusion',
    poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    rating: '4.950',
    year: 2017,
    duration: '2h 47m',
    category: 'south-dubbed',
    categoryLabel: 'South Indian Hindi Dubbed',
    genres: ['Action', 'Fantasy', 'Epic'],
    description: 'When Shiva discovers his royal royal heritage as Mahendra Baahubali, he sets out to avenge his father\'s death and free Mahishmati kingdom.',
    cast: ['Prabhas', 'Rana Daggubati', 'Anushka Shetty', 'Sathyaraj'],
    director: 'S.S. Rajamouli',
    audioLanguages: ['Hindi', 'Telugu', 'Tamil'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'EpicServer Max', quality: '1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p HDRip', size: '2.6 GB', resolution: '1920x1080', url: '#' }
    ]
  },
  {
    id: 'avatar-way-of-water',
    title: 'Avatar: The Way of Water',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    rating: '4.780',
    year: 2022,
    duration: '3h 12m',
    category: 'hollywood-dual',
    categoryLabel: 'Hollywood Dual Audio (Hindi/Eng)',
    genres: ['Sci-Fi', 'Adventure', 'Fantasy'],
    description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns, Jake must work with Neytiri to protect their home.',
    cast: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver', 'Stephen Lang'],
    director: 'James Cameron',
    audioLanguages: ['Hindi Dubbed [DD 5.1]', 'English [Original DD+]'],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    streamServers: [
      { name: 'IMAX 3D Encode 1080p', quality: '1080p', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Dual Audio 6CH', size: '3.4 GB', resolution: '1920x1080', url: '#' },
      { quality: '720p Dual Audio', size: '1.5 GB', resolution: '1280x720', url: '#' }
    ]
  },
  {
    id: 'chander-pahar',
    title: 'Chander Pahar (Mountain of Moon)',
    poster: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    rating: '4.835',
    year: 2013,
    duration: '2h 28m',
    category: 'bengali-cinema',
    categoryLabel: 'Bengali Blockbuster Movies',
    genres: ['Adventure', 'Action', 'Drama'],
    description: 'Shankar Roy, a young Bengali explorer, travels to the dark wilderness of Africa in 1909 searching for the mythical Mountain of the Moon and diamond mines.',
    cast: ['Dev', 'Gérard Rudolf', 'Martin Cito Otto'],
    director: 'Kamaleshwar Mukherjee',
    audioLanguages: ['Bengali (Original)', 'Hindi Dubbed'],
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    streamServers: [
      { name: 'Bengal Stream 1', quality: '1080p', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' }
    ],
    downloadLinks: [
      { quality: '1080p Digital Master', size: '2.2 GB', resolution: '1920x1080', url: '#' }
    ]
  }
];

export const START_IO_ADS: AdCreative[] = [
  {
    id: 'ad-freefire-max',
    title: 'Free Fire MAX: Rampage Reborn',
    tagline: 'Join 500M+ Players Worldwide! Battle Royale Action',
    description: 'Drop onto Bermuda island with Ultra HD graphics, realistic gunplay, and intense 10-minute battle royale survivor showdowns. Free install on Google Play.',
    advertiser: 'Garena International · Verified Ad Partner',
    rating: 4.8,
    reviewsCount: '24M',
    badge: 'SPONSORED · PLAY STORE',
    ctaText: 'INSTALL ON PLAY STORE',
    ctaUrl: 'https://play.google.com/store/apps/details?id=com.dts.freefiremax',
    icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80',
    mediaImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
    mediaVideo: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    appCategory: 'Action & Battle Royale',
    appSize: '620 MB',
    installs: '100M+'
  },
  {
    id: 'ad-vpn-fast',
    title: 'Turbo VPN: Fast Secure Proxy',
    tagline: 'High Speed 10Gbps Server - Unlimited Free Access',
    description: 'Bypass ISP limits, encrypt your connection with military-grade AES-128, and stream high quality 4K video with zero buffering.',
    advertiser: 'Innovative Connecting · Security Partner',
    rating: 4.7,
    reviewsCount: '6.2M',
    badge: 'SPONSORED · PLAY STORE',
    ctaText: 'GET FREE APP',
    ctaUrl: 'https://play.google.com/store/apps/details?id=free.vpn.unblock.proxy.turbovpn',
    icon: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80',
    mediaImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    mediaVideo: 'https://vjs.zencdn.net/v/oceans.mp4',
    appCategory: 'Tools & Utilities',
    appSize: '18 MB',
    installs: '100M+'
  },
  {
    id: 'ad-cricket-league',
    title: 'Real Cricket™ 24: Premier League',
    tagline: 'Authentic Shot Animations & Real Tournament Action',
    description: 'Experience real motion-captured batting shots, realistic stadiums, dynamic weather, and live commentary. Play World Cups and IPL tournaments.',
    advertiser: 'Nautilus Mobile · Sports Partner',
    rating: 4.6,
    reviewsCount: '1.4M',
    badge: 'SPONSORED · PLAY STORE',
    ctaText: 'PLAY NOW',
    ctaUrl: 'https://play.google.com/store/apps/details?id=com.nautilus.RealCricket3D',
    icon: 'https://images.unsplash.com/photo-1531415074868-036b1c57e329?w=150&auto=format&fit=crop&q=80',
    mediaImage: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80',
    mediaVideo: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
    appCategory: 'Sports & Cricket Games',
    appSize: '740 MB',
    installs: '50M+'
  },
  {
    id: 'ad-shopping-deals',
    title: 'Meesho: Online Shopping Mega Deals',
    tagline: 'Lowest Prices Guaranteed & Cash on Delivery',
    description: 'Discover over 5 crore trending items in fashion, electronics, home decor, and gadgets directly from wholesalers with free shipping.',
    advertiser: 'Meesho Direct · Commerce Partner',
    rating: 4.5,
    reviewsCount: '4.8M',
    badge: 'SPONSORED · PLAY STORE',
    ctaText: 'SHOP DEALS',
    ctaUrl: 'https://play.google.com/store/apps/details?id=com.meesho.supply',
    icon: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150&auto=format&fit=crop&q=80',
    mediaImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
    mediaVideo: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
    appCategory: 'Shopping & Offers',
    appSize: '22 MB',
    installs: '500M+'
  }
];

export const STARTIO_REAL_CAMPAIGNS = START_IO_ADS;

export const DEFAULT_STARTIO_CONFIG = {
  appId: '203877183', // User's real Start.io App ID
  enableBanner: true,
  enableNative: true,
  enableInterstitial: true,
  interstitialSkipCountdown: 5,
  interstitialFrequency: 'every_click' as const,
  testMode: false,
  bannerPosition: 'bottom' as const,
  customAdUrl: ''
};
