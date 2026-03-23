export type ChatIdentity = {
  rank?: string;
  lastName?: string;
  flight?: string;
};

export function getChatDisplayNameParts(identity: ChatIdentity) {
  const rank = identity.rank?.trim() || "Member";
  const lastName = identity.lastName?.trim() || "Unknown";
  const flight = identity.flight?.trim() ? `G ${identity.flight.trim()}` : null;

  return {
    primary: `${rank} ${lastName}`,
    secondary: flight,
  };
}
