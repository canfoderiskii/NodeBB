'use strict';

import rewardsAdmin from '../../rewards/admin';

const SocketRewards  = {} as any;

SocketRewards.save = async function (socket, data) {
	return await rewardsAdmin.save(data);
};

SocketRewards.delete = async function (socket, data) {
	await rewardsAdmin.delete(data);
};

export default SocketRewards;