import type { Actions, PageServerLoad } from './$types';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { isAdmin, isSelf } from '$lib/permissions';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import prisma from '$lib/server/prisma';
import { valibot } from 'sveltekit-superforms/adapters';
import {
	profileAvatarSchema,
	profileFirstNameSchema,
	profileLastNameSchema,
	profilePhoneSchema,
	profileBioSchema,
	sanitizeFormData
} from '$lib/valibot';

export const load: PageServerLoad = (async (event) => {
	if (!event.locals.authUser) throw redirect(302, '/login');
	const getProfile = async (name: string) => {
		const profile = await prisma.profile.findUnique({
			where: { name },
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
		if (!profile) throw redirect(302, '/users');
		// View policy: Users may view only their own profile; Admins may view any profile
		const viewer = event.locals.authUser;
		if (!viewer || !(isAdmin(viewer) || isSelf(viewer.id, profile.userId)))
			throw redirect(302, '/users');
		// Create forms
		const [avatarForm, firstNameForm, lastNameForm, phoneForm, bioForm] = await Promise.all([
			superValidate(
				{ id: profile.id, avatar: profile.avatar as string | undefined },
				valibot(profileAvatarSchema)
			),
			superValidate(
				{ id: profile.id, firstName: profile.firstName as string | undefined },
				valibot(profileFirstNameSchema)
			),
			superValidate(
				{ id: profile.id, lastName: profile.lastName as string | undefined },
				valibot(profileLastNameSchema)
			),
			superValidate(
				{ id: profile.id, phone: profile.phone as string | undefined },
				valibot(profilePhoneSchema)
			),
			superValidate(
				{ id: profile.id, bio: profile.bio as string | undefined },
				valibot(profileBioSchema)
			)
		]);

		return {
			id: profile.id,
			name: profile.name,
			userId: profile.userId,
			avatarForm,
			firstNameForm,
			lastNameForm,
			phoneForm,
			bioForm
		};
	};

	return await getProfile(event.params.username);
}) satisfies PageServerLoad;

export const actions: Actions = {
	avatar: async (event) => {
		const avatarForm = await superValidate(event.request, valibot(profileAvatarSchema));
		if (!avatarForm.valid) return fail(400, { avatarForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id } = avatarForm.data;
		const avatar = avatarForm.data.avatar === '' ? null : avatarForm.data.avatar;
		try {
			await prisma.profile.update({ where: { id }, data: { avatar } });
		} catch (error) {
			return setFlash(
				{ type: 'error', message: error instanceof Error ? error.message : String(error) },
				event.cookies
			);
		}
		setFlash(
			{
				type: 'success',
				message: `Avatar ${avatarForm.data.avatar === '' ? 'deleted' : 'updated'}.`
			},
			event.cookies
		);
	},
	firstName: async (event) => {
		const formData = await event.request.formData();
		const data = sanitizeFormData(formData, { trim: ['firstName'] });
		const firstNameForm = await superValidate(data, valibot(profileFirstNameSchema));
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
		const formData = await event.request.formData();
		const data = sanitizeFormData(formData, { trim: ['lastName'] });
		const lastNameForm = await superValidate(data, valibot(profileLastNameSchema));
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
		const formData = await event.request.formData();
		const data = sanitizeFormData(formData, { trim: ['phone'] });
		const phoneForm = await superValidate(data, valibot(profilePhoneSchema));
		if (!phoneForm.valid) return fail(400, { phoneForm });
		const viewer = event.locals.authUser;
		if (!viewer) throw redirect(302, '/login');
		const { id, phone } = phoneForm.data;
		if (typeof phone === 'string' && phone.length > 0) {
			const digits = phone.replace(/[^0-9]/g, '');
			if (digits.length < 7 || digits.length > 15) {
				return setError(phoneForm, 'phone', 'Phone number must contain between 7 and 15 digits');
			}
		}
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
