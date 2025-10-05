type Env = {};

function q(url: URL, key: string, fallback: string) {
	const v = url.searchParams.get(key);
	return v && v.trim() ? v.trim() : fallback;
}

function cors(h: Headers) {
	h.set("access-control-allow-origin", "*");
	h.set("access-control-allow-methods", "GET, OPTIONS");
	h.set("access-control-allow-headers", "Content-Type");
	return h;
}

export default {
	async fetch(request: Request, _env: Env): Promise<Response> {
		const url = new URL(request.url);

		// CHANGE THIS to match your running static server (8080 or 8081)
		const LOCAL_BASE = "http://127.0.0.1:8081";

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: cors(new Headers()) });
		}

		const league = q(url, "league", "nfl");
		const year = q(url, "year", "2025");
		const week = q(url, "week", "5");

		try {
			if (url.pathname === "/stats/espn") {
				const upstream = `${LOCAL_BASE}/data/stats/${league}/${year}/week=${week}/espn.json`;
				const r = await fetch(upstream);
				if (!r.ok) {
					return new Response(`Upstream not found: ${upstream}`, {
						status: 404,
						headers: cors(new Headers({ "content-type": "text/plain" })),
					});
				}
				const body = await r.text();
				return new Response(body, {
					headers: cors(new Headers({ "content-type": "application/json" })),
				});
			}

			if (url.pathname === "/projections/baseline") {
				const upstream = `${LOCAL_BASE}/data/projections/${league}/${year}/week=${week}/baseline.json`;
				const r = await fetch(upstream);
				if (!r.ok) {
					return new Response(`Upstream not found: ${upstream}`, {
						status: 404,
						headers: cors(new Headers({ "content-type": "text/plain" })),
					});
				}
				const body = await r.text();
				return new Response(body, {
					headers: cors(new Headers({ "content-type": "application/json" })),
				});
			}

			return new Response("Not Found", { status: 404, headers: cors(new Headers()) });
		} catch (err: any) {
			const msg = err?.stack || err?.message || String(err);
			return new Response(`Proxy error: ${msg}`, {
				status: 500,
				headers: cors(new Headers({ "content-type": "text/plain" })),
			});
		}
	},
} satisfies ExportedHandler;