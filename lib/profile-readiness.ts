type ProfileReadinessShape = {
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
  flight?: string | null;
  username?: string | null;
  phone?: string | null;
  homeAddress?: string | null;
  homeAddressVerified?: boolean | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
  carYear?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  carColor?: string | null;
};

export function getRequiredAccountIssues(profile: ProfileReadinessShape | null | undefined) {
  const issues: string[] = [];

  if (!profile?.firstName?.trim()) issues.push("Add your first name.");
  if (!profile?.lastName?.trim()) issues.push("Add your last name.");
  if (!profile?.rank?.trim()) issues.push("Add your rank.");
  if (!profile?.flight?.trim()) issues.push("Select your flight.");
  if (!profile?.username?.trim()) issues.push("Set your username.");
  if (!profile?.phone?.trim()) issues.push("Add your phone number.");

  return issues;
}

export function hasRequiredAccountInfo(profile: ProfileReadinessShape | null | undefined) {
  return getRequiredAccountIssues(profile).length === 0;
}

export function hasProfilePhoto(profile: ProfileReadinessShape | null | undefined) {
  return Boolean(profile?.riderPhotoUrl?.trim() || profile?.driverPhotoUrl?.trim());
}

export function getRideReadinessIssues(profile: ProfileReadinessShape | null | undefined) {
  const issues: string[] = [];

  if (!hasProfilePhoto(profile)) {
    issues.push("Add a clear profile photo before requesting rides.");
  }

  if (!profile?.homeAddress?.trim()) {
    issues.push("Add your home address in Account Settings before requesting rides.");
  } else if (profile.homeAddressVerified !== true) {
    issues.push("Verify your home address in Account Settings before requesting rides.");
  }

  return issues;
}

export function getDriverReadinessIssues(profile: ProfileReadinessShape | null | undefined) {
  const issues: string[] = [];

  if (!hasProfilePhoto(profile)) {
    issues.push("Add a clear profile photo before driving.");
  }

  if (!profile?.carYear?.trim() || !profile?.carMake?.trim() || !profile?.carModel?.trim() || !profile?.carColor?.trim()) {
    issues.push("Add your vehicle year, make, model, and color before driving.");
  }

  return issues;
}

export function canRequestRide(profile: ProfileReadinessShape | null | undefined) {
  return getRideReadinessIssues(profile).length === 0;
}

export function canDrive(profile: ProfileReadinessShape | null | undefined) {
  return getDriverReadinessIssues(profile).length === 0;
}
