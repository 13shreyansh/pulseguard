function normalizeE164Phone(value?: string) {
  const normalized = value?.trim().replace(/[\s().-]/g, "");
  if (!normalized) return null;
  if (/^\+\d{8,15}$/.test(normalized)) return normalized;
  if (/^\d{8,15}$/.test(normalized)) return `+${normalized}`;
  return null;
}

export function getResponseLinePhone() {
  return normalizeE164Phone(
    process.env.PULSE_COORDINATION_PHONE ||
      process.env.PULSE_OPERATOR_PHONE ||
      process.env.PULSE_RECEIVING_PHONE,
  );
}
