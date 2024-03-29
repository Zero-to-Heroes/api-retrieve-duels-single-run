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
	const escape = SqlString.escape;
	const runId = event.requestContext?.http?.path?.length
		? event.requestContext.http.path.split('/')[1]
		: event.pathParameters?.proxy;

	const mysql = await getConnection();

	const lootQuery = `
			SELECT * FROM dungeon_run_loot_info
			WHERE runId = ${escape(runId)}
		`;
	const lootDbResults: readonly InternalLootInfo[] = await mysql.query(lootQuery);

	const gameStatsQuery = `
			SELECT t1.*, t1.runId as currentDuelsRunId FROM replay_summary t1
			WHERE runId = ${escape(runId)}
		`;
	const gameStatDbResults: readonly GameStatQueryResult[] = await mysql.query(gameStatsQuery);
	await mysql.end();

	const lootResults =
		!lootDbResults || lootDbResults.length === 0
			? []
			: lootDbResults.map(
					result =>
						({
							...result,
							creationTimestamp: Date.parse(result.creationDate),
							option1Contents: result.option1Contents ? result.option1Contents.split(',') : [],
							option2Contents: result.option2Contents ? result.option2Contents.split(',') : [],
							option3Contents: result.option3Contents ? result.option3Contents.split(',') : [],
						} as DuelsRunInfo),
			  );

	const gameStatResults =
		!gameStatDbResults || gameStatDbResults.length === 0
			? []
			: gameStatDbResults.map(result => ({
					...result,
					creationTimestamp: Date.parse(result.creationDate),
			  }));

	const results: (GameStatQueryResult | DuelsRunInfo)[] = [...lootResults, ...gameStatResults].sort(
		(a, b) => a.creationTimestamp - b.creationTimestamp,
	);

	const stringResults = JSON.stringify({ results: results });
	const gzippedResults = gzipSync(stringResults).toString('base64');
	const response = {
		statusCode: 200,
		isBase64Encoded: true,
		body: gzippedResults,
		headers: {
			'Content-Type': 'text/html',
			'Content-Encoding': 'gzip',
		},
	};
	return response;
};

interface InternalLootInfo {
	id: number;
	adventureType: 'duels' | 'paid-duels';
	creationDate: string;
	userId: string;
	userName: string;
	reviewId: string;
	runId: string;
	bundleType: string;
	option1: string;
	option1Contents: string;
	option2: string;
	option2Contents: string;
	option3: string;
	option3Contents: string;
	chosenOptionIndex: number;
	wins: number;
	losses: number;
	rating: number;
}

interface InternalGameStatInfo {
	id: number;
	coinPlay: 'coin' | 'play';
	opponentClass: number;
	opponentDecklist: string;
	opponentName: string;
	opponentRank: string;
	playerClass: string;
	playerDecklist: string;
	playerName: string;
	playerRank: string;
	newPlayerRank: string;
	result: 'won' | 'lost' | 'tied';
	reviewId: string;
	gameMode: string;
	creationDate: string;
	userId: string;
	userName: string;
	gameFormat: string;
	opponentCardId: string;
	playerCardId: string;
	uploaderToken: string;
	buildNumber: number;
	playerDeckName: string;
	scenarioId: number;
	additionalResult: string;
	replayKey: string;
	application: string;
}

interface InternalGameStatSecondaryInfo {
	id: number;
	reviewId: string;
	bgsAvailableTribes: string;
	bgsBannedTribes: string;
	bgsHeroPickChoice: string;
	bgsHeroPickOption: string;
	duelsRunId: string;
	normalizedXpGain: number;
	totalDurationSeconds: number;
	totalDurationTurns: number;
	xpBonus: number;
}

interface GameStatQueryResult extends InternalGameStatInfo {
	currentDuelsRunId: string;
	creationTimestamp: number;
}
