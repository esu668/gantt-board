export default async function handler(req, res) {
    const binId = '6a5a450df5f4af5e299ceb09';
    const apiKey = process.env.JSONBIN_API_KEY;
    const url = `https://api.jsonbin.io/v3/b/${binId}`;

    if (req.method === 'GET') {
        try {
            const response = await fetch(`${url}/latest`, {
                headers: { 'X-Access-Key': apiKey }
            });
            const data = await response.json();
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    } else if (req.method === 'PUT') {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': apiKey
                },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}