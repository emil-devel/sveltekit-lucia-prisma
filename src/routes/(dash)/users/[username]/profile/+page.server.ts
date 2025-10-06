import type { Actions, PageServerLoad } from './$types';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { isAdmin, isSelf } from '$lib/permissions';
import { fail, superValidate } from 'sveltekit-superforms';
import prisma from '$lib/server/prisma';
import { valibot } from 'sveltekit-superforms/adapters';
import {
	profileAvatarSchema,
	profileFirstNameSchema,
	profileLastNameSchema,
	profilePhoneSchema,
	profileBioSchema
} from '$lib/valibot';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.authUser) throw redirect(302, '/login');
	const username = event.params.username;
	const row = await prisma.profile.findUnique({
		where: { name: username },
		select: {
			id: true,
			name: true,
			userId: true,
			avatar: true,
			firstName: true,
			lastName: true,
			phone: true,
			bio: true
		}
	});
	if (!row) throw redirect(302, '/users');
	const viewer = event.locals.authUser;
	if (!viewer || !(isAdmin(viewer) || isSelf(viewer.id, row.userId))) throw redirect(302, '/users');
	const profile = {
		...row,
		avatar: row.avatar ?? '',
		firstName: row.firstName ?? '',
		lastName: row.lastName ?? '',
		phone: row.phone ?? '',
		bio: row.bio ?? ''
	};
	const [avatarForm, firstNameForm, lastNameForm, phoneForm, bioForm] = await Promise.all([
		superValidate({ id: profile.id, avatar: profile.avatar }, valibot(profileAvatarSchema)),
		superValidate(
			{ id: profile.id, firstName: profile.firstName },
			valibot(profileFirstNameSchema)
		),
		superValidate({ id: profile.id, lastName: profile.lastName }, valibot(profileLastNameSchema)),
		superValidate({ id: profile.id, phone: profile.phone }, valibot(profilePhoneSchema)),
		superValidate({ id: profile.id, bio: profile.bio }, valibot(profileBioSchema))
	]);
	return {
		form: {
			id: profile.id,
			name: profile.name,
			userId: profile.userId,
			avatarForm,
			firstNameForm,
			lastNameForm,
			phoneForm,
			bioForm
		}
	};
};

export const actions: Actions = {
	avatar: async (event) => {
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const formData = await event.request.formData();
		const id = formData.get('id');
		if (typeof id !== 'string' || !id) {
			return setFlash({ type: 'error', message: 'Missing profile id.' }, event.cookies);
		}
		let base64: string | undefined;
		const avatarField = formData.get('avatar');
		if (avatarField instanceof File) {
			if (avatarField.size === 0) {
				return setFlash({ type: 'info', message: 'No avatar provided.' }, event.cookies);
			}
			const buffer = Buffer.from(await avatarField.arrayBuffer());
			const mime = avatarField.type || 'image/png';
			base64 = `data:${mime};base64,${buffer.toString('base64')}`;
		} else if (typeof avatarField === 'string' && avatarField.trim() !== '') {
			// fallback path if a base64 string is sent instead of a File
			base64 = avatarField.startsWith('data:image/')
				? avatarField
				: `data:image/png;base64,${avatarField}`;
		}
		if (!base64) {
			return setFlash({ type: 'info', message: 'No avatar provided.' }, event.cookies);
		}
		const avatarForm = await superValidate({ avatar: base64 }, valibot(profileAvatarSchema));
		if (!avatarForm.valid) {
			return setFlash({ type: 'error', message: 'Invalid avatar data.' }, event.cookies);
		}
		try {
			await prisma.profile.update({ where: { id }, data: { avatar: base64 } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash({ type: 'success', message: 'Avatar updated.' }, event.cookies);
	},
	firstName: async (event) => {
		const firstNameForm = await superValidate(event.request, valibot(profileFirstNameSchema));
		if (!firstNameForm.valid) return fail(400, { firstNameForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id, firstName } = firstNameForm.data;
		try {
			await prisma.profile.update({ where: { id }, data: { firstName } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash({ type: 'success', message: 'First name updated.' }, event.cookies);
	},
	lastName: async (event) => {
		const lastNameForm = await superValidate(event.request, valibot(profileLastNameSchema));
		if (!lastNameForm.valid) return fail(400, { lastNameForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id, lastName } = lastNameForm.data;
		try {
			await prisma.profile.update({ where: { id }, data: { lastName } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash({ type: 'success', message: 'Last name updated.' }, event.cookies);
	},
	phone: async (event) => {
		const phoneForm = await superValidate(event.request, valibot(profilePhoneSchema));
		if (!phoneForm.valid) return fail(400, { phoneForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id, phone } = phoneForm.data;
		try {
			await prisma.profile.update({ where: { id }, data: { phone } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash({ type: 'success', message: 'Phone updated.' }, event.cookies);
	},
	bio: async (event) => {
		const bioForm = await superValidate(event.request, valibot(profileBioSchema));
		if (!bioForm.valid) return fail(400, { bioForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id, bio } = bioForm.data;
		try {
			await prisma.profile.update({ where: { id }, data: { bio } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash({ type: 'success', message: 'Bio updated.' }, event.cookies);
	}
};
