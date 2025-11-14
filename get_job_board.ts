const JOB_BOARD_URL = "https://yes.umass.edu/portal/jobsearch?cmd=search"

export default {
    async fetch(request: Request) {
        const upstream = await fetch(JOB_BOARD_URL,
            { headers: { "User-Agent": "Mozilla/5.0" } }
        );

        const body = await upstream.text();

        return new Response(body, {
            headers: {
                "content-type": "text/html; charset=utf-8",
                "access-control-allow-origin": "*",
                "access-control-allow-headers": "Content-Type",
                "access-control-allow-methods": "GET,HEAD,OPTIONS",
            },
            status: upstream.status,
        });
    },
};