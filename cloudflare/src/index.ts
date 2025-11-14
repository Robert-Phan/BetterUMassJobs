// /**
//  * Welcome to Cloudflare Workers! This is your first worker.
//  *
//  * - Run `npm run dev` in your terminal to start a development server
//  * - Open a browser tab at http://localhost:8787/ to see your worker in action
//  * - Run `npm run deploy` to publish your worker
//  *
//  * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
//  * `Env` object can be regenerated with `npm run cf-typegen`.
//  *
//  * Learn more at https://developers.cloudflare.com/workers/
//  */

// export default {
// 	async fetch(request, env, ctx): Promise<Response> {
// 		return new Response('Hello World!');
// 	},
// } satisfies ExportedHandler<Env>;

const JOB_BOARD_URL = "https://yes.umass.edu/portal/jobsearch?cmd=search"
const JOB_DETAILS_URL = "https://yes.umass.edu/portal/jobsearch?cmd=Details&job_number_details="

async function getJobBoard() {
    const upstream = await fetch(JOB_BOARD_URL,
        { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const body = await upstream.text();

    return new Response(body, {
        headers: {
            "content-type": "text/html; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "access-control-allow-headers": "Content-Type",
            "access-control-allow-methods": "GET,HEAD,OPTIONS",
        },
        status: upstream.status,
    });
}

async function getPostingDetails(jobIdsStr: string) {
    let idArray = jobIdsStr.split(',')

    let body = {}

    await Promise.all(idArray.map(async id => {
        const upstream = await fetch(
            JOB_DETAILS_URL + id,
            { headers: { "User-Agent": "Mozilla/5.0" } }
        );

        const page = await upstream.text()

        Object.defineProperty(body, id, { value: page, enumerable: true });
    }))

    return new Response(JSON.stringify(body), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "access-control-allow-headers": "Content-Type",
            "access-control-allow-methods": "GET,HEAD,OPTIONS",
        },
        status: 200,
    });
}

export default {
    async fetch(request: Request) {
        let url = new URL(request.url)
        let searchParams = url.searchParams

        let jobIdsStr = searchParams.get('jobIds')

        if (jobIdsStr)
            return await getPostingDetails(jobIdsStr);

        return await getJobBoard();
    },
};