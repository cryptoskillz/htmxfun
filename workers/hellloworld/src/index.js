export default {
	async fetch(request, env, ctx) {
		// Handle preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Handle actual requests (example: GET request)
		if (request.method === 'GET') {
			const htmlResponse = `
				<div>
					<p>Hello World!</p>
				</div>
			`;
			const response = new Response(htmlResponse, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'text/html',
				},
			});
			return response;
		}

		// Handle unsupported methods
		return new Response(null, {
			status: 405,
			statusText: 'Method Not Allowed',
		});
	},
};
