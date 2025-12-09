import type { Actions, PageServerLoad } from './$types';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { hash } from '@node-rs/argon2';
import { fail } from 'sveltekit-superforms';
import { redirect } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { registerSchema } from '$lib/valibot';
import { valibot } from 'sveltekit-superforms/adapters';
import { setError } from 'sveltekit-superforms';
import prisma from '$lib/server/prisma';

export const load = (async (event) => {
	if (event.locals.authUser) throw redirect(302, '/');

	const form = await superValidate(valibot(registerSchema));
	return { form };
}) satisfies PageServerLoad;

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event.request, valibot(registerSchema));
		if (!form.valid) return fail(400, { form });
		
		const { username, email, password } = form.data;

		const userExist = await prisma.user.findFirst({ where: { username } });
		if (userExist) return setError(form, 'username', 'Username already exist!');

		// Check email uniqueness (previously incorrectly checked username twice)
		const emailExist = await prisma.user.findFirst({ where: { email } });
		if (emailExist) return setError(form, 'email', 'Email already in use!');

		const id = generateUserId();
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		const totalUsers = await prisma.user.count();
		const isFirstUser = totalUsers === 0;

		try {
			await prisma.$transaction(async (tx) => {
				await tx.user.create({
					data: isFirstUser
						? {
								id,
								username,
								email,
								passwordHash,
								role: 'ADMIN' as const,
								active: true as boolean
							}
						: { id, username, email, passwordHash }
				});

				// Separate create to avoid potential nested composite relation issue
				await tx.profile.create({ data: { userId: id, name: username } });
			});
		} catch (error) {
			console.error('Registration error:', error);
			// Always return the form for superforms on error
			return fail(500, {
				form,
				message: 'An error has occurred while creating the user! Please try again.',
				error: String(error)
			});
		}

		// Throw redirect with flash message; superforms will stop processing and navigation occurs
		throw redirect(
			302,
			'/login',
			{ type: 'success', message: 'You are now registered and can log in.' },
			event.cookies
		);
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}
