export const ADMIN_EMAIL = "509sfsrideapp@gmail.com";

export function isAdminEmail(email: string | null | undefined) {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
