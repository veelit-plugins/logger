import { Logger } from '@veelit/logger';
import * as uuid from 'uuid';

const test = async () => {
	const logger = new Logger({ app: 'veelit' });
	const log = logger.create();

	// perform some logging
	log.info('Hello world', {
		tracingId: uuid.v4(),
		service: 'cache',
		category: 'general',
	});
	log.info(
		{
			charges: 0,
			type: 'balance',
			account: '016101900320',
		},
		{ tracingId: uuid.v4(), service: 'cache', category: 'transactions' }
	);
	log.info(
		{
			meta: {
				requestedAt: '2021-06-30 09:09:03:161',
				respondedAt: '2021-06-30 09:09:03:950',
				latency: 789,
			},
			request: {
				headers: { 'Content-Type': 'application/json' },
				method: 'post',
				url: 'https://jsonplaceholder.typicode.com/todos',
				data: {
					userId: 1,
					id: 'ABC',
					title: 'Another Todo',
					completed: false,
				},
			},
			response: {
				status: 201,
				statusText: 'Created',
				headers: 'application/json; charset=utf-8',
				data: {
					userId: 1,
					id: 201,
					title: 'Another Todo',
					completed: false,
					transformRequest: true,
					transformResponse: true,
				},
			},
		},
		{ tracingId: uuid.v4(), service: 'cache', category: 'api' }
	);
	log.error('error message', {
		tracingId: uuid.v4(),
		service: 'cache',
		category: 'general',
	});
	log.warn('error message', {
		tracingId: uuid.v4(),
		service: 'cache',
		category: 'general',
	});

	const aggregated = await logger.getLogs({ app: 'veelit' });
	// console.log(aggregated);
};
test();
