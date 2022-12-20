'use strict';

import winston from 'winston';
import validator from 'validator';
import slugify from '../slugify';
import meta from '../meta';

const helpers = {} as any;

helpers.try = function (middleware) {
	if (middleware && middleware.constructor && middleware.constructor.name === 'AsyncFunction') {
		return async function (req, res, next) {
			try {
				await middleware(req, res, next);
			} catch (err: any) {
				next(err);
			}
		};
	}
	return function (req, res, next) {
		try {
			middleware(req, res, next);
		} catch (err: any) {
			next(err);
		}
	};
};

helpers.buildBodyClass = function (req, res, templateData = {} as any) {
	const clean = req.path.replace(/^\/api/, '').replace(/^\/|\/$/g, '');
	const parts = clean.split('/').slice(0, 3);
	parts.forEach((p, index) => {
		try {
			p = slugify(decodeURIComponent(p));
		} catch (err: any) {
			winston.error(`Error decoding URI: ${p}`);
			winston.error(err.stack);
			p = '';
		}
		p = validator.escape(String(p));
		parts[index] = index ? `${parts[0]}-${p}` : `page-${p || 'home'}`;
	});

	if (templateData.template && templateData.template.topic) {
		parts.push(`page-topic-category-${templateData.category.cid}`);
		parts.push(`page-topic-category-${slugify(templateData.category.name)}`);
	}

	if (Array.isArray(templateData.breadcrumbs)) {
		templateData.breadcrumbs.forEach((crumb) => {
			if (crumb && crumb.hasOwnProperty('cid')) {
				parts.push(`parent-category-${crumb.cid}`);
			}
		});
	}

	parts.push(`page-status-${res.statusCode}`);

	parts.push(`theme-${meta.config['theme:id'].split('-')[2]}`);

	if (req.loggedIn) {
		parts.push('user-loggedin');
	} else {
		parts.push('user-guest');
	}
	return parts.join(' ');
};

export default helpers;
