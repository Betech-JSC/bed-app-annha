// Logo URLs cho các hãng hàng không Việt Nam
export const AIRLINE_LOGOS: { [key: string]: string } = {
    // Vietnam Airlines
    'VN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Vietnam_Airlines_logo.svg/200px-Vietnam_Airlines_logo.svg.png',
    'Vietnam Airlines': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Vietnam_Airlines_logo.svg/200px-Vietnam_Airlines_logo.svg.png',

    // VietJet Air
    'VJ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/VietJet_Air_logo.svg/200px-VietJet_Air_logo.svg.png',
    'VietJet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/VietJet_Air_logo.svg/200px-VietJet_Air_logo.svg.png',
    'VietJet Air': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/VietJet_Air_logo.svg/200px-VietJet_Air_logo.svg.png',

    // Bamboo Airways
    'QH': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Bamboo_Airways_logo.svg/200px-Bamboo_Airways_logo.svg.png',
    'Bamboo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Bamboo_Airways_logo.svg/200px-Bamboo_Airways_logo.svg.png',
    'Bamboo Airways': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Bamboo_Airways_logo.svg/200px-Bamboo_Airways_logo.svg.png',

    // Jetstar Pacific (Pacific Airlines)
    'BL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Jetstar_Pacific_logo.svg/200px-Jetstar_Pacific_logo.svg.png',
    'Jetstar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Jetstar_Pacific_logo.svg/200px-Jetstar_Pacific_logo.svg.png',
    'Jetstar Pacific': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Jetstar_Pacific_logo.svg/200px-Jetstar_Pacific_logo.svg.png',
    'Pacific Airlines': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Jetstar_Pacific_logo.svg/200px-Jetstar_Pacific_logo.svg.png',

    // Vietravel Airlines
    'VU': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Vietravel_Airlines_logo.svg/200px-Vietravel_Airlines_logo.svg.png',
    'Vietravel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Vietravel_Airlines_logo.svg/200px-Vietravel_Airlines_logo.svg.png',
    'Vietravel Airlines': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Vietravel_Airlines_logo.svg/200px-Vietravel_Airlines_logo.svg.png',

    // VASCO (Vietnam Air Services Company)
    '0V': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Vietnam_Airlines_logo.svg/200px-Vietnam_Airlines_logo.svg.png',
    'VASCO': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Vietnam_Airlines_logo.svg/200px-Vietnam_Airlines_logo.svg.png',
};

// Default airline logo (fallback)
export const DEFAULT_AIRLINE_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Vietnam_Airlines_logo.svg/200px-Vietnam_Airlines_logo.svg.png';

/**
 * Lấy logo URL của hãng hàng không dựa trên tên hoặc mã IATA/ICAO
 * @param airline - Tên hãng bay hoặc mã IATA/ICAO (VD: "Vietnam Airlines", "VN", "VJ")
 * @param logoUrl - Logo URL từ API (nếu có)
 * @returns URL của logo hãng bay
 */
export function getAirlineLogo(airline: string | null | undefined, logoUrl?: string | null): string {
    // Nếu có logo_url từ API, ưu tiên dùng
    if (logoUrl) {
        return logoUrl;
    }

    if (!airline) {
        return DEFAULT_AIRLINE_LOGO;
    }

    // Chuẩn hóa tên hãng bay (uppercase, trim)
    const normalized = airline.trim().toUpperCase();

    // Tìm theo mã IATA/ICAO trước
    if (AIRLINE_LOGOS[normalized]) {
        return AIRLINE_LOGOS[normalized];
    }

    // Tìm theo tên đầy đủ (case-insensitive)
    const airlineLower = airline.toLowerCase();
    for (const [key, value] of Object.entries(AIRLINE_LOGOS)) {
        if (key.toLowerCase() === airlineLower || airlineLower.includes(key.toLowerCase())) {
            return value;
        }
    }

    // Tìm theo partial match
    for (const [key, value] of Object.entries(AIRLINE_LOGOS)) {
        if (airlineLower.includes(key.toLowerCase()) || key.toLowerCase().includes(airlineLower)) {
            return value;
        }
    }

    // Fallback về default logo
    return DEFAULT_AIRLINE_LOGO;
}

