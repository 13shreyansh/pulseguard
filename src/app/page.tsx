"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AppPhase = "standby" | "intake" | "responding";
type LocationState = "idle" | "locking" | "locked" | "unavailable";
type SpeechState = "idle" | "listening" | "processing" | "unsupported" | "error";
type MicState = "idle" | "requesting" | "granted" | "denied" | "unavailable";
type SpeechEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
type TriageResult = {
  title: string;
  emergencyType: string;
  severity: string;
  hospitalType: string;
  signals: string[];
  warning: string;
  actions: string[];
  dispatchBrief: string;
};
type DispatchCall = {
  callId?: string;
  status: "idle" | "starting" | "queued" | "ringing" | "in-progress" | "ended" | "failed";
  receivingPhone?: string;
  hospitalName?: string;
  hospitalIndex?: number;
  transcript?: string;
  summary?: string;
  error?: string;
};
type IncidentLocation = {
  label: string;
  latitude: number;
  longitude: number;
};
type HospitalCandidate = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distanceKm: number;
};
type SafetyScenario = {
  transcript: string;
  expectedType: string;
  expectedRoute: string;
  safetyRule: string;
};
type SafetyLabResult = {
  source: "adaption" | "local";
  status: "idle" | "syncing" | "ready" | "running" | "failed";
  datasetId?: string;
  runId?: string;
  rowCount: number;
  estimatedCredits?: number;
  estimatedMinutes?: number;
  quality?: {
    gradeBefore?: string;
    gradeAfter?: string;
    improvementPercent?: number;
  };
  scenarios: SafetyScenario[];
  note: string;
};

const initialReport = "";
const DEFAULT_INCIDENT_LOCATION: IncidentLocation = {
  label: "Acacia College, NUS",
  latitude: 1.3071479,
  longitude: 103.7725891,
};

const dispatchSchedule = [
  { at: 1, label: "Bystander report captured" },
  { at: 2, label: "Acacia location attached" },
  { at: 4, label: "Emergency classified" },
  { at: 6, label: "Nearby hospitals found" },
  { at: 8, label: "Hospitals sorted by distance" },
  { at: 10, label: "Calling nearest hospital" },
  { at: 12, label: "Call status monitored" },
  { at: 16, label: "Incident brief delivered by voice" },
  { at: 20, label: "Bystander guidance remains active" },
];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function isRejectedCall(text: string) {
  const normalized = text.toLowerCase();
  return /cannot receive|can't receive|cannot accept|can't accept|we cannot|unable to receive|unable to accept|not accepting|unavailable|full|try the next|call the next nearest hospital|next nearest hospital|no capacity|on divert/.test(
    normalized,
  );
}

function isAcceptedCall(text: string) {
  if (isRejectedCall(text)) return false;
  const normalized = text.toLowerCase();
  return /we can receive|can receive|we can accept|can accept|yes[,.\s]+send|send (the )?patient|receive (the )?patient|ambulance.*(send|coordinate|available)|can coordinate|will send|can send/.test(
    normalized,
  );
}

function getCallOutcome(dispatchCall: DispatchCall) {
  const callText = `${dispatchCall.transcript || ""} ${dispatchCall.summary || ""} ${dispatchCall.error || ""}`;

  if (dispatchCall.status === "failed") {
    return {
      label: "Call failed",
      detail: dispatchCall.error || "Pulse could not place this outbound call.",
      tone: "danger" as const,
    };
  }

  if (callText.trim() && isRejectedCall(callText)) {
    return {
      label: "Hospital unavailable",
      detail: "Pulse will call the next nearest hospital automatically.",
      tone: "danger" as const,
    };
  }

  if (callText.trim() && isAcceptedCall(callText)) {
    return {
      label: "Receiving confirmed",
      detail: "The hospital can receive the patient. Ambulance coordination has been requested.",
      tone: "success" as const,
    };
  }

  if (dispatchCall.status === "ended") {
    return {
      label: "Call completed",
      detail: "Pulse delivered the incident brief. Review the transcript for hospital response.",
      tone: "neutral" as const,
    };
  }

  if (["starting", "queued", "ringing", "in-progress"].includes(dispatchCall.status)) {
    return {
      label: "Calling receiving desk",
      detail: "Pulse is asking if they can receive the patient and send or coordinate an ambulance.",
      tone: "warning" as const,
    };
  }

  return {
    label: "Selecting hospital",
    detail: "Pulse is ranking nearby emergency facilities.",
    tone: "neutral" as const,
  };
}

function fallbackHospitals(): HospitalCandidate[] {
  return [
    {
      id: "nuh",
      name: "National University Hospital",
      address: "5 Lower Kent Ridge Road, Singapore",
      distanceKm: 1.4,
    },
    {
      id: "alexandra-hospital",
      name: "Alexandra Hospital",
      address: "378 Alexandra Road, Singapore",
      distanceKm: 4.6,
    },
    {
      id: "ng-teng-fong",
      name: "Ng Teng Fong General Hospital",
      address: "1 Jurong East Street 21, Singapore",
      distanceKm: 8.2,
    },
    {
      id: "gleneagles",
      name: "Gleneagles Hospital",
      address: "6A Napier Road, Singapore",
      distanceKm: 8.9,
    },
    {
      id: "singapore-general",
      name: "Singapore General Hospital",
      address: "Outram Road, Singapore",
      distanceKm: 10.4,
    },
  ];
}

function analyzeReport(report: string): TriageResult {
  const text = report.toLowerCase();
  const hasBleeding = /bleed|blood|khoon|cut|wound/.test(text);
  const hasFracture = /broken|fracture|leg|bone|twisted/.test(text);
  const beingMoved = /move|moving|lift|lifting|carry|carrying/.test(text);
  const breathingRisk = /not breathing|unconscious|collapsed|pulse/.test(text);
  const cardiacRisk = /chest|heart|cardiac/.test(text);

  if (breathingRisk || cardiacRisk) {
    return {
      title: "Critical medical emergency detected",
      emergencyType: breathingRisk ? "CARDIAC_ARREST" : "RESPIRATORY_DISTRESS",
      severity: "critical",
      hospitalType: "Emergency department required",
      signals: [
        breathingRisk ? "Breathing or consciousness risk" : "Chest pain or cardiac risk",
        hasBleeding ? "Active bleeding" : "Continuous monitoring required",
        "Immediate responder coordination required",
        "Emergency-ready facility required",
      ],
      warning: breathingRisk
        ? "Check breathing. If not breathing normally, begin hands-only CPR if trained and able."
        : "Keep the patient still and monitor breathing until responders arrive.",
      actions: breathingRisk
        ? ["Check breathing", "Begin hands-only CPR if needed", "Keep airway clear", "Stay with the patient"]
        : ["Keep the patient still", "Monitor breathing", "Keep them awake", "Clear space for responders"],
      dispatchBrief:
        "Critical medical emergency reported by bystander. Patient may have breathing, consciousness, or cardiac risk. Immediate emergency department coordination required.",
    };
  }

  return {
    title: "Major trauma detected",
    emergencyType: "MAJOR_TRAUMA",
    severity: "high",
    hospitalType: "Trauma-capable emergency care required",
    signals: [
      hasFracture ? "Possible fracture" : "Impact injury reported",
      hasBleeding ? "Active bleeding" : "Bleeding status unknown",
      beingMoved ? "Patient is being moved" : "Movement risk needs control",
      "Trauma-capable emergency care required",
    ],
    warning: "Do not move the patient unless there is immediate danger.",
    actions: [
      "Stop people from moving him",
      hasBleeding ? "Apply firm pressure to bleeding" : "Check for bleeding",
      "Keep him still and awake",
      "Watch breathing",
    ],
    dispatchBrief:
      "Major trauma reported by bystander. Possible fracture, bleeding status requires attention, and patient movement must be controlled. Trauma-capable emergency care required.",
  };
}

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("standby");
  const [report, setReport] = useState(initialReport);
  const [submittedReport, setSubmittedReport] = useState("");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [dispatchCall, setDispatchCall] = useState<DispatchCall>({ status: "idle" });
  const [incidentLocation, setIncidentLocation] = useState<IncidentLocation>(DEFAULT_INCIDENT_LOCATION);
  const [hospitals, setHospitals] = useState<HospitalCandidate[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [micState, setMicState] = useState<MicState>("idle");
  const [safetyLab, setSafetyLab] = useState<SafetyLabResult | null>(null);
  const reportRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const committedSpeechRef = useRef("");
  const shouldListenRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const retriedCallRef = useRef<string | null>(null);
  const safetyLabStartedRef = useRef(false);

  const fallbackTriage = useMemo(() => analyzeReport(submittedReport || report), [report, submittedReport]);
  const triage = triageResult ?? fallbackTriage;
  const visibleEvents = useMemo(
    () => dispatchSchedule.filter((event) => elapsed >= event.at),
    [elapsed],
  );

  useEffect(() => {
    if (phase !== "responding") return;
    const timer = window.setTimeout(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearTimeout(timer);
  }, [elapsed, phase]);

  useEffect(() => {
    if (!dispatchCall.callId || dispatchCall.status === "ended" || dispatchCall.status === "failed") {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/dispatch/status?callId=${dispatchCall.callId}`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          status?: DispatchCall["status"];
          transcript?: string;
          summary?: string;
        };
        setDispatchCall((current) => ({
          ...current,
          status: data.status || current.status,
          transcript: data.transcript || current.transcript,
          summary: data.summary || current.summary,
        }));
      } catch {
        // Keep the current status visible; polling can recover on the next tick.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [dispatchCall.callId, dispatchCall.status]);

  useEffect(() => {
    if (
      dispatchCall.status !== "ended" ||
      !dispatchCall.callId ||
      retriedCallRef.current === dispatchCall.callId ||
      !isRejectedCall(dispatchCall.transcript || dispatchCall.summary || "")
    ) {
      return;
    }

    retriedCallRef.current = dispatchCall.callId;
    const nextIndex = (dispatchCall.hospitalIndex ?? 0) + 1;
    const nextHospital = hospitals[nextIndex];
    if (!nextHospital || !submittedReport || !triageResult) return;

    startDispatchCall(submittedReport, triageResult, nextHospital, incidentLocation, nextIndex);
  }, [dispatchCall, hospitals, incidentLocation, submittedReport, triageResult]);

  useEffect(() => {
    if (phase === "intake") {
      window.setTimeout(() => reportRef.current?.focus(), 100);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "responding" || safetyLabStartedRef.current) return;

    let ignore = false;
    safetyLabStartedRef.current = true;
    fetch("/api/adaption/safety-lab", { method: "POST" })
      .then(async (response) => {
        const data = (await response.json()) as SafetyLabResult;
        if (!ignore) setSafetyLab(data);
      })
      .catch(() => {
        if (!ignore) {
          setSafetyLab({
            source: "local",
            status: "failed",
            rowCount: 0,
            scenarios: [],
            note: "Safety lab could not sync in this session.",
          });
        }
      })
      .finally(() => {
        if (ignore) safetyLabStartedRef.current = false;
      });

    return () => {
      ignore = true;
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function startPulse() {
    setPhase("intake");
    setElapsed(0);
    setReport("");
    setSubmittedReport("");
    committedSpeechRef.current = "";
    setLocationState("locked");
    startSpeechCapture();
  }

  async function submitCapturedReport(value = report) {
    const cleaned = value.trim();
    if (cleaned.length < 12) return;
    shouldListenRef.current = false;
    setSpeechState("processing");
    recognitionRef.current?.stop();
    setSubmittedReport(cleaned);
    setElapsed(0);
    setTriageResult(null);
    setDispatchCall({ status: "idle" });
    retriedCallRef.current = null;

    let resolvedTriage = analyzeReport(cleaned);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: cleaned }),
      });

      if (!response.ok) {
        throw new Error("Triage request failed");
      }

      const data = (await response.json()) as { triage: TriageResult };
      resolvedTriage = data.triage;
      setTriageResult(resolvedTriage);
    } catch {
      setTriageResult(resolvedTriage);
    }

    setPhase("responding");
    const hospitalSearch = await loadNearbyHospitals();
    startDispatchCall(
      cleaned,
      resolvedTriage,
      hospitalSearch.hospitals[0],
      hospitalSearch.incidentLocation,
      0,
    );
  }

  async function loadNearbyHospitals() {
    try {
      const response = await fetch("/api/hospitals");
      if (!response.ok) throw new Error("Hospital search failed");
      const data = (await response.json()) as {
        incidentLocation: IncidentLocation;
        hospitals: HospitalCandidate[];
      };
      const resolvedHospitals = data.hospitals.length > 0 ? data.hospitals : fallbackHospitals();
      setIncidentLocation(data.incidentLocation || DEFAULT_INCIDENT_LOCATION);
      setHospitals(resolvedHospitals);
      return {
        incidentLocation: data.incidentLocation || DEFAULT_INCIDENT_LOCATION,
        hospitals: resolvedHospitals,
      };
    } catch {
      const resolvedHospitals = fallbackHospitals();
      setIncidentLocation(DEFAULT_INCIDENT_LOCATION);
      setHospitals(resolvedHospitals);
      return {
        incidentLocation: DEFAULT_INCIDENT_LOCATION,
        hospitals: resolvedHospitals,
      };
    }
  }

  async function startDispatchCall(
    transcript: string,
    triageForCall: TriageResult,
    hospital: HospitalCandidate,
    readableLocation: IncidentLocation,
    hospitalIndex: number,
  ) {
    setDispatchCall({
      status: "starting",
      hospitalName: hospital.name,
      hospitalIndex,
    });

    try {
      const response = await fetch("/api/dispatch/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          triage: triageForCall,
          incidentLocation: readableLocation,
          hospital,
        }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error || "Dispatch call failed");
      }

      const data = (await response.json()) as {
        callId?: string;
        status?: DispatchCall["status"];
        receivingPhone?: string;
      };
      setDispatchCall({
        callId: data.callId,
        hospitalName: hospital.name,
        hospitalIndex,
        receivingPhone: data.receivingPhone,
        status: data.status || "queued",
      });
    } catch (error) {
      setDispatchCall({
        status: "failed",
        hospitalName: hospital.name,
        hospitalIndex,
        error: error instanceof Error ? error.message : "Dispatch call failed",
      });
    }
  }

  async function requestMicrophoneAccess() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("unavailable");
      return false;
    }

    try {
      setMicState("requesting");
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicState("granted");
      return true;
    } catch {
      setMicState("denied");
      return false;
    }
  }

  async function startSpeechCapture() {
    const hasMic = await requestMicrophoneAccess();
    if (!hasMic) {
      setSpeechState("error");
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      shouldListenRef.current = false;
      setSpeechState("unsupported");
      return;
    }

    shouldListenRef.current = true;
    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-SG";

    recognition.onresult = (event) => {
      let interim = "";
      let committed = committedSpeechRef.current;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          committed = `${committed} ${transcript}`.replace(/\s+/g, " ").trim();
        } else {
          interim = `${interim} ${transcript}`.replace(/\s+/g, " ").trim();
        }
      }

      committedSpeechRef.current = committed;
      const visibleTranscript = `${committed} ${interim}`.replace(/\s+/g, " ").trim();
      setReport(visibleTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setSpeechState("listening");
        return;
      }
      if (event.error === "aborted") return;
      shouldListenRef.current = false;
      setSpeechState("error");
    };

    recognition.onend = () => {
      if (!shouldListenRef.current) {
        setSpeechState((current) => (current === "processing" ? current : "idle"));
        return;
      }

      window.setTimeout(() => {
        if (!shouldListenRef.current) return;
        try {
          setSpeechState("listening");
          recognition.start();
        } catch {
          setSpeechState("error");
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    setSpeechState("listening");

    try {
      recognition.start();
    } catch {
      setSpeechState("error");
    }
  }

  function reset() {
    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setPhase("standby");
    setReport("");
    setSubmittedReport("");
    setTriageResult(null);
    setDispatchCall({ status: "idle" });
    setIncidentLocation(DEFAULT_INCIDENT_LOCATION);
    setHospitals([]);
    retriedCallRef.current = null;
    setSpeechState("idle");
    setMicState("idle");
    setSafetyLab(null);
    safetyLabStartedRef.current = false;
    setElapsed(0);
    setLocationState("idle");
  }

  return (
    <main className="min-h-screen bg-[#eef3f0] text-[#101817]">
      <section className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-xl border border-[#d9e1dd] bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-[#b11226] text-base font-black text-white">
              P
            </div>
            <div>
              <p className="text-2xl font-black tracking-[0.08em]">PULSE</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#687672]">
                Autonomous Emergency Dispatch
              </p>
            </div>
          </div>
          {phase !== "standby" && (
            <button
              onClick={reset}
              className="rounded border border-[#cfc5b8] bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#5f574f] transition hover:border-[#b11226] hover:text-[#b11226]"
            >
              Reset
            </button>
          )}
        </header>

        {phase === "standby" && <StartPanel onStart={startPulse} />}

        {phase === "intake" && (
          <IntakePanel
            locationState={locationState}
            micState={micState}
            onProcess={() => submitCapturedReport()}
            onRestartListening={startSpeechCapture}
            report={report}
            reportRef={reportRef}
            setReport={setReport}
            speechState={speechState}
          />
        )}

        {phase === "responding" && (
          <ResponsePanel
            elapsed={elapsed}
            events={visibleEvents}
            locationState={locationState}
            dispatchCall={dispatchCall}
            hospitals={hospitals}
            incidentLocation={incidentLocation}
            report={submittedReport}
            safetyLab={safetyLab}
            safetyLabLoading={!safetyLab && safetyLabStartedRef.current}
            triage={triage}
          />
        )}
      </section>
    </main>
  );
}

function StartPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.7fr)]">
      <section className="flex min-h-[72vh] flex-col justify-between rounded-xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
        <div>
          <p className="mb-4 w-fit rounded-md bg-[#101817] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
            Ready
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal sm:text-7xl">
            One tap. One report. Dispatch starts.
          </h1>
          <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-[#4f5d59]">
            Pulse captures what happened, attaches the Acacia College location, structures the emergency, guides the bystander, and contacts the receiving facility automatically.
          </p>
        </div>

        <button
          onClick={onStart}
          className="mt-10 flex min-h-32 w-full items-center justify-center rounded-lg bg-[#b11226] px-6 text-4xl font-black text-white transition hover:bg-[#8f0e1f] focus:outline-none focus:ring-4 focus:ring-[#e6a3ad]"
        >
          Start Pulse
        </button>
      </section>

      <section className="rounded-xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#687672]">
          Automatic Flow
        </p>
        <div className="mt-5 grid gap-2">
          {[
            "Listen to the witness",
            "Use Acacia College incident location",
            "Classify trauma and risk",
            "Show safe bystander actions",
            "Rank nearby hospitals",
            "Call the receiving desk",
            "Ask for patient intake and ambulance coordination",
          ].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-[#d9e1dd] bg-[#f7faf8] px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#101817] text-xs font-black text-white">
                {index + 1}
              </span>
              <span className="text-sm font-black">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function IntakePanel({
  locationState,
  micState,
  onProcess,
  onRestartListening,
  report,
  reportRef,
  setReport,
  speechState,
}: {
  locationState: LocationState;
  micState: MicState;
  onProcess: () => void;
  onRestartListening: () => void;
  report: string;
  reportRef: React.RefObject<HTMLTextAreaElement | null>;
  setReport: (value: string) => void;
  speechState: SpeechState;
}) {
  const canProcess = report.trim().length >= 12;
  const statusCopy =
    micState === "requesting"
      ? "Requesting microphone"
      : micState === "denied"
        ? "Microphone blocked"
        : speechState === "listening" || speechState === "idle"
      ? "Listening now"
      : speechState === "processing"
        ? "Processing report"
        : speechState === "unsupported"
          ? "Speech unavailable"
          : speechState === "error"
            ? "Microphone needs attention"
            : "Ready to listen";

  return (
    <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.65fr)]">
      <section className="flex min-h-[72vh] flex-col rounded-xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#687672]">
              Speech Intake
            </p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">Speak. Pulse is listening.</h1>
          </div>
          <LocationBadge locationLabel={DEFAULT_INCIDENT_LOCATION.label} state={locationState} />
        </div>

        <div className="mt-6 rounded-xl border border-[#17231f] bg-[#101817] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`mic-dot ${speechState === "listening" ? "mic-dot-active" : ""}`} />
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#afbbb6]">
                {statusCopy}
              </p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#afbbb6]">
              Click Process Now when ready
            </p>
          </div>

          <label htmlFor="incident-report" className="mt-6 block text-sm font-black uppercase tracking-[0.14em] text-[#afbbb6]">
            Live speech-to-text transcript
          </label>
          <textarea
            ref={reportRef}
            id="incident-report"
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="Say what happened, where you are, and what you can see."
            className="mt-3 min-h-72 w-full resize-none rounded-lg border border-[#32433d] bg-[#17231f] p-5 text-2xl font-black leading-10 text-white outline-none transition placeholder:text-[#7f8e89] focus:border-[#efb1bb] focus:ring-4 focus:ring-[#56333a]"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRestartListening}
            className="min-h-14 rounded-lg border border-[#101817] bg-white px-5 text-lg font-black text-[#101817] transition hover:border-[#b11226] hover:text-[#b11226]"
          >
            Restart Listening
          </button>
          <button
            type="button"
            onClick={onProcess}
            disabled={!canProcess || speechState === "processing"}
            className="min-h-14 rounded-lg bg-[#b11226] px-5 text-lg font-black text-white transition hover:bg-[#8f0e1f] disabled:cursor-not-allowed disabled:bg-[#cdd7d2] disabled:text-[#687672]"
          >
            {speechState === "processing" ? "Processing" : "Process Now"}
          </button>
        </div>

        {(speechState === "unsupported" || speechState === "error" || micState === "denied") && (
          <div className="mt-5 rounded-lg border border-[#d9e1dd] bg-[#f7faf8] p-4">
            <p className="text-sm font-bold leading-6 text-[#4f5d59]">
              Microphone access is not active. Allow microphone permission in the browser, then press Restart Listening.
              The transcript box remains editable as a fallback.
            </p>
          </div>
        )}

        <p className="mt-3 text-sm font-semibold text-[#687672]">
          Speak first. Review the transcript if needed. Then click Process Now.
        </p>
      </section>

      <section className="rounded-xl border border-[#d9e1dd] bg-[#101817] p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#afbbb6]">
          Microphone Capture
        </p>
        <div className="mt-6 flex h-20 items-end gap-1">
          {Array.from({ length: 30 }).map((_, index) => (
            <span
              key={index}
              className="wave-bar"
              style={{ animationDelay: `${index * 65}ms` }}
            />
          ))}
        </div>
        <div className="mt-8 grid gap-3">
          <StatusRow active label="Emergency session active" />
          <StatusRow active={micState === "granted"} label="Microphone permission granted" />
          <StatusRow active={speechState === "listening"} label="Speech recognition active" />
          <StatusRow active={locationState === "locked"} label="Incident location ready" />
          <StatusRow active={report.trim().length >= 12} label="Report ready" />
        </div>
      </section>
    </div>
  );
}

function ResponsePanel({
  dispatchCall,
  elapsed,
  events,
  hospitals,
  incidentLocation,
  locationState,
  report,
  safetyLab,
  safetyLabLoading,
  triage,
}: {
  dispatchCall: DispatchCall;
  elapsed: number;
  events: Array<{ at: number; label: string }>;
  hospitals: HospitalCandidate[];
  incidentLocation: IncidentLocation;
  locationState: LocationState;
  report: string;
  safetyLab: SafetyLabResult | null;
  safetyLabLoading: boolean;
  triage: TriageResult;
}) {
  const callText = `${dispatchCall.transcript || ""} ${dispatchCall.summary || ""}`;
  const delivered = dispatchCall.status === "ended" && !isRejectedCall(callText);

  return (
    <div className="grid flex-1 gap-4 py-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="grid content-start gap-4">
        <div className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[170px_1fr_270px]">
            <div className="rounded-lg border border-[#dbe4df] bg-[#f7faf8] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
                Incident Timer
              </p>
              <p className="mt-1 text-4xl font-black tabular-nums">{formatTime(elapsed)}</p>
            </div>
            <div className="rounded-lg bg-[#101817] p-4 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#afbbb6]">
                Bystander Report
              </p>
              <p className="mt-2 text-lg font-semibold leading-7">{report}</p>
            </div>
            <LocationBadge locationLabel={incidentLocation.label} state={locationState} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
              Triage
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-[#b11226]">{triage.title}</h2>
            <p className="mt-3 rounded-md border border-[#d9e1dd] bg-[#f7faf8] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#4f5d59]">
              {triage.hospitalType}
            </p>
            <div className="mt-4 grid gap-2">
              {triage.signals.map((signal) => (
                <div key={signal} className="flex items-center gap-2 rounded-md border border-[#d9e1dd] bg-white px-3 py-2 text-sm font-bold">
                  <span className="size-2 rounded-full bg-[#b11226]" />
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-[#b11226] bg-[#fff7f5] p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b11226]">
              Critical Warning
            </p>
            <p className="mt-3 text-2xl font-black leading-tight">{triage.warning}</p>
          </div>
        </div>

        <GuidancePanel actions={triage.actions} />

        {delivered && (
          <div className="rounded-xl border border-[#2f7a52] bg-[#ecf8f0] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f7a52]">
                  Final Status
                </p>
                <h2 className="mt-1 text-3xl font-black text-[#2f7a52]">Response package delivered</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {["Hospital contacted", "Incident brief delivered", "Bystander guidance active", "Ambulance coordination requested"].map((item) => (
                  <div key={item} className="rounded-md border border-[#b9ddc8] bg-white px-3 py-2 text-sm font-bold">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="grid content-start gap-4">
        <HospitalPanel dispatchCall={dispatchCall} hospitals={hospitals} triage={triage} report={report} />
        <TimelinePanel events={events} />
        <SafetyLabPanel loading={safetyLabLoading} result={safetyLab} />
      </aside>
    </div>
  );
}

function SafetyLabPanel({
  loading,
  result,
}: {
  loading: boolean;
  result: SafetyLabResult | null;
}) {
  const statusLabel = loading
    ? "Syncing"
    : result?.source === "adaption" && result.status === "running"
      ? "Run started"
      : result?.source === "adaption"
        ? "Adaption ready"
      : result?.status === "failed"
        ? "Local fallback"
        : "Ready";
  const scenarios = result?.scenarios.slice(0, 3) ?? [];

  return (
    <section className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
            Adaption Labs Safety
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Emergency eval dataset</h3>
        </div>
        <span className="rounded-md bg-[#f7faf8] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#4f5d59]">
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricTile label="Seed cases" value={loading ? "..." : String(result?.rowCount ?? 8)} />
        <MetricTile
          label="Credits"
          value={result?.estimatedCredits != null ? `${result.estimatedCredits}` : loading ? "..." : "0"}
        />
        <MetricTile
          label="Est. minutes"
          value={result?.estimatedMinutes != null ? `${result.estimatedMinutes}` : loading ? "..." : "0"}
        />
      </div>

      <p className="mt-3 text-sm font-semibold leading-5 text-[#4f5d59]">
        {loading
          ? "Uploading emergency edge cases to Adaption Labs without blocking dispatch."
          : result?.note || "Emergency edge cases are ready for adaptive scenario testing."}
      </p>

      {result?.datasetId && (
        <p className="mt-2 truncate font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#687672]">
          Dataset: {result.datasetId}
        </p>
      )}

      {result?.runId && (
        <p className="mt-1 truncate font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#687672]">
          Run: {result.runId}
        </p>
      )}

      {scenarios.length > 0 && (
        <div className="mt-3 grid gap-2">
          {scenarios.map((scenario) => (
            <div key={scenario.transcript} className="rounded-md border border-[#d9e1dd] bg-[#f7faf8] px-3 py-2">
              <p className="truncate text-sm font-black">{scenario.transcript}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#687672]">
                {scenario.expectedType} · {scenario.expectedRoute}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d9e1dd] bg-[#f7faf8] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#687672]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function GuidancePanel({ actions }: { actions: string[] }) {
  return (
    <section className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
        Bystander Guidance
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {actions.map((action, index) => (
          <div key={action} className="rounded-lg border border-[#17231f] bg-[#101817] p-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#afbbb6]">
              Action {index + 1}
            </p>
            <p className="mt-1 text-lg font-black leading-6">{action}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelinePanel({ events }: { events: Array<{ at: number; label: string }> }) {
  return (
    <section className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
        Autonomous Dispatch
      </p>
      <div className="mt-3 grid gap-2">
        {dispatchSchedule.map((event) => {
          const visible = events.some((item) => item.label === event.label);
          return (
            <div
              key={event.label}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition ${
                visible
                  ? "border-[#d9e1dd] bg-white"
                  : "border-[#e1e7e4] bg-[#f7faf8] text-[#8a9692]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`size-2 rounded-full ${visible ? "bg-[#1d6b44]" : "bg-[#cdbfaf]"}`} />
                <span className="text-sm font-bold">{event.label}</span>
              </div>
              <span className="text-xs font-black tabular-nums text-[#687672]">
                {visible ? formatTime(event.at) : "--:--"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HospitalPanel({
  dispatchCall,
  hospitals,
  report,
  triage,
}: {
  dispatchCall: DispatchCall;
  hospitals: HospitalCandidate[];
  report: string;
  triage: TriageResult;
}) {
  const outcome = getCallOutcome(dispatchCall);
  const statusLabel =
    dispatchCall.status === "failed"
      ? "Call failed"
      : dispatchCall.status === "ended"
        ? "Call ended"
        : dispatchCall.status === "in-progress"
          ? "In progress"
          : dispatchCall.status === "ringing"
            ? "Ringing"
            : dispatchCall.status === "queued"
              ? "Queued"
              : dispatchCall.status === "starting"
                ? "Starting"
                : "Waiting";
  const visibleTranscript = dispatchCall.transcript?.trim() || dispatchCall.summary?.trim();
  const fallbackBrief = `Pulse is placing a real outbound call. ${triage.dispatchBrief} Bystander report: ${report}`;
  const attemptNumber = (dispatchCall.hospitalIndex ?? 0) + 1;
  const totalHospitals = Math.max(hospitals.length, attemptNumber);
  const outcomeClass =
    outcome.tone === "success"
      ? "border-[#b9ddc8] bg-[#ecf8f0] text-[#1d6b44]"
      : outcome.tone === "danger"
        ? "border-[#f0c5c5] bg-[#fff5f4] text-[#b11226]"
        : outcome.tone === "warning"
          ? "border-[#f2dfb7] bg-[#fff8e8] text-[#7a5200]"
          : "border-[#d9e1dd] bg-[#f7faf8] text-[#4f5d59]";

  return (
    <section className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
            Hospital Call
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight">
            {dispatchCall.hospitalName || hospitals[0]?.name || "Selecting hospital"}
          </h3>
          {dispatchCall.receivingPhone && (
            <p className="mt-1 font-mono text-xs font-bold text-[#687672]">
              {dispatchCall.receivingPhone}
            </p>
          )}
        </div>
        <span
          className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
            dispatchCall.status === "ended"
              ? "bg-[#edf8f1] text-[#1d6b44]"
            : dispatchCall.status === "failed"
                ? "bg-[#fff5f4] text-[#b11226]"
                : "bg-[#fff0d7] text-[#8a5a00]"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className={`mt-4 rounded-lg border px-3 py-3 ${outcomeClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black">{outcome.label}</p>
          <p className="text-xs font-black uppercase tracking-[0.12em]">
            Attempt {attemptNumber}/{totalHospitals}
          </p>
        </div>
        <p className="mt-1 text-sm font-semibold leading-5">{outcome.detail}</p>
      </div>

      {hospitals.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#d9e1dd] bg-[#f7faf8] p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
            Nearby Hospitals
          </p>
          <div className="mt-3 grid gap-2">
            {hospitals.map((hospital, index) => (
              <div
                key={hospital.id}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm font-bold ${
                  hospital.name === dispatchCall.hospitalName
                    ? "border-[#b11226] bg-white text-[#101817]"
                    : "border-[#d9e1dd] bg-white text-[#4f5d59]"
                }`}
              >
                <span className="min-w-0 truncate">{index + 1}. {hospital.name}</span>
                <span className="shrink-0 font-mono text-xs">{hospital.distanceKm} km</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {dispatchCall.error ? (
          <div className="rounded border border-[#f0c5c5] bg-[#fff5f4] px-3 py-4 text-sm font-bold text-[#b11226]">
            {dispatchCall.error}
          </div>
        ) : (
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#687672]">
              {visibleTranscript ? "Live Call Transcript" : "Call Brief"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">
              {visibleTranscript || fallbackBrief}
            </p>
            {dispatchCall.callId && (
              <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#687672]">
                Call ID: {dispatchCall.callId}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LocationBadge({
  locationLabel,
  state,
}: {
  locationLabel?: string;
  state: LocationState;
}) {
  const statusLabel = state === "unavailable" ? "Incident location" : "Incident location";

  return (
    <div className="rounded-lg border border-[#d9e1dd] bg-[#f7faf8] px-3 py-2 text-right">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#687672]">{statusLabel}</p>
      <p className="mt-1 max-w-64 text-sm font-bold text-[#17130f]">
        {locationLabel || "Acacia College, NUS"}
      </p>
    </div>
  );
}

function StatusRow({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#32433d] bg-[#17231f] px-4 py-4">
      <span className="text-sm font-black">{label}</span>
      <span className={`size-3 rounded-full ${active ? "bg-[#76d99a]" : "bg-[#687672]"}`} />
    </div>
  );
}
