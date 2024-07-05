/*
todo

add delete 
add push url for add and edit form
add env for apiurl (also in front end)
check if the field name has a matching look up table in the database and if it finds one render a select instead of an input
add a cofirm modal for delete
add validation to the add / edit form
*/
const blackListFields = [
	'id',
	'guid',
	'created_at',
	'updated_at',
	'deleted_at',
	'isDeleted',
	'publishedAt',
	'adminId',
	'createdAt',
	'updatedAt',
	'deletedAt',
];

export default {
	async fetch(request, env, ctx) {
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

		const renderHTML = (renderType, tableName, fields, theData) => {
			let htmlResponse = '';

			if (renderType === 'table') {
				const dataToRender = Array.isArray(theData.results) ? theData.results : [theData];

				htmlResponse = `
          <table class="table delete-row-example">
            <thead>
              <tr>
                ${fields.map((field) => `<th>${field}</th>`).join('')}
                <td>Action</td>
              </tr>
            </thead>
            <tbody hx-target="closest tr" hx-swap="outerHTML">
              ${dataToRender
								.map(
									(result) => `
                <tr>
                  ${fields.map((field) => `<td>${result[field]}</td>`).join('')}
                  <td>
                    <a class="btn" href="/${tableName}/edit/?id=${result.id}">Edit</a>
                    | <a href="/${tableName}/delete/${result.id}" hx-delete>Delete</a>
                  </td>
                </tr>`
								)
								.join('')}
            </tbody>
          </table>`;
			} else if ((renderType === 'formedit' || renderType === 'formadd') && theData) {
				const formData = renderType === 'formedit' ? (Array.isArray(theData.results) ? theData.results[0] : theData) : {};

				const formFields = (renderType === 'formedit' ? Object.keys(formData) : theData.results.map((field) => field.name))
					.filter((key) => !blackListFields.includes(key))
					.map(
						(key) => `
            <div class="form-group">
              <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input type="text" name="${key}" value="${formData[key] || ''}" />
            </div>`
					)
					.join('');

				const formAction = renderType === 'formedit' ? 'hx-put' : 'hx-post';
				const formUrl =
					renderType === 'formedit' ? `http://localhost:8787/${tableName}/${formData.id}` : `http://localhost:8787/${tableName}/`;

				htmlResponse = `
          <form ${formAction}="${formUrl}" hx-target="this" hx-swap="outerHTML">
            ${formFields}
            <button type="submit" class="btn">Submit</button>
            <a class="btn" href="/${tableName}/">Cancel</a>
          </form>`;
			} else {
				htmlResponse = `<div>Unsupported render type: ${renderType}</div>`;
			}

			return htmlResponse;
		};

		const sendResponse = (theMessage, theCode, theType = 'text/html') => {
			return new Response(theMessage, {
				status: theCode,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': theType,
				},
			});
		};

		const setFields = (table) => {
			if (table == 'projects') return ['id', 'name', 'guid'];
			if (table == 'user') return ['id', 'name', 'email'];
		};

		if (request.method === 'GET') {
			const currentUrl = request.headers.get('Hx-Current-Url');
			const urlObj = new URL(currentUrl);
			const searchParams = new URLSearchParams(urlObj.search);

			const params = {};
			searchParams.forEach((value, key) => {
				params[key] = value.includes(',') ? value.split(',') : value;
			});

			const segments = urlObj.pathname.split('/').filter((segment) => segment.length > 0);
			const tableName = segments[0];
			const fieldNames = setFields(tableName);
			const fieldsString = fieldNames.join(',');

			let renderType = 'table';
			let theQuery = `SELECT ${fieldsString} FROM ${tableName} WHERE isDeleted = 0`;

			if (Object.keys(params).length !== 0) {
				if (params.id == 0) {
					renderType = 'formadd';
					theQuery = `PRAGMA table_info(${tableName});`;
				} else if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) {
					theQuery = `SELECT * FROM ${tableName} WHERE isDeleted = 0 AND id = ${params.id}`;
					renderType = 'formedit';
				} else {
					const htmlResponse = `<div>invalid id</div>`;
					return sendResponse(htmlResponse, 200);
				}
			}

			try {
				const stmt = env.DB.prepare(theQuery);
				let theData;

				if (renderType == 'table' || renderType == 'formadd') {
					theData = await stmt.all();
				} else {
					theData = await stmt.first();
				}

				let htmlResponse = '';
				if (theData.length === 0) {
					htmlResponse = `<div>no results</div>`;
				} else {
					htmlResponse = renderHTML(renderType, tableName, fieldNames, theData);
				}

				return sendResponse(htmlResponse, 200);
			} catch (error) {
				console.error('Error executing query:', error);
				const htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 500);
			}
		}

		if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
			try {
				const url = new URL(request.url);
				const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
				const tableName = segments[0];
				const id = segments[2];

				if (request.method === 'DELETE') {
					if (!id) {
						return sendResponse('Missing ID for deletion', 400);
					}

					const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
					const stmt = env.DB.prepare(sql);
					const result = await stmt.run();

					return sendResponse('Record deleted successfully', 200);
				}

				const contentType = request.headers.get('content-type');
				const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());

				const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));

				let sql = '';

				if (request.method === 'POST') {
					const fieldList = fields.join(', ');
					const valueList = fields.map((field) => `'${body[field]}'`).join(', ');
					sql = `INSERT INTO ${tableName} (${fieldList}) VALUES (${valueList})`;
				} else if (request.method === 'PUT') {
					const setClause = fields
						.map((field) => {
							const value = typeof body[field] === 'string' ? `'${body[field]}'` : body[field];
							return `${field} = ${value}`;
						})
						.join(', ');
					sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
				}

				const stmt = env.DB.prepare(sql);
				const result = await stmt.run();

				return sendResponse('Operation successful', 200);
			} catch (error) {
				console.error('Error handling request:', error);
				return sendResponse('Internal Server Error', 500);
			}
		}

		return sendResponse('Method Not Allowed', 405);
	},
};
