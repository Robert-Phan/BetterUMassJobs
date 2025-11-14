<script lang="ts">
	import { onMount } from 'svelte';
	import { processTable, type HoursPerWeek } from './processTable';
	import { processDetails, type JobPosting } from './processDetails';
	import { format } from 'date-fns';

	const PROXY_URL = 'https://get-job-board.fannk987.workers.dev/';

	async function getJobBoardDoc() {
		const res = await fetch(PROXY_URL);
		const htmlText = await res.text();

		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlText, 'text/html');
		return doc;
	}

	function chunkArray<T>(arr: T[], n: number) {
		const result: T[][] = [];
		for (let i = 0; i < arr.length; i += n) {
			result.push(arr.slice(i, i + n));
		}
		return result;
	}

	async function getDetailsDocs(jobIds: string[]) {
		const idToDetailsDoc: {
			[n: string]: Document;
		} = {};

		const parser = new DOMParser();
		let jobIdSubArrays = chunkArray(jobIds, 40);

		await Promise.all(
			jobIdSubArrays.map(async (idSubArr) => {
				const jobIdsStr = idSubArr.map((n) => n.toString()).join(',');

				const res = await fetch(PROXY_URL + `?jobIds=${jobIdsStr}`);
				const idToDetailsText = await res.json();

				for (let id in idToDetailsText) {
					const detailsText = idToDetailsText[id];
					const doc = parser.parseFromString(detailsText, 'text/html');

					idToDetailsDoc[id] = doc;
				}
			})
		);

		return idToDetailsDoc;
	}

	const jobPostings: JobPosting[] = $state([]);
    
	onMount(async () => {
        const boardDoc = await getJobBoardDoc();
    
        const tableRecords = processTable(boardDoc);
    
        const jobIds = tableRecords.map((rec) => rec.id);
    
        const idToDetailsDoc = await getDetailsDocs(jobIds);

		for (let rec of tableRecords) {
			let detailsDoc = idToDetailsDoc[rec.id];

			if (detailsDoc) {
				const details = processDetails(detailsDoc);
				jobPostings.push({ ...rec, ...details });
			}
		}
	});

    
	let open = $state(new Array<string>());
	const COLS = 7;

    function has(id: string) {
        return open.indexOf(id) !== -1
    }

	function toggle(id: string) {
		if (has(id)) 
            open = open.filter(i => i !== id);
		else 
            open.push(id);
	}

    $inspect(open);

	function formatDate(d: Date) {
		return format(d, 'MM/dd/yyyy');
	}

	function formatWorkStudy(v: boolean | 'E'): string {
		if (v === 'E') return 'Either';
		return v ? 'Yes' : 'No';
	}

	function formatHours(h: HoursPerWeek): string {
		if (Array.isArray(h)) {
			const [a, b] = h;
			return `${a}-${b}`;
		}

		return `${h}`;
	}

	function formatOnCampus(p: JobPosting): string {
		return p.onCampus ? 'Yes' : 'No';
	}

	function formatAddress(p: JobPosting): string | null {
		const parts = [p.streetAddress, [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean);
		return parts.length ? parts.join(' · ') : null;
	}
</script>

<table class="jobs">
	<thead>
		<tr class="column">
			<th class="col-expand" aria-hidden="true"></th>
			<th>Job ID</th>
			<th>Posting Date</th>
			<th>Title</th>
			<th>Work-Study?</th>
			<th>On Campus?</th>
			<th>Hiring Period</th>
		</tr>
	</thead>
	<tbody>
		{#each jobPostings as p}
			<tr class="row">
				<td class="col-expand">
					<button
						class="expandBtn"
						aria-expanded={has(p.id)}
						aria-controls={'details-' + p.id}
						onclick={() => toggle(p.id)}
					>
						<span class="chev" aria-hidden="true">{has(p.id) ? '▾' : '▸'}</span>
						<span class="visually-hidden">Toggle details</span>
					</button>
				</td>
				<td class="mono">{p.id}</td>
				<td>{formatDate(p.date)}</td>
				<td class="title">{p.title}</td>
				<td>{formatWorkStudy(p.workStudy)}</td>
				<td>{formatOnCampus(p)}</td>
				<td class="mono">{p.hiringPeriod}</td>
			</tr>

			{#if has(p.id)}
				<tr class="details-row">
					<td class="details-cell" colspan={COLS} id={'details-' + p.id}>
						<div class="details">
							<section class="top">
								<div class="compensation card">
									<h4>Compensation & Hours</h4>
									<div class="item">
										<span class="label">Hourly Rate</span>
										<span>${p.hourlyPayRate}</span>
									</div>
									<div class="item">
										<span class="label">Hours/Week</span>
										<span>{formatHours(p.hoursPerWeek)}</span>
									</div>
								</div>
								<div class="contact card">
									<h4>Contact & Application</h4>
									<div class="item">
										<span class="label">Contact</span>
										<span>{p.contact}</span>
									</div>
									<div class="item">
										<span class="label">Email</span>
										<span><a href={'mailto:' + p.contactEmail}>{p.contactEmail}</a></span>
									</div>
									{#if p.contactPhone}
										<div class="item">
											<span class="label">Phone</span>
											<span><a href={'tel:' + p.contactPhone}>{p.contactPhone}</a></span>
										</div>
									{/if}
									{#if formatAddress(p)}
										<div class="item">
											<span class="label">Address</span>
											<span>{formatAddress(p)}</span>
										</div>
									{/if}
									{#if p.website}
										<div class="item">
											<span class="label">Website</span>
											<span
												><a href={p.website} target="_blank" rel="noopener noreferrer"
													>{p.website}</a
												></span
											>
										</div>
									{/if}
									<div class="item">
										<span class="label">How to Apply</span>
										<span class="howto">{p.howToApply}</span>
									</div>
								</div>
							</section>
							<section class="desc card">
								<h4>Description</h4>
								<p>{p.description}</p>
							</section>
							<!-- Bottom flags -->
							<section class="meta">
								<div class="flag">
									<span class="dot" class:on={p.onBusRoute}></span>
									<span>On Bus Route: <strong>{p.onBusRoute ? 'Yes' : 'No'}</strong></span>
								</div>
								{#if p.departmentInfo}
									<div class="flag">
										<span>Department: <strong>{p.departmentInfo}</strong></span>
									</div>
								{/if}
							</section>
						</div>
					</td>
				</tr>
			{/if}
		{/each}
	</tbody>
</table>

<style>
	:root {
		--bg: #fff;
		--text: #1a1a1a;
		--muted: #6b7280;
		--border: #e5e7eb;
		--accent: #0f766e;
		--accent-weak: #ccfbf1;
	}

	.visually-hidden {
		position: absolute !important;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	table.jobs {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: var(--bg);
		color: var(--text);
		font-size: 0.95rem;
	}

	thead th {
		text-align: left;
		font-weight: 600;
		padding: 0.75rem 0.75rem;
		background: #f9fafb;
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.col-expand {
		width: 2.5rem;
	}

	tbody tr.row td {
		padding: 0.75rem 0.75rem;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
		background: white;
	}

	tbody tr.row:hover td {
		background: #fcfdfd;
	}

	td.title {
		font-weight: 600;
	}

	td.mono {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
		letter-spacing: 0.02em;
	}

	.expandBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: #fff;
		cursor: pointer;
		transition:
			background 120ms,
			border-color 120ms;
	}
	.expandBtn:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}
	.expandBtn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.chev {
		font-size: 0.9rem;
	}

	/* Details row */
	tr.details-row td.details-cell {
		padding: 0;
		background: #f8fafa;
		border-bottom: 1px solid var(--border);
	}

	.details {
		padding: 1rem 1rem 1.25rem;
		display: grid;
		gap: 1rem;
	}

	.top {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.card {
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.75rem 0.9rem;
	}

	.card h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.item {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: 0.5rem;
		padding: 0.35rem 0;
		align-items: start;
	}

	.item .label {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.item .howto {
		white-space: pre-wrap;
	}

	.desc p {
		margin: 0.25rem 0 0 0;
		line-height: 1.55;
        white-space: pre-line; 
	}

	.meta {
		display: flex;
		gap: 1.25rem;
		align-items: center;
		padding: 0.25rem 0.25rem 0 0.25rem;
		color: #111827;
	}

	.flag {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #e5e7eb;
	}
	.dot.on {
		background: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-weak);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.top {
			grid-template-columns: 1fr;
		}
		.item {
			grid-template-columns: 7.5rem 1fr;
		}
		thead th:nth-child(6),
		tbody td:nth-child(6) {
			display: none;
		} /* hide Location on smaller screens */
	}
</style>
