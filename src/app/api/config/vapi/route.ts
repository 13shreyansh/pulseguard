import { NextRequest, NextResponse } from "next/server";
import { getResponseLinePhone } from "@/lib/response-line";

type VapiPhoneNumber = {
  id?: string;
  provider?: string;
  number?: string;
  name?: string;
  status?: string;
  assistantId?: string;
  credentialId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioApiKey?: string;
  twilioApiSecret?: string;
  orgId?: string;
};

type TwilioAccount = {
  status?: string;
  type?: string;
};

type TwilioIncomingNumber = {
  sid?: string;
  phone_number?: string;
  status?: string;
  friendly_name?: string;
  capabilities?: Record<string, boolean>;
  voice_url?: string;
  voice_method?: string;
  status_callback?: string | null;
  sms_url?: string;
  sms_method?: string;
};

type TwilioCall = {
  sid?: string;
  to?: string;
  from?: string;
  status?: string;
  duration?: string;
  start_time?: string;
  end_time?: string;
  direction?: string;
  answered_by?: string | null;
  price?: string | null;
  error_code?: string | number | null;
};

type VapiCall = {
  id?: string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  transcript?: string;
  summary?: string;
  phoneCallProvider?: string;
  phoneCallProviderId?: string;
  phoneNumber?: VapiPhoneNumber;
  customer?: { number?: string };
  artifact?: {
    transcript?: string;
    messages?: Array<{ role?: string; message?: string; time?: number }>;
  };
};

function hasOpsAccess(request: NextRequest) {
  const token = process.env.PULSE_OPS_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${token}`;
}

function redactPhone(number?: string) {
  if (!number) return undefined;
  const normalized = number.replace(/[^\d+]/g, "");
  if (normalized.length <= 5) return "[redacted]";
  return `${normalized.slice(0, 3)}...${normalized.slice(-2)}`;
}

function normalizeE164Phone(value?: string) {
  const normalized = value?.trim().replace(/[\s().-]/g, "");
  if (!normalized) return null;
  if (/^\+\d{8,15}$/.test(normalized)) return normalized;
  if (/^\d{8,15}$/.test(normalized)) return `+${normalized}`;
  return null;
}

function getTwilioNumber() {
  return normalizeE164Phone(
    process.env.TWILIO_FROM_NUMBER || process.env.VAPI_CALLER_NUMBER || process.env.SMS_FROM_NUMBER,
  );
}

function getOperatorPhone() {
  return getResponseLinePhone();
}

function summarizePhone(phone: VapiPhoneNumber | null, expectedId?: string) {
  if (!phone) return null;
  return {
    id: phone.id,
    idMatchesConfigured: expectedId ? phone.id === expectedId : undefined,
    provider: phone.provider,
    status: phone.status,
    name: phone.name,
    number: redactPhone(phone.number),
    assistantAttached: Boolean(phone.assistantId),
    credentialAttached: Boolean(phone.credentialId),
    twilioAccountAttached: Boolean(phone.twilioAccountSid),
    twilioAuthAttached: Boolean(phone.twilioAuthToken || (phone.twilioApiKey && phone.twilioApiSecret)),
  };
}

async function vapiFetch(path: string, apiKey: string) {
  return fetch(`https://api.vapi.ai${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

async function vapiPatch(path: string, apiKey: string, body: unknown) {
  return fetch(`https://api.vapi.ai${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function getTwilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const username = process.env.TWILIO_API_KEY_SID || accountSid;
  const password = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !username || !password) return null;

  return {
    accountSid,
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

async function twilioFetch(path: string) {
  const twilio = getTwilioAuth();
  if (!twilio) return null;
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}${path}`, {
    headers: {
      Authorization: twilio.authorization,
    },
  });
}

function summarizeTwilioCall(call: TwilioCall) {
  return {
    sid: call.sid,
    to: redactPhone(call.to),
    from: redactPhone(call.from),
    status: call.status,
    durationSeconds: call.duration ? Number(call.duration) : undefined,
    startTime: call.start_time,
    endTime: call.end_time,
    direction: call.direction,
    answeredBy: call.answered_by || undefined,
    errorCode: call.error_code || undefined,
  };
}

function transcriptForVapiCall(call: VapiCall) {
  return call.artifact?.transcript || call.transcript;
}

function summarizeVapiCall(call: VapiCall, includeTranscript = false) {
  const startedAt = call.startedAt ? new Date(call.startedAt).getTime() : null;
  const endedAt = call.endedAt ? new Date(call.endedAt).getTime() : null;
  const durationSeconds = startedAt && endedAt ? Math.round((endedAt - startedAt) / 1000) : undefined;
  const transcript = transcriptForVapiCall(call);

  return {
    id: call.id,
    status: call.status,
    endedReason: call.endedReason,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    durationSeconds,
    phoneCallProvider: call.phoneCallProvider,
    phoneCallProviderId: call.phoneCallProviderId,
    phoneNumber: summarizePhone(call.phoneNumber || null, process.env.VAPI_PHONE_NUMBER_ID),
    customer: { number: redactPhone(call.customer?.number) },
    transcriptPresent: Boolean(transcript),
    transcriptPreview: transcript ? transcript.slice(0, 300) : undefined,
    transcript: includeTranscript ? transcript : undefined,
    summaryPresent: Boolean(call.summary),
    summary: includeTranscript ? call.summary : undefined,
  };
}

function readVapiCallList(data: unknown) {
  if (Array.isArray(data)) return data as VapiCall[];
  if (data && typeof data === "object") {
    const objectData = data as {
      calls?: VapiCall[];
      results?: VapiCall[];
      data?: VapiCall[];
    };
    return objectData.calls || objectData.results || objectData.data || [];
  }
  return [];
}

async function readJson<T>(response: Response | null) {
  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as T | null;
}

async function placeDirectTwilioAudioTest(to: string) {
  const twilio = getTwilioAuth();
  const from = getTwilioNumber();
  if (!twilio || !from) {
    return { ok: false, error: "Twilio voice is not configured" };
  }

  const twiml = [
    "<Response>",
    "<Pause length=\"1\"/>",
    "<Say voice=\"alice\">Pulse direct Twilio audio test. If you can hear this, the Twilio phone leg is working.</Say>",
    "<Pause length=\"2\"/>",
    "</Response>",
  ].join("");
  const body = new URLSearchParams({
    To: to,
    From: from,
    Twiml: twiml,
    Timeout: "60",
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: twilio.authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await response.json().catch(() => null)) as TwilioCall & { message?: string } | null;

  return {
    ok: response.ok,
    httpStatus: response.status,
    call: data ? summarizeTwilioCall(data) : null,
    error: response.ok ? undefined : data?.message || "Twilio test call failed",
  };
}

async function placeMinimalVapiTest(to: string) {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    return { ok: false, error: "Vapi phone call is not configured" };
  }

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      customer: {
        number: to,
        numberE164CheckEnabled: true,
      },
      assistant: {
        name: "Pulse Minimal Connection Test",
        firstMessage: "Pulse Vapi connection test. Please say yes if you can hear this.",
        firstMessageMode: "assistant-speaks-first",
        model: {
          provider: "openai",
          model: process.env.PULSE_VAPI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are running a brief phone connection test. Say one short sentence, wait for the user, then say goodbye.",
            },
          ],
          temperature: 0.1,
        },
        voice: {
          provider: "vapi",
          voiceId: process.env.PULSE_VAPI_VOICE_ID || "Elliot",
        },
        maxDurationSeconds: 60,
        transportConfigurations: [
          {
            provider: "twilio",
            timeout: 60,
            record: false,
            recordingChannels: "mono",
          },
        ],
        recordingEnabled: true,
      },
    }),
  });
  const data = (await response.json().catch(() => null)) as VapiCall & { message?: string } | null;

  return {
    ok: response.ok,
    httpStatus: response.status,
    call: data ? summarizeVapiCall(data) : null,
    error: response.ok ? undefined : data?.message || "Vapi minimal test call failed",
  };
}

export async function GET(request: NextRequest) {
  if (!hasOpsAccess(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const operatorPhone = getOperatorPhone();
  const twilioNumber = getTwilioNumber();
  const callProvider = process.env.PULSE_CALL_PROVIDER === "twilio" ? "twilio" : "vapi";
  const interactiveRequired = process.env.PULSE_REQUIRE_INTERACTIVE_CALL !== "false";

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "Vapi API key is not configured",
        callProvider,
        phoneNumberIdConfigured: Boolean(phoneNumberId),
        operatorPhoneConfigured: Boolean(operatorPhone),
      },
      { status: 500 },
    );
  }

  const configuredPhoneResponse = phoneNumberId ? await vapiFetch(`/phone-number/${phoneNumberId}`, apiKey) : null;
  const listResponse = await vapiFetch("/phone-number", apiKey);

  const configuredPhone = configuredPhoneResponse?.ok
    ? ((await configuredPhoneResponse.json()) as VapiPhoneNumber)
    : null;
  const phoneNumbers = listResponse.ok
    ? (((await listResponse.json()) as VapiPhoneNumber[]).map((phone) => summarizePhone(phone, phoneNumberId)))
    : [];
  const twilioAccount = await readJson<TwilioAccount>(await twilioFetch(".json"));
  const incomingNumberResponse = twilioNumber
    ? await twilioFetch(`/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(twilioNumber)}`)
    : null;
  const incomingNumberData = await readJson<{ incoming_phone_numbers?: TwilioIncomingNumber[] }>(incomingNumberResponse);
  const outgoingCallerIdsData = await readJson<{
    outgoing_caller_ids?: Array<{ sid?: string; phone_number?: string; friendly_name?: string }>;
  }>(await twilioFetch("/OutgoingCallerIds.json?PageSize=20"));
  const recentCallsData = await readJson<{ calls?: TwilioCall[] }>(await twilioFetch("/Calls.json?PageSize=10"));
  const notificationsData = await readJson<{
    notifications?: Array<{ sid?: string; error_code?: string | number; message_text?: string; log?: string; request_url?: string }>;
  }>(await twilioFetch("/Notifications.json?PageSize=10"));

  return NextResponse.json({
    configured: Boolean(apiKey && phoneNumberId && operatorPhone),
    env: {
      vapiApiConfigured: Boolean(apiKey),
      phoneNumberIdConfigured: Boolean(phoneNumberId),
      operatorPhone: redactPhone(operatorPhone || undefined),
      twilioFromNumber: redactPhone(twilioNumber || undefined),
      twilioAccountConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
      twilioAuthConfigured: Boolean(
        process.env.TWILIO_AUTH_TOKEN || (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET),
      ),
    },
    callProvider,
    interactiveRequired,
    phoneNumberIdConfigured: Boolean(phoneNumberId),
    operatorPhoneConfigured: Boolean(operatorPhone),
    assistantIdConfigured: Boolean(process.env.PULSE_VAPI_ASSISTANT_ID),
    configuredPhoneStatus: configuredPhoneResponse
      ? {
          ok: configuredPhoneResponse.ok,
          httpStatus: configuredPhoneResponse.status,
        }
      : null,
    configuredPhone: summarizePhone(configuredPhone, phoneNumberId),
    phoneNumbers,
    twilio: {
      account: twilioAccount ? { status: twilioAccount.status, type: twilioAccount.type } : null,
      incomingNumber: incomingNumberData?.incoming_phone_numbers?.map((number) => ({
        sid: number.sid,
        phoneNumber: redactPhone(number.phone_number),
        status: number.status,
        friendlyName: number.friendly_name,
        capabilities: number.capabilities,
        voiceUrl: number.voice_url,
        voiceMethod: number.voice_method,
        statusCallback: number.status_callback,
        smsUrl: number.sms_url,
        smsMethod: number.sms_method,
      })) || [],
      outgoingCallerIds: outgoingCallerIdsData?.outgoing_caller_ids?.map((callerId) => ({
        sid: callerId.sid,
        phoneNumber: redactPhone(callerId.phone_number),
        friendlyName: callerId.friendly_name,
      })) || [],
      recentCalls: recentCallsData?.calls?.map(summarizeTwilioCall) || [],
      notifications:
        notificationsData?.notifications?.map((notification) => ({
          sid: notification.sid,
          errorCode: notification.error_code,
          messageText: notification.message_text,
          log: notification.log,
          requestUrl: notification.request_url,
        })) || [],
    },
    recommendations: [
      "For interactive GPT calls to international destinations, use a Vapi phone number imported from Twilio or another supported provider.",
      "VAPI_PHONE_NUMBER_ID must match that imported active phone number.",
      "Keep PULSE_CALL_PROVIDER=vapi for live GPT phone conversations. Twilio Voice alone is only a one-way alert call.",
    ],
  });
}

export async function POST(request: NextRequest) {
  if (!hasOpsAccess(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    to?: string;
    callId?: string;
    includeTranscript?: boolean;
    limit?: number;
  } | null;
  const action = body?.action;
  if (
    action !== "repair-twilio-auth" &&
    action !== "direct-twilio-audio-test" &&
    action !== "minimal-vapi-test" &&
    action !== "call-status" &&
    action !== "recent-vapi-calls"
  ) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const operatorPhone = getOperatorPhone();
  const requestedTo = normalizeE164Phone(body?.to) || operatorPhone;

  if (action === "direct-twilio-audio-test") {
    if (!requestedTo) {
      return NextResponse.json({ error: "Destination phone is not configured" }, { status: 500 });
    }
    return NextResponse.json(await placeDirectTwilioAudioTest(requestedTo));
  }

  if (action === "minimal-vapi-test") {
    if (!requestedTo) {
      return NextResponse.json({ error: "Destination phone is not configured" }, { status: 500 });
    }
    return NextResponse.json(await placeMinimalVapiTest(requestedTo));
  }

  if (action === "call-status") {
    const callId = body?.callId?.trim();
    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    if (callId.startsWith("CA")) {
      const call = await readJson<TwilioCall>(await twilioFetch(`/Calls/${callId}.json`));
      return NextResponse.json({ ok: Boolean(call), callProvider: "twilio", call: call ? summarizeTwilioCall(call) : null });
    }

    const apiKeyForStatus = process.env.VAPI_API_KEY;
    if (!apiKeyForStatus) {
      return NextResponse.json({ error: "Vapi API key is not configured" }, { status: 500 });
    }

    const response = await vapiFetch(`/call/${callId}`, apiKeyForStatus);
    const call = await readJson<VapiCall>(response);
    return NextResponse.json({
      ok: Boolean(call),
      httpStatus: response.status,
      callProvider: "vapi",
      call: call ? summarizeVapiCall(call, Boolean(body?.includeTranscript)) : null,
    });
  }

  if (action === "recent-vapi-calls") {
    const apiKeyForList = process.env.VAPI_API_KEY;
    if (!apiKeyForList) {
      return NextResponse.json({ error: "Vapi API key is not configured" }, { status: 500 });
    }

    const limit = Math.min(Math.max(Math.round(Number(body?.limit) || 5), 1), 10);
    const response = await vapiFetch(`/call?limit=${limit}`, apiKeyForList);
    const data = await response.json().catch(() => null);
    const calls = readVapiCallList(data);

    return NextResponse.json({
      ok: response.ok,
      httpStatus: response.status,
      callProvider: "vapi",
      calls: calls.slice(0, limit).map((call) => summarizeVapiCall(call, Boolean(body?.includeTranscript))),
    });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const twilioNumber = getTwilioNumber();
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioApiKey = process.env.TWILIO_API_KEY_SID;
  const twilioApiSecret = process.env.TWILIO_API_KEY_SECRET;

  if (!apiKey || !phoneNumberId || !twilioNumber || !twilioAccountSid) {
    return NextResponse.json(
      {
        error: "Vapi phone repair is missing required server configuration",
        hasVapiApiKey: Boolean(apiKey),
        hasPhoneNumberId: Boolean(phoneNumberId),
        hasTwilioNumber: Boolean(twilioNumber),
        hasTwilioAccountSid: Boolean(twilioAccountSid),
      },
      { status: 500 },
    );
  }

  if (!twilioAuthToken && !(twilioApiKey && twilioApiSecret)) {
    return NextResponse.json(
      {
        error: "Twilio auth token or API key/secret is required to repair the Vapi phone number.",
      },
      { status: 500 },
    );
  }

  const updatePayload = {
    name: "Pulse Dispatch",
    number: twilioNumber,
    twilioAccountSid,
    ...(twilioAuthToken
      ? { twilioAuthToken }
      : { twilioApiKey, twilioApiSecret }),
    smsEnabled: true,
  };

  const updateResponse = await vapiPatch(`/phone-number/${phoneNumberId}`, apiKey, updatePayload);
  const updateText = await updateResponse.text();
  const updatedPhone = updateResponse.ok ? (JSON.parse(updateText) as VapiPhoneNumber) : null;

  return NextResponse.json(
    {
      ok: updateResponse.ok,
      httpStatus: updateResponse.status,
      configuredPhone: summarizePhone(updatedPhone, phoneNumberId),
      error: updateResponse.ok ? undefined : updateText.slice(0, 500),
    },
    { status: updateResponse.ok ? 200 : 502 },
  );
}
