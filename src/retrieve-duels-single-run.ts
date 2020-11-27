/* eslint-disable @typescript-eslint/no-use-before-define */
import SqlString from 'sqlstring';
import { gzipSync } from 'zlib';
import { getConnection } from './db/rds';
import { DuelsRunInfo } from './duels-run-info';

// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.
// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	const headers = {
		'Access-Control-Allow-Headers':
			'Accept,Accept-Language,Content-Language,Content-Type,Authorization,x-correlation-id,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
		'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
		'Access-Control-Allow-Origin': event.headers?.Origin || event.headers?.origin || '*',
	};
	try {
		console.log('processing event', event);
		const escape = SqlString.escape;
		const runId = event.pathParameters?.proxy;

		const mysql = await getConnection();

		const query = `
			SELECT * FROM dungeon_run_loot_info
			WHERE runId = ${escape(runId)}
		`;
		console.log('running query', query);
		const dbResults: readonly any[] = await mysql.query(query);
		console.log('executed query', dbResults && dbResults.length, dbResults && dbResults.length > 0 && dbResults[0]);
		await mysql.end();

		const results =
			!dbResults || dbResults.length === 0
				? []
				: dbResults.map(
						result =>
							({
								...result,
								creationTimestamp: Date.parse(result.creationDate),
								option1Contents: result.option1Contents ? result.option1Contents.split(',') : [],
								option2Contents: result.option2Contents ? result.option2Contents.split(',') : [],
								option3Contents: result.option3Contents ? result.option3Contents.split(',') : [],
							} as DuelsRunInfo),
				  );
		console.log('results', results);

		const stringResults = JSON.stringify({ results });
		const gzippedResults = gzipSync(stringResults).toString('base64');
		console.log('compressed', stringResults.length, gzippedResults.length);
		const response = {
			statusCode: 200,
			isBase64Encoded: true,
			body: gzippedResults,
			headers: {
				'Content-Type': 'text/html',
				'Content-Encoding': 'gzip',
			},
		};
		console.log('sending back success reponse');
		return response;
	} catch (e) {
		console.error('issue getting runs info', e);
		const response = {
			statusCode: 500,
			isBase64Encoded: false,
			body: null,
			headers: headers,
		};
		console.log('sending back error reponse', response);
		return response;
	}
};
