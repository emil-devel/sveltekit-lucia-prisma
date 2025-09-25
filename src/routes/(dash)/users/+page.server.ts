import type { PageServerLoad } from './$types';
import { redirect } from 'sveltekit-flash-message/server';
import prisma from '$lib/server/prisma';

export const load = (async (event) => {
	if (!event.locals.authUser) throw redirect(302, '/login');

	const getUsers = async () => {
		const users = prisma.user.findMany({
			select: {
				id: true,
				active: true,
				role: true,
				username: true,
				createdAt: true,
				profile: { select: { avatar: true } }
			},
			orderBy: { username: 'asc' }
		});

		return users;
	};

	return {
		users: await getUsers()
	};
}) satisfies PageServerLoad;
