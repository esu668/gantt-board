const WORKSPACE_ID = 'main';
const TABLE_NAME = 'gantt_workspace';

function getConfig() {
    const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const secretKey = process.env.SUPABASE_SECRET_KEY || '';

    if (!baseUrl || !secretKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    }

    return { baseUrl, secretKey };
}

function getHeaders(secretKey, extra = {}) {
    return {
        apikey: secretKey,
        Accept: 'application/json',
        ...extra
    };
}

async function readWorkspace(baseUrl, secretKey) {
    const endpoint =
        `${baseUrl}/rest/v1/${TABLE_NAME}` +
        `?id=eq.${encodeURIComponent(WORKSPACE_ID)}` +
        `&select=data&limit=1`;

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: getHeaders(secretKey),
        cache: 'no-store'
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
            `Supabase GET failed: ${response.status} ${detail.slice(0, 300)}`
        );
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || rows.length === 0) {
        return {};
    }

    return rows[0] &&
        rows[0].data &&
        typeof rows[0].data === 'object'
        ? rows[0].data
        : {};
}

async function writeWorkspace(baseUrl, secretKey, data) {
    const endpoint =
        `${baseUrl}/rest/v1/${TABLE_NAME}?on_conflict=id`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(secretKey, {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
        }),
        body: JSON.stringify({
            id: WORKSPACE_ID,
            data,
            updated_at: new Date().toISOString()
        })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
            `Supabase UPSERT failed: ${response.status} ${detail.slice(0, 300)}`
        );
    }

    const rows = await response.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        const { baseUrl, secretKey } = getConfig();

        if (req.method === 'GET') {
            const record = await readWorkspace(baseUrl, secretKey);

            return res.status(200).json({
                record
            });
        }

        if (req.method === 'PUT') {
            let payload = req.body;

            if (typeof payload === 'string') {
                payload = JSON.parse(payload);
            }

            if (
                !payload ||
                typeof payload !== 'object' ||
                Array.isArray(payload)
            ) {
                return res.status(400).json({
                    error: 'Invalid payload'
                });
            }

            await writeWorkspace(
                baseUrl,
                secretKey,
                payload
            );

            return res.status(200).json({
                ok: true
            });
        }

        res.setHeader('Allow', 'GET, PUT');

        return res.status(405).json({
            error: 'Method not allowed'
        });
    } catch (error) {
        console.error('Sync API error:', error);

        return res.status(500).json({
            error: 'Cloud sync failed'
        });
    }
}