<script lang="ts">
	import { format } from 'date-fns';
	import type { PageProps } from './$types';
	import type { HoursPerWeek } from './processTable';
	import type { JobPosting } from './processDetails';

	let { data }: PageProps = $props();
	const jobPostingsPromise: Promise<JobPosting[]> = data.jobPostingsPromise;
	let jobPostings = $state([] as JobPosting[]);

	jobPostingsPromise.then((value) => {
		jobPostings = value;
	});

	type WorkStudyFilter = 'all' | 'yes' | 'no' | 'either';
	type BooleanFilter = 'all' | 'yes' | 'no';

	let workStudyFilter = $state('all' as WorkStudyFilter);
	let onCampusFilter = $state('all' as BooleanFilter);
	let onBusRouteFilter = $state('all' as BooleanFilter);
	let hiringPeriodFilter = $state('all');
	let jobTitleSelectValue = $state('all');
	let selectedJobTitles = $state<string[]>([]);
	let citySelectValue = $state('all');
	let selectedCities = $state<string[]>([]);
	let hoursMinInput = $state<number | null>(null);
	let hoursMaxInput = $state<number | null>(null);
	let payMinInput = $state<number | null>(null);
	let payMaxInput = $state<number | null>(null);
	let descriptionSearch = $state('');

	function uniqueSorted(values: Array<string | null | undefined>): string[] {
		const seen: Record<string, true> = {};
		const unique: string[] = [];
		for (const value of values) {
			if (!value) continue;
			const trimmed = value.trim();
			if (!trimmed) continue;
			if (seen[trimmed]) continue;
			seen[trimmed] = true;
			unique.push(trimmed);
		}
		return unique.sort((a, b) => a.localeCompare(b));
	}

	function getHoursRange(hours: HoursPerWeek): [number, number] {
		if (Array.isArray(hours)) {
			const [min, max] = hours[0] <= hours[1] ? hours : [hours[1], hours[0]];
			return [min, max];
		}
		return [hours, hours];
	}

	function normalizeNumber(value: number | null): number | null {
		if (value === null) return null;
		return Number.isFinite(value) ? value : null;
	}

	function getNormalizedRange(minInput: number | null, maxInput: number | null) {
		const minValue = normalizeNumber(minInput);
		const maxValue = normalizeNumber(maxInput);

		if (minValue !== null && maxValue !== null && minValue > maxValue) {
			return { min: maxValue, max: minValue };
		}

		return { min: minValue, max: maxValue };
	}

	let open = $state(new Array<string>());
	const COLS = 7;

	const hiringPeriodOptions = $derived(uniqueSorted(jobPostings.map((p) => p.hiringPeriod)));
	const jobTitleOptions = $derived(uniqueSorted(jobPostings.map((p) => p.title)));
	const cityOptions = $derived(uniqueSorted(jobPostings.map((p) => p.city)));
	const normalizedHoursRange = $derived(getNormalizedRange(hoursMinInput, hoursMaxInput));
	const normalizedPayRange = $derived(getNormalizedRange(payMinInput, payMaxInput));
	const searchWords = $derived(
		descriptionSearch
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((word) => word.length)
	);
	const filteredPostings = $derived(
		jobPostings.filter((p) => {
			if (workStudyFilter === 'yes' && p.workStudy !== true) return false;
			if (workStudyFilter === 'no' && p.workStudy !== false) return false;
			if (workStudyFilter === 'either' && p.workStudy !== 'E') return false;

			if (onCampusFilter === 'yes' && !p.onCampus) return false;
			if (onCampusFilter === 'no' && p.onCampus) return false;

			if (onBusRouteFilter === 'yes' && !p.onBusRoute) return false;
			if (onBusRouteFilter === 'no' && p.onBusRoute) return false;

			if (hiringPeriodFilter !== 'all' && p.hiringPeriod !== hiringPeriodFilter) return false;
			const normalizedTitle = p.title.toLowerCase();
			const normalizedDescription = p.description.toLowerCase();
			const combinedText = `${normalizedTitle} ${normalizedDescription}`;
			const trimmedTitle = p.title.trim();
			// const hasSearch = searchWords.length > 0;
			// const titleMatchesSearch = hasSearch
			// 	? searchWords.every((word) => normalizedTitle.includes(word))
			// 	: false;
			// const textMatchesSearch = hasSearch ? searchWords.every((word) => combinedText.includes(word)) : true;
			if (selectedJobTitles.length && !selectedJobTitles.includes(trimmedTitle)) return false;
			if (selectedCities.length) {
				const postingCity = (p.city ?? '').trim();
				if (!selectedCities.includes(postingCity)) return false;
			}

			if (normalizedHoursRange.min !== null || normalizedHoursRange.max !== null) {
				const [jobMin, jobMax] = getHoursRange(p.hoursPerWeek);
				const userMin = normalizedHoursRange.min ?? Number.NEGATIVE_INFINITY;
				const userMax = normalizedHoursRange.max ?? Number.POSITIVE_INFINITY;
				const overlaps = jobMin <= userMax && jobMax >= userMin;
				if (!overlaps) return false;
			}

			if (normalizedPayRange.min !== null && p.hourlyPayRate < normalizedPayRange.min) {
				return false;
			}

			if (normalizedPayRange.max !== null && p.hourlyPayRate > normalizedPayRange.max) {
				return false;
			}

			if (searchWords.length && !searchWords.every((word) => combinedText.includes(word))) return false;

			return true;
		})
	);
	const filteredIds = $derived(filteredPostings.map((p) => p.id));
	const allExpanded = $derived(
		filteredIds.length > 0 && filteredIds.every((id) => open.indexOf(id) !== -1)
	);

	function toggleExpandAll() {
		if (!filteredIds.length) return;
		if (allExpanded) {
			open = open.filter((id) => !filteredIds.includes(id));
		} else {
			const merged = [...open];
			for (const id of filteredIds) {
				if (!merged.includes(id)) {
					merged.push(id);
				}
			}
			open = merged;
		}
	}

	function has(id: string) {
		return open.indexOf(id) !== -1;
	}

	function toggle(id: string) {
		if (has(id)) open = open.filter((i) => i !== id);
		else open.push(id);
	}

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

	function addJobTitleSelection(title: string) {
		const trimmed = title.trim();
		if (!trimmed) return;
		if (!selectedJobTitles.includes(trimmed)) {
			selectedJobTitles = [...selectedJobTitles, trimmed];
		}
	}

	function removeJobTitleSelection(title: string) {
		selectedJobTitles = selectedJobTitles.filter((t) => t !== title);
	}

	function handleJobTitleSelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;

		if (value === 'all') {
			selectedJobTitles = [];
			jobTitleSelectValue = 'all';
			return;
		}

		addJobTitleSelection(value);
		jobTitleSelectValue = 'all';
	}

	function addCitySelection(city: string) {
		const trimmed = city.trim();
		if (!trimmed) return;
		if (!selectedCities.includes(trimmed)) {
			selectedCities = [...selectedCities, trimmed];
		}
	}

	function removeCitySelection(city: string) {
		selectedCities = selectedCities.filter((c) => c !== city);
	}

	function handleCitySelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;

		if (value === 'all') {
			selectedCities = [];
			citySelectValue = 'all';
			return;
		}

		addCitySelection(value);
		citySelectValue = 'all';
	}
</script>

{#await jobPostingsPromise}
	<div class="loading-state" role="status" aria-live="polite">
		<span class="spinner" aria-hidden="true"></span>
		<span>Loading job data…</span>
	</div>
{:then}
<section class="filters-panel">
	<h2>Search & Filter</h2>
	<div class="filters-grid">
		<div class="filter">
			<label for="work-study-filter">Work-Study Status</label>
			<select id="work-study-filter" bind:value={workStudyFilter}>
				<option value="all">All statuses</option>
				<option value="yes">Work-study only</option>
				<option value="no">Non work-study</option>
				<option value="either">Either available</option>
			</select>
		</div>

		<div class="filter">
			<label for="on-campus-filter">On Campus</label>
			<select id="on-campus-filter" bind:value={onCampusFilter}>
				<option value="all">Any location</option>
				<option value="yes">On campus</option>
				<option value="no">Off campus</option>
			</select>
		</div>

		<div class="filter">
			<label for="bus-route-filter">On Bus Route</label>
			<select id="bus-route-filter" bind:value={onBusRouteFilter}>
				<option value="all">Either</option>
				<option value="yes">On a bus route</option>
				<option value="no">Not on a bus route</option>
			</select>
		</div>

		<div class="filter">
			<label for="hiring-period-filter">Hiring Period</label>
			<select id="hiring-period-filter" bind:value={hiringPeriodFilter}>
				<option value="all">All periods</option>
				{#each hiringPeriodOptions as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="title-filter">Job Title</label>
			<select id="title-filter" bind:value={jobTitleSelectValue} onchange={handleJobTitleSelect}>
				<option value="all">All titles</option>
				{#each jobTitleOptions as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="city-filter">City</label>
			<select id="city-filter" bind:value={citySelectValue} onchange={handleCitySelect}>
				<option value="all">All cities</option>
				{#each cityOptions as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<div class="filter">
			<label for="description-search">Title or Description Keywords</label>
			<input
				id="description-search"
				type="search"
				placeholder="Search titles or descriptions"
				bind:value={descriptionSearch}
			/>
		</div>

		<div class="filter range">
			<span class="filter-label">Hours per Week</span>
			<div class="range-inputs">
				<div>
					<label class="visually-hidden" for="hours-min">Minimum hours per week</label>
					<input
						id="hours-min"
						type="number"
						min="0"
						placeholder="Min"
						bind:value={hoursMinInput}
					/>
				</div>
				<span aria-hidden="true">to</span>
				<div>
					<label class="visually-hidden" for="hours-max">Maximum hours per week</label>
					<input
						id="hours-max"
						type="number"
						min="0"
						placeholder="Max"
						bind:value={hoursMaxInput}
					/>
				</div>
			</div>
		</div>

		<div class="filter range">
			<span class="filter-label">Hourly Pay ($)</span>
			<div class="range-inputs">
				<div>
					<label class="visually-hidden" for="pay-min">Minimum hourly pay</label>
					<input
						id="pay-min"
						type="number"
						min="0"
						placeholder="Min"
						bind:value={payMinInput}
					/>
				</div>
				<span aria-hidden="true">to</span>
				<div>
					<label class="visually-hidden" for="pay-max">Maximum hourly pay</label>
					<input
						id="pay-max"
						type="number"
						min="0"
						placeholder="Max"
						bind:value={payMaxInput}
					/>
				</div>
			</div>
		</div>
	</div>
	{#if selectedJobTitles.length || selectedCities.length}
		<div class="selected-filter-tags">
			{#if selectedJobTitles.length}
				<div class="tag-group">
					<span class="tags-label">Job Titles:</span>
					<div class="tags-list">
						{#each selectedJobTitles as title (title)}
							<span class="tag">
								<span>{title}</span>
								<button
									type="button"
									class="tag-remove"
									aria-label={`Remove ${title} job title filter`}
									onclick={() => removeJobTitleSelection(title)}
								>
									×
								</button>
							</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if selectedJobTitles.length && selectedCities.length}
				<span class="tags-separator" aria-hidden="true">|</span>
			{/if}
			{#if selectedCities.length}
				<div class="tag-group">
					<span class="tags-label">Cities:</span>
					<div class="tags-list">
						{#each selectedCities as city (city)}
							<span class="tag">
								<span>{city}</span>
								<button
									type="button"
									class="tag-remove"
									aria-label={`Remove ${city} city filter`}
									onclick={() => removeCitySelection(city)}
								>
									×
								</button>
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<div class="results-meta">
		<button class="expand-all-btn" type="button" onclick={toggleExpandAll} disabled={!filteredIds.length}>
			{allExpanded ? 'Collapse all' : 'Expand all'}
		</button>
		<span class="results-count">
			{filteredPostings.length}
			{filteredPostings.length === 1 ? 'job' : 'jobs'} found
		</span>
	</div>
</section>


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
		{#if filteredPostings.length === 0}
			<tr>
				<td class="empty-row" colspan={COLS}>No job postings match your filters.</td>
			</tr>
		{:else}
			{#each filteredPostings as p (p.id)}
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
											<span style="white-space: pre-wrap;">{p.howToApply}</span>
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
		{/if}
	</tbody>
</table>
{/await}

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

	.filters-panel {
		margin-bottom: 1.5rem;
		padding: 1.25rem;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.filters-panel h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.15rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 1rem;
	}

	.selected-filter-tags {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.tag-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.tags-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tags-separator {
		align-self: center;
		color: var(--border);
		font-weight: 600;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--accent-weak);
		border-radius: 999px;
		border: 1px solid rgba(15, 118, 110, 0.25);
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
		color: var(--text);
	}

	.tag-remove {
		border: none;
		background: transparent;
		color: var(--accent);
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}
	.tag-remove:hover,
	.tag-remove:focus-visible {
		color: #0c4a3e;
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.filter label,
	.filter .filter-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.filter select,
	.filter input {
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--text);
	}

	.filter input[type='number']::-webkit-outer-spin-button,
	.filter input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.range {
		gap: 0.4rem;
	}

	.range-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.range-inputs div {
		flex: 1;
		min-width: 0;
	}

	.range-inputs input {
		width: 100%;
		box-sizing: border-box;
	}

	.range-inputs span {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.results-meta {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: var(--muted);
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.results-count {
		color: var(--muted);
	}

	.expand-all-btn {
		padding: 0.4rem 0.85rem;
		border-radius: 20px;
		border: 1px solid var(--border);
		background: #f9fafb;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
		cursor: pointer;
		transition:
			background 120ms,
			border-color 120ms;
	}
	.expand-all-btn:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #d1d5db;
	}
	.expand-all-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-state {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: center;
		margin: 3rem 0;
		font-size: 1.1rem;
		color: var(--muted);
	}

	.spinner {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0turn);
		}
		to {
			transform: rotate(1turn);
		}
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

	.empty-row {
		text-align: center;
		padding: 1.75rem 0;
		color: var(--muted);
		font-size: 0.95rem;
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
