const parseJsonResponse = async (response) => {
    const text = await response.text();
    if (!text.trim()) {
        throw new Error(`MyFatoorah returned empty body (${response.status})`);
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `MyFatoorah returned invalid JSON (${response.status}): ${text.slice(0, 160)}`,
        );
    }
};

const client = async (path, { method = 'POST', data } = {}) => {
    const response = await fetch(process.env.NEXT_PUBLIC_MYFATORA_API_ENDPOINT + '/v2/' + path, {
        method,
        ...(data && {
            body: JSON.stringify(data),
        }),
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MYFATORA_API_TOKEN}`,
            ...(data && {
                'Content-Type': 'application/json'
            }),
        }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`MyFatoorah request failed (${response.status}): ${text.slice(0, 200)}`);
    }
    return parseJsonResponse(response);
};

export {
    client
}
