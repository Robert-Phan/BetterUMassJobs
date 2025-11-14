import type { PageLoad } from './$types';
import { processTable } from './processTable';
import { processDetails, type JobPosting } from './processDetails';

const PROXY_URL = 'https://get-job-board.fannk987.workers.dev/';

const chunkArray = <T>(arr: T[], size: number) => {
	const result: T[][] = [];

	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}

	return result;
};

const getJobBoardDoc = async (fetchFn: typeof fetch) => {
	const res = await fetchFn(PROXY_URL);
	const htmlText = await res.text();

	const parser = new DOMParser();
	return parser.parseFromString(htmlText, 'text/html');
};

const getDetailsDocs = async (fetchFn: typeof fetch, jobIds: string[]) => {
	const idToDetailsDoc: Record<string, Document> = {};
	const parser = new DOMParser();
	const jobIdBatches = chunkArray(jobIds, 40);

	await Promise.all(
		jobIdBatches.map(async (batch) => {
			const jobIdsStr = batch.join(',');
			const res = await fetchFn(`${PROXY_URL}?jobIds=${jobIdsStr}`);
			const idToDetailsText = await res.json();

			for (const id in idToDetailsText) {
				const detailsText = idToDetailsText[id];
				idToDetailsDoc[id] = parser.parseFromString(detailsText, 'text/html');
			}
		})
	);

	return idToDetailsDoc;
};

const loadJobPostings = async (fetchFn: typeof fetch) => {
	const boardDoc = await getJobBoardDoc(fetchFn);
	const tableRecords = processTable(boardDoc);
	const jobIds = tableRecords.map((rec) => rec.id);
	const idToDetailsDoc = await getDetailsDocs(fetchFn, jobIds);
	const jobPostings: JobPosting[] = [];

	for (const rec of tableRecords) {
		const detailsDoc = idToDetailsDoc[rec.id];

		if (detailsDoc) {
			const details = processDetails(detailsDoc);
			jobPostings.push({ ...rec, ...details });
		}
	}

	return jobPostings;
};

export const ssr = false;

export const load: PageLoad = async ({ fetch }) => {
	const jobPostings = await loadJobPostings(fetch);

	return {
		jobPostings
	};
};
