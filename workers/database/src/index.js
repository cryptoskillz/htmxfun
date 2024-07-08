import jwt from '@tsndr/cloudflare-worker-jwt';

const blackListFields = [
	'id',
	'created_at',
	'updated_at',
	'deleted_at',
	'isDeleted',
	'publishedAt',
	'adminId',
	'createdAt',
	'updatedAt',
	'deletedAt',
	'authToken',
];

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		const url = new URL(request.url);
		const authToken = new URLSearchParams(url.search).get('authToken');

		if (request.method === 'GET') {
			return handleGetRequest(request, env, authToken);
		}

		if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
			return handleDataModification(request, env, url, authToken);
		}

		return sendResponse('Method Not Allowed', 405);
	},
};

function handleOptions() {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400',
		},
	});
}

async function handleGetRequest(request, env, authToken) {
	const jwtValid = await validateJWT(authToken, env.SECRET_KEY);
	if (!jwtValid) return sendResponse('Unauthorized', 401);
	//why are we using hx-current-url here instad of uel
	const url = new URL(request.headers.get('Hx-Current-Url'));
	const searchParams = new URLSearchParams(url.search);
	const params = Object.fromEntries(searchParams.entries());
	const tableName = url.pathname.split('/').filter(Boolean)[0];
	const fields = getFields(tableName);
	const fieldNames = fields.map((f) => f.name).join(',');
	const renderType = determineRenderType(params);
	const query = buildQuery(params, tableName, fieldNames, renderType);
	try {
		/*
		TODO: 

		check delete function is showing unathorised (paramater or token)
		insert is not generating a guid automitcally 

		thoughts

		we could uses the field list instead of the PRAGMA table_info(projects); from the setfields function as that would be easier to control 
		if we do this then we can make the build insert query much simpleier

		if we do this then buildQuery has to be updated for the insert 

		buildInsertQuery does not have to exxeute the prag as we have the setfields that we can use




		*/
		let returnOne = true;
		if (renderType == 'table') returnOne = false;
		const data = await executeQuery(env.DB, query, returnOne, true);
		const htmlResponse = data.length === 0 ? 'No results' : await renderHTML(renderType, tableName, fields, data, env);
		return sendResponse(htmlResponse, 200);
	} catch (error) {
		console.error('Error executing query:', error);
		return sendResponse(`Error executing query: ${error.message}`, 500);
	}
}

async function handleDataModification(request, env, url, authToken) {
	const segments = url.pathname.split('/').filter(Boolean);
	const tableName = segments[0];
	const id = segments[1];
	const body = await parseRequestBody(request);

	// Validate JWT
	const jwtToken = body.authToken || getUrlParameter(request.url, 'authToken');
	const jwtValid = await validateJWT(jwtToken, env.SECRET_KEY);
	if (!jwtValid) return sendResponse('Unauthorized', 401);

	if (request.method === 'DELETE') {
		if (!id) return sendResponse('Missing ID for deletion', 400);
		const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
		await executeQuery(env.DB, sql);
		return sendResponse('Record deleted successfully', 200);
	}

	const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));
	if (!validateData(fields)) return sendResponse('Invalid data', 400);

	const sql = request.method === 'POST' ? await buildInsertQuery(tableName, env, body) : buildUpdateQuery(tableName, fields, body, id);
	await executeQuery(env.DB, sql, true, true);

	const responseObj = {
		message: `Record ${request.method === 'POST' ? 'added' : 'updated'} successfully`,
		tableName: tableName,
		statusText: 'OK',
	};

	return sendResponse(responseObj, 200, 'application/json');
}

function getUrlParameter(url, name) {
	// Function to extract URL parameter from query string
	const searchParams = new URLSearchParams(url.search);
	return searchParams.get(name);
}

async function parseRequestBody(request) {
	const contentType = request.headers.get('content-type');
	return contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
}

async function validateJWT(authToken, secretKey) {
	return authToken ? await jwt.verify(authToken, secretKey) : false;
}

function getFields(tableName) {
	const fieldsConfig = {
		projects: [
			{ name: 'id', inputType: 'integer', required: true },
			{ name: 'name', inputType: 'text' },
			{ name: 'guid', inputType: 'text', extendedType: 'guid', disableAdd: true, disableEdit: true },
		],
		user: [
			{ name: 'id', inputType: 'number', required: true },
			{ name: 'name', inputType: 'text', minLength: 5, maxLength: 10, required: true },
			{ name: 'email', inputType: 'email', required: true },
			{ name: 'username', inputType: 'text' },
		],
	};
	return fieldsConfig[tableName] || [];
}

function determineRenderType(params) {
	if (params.id === '0') return 'formadd';
	if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) return 'formedit';
	return 'table';
}

function buildQuery(params, tableName, fieldNames, renderType) {
	if (renderType === 'formadd') {
		return `PRAGMA table_info(${tableName});`;
	}
	if (renderType === 'formedit') {
		return `SELECT * FROM ${tableName} WHERE isDeleted = 0 AND id = ${params.id}`;
	}
	return `SELECT ${fieldNames} FROM ${tableName} WHERE isDeleted = 0`;
}

function validateData(data) {
	// Implement your validation logic here
	return true;
}

async function getTableFields(env, tableName) {
	const query = `PRAGMA table_info(${tableName});`;
	const data = await executeQuery(env.DB, query, false, true);
	return data.results.map((row) => row.name);
}

async function buildInsertQuery(tableName, env, body) {
	const allFields = await getTableFields(env, tableName);
	const fields = allFields.filter((field) => !blackListFields.includes(field) && field !== 'authToken');

	const extendedData = generateExtendedData(fields);
	const insertFields = [];
	const insertValues = [];

	fields.forEach((field) => {
		// Exclude fields in blacklist and 'authToken'
		if (!blackListFields.includes(field) && body.hasOwnProperty(field)) {
			insertFields.push(field);
			const value = extendedData[field] || `'${body[field]}'`;
			insertValues.push(value);
		}
	});

	const fieldNames = insertFields.join(', ');
	const values = insertValues.join(', ');
	return `INSERT INTO ${tableName} (${fieldNames}) VALUES (${values})`;
}

function buildUpdateQuery(tableName, fields, body, id) {
	const setClause = fields.map((field) => `${field} = '${body[field]}'`).join(', ');
	return `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
}

function generateExtendedData(fields) {
	const extendedData = {};
	fields.forEach((field) => {
		if (field.extendedType === 'guid') {
			extendedData[field.name] = generateUUID();
		}
	});
	return extendedData;
}

function generateUUID() {
	let array = new Uint8Array(16);
	crypto.getRandomValues(array);
	array[6] = (array[6] & 0x0f) | 0x40;
	array[8] = (array[8] & 0x3f) | 0x80;
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

async function renderHTML(renderType, tableName, fields, data, env) {
	if (renderType === 'table') {
		return renderTable(fields, data, tableName, env);
	}

	if (['formedit', 'formadd'].includes(renderType)) {
		const formData = renderType === 'formedit' ? data : {};
		return renderForm(renderType, tableName, fields, formData, env);
	}

	return `<div>Unsupported render type: ${renderType}</div>`;
}

function renderTable(fields, data, tableName, env) {
	const rows = data.results; // Access the results array from data
	const headers = fields.map((field) => `<th class="px-4 py-2">${field.name}</th>`).join('');
	const bodyRows = rows
		.map(
			(row) => `
            <tr>
                ${fields.map((field) => `<td>${row[field.name]}</td>`).join('')}
                <td>
                    <a class="pure-button" href="/${tableName}/edit/?id=${row.id}">Edit</a>
                    <button class="pure-button" hx-delete="${env.API_URL}${tableName}/${row.id}" 
                                    hx-trigger='confirmed'
                                    hx-target="#responseText"
                                    hx-swap="innerHTML"
                                    onClick="Swal.fire({title: 'Delete Record',showCancelButton: true, text:'Do you want to continue?'}).then((result)=>{
                                        if(result.isConfirmed){
                                            htmx.trigger(this, 'confirmed');  
                                        } 
                                    })">
                                    Delete
                    </button>
                </td>
            </tr>
        `
		)
		.join('');
	return `
        <table class="pure-table">
            <thead>
                <tr>${headers}<th class="px-4 py-2">Action</th></tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
}

async function renderForm(renderType, tableName, fields, formData, env) {
	const formFields = await Promise.all(
		fields
			.filter((field) => !blackListFields.includes(field.name)) // Filter out fields in blacklist
			.map(async (field) => {
				let lookupData = [];
				if (field.inputType === 'select') {
					lookupData = await getLookupData(tableName, field);
				}

				if (lookupData.length > 0) {
					return renderSelectField(field, formData, lookupData);
				}
				console.log(field.name);
				console.log(formData);

				return renderInputField(field, formData, renderType);
			})
	);

	const formAction = renderType === 'formedit' ? 'hx-put' : 'hx-post';
	const formUrl = renderType === 'formedit' ? `${env.API_URL}${tableName}/${formData.id}` : `${env.API_URL}${tableName}/`;
	return `
        <form class="pure-form pure-form-stacked" ${formAction}="${formUrl}">
            ${formFields.join('')}
            <button type="submit" class="pure-button pure-button-primary">${renderType === 'formedit' ? 'Update' : 'Add'}</button>
        </form>
    `;
}

function renderInputField(field, formData, renderType) {
	const value = formData[field.name] || '';
	const disableAttr = (field.disableAdd && renderType === 'formadd') || (field.disableEdit && renderType === 'formedit') ? 'disabled' : '';
	return `
    <label for="${field.name}">${field.name}</label>
    <input type="${field.inputType}" id="${field.name}" name="${field.name}" value="${value}" ${disableAttr} />
  `;
}

function renderSelectField(field, formData, lookupData) {
	const options = lookupData
		.map((option) => {
			const selectedAttr = option.id === formData[field.name] ? 'selected' : '';
			return `<option value="${option.id}" ${selectedAttr}>${option.name}</option>`;
		})
		.join('');
	return `
    <label for="${field.name}">${field.name}</label>
    <select id="${field.name}" name="${field.name}">
      ${options}
    </select>
  `;
}

async function getLookupData(tableName, fieldName) {
	// Implement your logic to fetch lookup data for select fields
	// This function should return an array of objects with 'id' and 'name' properties
	return [
		{ id: 1, name: 'Option 1' },
		{ id: 2, name: 'Option 2' },
	];
}

async function executeQuery(db, query, returnOne = false, debug = false) {
	try {
		const stmt = db.prepare(query);
		let data;

		if (returnOne == false) data = await stmt.all();
		else data = await stmt.first();

		if (debug == true) {
			console.log(returnOne);
			console.log(query);
			console.log(data);
		}
		return data;
	} catch (error) {
		console.error('Error executing query:', error);
		throw error;
	}
}

function sendResponse(body, status = 200, contentType = 'text/html') {
	if (contentType == 'application/json') body = JSON.stringify(body);
	const headers = {
		'Content-Type': contentType,
		'Access-Control-Allow-Origin': '*',
	};

	return new Response(body, {
		status,
		headers,
	});
}
