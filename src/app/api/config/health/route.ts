import { NextResponse } from "next/server";

export async function GET() {
  const googlePlacesConfigured = Boolean(
    process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY,
  );
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const vapiApiConfigured = Boolean(process.env.VAPI_API_KEY);
  const vapiPhoneNumberConfigured = Boolean(process.env.VAPI_PHONE_NUMBER_ID);
  const operatorPhoneConfigured = Boolean(process.env.PULSE_OPERATOR_PHONE || process.env.PULSE_RECEIVING_PHONE);
  const twilioCredentialConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      ((process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET) || process.env.TWILIO_AUTH_TOKEN),
  );
  const smsConfigured = Boolean(
    twilioCredentialConfigured &&
      (process.env.TWILIO_FROM_NUMBER || process.env.SMS_FROM_NUMBER),
  );
  const twilioVoiceConfigured = Boolean(
    twilioCredentialConfigured &&
      (process.env.TWILIO_FROM_NUMBER || process.env.VAPI_CALLER_NUMBER || process.env.SMS_FROM_NUMBER) &&
      operatorPhoneConfigured,
  );
  const messageWebhookConfigured = Boolean(process.env.PULSE_MESSAGE_WEBHOOK_URL);
  const dryRunRequested = process.env.PULSE_DISPATCH_MODE === "dry_run";
  const dryRunAllowed =
    process.env.NODE_ENV !== "production" || process.env.PULSE_ALLOW_DRY_RUN_IN_PRODUCTION === "true";
  const dispatchMode = dryRunRequested && dryRunAllowed ? "dry_run" : "live";
  const callProvider = process.env.PULSE_CALL_PROVIDER === "twilio" ? "twilio" : "vapi";
  const interactiveRequired = process.env.PULSE_REQUIRE_INTERACTIVE_CALL !== "false";
  const vapiConfigured = vapiApiConfigured && vapiPhoneNumberConfigured && operatorPhoneConfigured;
  const callConfigured = callProvider === "twilio" && !interactiveRequired ? twilioVoiceConfigured : vapiConfigured;
  const operatorRelayConfigured = callConfigured && (smsConfigured || messageWebhookConfigured);
  const interactiveCallConfigured = vapiConfigured;
  const voiceAlertConfigured = twilioVoiceConfigured;
  const dispatchLabel =
    dispatchMode === "dry_run"
      ? "Operator handoff verification"
      : !operatorRelayConfigured
        ? "Operator dispatch needs configuration"
        : callProvider === "vapi"
          ? "Interactive operator call ready"
          : "One-way operator alert ready";

  return NextResponse.json({
    googlePlaces: {
      configured: googlePlacesConfigured,
      label: googlePlacesConfigured ? "Hospital search ready" : "Hospital search needs configuration",
    },
    triage: {
      configured: openaiConfigured,
      label: openaiConfigured ? "AI triage ready" : "AI triage needs configuration",
    },
    speech: {
      configured: openaiConfigured,
      label: openaiConfigured ? "Realtime voice ready" : "Realtime voice needs configuration",
    },
    dispatch: {
      vapiConfigured,
      vapiApiConfigured,
      vapiPhoneNumberConfigured,
      operatorPhoneConfigured,
      smsConfigured,
      twilioVoiceConfigured,
      messageWebhookConfigured,
      callProvider,
      interactiveRequired,
      interactiveCallConfigured,
      voiceAlertConfigured,
      status: dispatchMode === "dry_run" ? "verification" : operatorRelayConfigured ? "configured" : "missing_config",
      label: dispatchLabel,
    },
  });
}
