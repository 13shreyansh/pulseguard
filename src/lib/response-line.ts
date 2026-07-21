function normalizeE164Phone(value?: string) {
  const normalized = value?.trim().replace(/[\s().-]/g, "");
  if (!normalized) return null;
  if (/^\+65\d{8}$/.test(normalized)) return normalized;
  if (/^65\d{8}$/.test(normalized)) return `+${normalized}`;
  if (/^\d{8}$/.test(normalized)) return `+65${normalized}`;
  return null;
}

export function getResponseLinePhone() {
  return normalizeE164Phone(
    process.env.PULSE_COORDINATION_PHONE ||
      process.env.PULSE_OPERATOR_PHONE ||
      process.env.PULSE_RECEIVING_PHONE,
  );
}
