
async function testAdminFlow() {
    const baseUrl = 'http://localhost:5136/api/admin';

    console.log('1. Testing Login...');
    try {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'etpatil62@gmail.com',
                password: 'password'
            })
        });

        const loginData = await loginRes.json();
        console.log('Login Response:', loginData);

        if (!loginData.success || !loginData.token) {
            console.error('Login Failed!');
            return;
        }

        const token = loginData.token;
        console.log('Token received:', token.substring(0, 20) + '...');

        console.log('\n2. Testing Verify Token...');
        const verifyRes = await fetch(`${baseUrl}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const verifyData = await verifyRes.text(); // Get text first to debug HTML responses
        try {
            const json = JSON.parse(verifyData);
            console.log('Verify Response:', json);
        } catch (e) {
            console.error('Verify returned non-JSON:', verifyData.substring(0, 200));
        }

    } catch (error) {
        console.error('Test Error:', error);
    }
}

testAdminFlow();
