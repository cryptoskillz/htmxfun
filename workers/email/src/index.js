export default {
	async fetch(request, env) {
		async function debutIt(send_request) {
			/*
			as we cannot run this locally we sometimes have to log, run  the command below from the terminal
				sudo wrangler --tail 
			*/
			// Clone the request to read its body separately
			const requestClone = send_request.clone();
			// Extract properties for detailed logging
			const requestUrl = send_request.url;
			const requestMethod = send_request.method;
			const requestHeaders = {};
			send_request.headers.forEach((value, key) => {
				requestHeaders[key] = value;
			});
			const requestBody = await requestClone.text();
			console.log('send_request URL:', requestUrl);
			console.log('send_request Method:', requestMethod);
			console.log('send_request Headers:', JSON.stringify(requestHeaders, null, 2));
			console.log('send_request Body:', requestBody);
			const resp = await fetch(send_request);
			const respText = await resp.text();
			console.log('Response:', respText);
		}

		//this will be passed in the body from the worker
		const content = [
			{
				type: 'text/html',
				value: '<h1>Hello from Cloudflare worker</h1>',
			},
		];
		const receiver = 'chrisjmccreadie@protonmail.com';
		const receiverName = 'chris';
		const subject = 'test';

		//build the email
		const send_request = new Request(env.EMAIL_API_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				personalizations: [
					{
						to: [{ email: receiver, name: receiverName }],
					},
				],
				from: {
					email: env.EMAIL_FROM,
					name: env.SENDER_EMAIL_NAME,
				},
				subject: subject,
				content: content,
			}),
		});

		//unghost this if you want to debug
		//debugIt(send_request);

		return new Response(await resp.ok);
	},
};
