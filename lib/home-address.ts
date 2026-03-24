export type HomeAddressFields = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export function buildHomeAddress(fields: HomeAddressFields) {
  const street = fields.street.trim();
  const city = fields.city.trim();
  const state = fields.state.trim();
  const zip = fields.zip.trim();
  const stateZip = [state, zip].filter(Boolean).join(" ").trim();

  return [street, city, stateZip].filter(Boolean).join(", ");
}

export function splitHomeAddress(address?: string | null) {
  const fallback: HomeAddressFields = {
    street: "",
    city: "",
    state: "",
    zip: "",
  };

  if (!address?.trim()) {
    return fallback;
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const street = parts[0] || "";
  const city = parts[1] || "";
  const trailing = parts.slice(2).join(" ").trim();
  const stateZipMatch = trailing.match(/([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)/);

  return {
    street,
    city,
    state: stateZipMatch?.[1] || "",
    zip: stateZipMatch?.[2] || "",
  };
}
