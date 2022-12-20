'use strict';

import _ from 'lodash';
import plugins from './plugins';
import db from './database';


const social = {} as any;

social.postSharing = null;

social.getPostSharing = async function () {
	if (social.postSharing) {
		return _.cloneDeep(social.postSharing);
	}

	let networks = [
		{
			id: 'facebook',
			name: 'Facebook',
			class: 'fa-facebook',
		},
		{
			id: 'twitter',
			name: 'Twitter',
			class: 'fa-twitter',
		},
	];
	networks = await plugins.hooks.fire('filter:social.posts', networks);
	const activated = await db.getSetMembers('social:posts.activated');
	networks.forEach((network: any) => {
		network.activated = activated.includes(network.id);
	});

	social.postSharing = networks;
	return _.cloneDeep(networks);
};

social.getActivePostSharing = async function () {
	const networks = await social.getPostSharing();
	return networks.filter(network => network && network.activated);
};

social.setActivePostSharingNetworks = async function (networkIDs) {
	social.postSharing = null;
	await db.delete('social:posts.activated');
	if (!networkIDs.length) {
		return;
	}
	await db.setAdd('social:posts.activated', networkIDs);
};

import promisify from './promisify';
promisify(social);

export default social;