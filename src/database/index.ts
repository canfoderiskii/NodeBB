'use strict';

import nconf from 'nconf';
import * as winston from 'winston';
const databaseName = nconf.get('database') || 'mongo';


if (!databaseName) {
	winston.error(new Error('Database type not set! Run ./nodebb setup'));
	(process as any).exit();
}

const primaryDB = require(`./${databaseName}`).default;

primaryDB.parseIntFields = function (data, intFields, requestedFields) {
	intFields.forEach((field) => {
		if (!requestedFields || !requestedFields.length || requestedFields.includes(field)) {
			data[field] = parseInt(data[field], 10) || 0;
		}
	});
};

primaryDB.initSessionStore = async function () {
	const sessionStoreConfig = nconf.get('session_store') || nconf.get('redis') || nconf.get(databaseName);
	let sessionStoreDB = primaryDB;

	if (nconf.get('session_store')) {
		sessionStoreDB = require(`./${sessionStoreConfig.name}`).default;
	} else if (nconf.get('redis')) {
		// if redis is specified, use it as session store over others
		sessionStoreDB =  require('./redis');
	}

	primaryDB.sessionStore = await sessionStoreDB.createSessionStore(sessionStoreConfig);
};

export default primaryDB;
