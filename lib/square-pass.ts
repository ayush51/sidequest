import { createHmac, timingSafeEqual } from "node:crypto";

// Sign-in from The Square, the building app (the-square.app). Its server mints
// a pass when a member opens its app menu, and the SideQuest tile links to
// /sso?t=<pass>. A pass is `<payload>.<sig>`: base64url JSON, then the
// base64url HMAC-SHA256 of that payload under SQUARE_SSO_SECRET, a secret
// shared with this app only. The Square's side is lib/app-pass.js there.
//
// This file only checks signatures and times. Single use (the jti) and the
// account link are app/sso/route.ts's job, against the database.

export type SquareClaims = {
	v: 1;
	aud: string; // "sidequest", so a pass for another app can't be replayed here
	iss: string; // which Square instance, e.g. "ava"
	sub: string; // the person's id there
	name: string; // their display name
	owner: boolean;
	iat: number; // seconds
	exp: number; // seconds, five minutes after iat
	jti: string; // nonce: refused if seen before
};

const sign = (data: string, secret: string) =>
	createHmac("sha256", secret).update(data).digest("base64url");

const same = (a: string, b: string) => {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
};

export function verifyPass(
	token: string | null,
	secret: string | undefined,
	now = Date.now(),
): SquareClaims | null {
	if (!token || !secret) return null;
	const parts = token.split(".");
	if (parts.length !== 2) return null;
	const [payload, sig] = parts;
	if (!same(sig, sign(payload, secret))) return null;
	let c: SquareClaims;
	try {
		c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	} catch {
		return null;
	}
	const t = Math.floor(now / 1000);
	if (
		c?.v !== 1 ||
		c.aud !== "sidequest" ||
		typeof c.iss !== "string" ||
		typeof c.sub !== "string" ||
		typeof c.name !== "string" ||
		typeof c.jti !== "string" ||
		typeof c.exp !== "number" ||
		c.exp <= t ||
		c.iat > t + 60
	) {
		return null;
	}
	return c;
}

// Someone The Square vouched for who isn't linked yet: held in a short-lived,
// httpOnly cookie while they choose to link an account or create one. Signed
// in its own domain ("pending:"), so a pass can never pass for this cookie.
export const PENDING_COOKIE = "sq_square_link";
export const PENDING_SECONDS = 15 * 60;
export type PendingLink = {
	iss: string;
	sub: string;
	name: string;
	exp: number;
};

export function sealPending(p: PendingLink, secret: string) {
	const payload = Buffer.from(JSON.stringify(p)).toString("base64url");
	return `${payload}.${sign(`pending:${payload}`, secret)}`;
}

export function openPending(
	value: string | undefined,
	secret: string | undefined,
	now = Date.now(),
): PendingLink | null {
	if (!value || !secret) return null;
	const parts = value.split(".");
	if (parts.length !== 2) return null;
	const [payload, sig] = parts;
	if (!same(sig, sign(`pending:${payload}`, secret))) return null;
	try {
		const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
		return typeof p?.exp === "number" && p.exp > Math.floor(now / 1000)
			? p
			: null;
	} catch {
		return null;
	}
}

// A SideQuest name suggested from a Square name: "Better Connor" -> "better_connor".
export function usernameFrom(name: string) {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 20);
	return base.length >= 3 ? base : `${base}_sq`.slice(0, 20);
}
