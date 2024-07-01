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

		// Handle actual requests
		if (request.method === 'GET') {
			const stmt = env.DB.prepare('SELECT * FROM projects');
			const { results } = await stmt.all();

			const htmlResponse = `
			<div>
                ${results.map((result) => `${result.name}`).join('')}
             </div>
      `;
			return new Response(htmlResponse, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'text/html',
				},
			});
		} else if (request.method === 'POST') {
			const contentType = request.headers.get('Content-Type') || '';
			//if (contentType.includes('application/json')) {
			//const json = await request.json();
			//const { name, description } = json;

			//const stmt = env.DB.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
			//await stmt.bind(name, description).run();

			const htmlResponse = `
              <div>
                <p>Project added successfully!</p>
              </div>
            `;
			return new Response(htmlResponse, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'text/html',
				},
			});
		}

		// Handle unsupported methods
		return new Response('<html><body><div>Method Not Allowed</div></body></html>', {
			status: 405,
			statusText: 'Method Not Allowed',
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'text/html',
			},
		});
	},
};
