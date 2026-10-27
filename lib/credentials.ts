// Supabase needs an email and a 6+ char password; derive both from name + 4-digit code.
export const credentials = (name: string, pin: string) => ({
	email: `${name}@users.sidequest.app`,
	password: `${name}:${pin}`,
});
