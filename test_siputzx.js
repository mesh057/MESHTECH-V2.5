const axios = require('axios');

async function test() {
    try {
        console.log('Testing Siputzx DuckAI...');
        const res = await axios.get('https://api.siputzx.my.id/api/m/ephoto360?url=https%3A%2F%2Fen.ephoto360.com%2Fglossy-silver-text-effect-online-802.html&text1=hello', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        }
    }
}

test();
