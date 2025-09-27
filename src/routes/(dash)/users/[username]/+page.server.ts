import type { Actions, PageServerLoad } from './$types';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import prisma from '$lib/server/prisma';
import { isAdmin, isSelf } from '$lib/permissions';
import { valibot } from 'sveltekit-superforms/adapters';
import {
	activeUserSchema,
	roleUserSchema,
	userNameSchema,
	userIdSchema,
	userEmailSchema
} from '$lib/valibot';

export const load = (async (event) => {
	if (!event.locals.authUser) throw redirect(302, '/login');

	const getUserForms = async (username: string) => {
		const user = await prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				active: true,
				role: true,
				username: true,
				email: true,
				updatedAt: true,
				createdAt: true,
				profile: { select: { id: true, avatar: true, firstName: true, lastName: true } }
			}
		});
		if (!user) throw redirect(302, '/users');
		if (!user.profile?.id) throw redirect(302, '/users'); // invariant: profile should exist

		const { updatedAt, createdAt } = user;
		const { avatar, firstName, lastName } = user.profile;
		const { id: userId, username: uName, email: uEmail, active: uActive, role: uRole } = user;

		const [usernameForm, emailForm, activeForm, roleForm, deleteForm] = await Promise.all([
			superValidate({ id: userId, username: uName }, valibot(userNameSchema)),
			superValidate({ id: userId, email: uEmail }, valibot(userEmailSchema)),
			superValidate({ id: userId, active: uActive }, valibot(activeUserSchema)),
			superValidate({ id: userId, role: uRole }, valibot(roleUserSchema)),
			superValidate({ id: userId }, valibot(userIdSchema))
		]);

		return {
			usernameForm,
			emailForm,
			activeForm,
			roleForm,
			deleteForm,
			updatedAt,
			createdAt,
			avatar,
			firstName,
			lastName
		};
	};

	return { form: await getUserForms(event.params.username) };
}) satisfies PageServerLoad;

export const actions: Actions = {
	username: async (event) => {
		const usernameForm = await superValidate(event.request, valibot(userNameSchema));
		const { id, username } = usernameForm.data;

		if (!usernameForm.valid) return fail(400, { usernameForm });

		// Authz: self or admin can change username
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		if (!(isAdmin(viewer) || isSelf(viewer.id, id))) {
			return setFlash({ type: 'error', message: 'Not authorized.' }, event.cookies);
		}

		const res = await prisma.user.findFirst({
			where: { username, NOT: { id } },
			select: { username: true }
		});
		if (username === res?.username)
			return setError(usernameForm, 'username', 'Username already exist!');

		try {
			await prisma.user.update({ where: { id }, data: { username } });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return setFlash({ type: 'error', message }, event.cookies);
		}

		redirect('/users', { type: 'success', message: 'Username updated.' }, event.cookies);
	},
	email: async (event) => {
		const emailForm = await superValidate(event.request, valibot(userEmailSchema));
		const { id, email } = emailForm.data;

		if (!emailForm.valid) return fail(400, { emailForm });

		// Authz: self or admin can change email
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		if (!(isAdmin(viewer) || isSelf(viewer.id, id))) {
			return setFlash({ type: 'error', message: 'Not authorized.' }, event.cookies);
		}

		const res = await prisma.user.findFirst({
			where: { email, NOT: { id } },
			select: { email: true }
		});
		if (email === res?.email) return setError(emailForm, 'email', 'Email already in use!');

		try {
			await prisma.user.update({ where: { id }, data: { email } });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return setFlash({ type: 'error', message }, event.cookies);
		}

		setFlash({ type: 'success', message: `Email updated.` }, event.cookies);
	},
	active: async (event) => {
		const activeForm = await superValidate(event.request, valibot(activeUserSchema));
		const { id, active } = activeForm.data;

		if (!activeForm.valid) return fail(400, { activeForm });

		// Authz: only admin can toggle active and cannot target self
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		if (!isAdmin(viewer) || isSelf(viewer.id, id)) {
			return setFlash({ type: 'error', message: 'Not authorized.' }, event.cookies);
		}

		try {
			await prisma.user.update({ where: { id }, data: { active } });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return setFlash({ type: 'error', message }, event.cookies);
		}

		setFlash({ type: 'success', message: `User updated.` }, event.cookies);
	},
	role: async (event) => {
		const roleForm = await superValidate(event.request, valibot(roleUserSchema));
		const { id, role } = roleForm.data;

		if (!roleForm.valid) return fail(400, { roleForm });

		// Authz: only admin can change role and cannot target self
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		if (!isAdmin(viewer) || isSelf(viewer.id, id)) {
			return setFlash({ type: 'error', message: 'Not authorized.' }, event.cookies);
		}

		try {
			await prisma.user.update({ where: { id }, data: { role } });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return setFlash({ type: 'error', message }, event.cookies);
		}

		setFlash({ type: 'success', message: `User updated.` }, event.cookies);
	},
	delete: async (event) => {
		const deleteForm = await superValidate(event.request, valibot(userIdSchema));
		const { id } = deleteForm.data;

		if (!deleteForm.valid) return fail(400, { deleteForm });

		// Authz: only admin can delete and cannot delete self
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		if (!isAdmin(viewer) || isSelf(viewer.id, id)) {
			return setFlash({ type: 'error', message: 'Not authorized.' }, event.cookies);
		}

		try {
			await prisma.user.delete({ where: { id } });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return setFlash({ type: 'error', message }, event.cookies);
		}

		redirect('/users', { type: 'success', message: 'User deleted!' }, event.cookies);
	}
};
