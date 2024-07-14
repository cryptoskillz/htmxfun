/**
email worker
 */
export default {
	async fetch(request, env) {
		//handle the post
		if (request.method == 'POST') {
			let method = '';
			const theData = await request.json();
			const data = {
				From: `${env.EMAIL_FROM}`,
				To: `${theData.to}`,
			};
			//build the api call
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
			//build the api call
			const options = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					'X-Postmark-Server-Token': env.EMAIL_TOKEN,
				},
				body: JSON.stringify(data),
			};
			//call the api
			const response = await fetch(env.EMAIL_API + method, options);
			//console.log(response);
			//handle the response
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
