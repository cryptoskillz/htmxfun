export default {
	async fetch(request, env) {
		async function debugIt(send_request) {
			const requestClone = send_request.clone();
			const requestUrl = send_request.url;
			const requestMethod = send_request.method;
			const requestHeaders = {};
			send_request.headers.forEach((value, key) => {
				requestHeaders[key] = value;
			});
			const requestBody = await requestClone.text();
			const logData = {
				url: requestUrl,
				method: requestMethod,
				headers: requestHeaders,
				body: requestBody,
			};
			console.log('Debug Data:', JSON.stringify(logData, null, 2));
			return logData;
		}

		async function parseRequestBody(request) {
			const contentType = request.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return await request.json();
			} else {
				return Object.fromEntries(await request.formData());
			}
		}

		if (request.method === 'POST') {
			const body = await parseRequestBody(request);
			const send_request = new Request(env.EMAIL_API_URL, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					personalizations: [
						{
							to: [{ email: body.receiver, name: body.receiverName }],
						},
					],
					from: {
						email: body.email_from,
						name: body.sender_email_name,
					},
					subject: body.subject,
					content: [
						{
							type: 'text/html',
							value: body.content,
						},
					],
				}),
			});

			//send back debug information
			//const debugData = await debugIt(send_request);
			const debugData = '';
			const resp = await fetch(send_request);

			// Return debug data as part of the response for debugging
			return new Response(
				JSON.stringify(
					{
						debug: debugData,
						emailResponse: await resp.json(),
					},
					null,
					2
				),
				{
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		return new Response('Method not allowed', { status: 405 });
	},
};
