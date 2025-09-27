<script lang="ts">
	import type { PageProps } from './$types';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte/composed';
	import { Check, Funnel, FunnelX, Search, SearchX, UsersRound, X } from '@lucide/svelte';

	let { data }: PageProps = $props();
	const users = $derived(data.users);
	const countUser: number = $derived(users.length);
</script>

<svelte:head>
	<title>Users</title>
</svelte:head>

<article class="">
	<header class="flex flex-row-reverse items-center gap-4">
		<h2 class="flex items-center justify-end gap-2 h4">
			<UsersRound />
			<span>Users</span>
		</h2>
		<label class="label flex items-center gap-1">
			<input class="input w-fit" type="search" name="search" />
			<Search size="20" />
			<SearchX size="20" />
			<Funnel size="20" />
			<FunnelX size="20" />
		</label>
	</header>

	<div class="my-2 table-wrap border-[.1em] border-surface-300-700 p-4">
		<table class="table table-auto caption-bottom sm:table-fixed">
			<thead>
				<tr>
					<th>avatar</th>
					<th>username</th>
					<th>role</th>
					<th>active</th>
					<th>registred</th>
				</tr>
			</thead>
			<tbody class="[&>tr]:hover:preset-tonal-primary">
				{#each users as user (user.id)}
					<tr class="relative">
						<td>
							<Avatar class="h-10 w-10 text-xs">
								<Avatar.Image src={user.profile?.avatar} />
								<Avatar.Fallback
									>{user.profile?.firstName?.at(0)}{user.profile?.lastName?.at(0)}</Avatar.Fallback
								>
							</Avatar>
							<a
								class="absolute top-0 left-0 h-full w-full"
								href="/users/{user.username}"
								aria-label="anchor"
							></a>
						</td>
						<td>
							<span class="opacity-80">
								{user.username}
							</span>
						</td>
						<td class="lowercase">
							<span
								class:text-success-300-700={user.role === 'USER'}
								class:text-warning-300-700={user.role === 'REDACTEUR'}
								class:text-error-300-700={user.role === 'ADMIN'}
							>
								{user.role}
							</span>
						</td>
						<td>
							<Switch
								checked={user.active}
								controlWidth="w-6"
								controlActive="preset-filled-primary-300-700"
								compact
							>
								{#snippet inactiveChild()}<X size="14" />{/snippet}
								{#snippet activeChild()}<Check size="14" />{/snippet}
							</Switch>
						</td>
						<td><span class="code">{user.createdAt.toLocaleDateString()}</span></td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="3"></td>
					<td>Total:</td>
					<td class="text-right"
						><span class="code">{countUser}</span> User{countUser === 1 ? '' : 's'}</td
					>
				</tr>
			</tfoot>
		</table>
	</div>
</article>
