<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { superForm } from 'sveltekit-superforms';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { isSelf as isSelfUtil } from '$lib/permissions';
	import { valibot } from 'sveltekit-superforms/adapters';
	import {
		profileFirstNameSchema,
		profileLastNameSchema,
		profilePhoneSchema,
		profileBioSchema
	} from '$lib/valibot';
	import { ArrowBigLeft, Phone, UserRound, UserRoundPen } from '@lucide/svelte';
	const iconSize: number = 16;

	let { data }: PageProps = $props();

	// Destructure basic fields
	const { id, name, userId } = data;
	// Forms
	const { form: avatarForm } = superForm(data.avatarForm);
	const {
		enhance: firstNameEnhance,
		form: firstNameForm,
		errors: firstNameErrors
	} = superForm(data.firstNameForm, { validators: valibot(profileFirstNameSchema) });
	const {
		enhance: lastNameEnhance,
		form: lastNameForm,
		errors: lastNameErrors
	} = superForm(data.lastNameForm, { validators: valibot(profileLastNameSchema) });
	const {
		enhance: phoneEnhance,
		form: phoneForm,
		errors: phoneErrors
	} = superForm(data.phoneForm, { validators: valibot(profilePhoneSchema) });
	const { enhance: bioEnhance, form: bioForm } = superForm(data.bioForm, {
		validators: valibot(profileBioSchema),
		dataType: 'json'
	});

	const errorsFirstName = $derived(($firstNameErrors.firstName ?? []) as string[]);
	const errorsLastName = $derived(($lastNameErrors.lastName ?? []) as string[]);
	const errorsPhone = $derived(($phoneErrors.phone ?? []) as string[]);

	// Use helper-based permission check like on the username page
	const isSelf = $derived(isSelfUtil(page.data.authUser.id, userId));

	// Normalized phone for "tel: link" after passing the schema.
	const normalizedPhone = $derived.by(() => {
		let raw = $phoneForm.phone?.trim();
		if (!raw) return '';
		// Remove spaces
		let val = raw.replace(/\s+/g, '');
		// Convert 00 international prefix to +
		if (val.startsWith('00')) {
			val = '+' + val.slice(2);
		}
		return val;
	});

	// Tipex
	import { Tipex } from '@friendofsvelte/tipex';
	import AvatarUpload from '$lib/components/profile/AvatarUpload.svelte';

	// Initial HTML content from server form
	let body = $state($bioForm.bio ?? '');
	// Editor instance binding (use a permissive type to avoid tiptap version type mismatches)
	let editor = $state<any>();
	// Always up-to-date HTML extracted from the editor
	const htmlContent = $derived.by(() => editor?.getHTML() ?? body);

	// Keep superform field in sync so JSON submission includes latest HTML
	$effect(() => {
		if (editor) {
			const current = editor.getHTML();
			if (current !== $bioForm.bio) {
				$bioForm.bio = current;
			}
		}
	});
</script>

<svelte:head>
	<title>Users Profile: {name}</title>
	<meta name="description" content="Page Description" />
</svelte:head>

<section class="m-auto max-w-xl space-y-4">
	<div
		class="divide-y divide-surface-200-800 card border border-surface-200-800 preset-filled-surface-100-900"
	>
		<header
			class="flex flex-row-reverse items-center justify-between gap-4 preset-filled-secondary-300-700 p-4"
		>
			<h1 class="h4">
				{#if isSelf}
					<UserRoundPen size={32} />
				{:else}
					<UserRound size={32} />
				{/if}
				<span>{name}</span>
			</h1>
			<div class="mt-6 -mb-16 h-24 w-24 rounded-full border-6 border-secondary-300-700">
				<Avatar class="h-full w-full bg-surface-100-900">
					{#key $avatarForm.avatar}
						<Avatar.Image src={$avatarForm.avatar} />
					{/key}
					<Avatar.Fallback>
						{$firstNameForm.firstName?.at(0)}{$lastNameForm.lastName?.at(0)}
					</Avatar.Fallback>
				</Avatar>
			</div>
		</header>
		<article class="p-4 pb-8">
			<div class="space-y-8">
				<h2 class="py-4 text-right h6">
					<span>Profile</span>
				</h2>
				{#if isSelf}
					<AvatarUpload {id} {data} {iconSize} />
					<form method="post" action="?/firstName" use:firstNameEnhance>
						<input class="input" type="hidden" name="id" value={id} />
						<label class="label label-text" for="firstName">First Name</label>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5">
								<UserRound size={iconSize} />
							</div>
							<input
								class="ig-input text-sm"
								type="text"
								name="firstName"
								bind:value={$firstNameForm.firstName}
								spellcheck="false"
							/>
							<button class="ig-btn preset-tonal btn-sm" type="submit"> Submit </button>
						</div>
					</form>
					{#if errorsFirstName && $firstNameForm.firstName}
						<div class="mx-auto max-w-xs space-y-1.5 text-center text-sm" aria-live="polite">
							{#each errorsFirstName as message, i (i)}
								<p
									class="card preset-filled-error-300-700 p-2"
									transition:slide={{ duration: 140 }}
									animate:flip={{ duration: 160 }}
								>
									{message}
								</p>
							{/each}
						</div>
					{/if}
					<form method="post" action="?/lastName" use:lastNameEnhance>
						<input class="input" type="hidden" name="id" value={id} />
						<label class="label label-text" for="lastName">Last Name</label>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5">
								<UserRound size={iconSize} />
							</div>
							<input
								class="ig-input text-sm"
								type="text"
								name="lastName"
								bind:value={$lastNameForm.lastName}
								spellcheck="false"
							/>
							<button class="ig-btn preset-tonal btn-sm" type="submit"> Submit </button>
						</div>
					</form>
					{#if errorsLastName && $lastNameForm.lastName}
						<div class="mx-auto max-w-xs space-y-1.5 text-center text-sm" aria-live="polite">
							{#each errorsLastName as message, i (i)}
								<p
									class="card preset-filled-error-300-700 p-2"
									transition:slide={{ duration: 140 }}
									animate:flip={{ duration: 160 }}
								>
									{message}
								</p>
							{/each}
						</div>
					{/if}
					<form method="post" action="?/phone" use:phoneEnhance>
						<input class="input" type="hidden" name="id" value={id} />
						<label class="label label-text" for="phone">Phone</label>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5">
								<Phone size={iconSize} />
							</div>
							<input
								class="ig-input text-sm"
								type="tel"
								name="phone"
								bind:value={$phoneForm.phone}
								spellcheck="false"
							/>
							<button class="ig-btn preset-tonal btn-sm" type="submit"> Submit </button>
						</div>
					</form>
					{#if errorsPhone && $phoneForm.phone}
						<div class="mx-auto max-w-xs space-y-1.5 text-center text-sm" aria-live="polite">
							{#each errorsPhone as message, i (i)}
								<p
									class="card preset-filled-error-300-700 p-2"
									transition:slide={{ duration: 140 }}
									animate:flip={{ duration: 160 }}
								>
									{message}
								</p>
							{/each}
						</div>
					{/if}
				{:else}
					<div>
						<p class="label-text">First Name</p>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5"><UserRound size={iconSize} /></div>
							<span class="ig-input text-sm">{$firstNameForm.firstName}</span>
						</div>
					</div>
					<div>
						<p class="label-text">Last Name</p>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5"><UserRound size={iconSize} /></div>
							<span class="ig-input text-sm">{$lastNameForm.lastName}</span>
						</div>
					</div>
					<div>
						<p class="label-text">Phone</p>
						<div class="input-group grid-cols-[auto_1fr_auto]">
							<div class="ig-cell preset-tonal py-1.5"><Phone size={iconSize} /></div>
							<span class="ig-input text-sm">
								{#if normalizedPhone}
									<a href={'tel:' + normalizedPhone}>{$phoneForm.phone}</a>
								{:else}
									{$phoneForm.phone}
								{/if}
							</span>
						</div>
					</div>
				{/if}
				<div class="py-4">
					{#if isSelf}
						<form
							class="flex items-baseline justify-between gap-4 pb-1"
							method="post"
							action="?/bio"
							use:bioEnhance
						>
							<input class="input" type="hidden" name="id" value={id} />
							<label class="label" for="id"><span class="label-text">Bio</span></label>
							<!-- bio value provided via superforms JSON (kept in sync in script) -->
							<button class="btn preset-tonal btn-sm" type="submit"> Submit </button>
						</form>
						<div class="pb-4">
							<Tipex
								body={$bioForm.bio}
								bind:tipex={editor}
								floating
								focal
								class="h-[40vh] border border-surface-200-800"
							/>
						</div>
					{:else}
						<h3 class="label-text">Bio</h3>
						<div class="prose border border-surface-200-800 p-2 prose-invert">
							{@html htmlContent}
						</div>
					{/if}
				</div>
			</div>
		</article>
		<footer class="mt-4 flex flex-row-reverse items-center justify-between gap-4 px-4 pb-4">
			<small class="opacity-60">Footer</small>
		</footer>
	</div>
	<div class="mt-8 flex items-center justify-between gap-4 border-t border-surface-200-800 p-2">
		<a class="btn preset-tonal btn-sm" href="/users/{name}">
			<ArrowBigLeft size={iconSize} />
			{name}
		</a>
	</div>
</section>
