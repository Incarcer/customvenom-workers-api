type Env = {
	customvenom_data?: R2Bucket; // R2 binding (present in deployed env)
};

function q(url: URL, key: string, fallback: string) {
	const v = url.searchParams.get(key);
	return v && v.trim() ? v.trim() : fallback;
}

function cors(headers: Headers = new Headers()) {
	headers.set("access-control-allow-origin", "*");
	headers.set("access-control-allow-methods", "GET, OPTIONS");
	headers.set("access-control-allow-headers", "Content-Type");
	return headers;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Local dev proxy: keep your static server running on 8081
		// cd C:\Users\JDewe\Documents\customvenom\customvenom\customvenom-data-pipelines
		// npx http-server -p 8081 .
		const LOCAL_BASE = "http://127.0.0.1:8081";

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: cors() });
		}

		const league = q(url, "league", "nfl");
		const year = q(url, "year", "2025");
		const week = q(url, "week", "5");

		// If the R2 binding is missing, we’re in local-proxy mode
		const inLocalMode = !env.customvenom_data;

		const ok = (body: string, contentType = "application/json", key?: string) => {
			const h = cors(new Headers({ "content-type": contentType }));
			if (key) h.set("x-key", key); // optional debug
			return new Response(body, { headers: h });
		};

		const notFound = (msg: string, key?: string) => {
			const h = cors(new Headers({ "content-type": "text/plain" }));
			if (key) h.set("x-key", key); // optional debug
			return new Response(msg, { status: 404, headers: h });
		};

		const r2GetText = async (key: string) => {
			const bucket = env.customvenom_data;
			if (!bucket) throw new Error("R2 binding not available");
			const obj = await bucket.get(key);
			if (!obj) return null;
			return await obj.text();
		};

		try {
			// /stats/espn
			if (url.pathname === "/stats/espn") {
				// IMPORTANT: Build key explicitly. Do NOT use url.pathname or url.search.
				const key = `data/stats/${league}/${year}/week=${week}/espn.json`;

				if (inLocalMode) {
					const upstream = `${LOCAL_BASE}/${key}`;
					const r = await fetch(upstream);
					if (!r.ok) return notFound(`Upstream not found: ${upstream}`, key);
					return ok(await r.text(), "application/json", key);
				} else {
					const body = await r2GetText(key);
					if (!body) return notFound(`R2 key not found: ${key}`, key);
					return ok(body, "application/json", key);
				}
			}

			// /projections/baseline
			if (url.pathname === "/projections/baseline") {
				// IMPORTANT: Build key explicitly. Do NOT use url.pathname or url.search.
				const key = `data/projections/${league}/${year}/week=${week}/baseline.json`;

				if (inLocalMode) {
					const upstream = `${LOCAL_BASE}/${key}`;
					const r = await fetch(upstream);
					if (!r.ok) return notFound(`Upstream not found: ${upstream}`, key);
					return ok(await r.text(), "application/json", key);
				} else {
					const body = await r2GetText(key);
					if (!body) return notFound(`R2 key not found: ${key}`, key);
					return ok(body, "application/json", key);
				}
			}

			return notFound("Not Found");
		} catch (err: any) {
			const msg = err?.stack || err?.message || String(err);
			return new Response(`Error: ${msg}`, {
				status: 500,
				headers: cors(new Headers({ "content-type": "text/plain" })),
			});
		}
	},
} satisfies ExportedHandler<Env>;