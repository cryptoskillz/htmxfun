/**


TODO



 */

export default {
	async fetch(request, env) {
		console.log(env);
		if (request.method == 'POST') {
			let method = '';
			const theData = await request.json();
			const data = {
				From: `${env.EMAILFROM}`,
				To: `${theData.to}`,
			};
			console.log(data);
			if (theData.templateId != void 0) {
				method = 'email/withTemplate';
				data.TemplateId = theData.templateId;
				data.TemplateModel = theData.templateVariables;
			} else {
				method = 'email';
				if (theData.subject != void 0) data.Subject = theData.subject;
				if (theData.textBody != void 0) data.TextBody = theData.textBody;
				if (theData.htmlBody != void 0) data.HextBody = theData.htmlBody;
			}
			console.log(env.EMAILAPI + method);
			const options = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					'X-Postmark-Server-Token': env.EMAILTOKEN,
				},
				body: JSON.stringify(data),
			};
			const response = await fetch(env.EMAILAPI + method, options);
			console.log(response);
			if (response.ok) {
				return new Response(JSON.stringify({ message: 'Email sent!' }, 200));
			} else {
				return new Response(JSON.stringify({ message: 'An error occurred' }, 400));
			}
		} else {
			return new Response(JSON.stringify({ message: 'POST ONLY' }, 400));
		}
	},
};
