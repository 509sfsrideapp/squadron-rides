export type ChatIdentity = {
  rank?: string;
  firstName?: string;
  lastName?: string;
  flight?: string;
};

export function getChatDisplayNameParts(identity: ChatIdentity) {
  const rank = identity.rank?.trim() || "Member";
  const firstInitial = identity.firstName?.trim()?.charAt(0).toUpperCase();
  const lastName = identity.lastName?.trim() || "Unknown";
  const suffix = firstInitial ? `, ${firstInitial}` : "";
  const flight = identity.flight?.trim() || null;

  return {
    primary: `${rank} ${lastName}${suffix}`,
    secondary: flight,
  };
}
