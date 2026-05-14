"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Crosshair,
  FileText,
  Headphones,
  Home as HomeIcon,
  Hospital,
  ListChecks,
  Loader2,
  Lock,
  MapPin,
  Mic,
  Navigation,
  PhoneCall,
  Radio,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";

type WorkflowStep = "start" | "location" | "listen" | "triage" | "hospitals" | "dispatch";
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
  source: "openai" | "local_fallback";
};
type DispatchCall = {
  callId?: string;
  status: "idle" | "starting" | "queued" | "ringing" | "in-progress" | "ended" | "failed";
  receivingPhone?: string;
  callTarget?: "test_receiver";
  selectedHospitalPhone?: string;
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
  accuracy?: number;
  source: "gps" | "fallback";
};
type HospitalCandidate = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distanceKm: number;
  source: "google_places" | "fallback";
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
type StepDefinition = {
  id: WorkflowStep;
  label: string;
  detail: string;
  icon: LucideIcon;
};
type SourceBadgeValue =
  | HospitalCandidate["source"]
  | TriageResult["source"]
  | SafetyLabResult["source"]
  | IncidentLocation["source"]
  | "test_receiver";

const initialReport = "";

const stepDefinitions: StepDefinition[] = [
  { id: "start", label: "Start", detail: "Pulse ready", icon: HomeIcon },
  { id: "location", label: "Location", detail: "GPS lock", icon: Crosshair },
  { id: "listen", label: "Listen", detail: "Voice intake", icon: Mic },
  { id: "triage", label: "Triage", detail: "AI guidance", icon: Stethoscope },
  { id: "hospitals", label: "Hospitals", detail: "Distance rank", icon: Hospital },
  { id: "dispatch", label: "Dispatch", detail: "Test receiver", icon: PhoneCall },
];

const dispatchSchedule = [
  { at: 1, label: "Report captured" },
  { at: 2, label: "GPS attached" },
  { at: 4, label: "Emergency classified" },
  { at: 6, label: "Hospitals ranked" },
  { at: 10, label: "Test receiver called" },
  { at: 12, label: "Call status monitored" },
  { at: 16, label: "Brief delivered" },
  { at: 20, label: "Guidance active" },
];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function stepIndex(step: WorkflowStep) {
  return stepDefinitions.findIndex((item) => item.id === step);
}

function isRejectedCall(text: string) {
  const normalized = text.toLowerCase();
  return /cannot receive|can't receive|cannot accept|can't accept|we cannot|unable to receive|unable to accept|not accepting|unavailable|full|try the next|next selected hospital|no capacity|on divert/.test(
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

function formatCoordinates(location: IncidentLocation) {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function describeLocationError(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = Number((error as { code?: number }).code);
    if (code === 1) {
      return "Location permission is required before Pulse can continue.";
    }
    if (code === 2) {
      return "Your browser could not determine a GPS location. Check device location settings and try again.";
    }
    if (code === 3) {
      return "GPS lookup timed out. Move near a window or enable precise location, then try again.";
    }
  }

  return "Pulse needs a real GPS location before dispatch can start.";
}

function requestCurrentLocation() {
  return new Promise<IncidentLocation>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          label: "Current GPS location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      },
    );
  });
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
      detail: "Pulse will route the next selected hospital scenario to the configured test receiver.",
      tone: "danger" as const,
    };
  }

  if (callText.trim() && isAcceptedCall(callText)) {
    return {
      label: "Receiving confirmed",
      detail: "The test receiver confirmed the selected hospital can receive the patient.",
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
      label: "Calling configured test receiver",
      detail: "Pulse is routing the selected hospital scenario to the configured test receiver.",
      tone: "warning" as const,
    };
  }

  return {
    label: "Selecting hospital",
    detail: "Pulse is ranking nearby emergency facilities.",
    tone: "neutral" as const,
  };
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function fallbackHospitals(location: IncidentLocation): HospitalCandidate[] {
  const fallbackLocations = [
    {
      id: "nuh",
      name: "National University Hospital",
      address: "5 Lower Kent Ridge Road, Singapore",
      latitude: 1.2931,
      longitude: 103.7846,
    },
    {
      id: "alexandra-hospital",
      name: "Alexandra Hospital",
      address: "378 Alexandra Road, Singapore",
      latitude: 1.2862,
      longitude: 103.8017,
    },
    {
      id: "ng-teng-fong",
      name: "Ng Teng Fong General Hospital",
      address: "1 Jurong East Street 21, Singapore",
      latitude: 1.3331,
      longitude: 103.7456,
    },
    {
      id: "gleneagles",
      name: "Gleneagles Hospital",
      address: "6A Napier Road, Singapore",
      latitude: 1.3077,
      longitude: 103.8206,
    },
    {
      id: "singapore-general",
      name: "Singapore General Hospital",
      address: "Outram Road, Singapore",
      latitude: 1.2807,
      longitude: 103.8346,
    },
  ];

  return fallbackLocations
    .map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      address: hospital.address,
      distanceKm: distanceKm(location.latitude, location.longitude, hospital.latitude, hospital.longitude),
      source: "fallback" as const,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
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
      source: "local_fallback",
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
    source: "local_fallback",
  };
}

export default function Home() {
  const [step, setStep] = useState<WorkflowStep>("start");
  const [report, setReport] = useState(initialReport);
  const [submittedReport, setSubmittedReport] = useState("");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [dispatchCall, setDispatchCall] = useState<DispatchCall>({ status: "idle" });
  const [incidentLocation, setIncidentLocation] = useState<IncidentLocation | null>(null);
  const [hospitals, setHospitals] = useState<HospitalCandidate[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [locationError, setLocationError] = useState("");
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
  const selectedHospital = hospitals[dispatchCall.hospitalIndex ?? 0] || hospitals[0];

  useEffect(() => {
    if (!["triage", "hospitals", "dispatch"].includes(step)) return;
    const timer = window.setTimeout(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearTimeout(timer);
  }, [elapsed, step]);

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
    if (!nextHospital || !submittedReport || !triageResult || !incidentLocation) return;

    startDispatchCall(submittedReport, triageResult, nextHospital, incidentLocation, nextIndex);
  }, [dispatchCall, hospitals, incidentLocation, submittedReport, triageResult]);

  useEffect(() => {
    if (step === "listen") {
      window.setTimeout(() => reportRef.current?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    if (step !== "dispatch" || safetyLabStartedRef.current) return;

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
  }, [step]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function canOpenStep(target: WorkflowStep) {
    if (target === "start") return true;
    if (target === "location") return step !== "start" || locationState !== "idle";
    if (target === "listen") return Boolean(incidentLocation);
    if (target === "triage") return Boolean(submittedReport || triageResult || ["triage", "hospitals", "dispatch"].includes(step));
    if (target === "hospitals") return hospitals.length > 0 || step === "hospitals" || step === "dispatch";
    return dispatchCall.status !== "idle" || step === "dispatch";
  }

  function openStep(target: WorkflowStep) {
    if (canOpenStep(target)) setStep(target);
  }

  async function startPulse() {
    if (locationState === "locking") return;

    setStep("location");
    setElapsed(0);
    setReport("");
    setSubmittedReport("");
    setTriageResult(null);
    setDispatchCall({ status: "idle" });
    setHospitals([]);
    setSafetyLab(null);
    safetyLabStartedRef.current = false;
    retriedCallRef.current = null;
    committedSpeechRef.current = "";
    setLocationError("");
    setIncidentLocation(null);
    setLocationState("locking");

    try {
      const location = await requestCurrentLocation();
      setIncidentLocation(location);
      setLocationState("locked");
      setStep("listen");
    } catch (error) {
      setLocationState("unavailable");
      setLocationError(describeLocationError(error));
      setStep("location");
      return;
    }

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
    setStep("triage");

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

    setStep("hospitals");

    try {
      const hospitalSearch = await loadNearbyHospitals();
      const chosenHospital = hospitalSearch.hospitals[0];
      if (!chosenHospital) {
        throw new Error("No hospital candidates were available.");
      }
      setSpeechState("idle");
      setStep("dispatch");
      startDispatchCall(
        cleaned,
        resolvedTriage,
        chosenHospital,
        hospitalSearch.incidentLocation,
        0,
      );
    } catch (error) {
      setSpeechState("idle");
      setStep("dispatch");
      setDispatchCall({
        status: "failed",
        error: error instanceof Error ? error.message : "Hospital search failed",
      });
    }
  }

  async function loadNearbyHospitals() {
    if (!incidentLocation) {
      throw new Error("GPS location is required before hospital search.");
    }

    const params = new URLSearchParams({
      lat: String(incidentLocation.latitude),
      lng: String(incidentLocation.longitude),
    });

    try {
      const response = await fetch(`/api/hospitals?${params.toString()}`);
      if (!response.ok) throw new Error("Hospital search failed");
      const data = (await response.json()) as {
        incidentLocation: IncidentLocation;
        hospitals: HospitalCandidate[];
        source?: "google_places" | "fallback";
      };
      const resolvedLocation = {
        ...incidentLocation,
        ...data.incidentLocation,
        accuracy: incidentLocation.accuracy,
      };
      const resolvedHospitals = data.hospitals.length > 0 ? data.hospitals : fallbackHospitals(resolvedLocation);
      setIncidentLocation(resolvedLocation);
      setHospitals(resolvedHospitals);
      return {
        incidentLocation: resolvedLocation,
        hospitals: resolvedHospitals,
      };
    } catch {
      const resolvedHospitals = fallbackHospitals(incidentLocation);
      setHospitals(resolvedHospitals);
      return {
        incidentLocation,
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
        callTarget?: "test_receiver";
        selectedHospitalPhone?: string;
      };
      setDispatchCall({
        callId: data.callId,
        hospitalName: hospital.name,
        hospitalIndex,
        receivingPhone: data.receivingPhone,
        callTarget: data.callTarget,
        selectedHospitalPhone: data.selectedHospitalPhone,
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
    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechState("unsupported");
      return;
    }

    const hasMicrophone = await requestMicrophoneAccess();
    if (!hasMicrophone) {
      setSpeechState("error");
      return;
    }

    try {
      recognitionRef.current?.abort();
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      shouldListenRef.current = true;
      committedSpeechRef.current = "";

      recognition.onresult = (event: SpeechEventLike) => {
        let interim = "";
        let committed = committedSpeechRef.current;

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) {
            committed += `${transcript.trim()} `;
          } else {
            interim += transcript;
          }
        }

        committedSpeechRef.current = committed;
        setReport(`${committed}${interim}`.trimStart());
      };

      recognition.onerror = () => {
        setSpeechState("error");
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            setSpeechState("error");
          }
          return;
        }
        setSpeechState((current) => (current === "processing" ? current : "idle"));
      };

      recognition.start();
      setSpeechState("listening");
    } catch {
      setSpeechState("error");
    }
  }

  function reset() {
    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setStep("start");
    setReport("");
    setSubmittedReport("");
    setTriageResult(null);
    setDispatchCall({ status: "idle" });
    setIncidentLocation(null);
    setHospitals([]);
    retriedCallRef.current = null;
    setSpeechState("idle");
    setMicState("idle");
    setSafetyLab(null);
    safetyLabStartedRef.current = false;
    setElapsed(0);
    setLocationState("idle");
    setLocationError("");
  }

  return (
    <PulseShell
      activeStep={step}
      canOpenStep={canOpenStep}
      elapsed={elapsed}
      locationState={locationState}
      onReset={reset}
      onStepChange={openStep}
    >
      {step === "start" && (
        <StartScreen
          locationError={locationError}
          locationState={locationState}
          onStart={startPulse}
        />
      )}

      {(step === "location" || step === "listen") && (
        <LocationIntakeScreen
          incidentLocation={incidentLocation}
          locationError={locationError}
          locationState={locationState}
          micState={micState}
          mode={step}
          onProcess={() => submitCapturedReport()}
          onRequestLocation={startPulse}
          onRestartListening={startSpeechCapture}
          report={report}
          reportRef={reportRef}
          setReport={setReport}
          speechState={speechState}
        />
      )}

      {step === "triage" && (
        <TriageScreen
          isProcessing={speechState === "processing" && !triageResult}
          report={submittedReport}
          triage={triage}
        />
      )}

      {step === "hospitals" && (
        <HospitalScreen
          hospitals={hospitals}
          incidentLocation={incidentLocation}
          selectedHospital={selectedHospital}
        />
      )}

      {step === "dispatch" && (
        <DispatchScreen
          dispatchCall={dispatchCall}
          elapsed={elapsed}
          events={visibleEvents}
          hospitals={hospitals}
          incidentLocation={incidentLocation}
          report={submittedReport}
          safetyLab={safetyLab}
          safetyLabLoading={!safetyLab && safetyLabStartedRef.current}
          selectedHospital={selectedHospital}
          triage={triage}
        />
      )}
    </PulseShell>
  );
}

function PulseShell({
  activeStep,
  canOpenStep,
  children,
  elapsed,
  locationState,
  onReset,
  onStepChange,
}: {
  activeStep: WorkflowStep;
  canOpenStep: (step: WorkflowStep) => boolean;
  children: React.ReactNode;
  elapsed: number;
  locationState: LocationState;
  onReset: () => void;
  onStepChange: (step: WorkflowStep) => void;
}) {
  return (
    <main className="min-h-screen bg-[#081116] text-[#f8f4ec]">
      <section className="mx-auto grid min-h-screen w-full max-w-[1540px] gap-4 p-3 md:p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/10 bg-[rgba(13,23,29,0.86)] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex">
          <BrandBlock />
          <StepRail activeStep={activeStep} canOpenStep={canOpenStep} onStepChange={onStepChange} />
          <div className="mt-auto space-y-3">
            <SystemStatus locationState={locationState} />
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b98a5]">
              Session {formatTime(elapsed)}
            </p>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col gap-4">
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(13,23,29,0.88)] p-3 shadow-xl shadow-black/25 backdrop-blur-xl lg:hidden">
            <BrandBlock compact />
            <div className="flex items-center gap-2">
              {activeStep !== "start" && (
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#b6c0ca] transition hover:border-[#d92d38] hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </header>

          <MobileStepper activeStep={activeStep} />

          <section className="min-w-0 flex-1">{children}</section>

          {activeStep !== "start" && (
            <button
              type="button"
              onClick={onReset}
              className="fixed bottom-4 right-4 z-30 hidden rounded-xl border border-white/10 bg-[rgba(17,31,39,0.92)] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#b6c0ca] shadow-2xl shadow-black/30 backdrop-blur transition hover:border-[#d92d38] hover:text-white lg:block"
            >
              Reset
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "px-1 pb-5"}`}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d92d38] text-white shadow-lg shadow-[rgba(217,45,56,0.28)]">
        <Siren className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-black tracking-[0.28em] text-white">PULSE</p>
        <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#8b98a5]">
          Emergency
        </p>
      </div>
    </div>
  );
}

function StepRail({
  activeStep,
  canOpenStep,
  onStepChange,
}: {
  activeStep: WorkflowStep;
  canOpenStep: (step: WorkflowStep) => boolean;
  onStepChange: (step: WorkflowStep) => void;
}) {
  const currentIndex = stepIndex(activeStep);

  return (
    <nav className="grid gap-1">
      {stepDefinitions.map((step, index) => {
        const Icon = step.icon;
        const active = step.id === activeStep;
        const complete = index < currentIndex;
        const disabled = !canOpenStep(step.id);
        return (
          <button
            key={step.id}
            type="button"
            disabled={disabled}
            onClick={() => onStepChange(step.id)}
            className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
              active
                ? "border-[rgba(217,45,56,0.55)] bg-[rgba(217,45,56,0.13)] text-white"
                : complete
                  ? "border-transparent bg-[rgba(255,255,255,0.04)] text-[#b6c0ca] hover:border-white/10"
                  : "border-transparent text-[#8b98a5] hover:border-white/10 hover:bg-white/[0.03]"
            } ${disabled ? "opacity-45" : ""}`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                active
                  ? "border-[rgba(217,45,56,0.55)] bg-[#d92d38] text-white"
                  : complete
                    ? "border-[rgba(53,166,106,0.4)] bg-[rgba(53,166,106,0.13)] text-[#35a66a]"
                    : "border-white/10 bg-white/[0.03] text-[#8b98a5]"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{step.label}</span>
              <span className="block truncate text-[11px] font-semibold text-[#8b98a5]">{step.detail}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileStepper({ activeStep }: { activeStep: WorkflowStep }) {
  const activeIndex = stepIndex(activeStep);

  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[rgba(13,23,29,0.7)] p-2 lg:hidden">
      {stepDefinitions.map((step, index) => (
        <div
          key={step.id}
          className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
            step.id === activeStep
              ? "bg-[#d92d38] text-white"
              : index < activeIndex
                ? "bg-[rgba(53,166,106,0.13)] text-[#35a66a]"
                : "bg-white/[0.04] text-[#8b98a5]"
          }`}
        >
          <span>{index + 1}</span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function SystemStatus({ locationState }: { locationState: LocationState }) {
  const ready = locationState === "locked";
  return (
    <div className="rounded-xl border border-[rgba(53,166,106,0.24)] bg-[rgba(53,166,106,0.09)] p-3">
      <div className="flex items-center gap-2 text-[#35a66a]">
        <ShieldCheck className="size-4" />
        <p className="text-xs font-black uppercase tracking-[0.12em]">
          {ready ? "GPS verified" : "System normal"}
        </p>
      </div>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8b98a5]">
        All services operational. GPS is required before dispatch.
      </p>
    </div>
  );
}

function StartScreen({
  locationError,
  locationState,
  onStart,
}: {
  locationError: string;
  locationState: LocationState;
  onStart: () => void;
}) {
  const isLocating = locationState === "locking";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_420px]">
      <Panel className="pulse-shell-grid min-h-[72vh] overflow-hidden p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <StatusPill icon={Activity} label="Autonomous emergency dispatch" tone="neutral" />
            <h1 className="mt-8 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-7xl sm:leading-[0.95]">
              One tap. One report. Dispatch starts.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[#b6c0ca] sm:mt-6 sm:text-lg sm:leading-8">
              Pulse locks live GPS, listens to the bystander, structures the emergency, ranks nearby hospitals, and routes a selected hospital scenario to the configured test receiver.
            </p>
          </div>
          <GpsStatusPill locationState={locationState} />
        </div>

        <div className="mt-8 grid items-center gap-8 sm:mt-12 lg:grid-cols-[minmax(260px,0.55fr)_minmax(0,1fr)] lg:gap-10">
          <button
            type="button"
            onClick={onStart}
            disabled={isLocating}
            className="pulse-orb mx-auto grid aspect-square w-44 place-items-center rounded-full border border-white/20 bg-[linear-gradient(145deg,#f44950,#9d1824)] text-center text-white shadow-2xl shadow-[rgba(217,45,56,0.45)] ring-[10px] ring-[rgba(217,45,56,0.16)] transition duration-300 hover:scale-[1.02] focus:outline-none focus:ring-[rgba(217,45,56,0.35)] disabled:scale-100 sm:w-64"
          >
            <span className="relative z-10 grid place-items-center gap-3">
              {isLocating ? <Loader2 className="size-9 animate-spin" /> : <Activity className="size-9" />}
              <span className="text-xl font-black uppercase leading-6 tracking-[0.04em] sm:text-2xl sm:leading-7">
                {isLocating ? "Locking GPS" : "Start Pulse"}
              </span>
            </span>
          </button>

          <div className="grid gap-4">
            {locationError && (
              <div className="rounded-2xl border border-[rgba(217,45,56,0.38)] bg-[rgba(217,45,56,0.12)] p-4">
                <div className="flex items-center gap-2 text-[#d92d38]">
                  <AlertTriangle className="size-5" />
                  <p className="text-sm font-black uppercase tracking-[0.14em]">Location required</p>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#b6c0ca]">{locationError}</p>
              </div>
            )}
            <Panel className="bg-[rgba(17,31,39,0.78)] p-4">
              <p className="text-sm font-black text-white">What happens next</p>
              <div className="mt-4 grid gap-3">
                {[
                  "Listen to the situation",
                  "Capture live GPS",
                  "Assess risk and guide you",
                  "Route selected hospital scenario",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#b6c0ca]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#081116]">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="bg-[rgba(17,31,39,0.78)] p-4">
              <div className="flex gap-3">
                <Lock className="mt-1 size-5 shrink-0 text-[#b6c0ca]" />
                <div>
                  <p className="text-sm font-black text-white">Secure and private</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#8b98a5]">
                    Location is requested only when a Pulse session starts and is attached to the emergency package.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Live readiness</p>
        <div className="mt-5 grid gap-3">
          <ReadinessRow active={locationState === "locked"} icon={Crosshair} label="GPS location" />
          <ReadinessRow active={false} icon={Mic} label="Voice transcript" />
          <ReadinessRow active={false} icon={Stethoscope} label="AI triage" />
          <ReadinessRow active={false} icon={Hospital} label="Hospital ranking" />
          <ReadinessRow active={false} icon={PhoneCall} label="Test dispatch call" />
        </div>
      </Panel>
    </div>
  );
}

function LocationIntakeScreen({
  incidentLocation,
  locationError,
  locationState,
  micState,
  mode,
  onProcess,
  onRequestLocation,
  onRestartListening,
  report,
  reportRef,
  setReport,
  speechState,
}: {
  incidentLocation: IncidentLocation | null;
  locationError: string;
  locationState: LocationState;
  micState: MicState;
  mode: "location" | "listen";
  onProcess: () => void;
  onRequestLocation: () => void;
  onRestartListening: () => void;
  report: string;
  reportRef: React.RefObject<HTMLTextAreaElement | null>;
  setReport: (value: string) => void;
  speechState: SpeechState;
}) {
  const canProcess = report.trim().length >= 12;
  const locked = locationState === "locked" && incidentLocation;
  const statusCopy =
    locationState === "locking"
      ? "Requesting precise GPS"
      : !locked
        ? "GPS required before intake"
        : micState === "requesting"
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
      <Panel className="min-h-[72vh] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill icon={mode === "location" ? Crosshair : Mic} label={mode === "location" ? "Location" : "Voice intake"} tone="red" />
            <h1 className="mt-4 text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
              {locked ? "Tell us what happened." : "We need your location."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#8b98a5]">
              {locked
                ? "Speak clearly. Pulse will keep the transcript editable so you can correct it before triage."
                : "Pulse uses real GPS to route hospital search and attach the incident location to dispatch context."}
            </p>
          </div>
          <GpsStatusPill location={incidentLocation} locationState={locationState} />
        </div>

        <Panel className="mt-6 bg-[rgba(17,31,39,0.72)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${locked ? "bg-[rgba(53,166,106,0.15)] text-[#35a66a]" : "bg-[rgba(217,45,56,0.15)] text-[#d92d38]"}`}>
                {locationState === "locking" ? <Loader2 className="size-5 animate-spin" /> : <Navigation className="size-5" />}
              </span>
              <div>
                <p className="text-sm font-black text-white">GPS lock</p>
                <p className="text-xs font-semibold text-[#8b98a5]">
                  {locked
                    ? `${formatCoordinates(incidentLocation)}${incidentLocation.accuracy != null ? ` · ±${Math.round(incidentLocation.accuracy)}m` : ""}`
                    : locationError || "Allow location access to continue."}
                </p>
              </div>
            </div>
            {!locked && (
              <button
                type="button"
                onClick={onRequestLocation}
                disabled={locationState === "locking"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#d92d38] px-4 py-3 text-sm font-black text-white transition hover:bg-[#a51d2a] disabled:bg-white/10 disabled:text-[#8b98a5]"
              >
                {locationState === "locking" ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                {locationState === "locking" ? "Locking GPS" : "Allow Location Access"}
              </button>
            )}
          </div>
        </Panel>

        <Panel className="mt-5 bg-[rgba(8,17,22,0.72)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${speechState === "listening" ? "bg-[rgba(217,45,56,0.18)] text-[#d92d38]" : "bg-white/[0.05] text-[#8b98a5]"}`}>
                <Mic className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-white">{statusCopy}</p>
                <p className="text-xs font-semibold text-[#8b98a5]">Review the transcript before processing.</p>
              </div>
            </div>
            <Waveform active={speechState === "listening"} />
          </div>

          <label htmlFor="incident-report" className="mt-6 block text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">
            Live speech-to-text transcript
          </label>
          <textarea
            ref={reportRef}
            id="incident-report"
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder={locked ? "Say what happened, where you are, and what you can see." : "GPS lock is required before voice intake starts."}
            disabled={!locked || speechState === "processing"}
            className="mt-3 min-h-72 w-full resize-none rounded-2xl border border-white/10 bg-[rgba(17,31,39,0.75)] p-5 text-xl font-bold leading-9 text-white outline-none transition placeholder:text-[#8b98a5] focus:border-[rgba(217,45,56,0.65)] focus:ring-4 focus:ring-[rgba(217,45,56,0.16)] disabled:text-[#8b98a5] sm:text-2xl"
          />
        </Panel>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRestartListening}
            disabled={!locked}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.03] px-5 text-sm font-black text-white transition hover:border-[#d92d38] disabled:text-[#8b98a5]"
          >
            <RefreshCw className="size-4" />
            Restart Listening
          </button>
          <button
            type="button"
            onClick={onProcess}
            disabled={!canProcess || speechState === "processing"}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#d92d38] px-5 text-sm font-black text-white shadow-lg shadow-[rgba(217,45,56,0.22)] transition hover:bg-[#a51d2a] disabled:bg-white/10 disabled:text-[#8b98a5]"
          >
            {speechState === "processing" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {speechState === "processing" ? "Processing" : "Process Now"}
          </button>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Capture readiness</p>
        <div className="mt-5 grid gap-3">
          <ReadinessRow active={Boolean(locked)} icon={Crosshair} label="GPS location ready" />
          <ReadinessRow active={micState === "granted"} icon={Mic} label="Microphone granted" />
          <ReadinessRow active={speechState === "listening"} icon={Radio} label="Speech recognition live" />
          <ReadinessRow active={report.trim().length >= 12} icon={FileText} label="Report ready" />
        </div>
        {(speechState === "unsupported" || speechState === "error" || micState === "denied") && (
          <div className="mt-5 rounded-2xl border border-[rgba(232,179,80,0.28)] bg-[rgba(232,179,80,0.1)] p-4">
            <p className="text-sm font-semibold leading-6 text-[#b6c0ca]">
              Microphone access is not active. The transcript box remains editable after GPS is locked.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function TriageScreen({
  isProcessing,
  report,
  triage,
}: {
  isProcessing: boolean;
  report: string;
  triage: TriageResult;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel className="min-h-[72vh] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill icon={Stethoscope} label="AI triage assessment" tone="red" />
            <h1 className="mt-4 text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
              {isProcessing ? "Assessing the report." : triage.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#8b98a5]">
              Pulse converts the bystander report into a focused emergency brief and immediate safety guidance.
            </p>
          </div>
          <SourceBadge source={triage.source} />
        </div>

        <div className="mt-6 rounded-2xl border border-[rgba(217,45,56,0.38)] bg-[linear-gradient(135deg,rgba(217,45,56,0.22),rgba(217,45,56,0.08))] p-5">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#d92d38] text-white">
              <AlertTriangle className="size-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">
                {triage.severity} · get help now
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white">{triage.warning}</h2>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Panel className="bg-[rgba(17,31,39,0.72)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">Signals detected</p>
            <div className="mt-4 grid gap-2">
              {triage.signals.map((signal) => (
                <div key={signal} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <CircleDot className="size-4 shrink-0 text-[#d92d38]" />
                  <span className="text-sm font-bold text-[#b6c0ca]">{signal}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="bg-[rgba(17,31,39,0.72)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">Care route</p>
            <h3 className="mt-4 text-2xl font-black leading-tight text-white">{triage.hospitalType}</h3>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#8b98a5]">{triage.dispatchBrief}</p>
          </Panel>
        </div>
      </Panel>

      <GuidancePanel actions={triage.actions} report={report} />
    </div>
  );
}

function HospitalScreen({
  hospitals,
  incidentLocation,
  selectedHospital,
}: {
  hospitals: HospitalCandidate[];
  incidentLocation: IncidentLocation | null;
  selectedHospital?: HospitalCandidate;
}) {
  const loading = hospitals.length === 0;
  const fallbackMode = hospitals.some((hospital) => hospital.source === "fallback");

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <Panel className="min-h-[72vh] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill icon={Hospital} label="Nearby hospitals" tone="red" />
            <h1 className="mt-4 text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
              {loading ? "Finding emergency facilities." : "Hospitals ranked by distance."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#8b98a5]">
              Distances are computed from the locked GPS location. Fallback results are labeled when Google Places is unavailable.
            </p>
          </div>
          {fallbackMode ? <SourceBadge source="fallback" /> : hospitals[0] ? <SourceBadge source={hospitals[0].source} /> : <StatusPill icon={Loader2} label="Searching" tone="neutral" />}
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <LoadingPanel label="Searching hospitals around the GPS location" />
          ) : (
            hospitals.map((hospital, index) => (
              <HospitalCard
                key={hospital.id}
                hospital={hospital}
                index={index}
                selected={hospital.id === selectedHospital?.id}
              />
            ))
          )}
        </div>
      </Panel>

      <AbstractRouteMap hospitals={hospitals} incidentLocation={incidentLocation} selectedHospital={selectedHospital} />
    </div>
  );
}

function DispatchScreen({
  dispatchCall,
  elapsed,
  events,
  hospitals,
  incidentLocation,
  report,
  safetyLab,
  safetyLabLoading,
  selectedHospital,
  triage,
}: {
  dispatchCall: DispatchCall;
  elapsed: number;
  events: Array<{ at: number; label: string }>;
  hospitals: HospitalCandidate[];
  incidentLocation: IncidentLocation | null;
  report: string;
  safetyLab: SafetyLabResult | null;
  safetyLabLoading: boolean;
  selectedHospital?: HospitalCandidate;
  triage: TriageResult;
}) {
  const outcome = getCallOutcome(dispatchCall);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="grid content-start gap-4">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StatusPill icon={PhoneCall} label="Test dispatch call monitor" tone="red" />
              <h1 className="mt-4 text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
                {dispatchCall.hospitalName || selectedHospital?.name || "Dispatch in progress."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#8b98a5]">
                Pulse calls the configured test receiver with selected hospital context. It does not dial the hospital directly.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right">
              <p className="font-mono text-4xl font-black text-white">{formatTime(elapsed)}</p>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">Session timer</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <CallInfoTile
              icon={Headphones}
              label="Test receiver"
              title={dispatchCall.receivingPhone || "Configured receiver"}
              badge="Test mode"
            />
            <CallInfoTile
              icon={Hospital}
              label="Selected hospital"
              title={dispatchCall.hospitalName || selectedHospital?.name || "Selecting hospital"}
              badge={selectedHospital ? `${selectedHospital.distanceKm} km` : "Pending"}
            />
            <CallStatusCard dispatchCall={dispatchCall} outcome={outcome} />
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Live call transcript</p>
              <SourceBadge source="test_receiver" />
            </div>
            <p className="mt-4 min-h-32 text-sm font-semibold leading-7 text-[#b6c0ca]">
              {dispatchCall.transcript?.trim() ||
                dispatchCall.summary?.trim() ||
                `Pulse is placing a test-mode outbound call. ${triage.dispatchBrief} Bystander report: ${report}`}
            </p>
            {dispatchCall.callId && (
              <p className="mt-4 truncate font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#8b98a5]">
                Call ID: {dispatchCall.callId}
              </p>
            )}
          </Panel>

          <Panel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Dispatch outcome</p>
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                outcome.tone === "success"
                  ? "border-[rgba(53,166,106,0.35)] bg-[rgba(53,166,106,0.12)]"
                  : outcome.tone === "danger"
                    ? "border-[rgba(217,45,56,0.38)] bg-[rgba(217,45,56,0.12)]"
                    : outcome.tone === "warning"
                      ? "border-[rgba(232,179,80,0.32)] bg-[rgba(232,179,80,0.1)]"
                      : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p className="text-xl font-black text-white">{outcome.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#b6c0ca]">{outcome.detail}</p>
            </div>
            {selectedHospital?.phone && (
              <p className="mt-4 text-xs font-semibold leading-5 text-[#8b98a5]">
                Listed hospital phone from Google Places: <span className="font-mono text-[#b6c0ca]">{selectedHospital.phone}</span>. This number is context only.
              </p>
            )}
          </Panel>
        </div>

        <GuidancePanel actions={triage.actions} report={report} compact />
      </section>

      <aside className="grid content-start gap-4">
        <AbstractRouteMap hospitals={hospitals} incidentLocation={incidentLocation} selectedHospital={selectedHospital} compact />
        <TimelinePanel events={events} />
        <SafetyLabPanel loading={safetyLabLoading} result={safetyLab} />
      </aside>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#0d171d] shadow-2xl shadow-black/25 ${className}`}>
      {children}
    </section>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "neutral" | "red" | "green" | "warning";
}) {
  const toneClass =
    tone === "red"
      ? "border-[rgba(217,45,56,0.32)] bg-[rgba(217,45,56,0.12)] text-[#ff8088]"
      : tone === "green"
        ? "border-[rgba(53,166,106,0.32)] bg-[rgba(53,166,106,0.12)] text-[#35a66a]"
        : tone === "warning"
          ? "border-[rgba(232,179,80,0.32)] bg-[rgba(232,179,80,0.12)] text-[#e8b350]"
          : "border-white/10 bg-white/[0.04] text-[#b6c0ca]";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${toneClass}`}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: SourceBadgeValue }) {
  const labels: Record<SourceBadgeValue, string> = {
    google_places: "Google Places",
    fallback: "Fallback",
    openai: "OpenAI",
    local_fallback: "Local fallback",
    adaption: "Adaption",
    local: "Local",
    gps: "GPS",
    test_receiver: "Test receiver",
  };
  const tone =
    source === "fallback" || source === "local_fallback" || source === "local"
      ? "border-[rgba(232,179,80,0.32)] bg-[rgba(232,179,80,0.12)] text-[#e8b350]"
      : source === "test_receiver"
        ? "border-[rgba(217,45,56,0.32)] bg-[rgba(217,45,56,0.12)] text-[#ff8088]"
        : "border-[rgba(53,166,106,0.32)] bg-[rgba(53,166,106,0.12)] text-[#35a66a]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${tone}`}>
      <CheckCircle2 className="size-3.5" />
      {labels[source]}
    </span>
  );
}

function GpsStatusPill({
  location,
  locationState,
}: {
  location?: IncidentLocation | null;
  locationState: LocationState;
}) {
  if (locationState === "locked" && location) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(53,166,106,0.32)] bg-[rgba(53,166,106,0.12)] px-3 py-2 text-xs font-black text-[#35a66a]">
        <MapPin className="size-4" />
        GPS ready · ±{location.accuracy != null ? Math.round(location.accuracy) : "?"}m
      </span>
    );
  }

  if (locationState === "locking") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-[#b6c0ca]">
        <Loader2 className="size-4 animate-spin" />
        GPS locking
      </span>
    );
  }

  if (locationState === "unavailable") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(217,45,56,0.36)] bg-[rgba(217,45,56,0.12)] px-3 py-2 text-xs font-black text-[#ff8088]">
        <AlertTriangle className="size-4" />
        GPS required
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-[#8b98a5]">
      <Crosshair className="size-4" />
      GPS pending
    </span>
  );
}

function ReadinessRow({ active, icon: Icon, label }: { active: boolean; icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-8 place-items-center rounded-lg ${active ? "bg-[rgba(53,166,106,0.13)] text-[#35a66a]" : "bg-white/[0.04] text-[#8b98a5]"}`}>
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-bold text-[#b6c0ca]">{label}</span>
      </div>
      <span className={`size-2.5 rounded-full ${active ? "bg-[#35a66a]" : "bg-[#8b98a5]"}`} />
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-12 items-center gap-1">
      {Array.from({ length: 34 }).map((_, index) => (
        <span
          key={index}
          className={`pulse-wave-bar ${active ? "" : "opacity-35 grayscale"}`}
          style={{ animationDelay: `${index * 42}ms` }}
        />
      ))}
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
      <div>
        <Loader2 className="mx-auto size-9 animate-spin text-[#d92d38]" />
        <p className="mt-4 text-sm font-black text-white">{label}</p>
        <p className="mt-1 text-xs font-semibold text-[#8b98a5]">Live data stays labeled by source.</p>
      </div>
    </div>
  );
}

function GuidancePanel({
  actions,
  compact = false,
  report,
}: {
  actions: string[];
  compact?: boolean;
  report: string;
}) {
  return (
    <Panel className={`p-5 ${compact ? "" : "min-h-[72vh]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Guidance for you</p>
          <h2 className="mt-2 text-2xl font-black text-white">Stay with the patient.</h2>
        </div>
        <ListChecks className="size-6 text-[#35a66a]" />
      </div>
      <div className="mt-5 grid gap-2">
        {actions.map((action, index) => (
          <div key={action} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(53,166,106,0.12)] text-xs font-black text-[#35a66a]">
              {index + 1}
            </span>
            <p className="text-sm font-bold leading-5 text-[#b6c0ca]">{action}</p>
          </div>
        ))}
      </div>
      {!compact && report && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[rgba(8,17,22,0.55)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">Bystander report</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#b6c0ca]">{report}</p>
        </div>
      )}
    </Panel>
  );
}

function HospitalCard({
  hospital,
  index,
  selected,
}: {
  hospital: HospitalCandidate;
  index: number;
  selected: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected
          ? "border-[rgba(217,45,56,0.58)] bg-[rgba(217,45,56,0.11)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${selected ? "bg-[#d92d38] text-white" : "bg-white/[0.06] text-[#b6c0ca]"}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">{hospital.name}</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#8b98a5]">{hospital.address}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-black text-white">{hospital.distanceKm} km</p>
          <SourceBadge source={hospital.source} />
        </div>
      </div>
      {hospital.phone && (
        <p className="mt-3 font-mono text-xs font-semibold text-[#8b98a5]">Listed phone: {hospital.phone}</p>
      )}
    </div>
  );
}

function AbstractRouteMap({
  compact = false,
  hospitals,
  incidentLocation,
  selectedHospital,
}: {
  compact?: boolean;
  hospitals: HospitalCandidate[];
  incidentLocation: IncidentLocation | null;
  selectedHospital?: HospitalCandidate;
}) {
  const markers = hospitals.slice(0, compact ? 3 : 5);
  const positions = [
    { left: "68%", top: "36%" },
    { left: "38%", top: "24%" },
    { left: "32%", top: "62%" },
    { left: "76%", top: "70%" },
    { left: "52%", top: "52%" },
  ];

  return (
    <Panel className={`overflow-hidden p-4 ${compact ? "min-h-[360px]" : "min-h-[72vh]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Distance view</p>
          <h2 className="mt-2 text-2xl font-black text-white">Abstract route preview</h2>
        </div>
        <Route className="size-6 text-[#35a66a]" />
      </div>
      <div className="pulse-route-map relative mt-5 min-h-[300px] overflow-hidden rounded-2xl border border-white/10">
        <div className="pulse-route-line absolute left-[48%] top-[18%] h-[68%] w-1 -rotate-[18deg] rounded-full opacity-80" />
        <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-[rgba(8,17,22,0.82)] p-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[#d92d38]" />
            <p className="text-xs font-black text-white">Your location</p>
          </div>
          <p className="mt-1 font-mono text-[11px] text-[#8b98a5]">
            {incidentLocation ? formatCoordinates(incidentLocation) : "Waiting for GPS"}
          </p>
        </div>
        {markers.map((hospital, index) => (
          <div
            key={hospital.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${hospital.id === selectedHospital?.id ? "z-10" : ""}`}
            style={positions[index]}
          >
            <div
              className={`grid size-12 place-items-center rounded-full border text-sm font-black shadow-xl ${
                hospital.id === selectedHospital?.id
                  ? "border-[rgba(53,166,106,0.85)] bg-[#35a66a] text-white shadow-[rgba(53,166,106,0.28)]"
                  : "border-white/10 bg-[rgba(17,31,39,0.92)] text-[#b6c0ca]"
              }`}
            >
              {index + 1}
            </div>
            <p className="mt-2 hidden max-w-36 rounded-lg bg-[rgba(8,17,22,0.78)] px-2 py-1 text-center text-[10px] font-black text-white backdrop-blur sm:block">
              {hospital.distanceKm} km
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[#8b98a5]">
        This is a visual route summary, not a live map. Hospital ranking uses real GPS distance from the locked location.
      </p>
    </Panel>
  );
}

function CallInfoTile({
  badge,
  icon: Icon,
  label,
  title,
}: {
  badge: string;
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-[#b6c0ca]">
          <Icon className="size-5" />
        </span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8b98a5]">
          {badge}
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#8b98a5]">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-white">{title}</p>
    </div>
  );
}

function CallStatusCard({
  dispatchCall,
  outcome,
}: {
  dispatchCall: DispatchCall;
  outcome: ReturnType<typeof getCallOutcome>;
}) {
  const statusLabel =
    dispatchCall.status === "failed"
      ? "Failed"
      : dispatchCall.status === "ended"
        ? "Ended"
        : dispatchCall.status === "in-progress"
          ? "Connected"
          : dispatchCall.status === "ringing"
            ? "Ringing"
            : dispatchCall.status === "queued"
              ? "Queued"
              : dispatchCall.status === "starting"
                ? "Starting"
                : "Waiting";
  const tone =
    outcome.tone === "success"
      ? "border-[rgba(53,166,106,0.36)] bg-[rgba(53,166,106,0.12)] text-[#35a66a]"
      : outcome.tone === "danger"
        ? "border-[rgba(217,45,56,0.38)] bg-[rgba(217,45,56,0.12)] text-[#ff8088]"
        : "border-[rgba(232,179,80,0.32)] bg-[rgba(232,179,80,0.1)] text-[#e8b350]";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-black/20">
          <Radio className="size-5" />
        </span>
        <span className="text-xs font-black uppercase tracking-[0.16em]">{statusLabel}</span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] opacity-80">Call status</p>
      <p className="mt-2 text-lg font-black text-white">{outcome.label}</p>
    </div>
  );
}

function TimelinePanel({ events }: { events: Array<{ at: number; label: string }> }) {
  return (
    <Panel className="p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Call timeline</p>
      <div className="mt-4 grid gap-3">
        {dispatchSchedule.map((event) => {
          const visible = events.some((item) => item.label === event.label);
          return (
            <div key={event.label} className="flex items-center gap-3">
              <span className={`grid size-8 place-items-center rounded-full border ${visible ? "border-[rgba(53,166,106,0.4)] bg-[rgba(53,166,106,0.13)] text-[#35a66a]" : "border-white/10 bg-white/[0.03] text-[#8b98a5]"}`}>
                {visible ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${visible ? "text-white" : "text-[#8b98a5]"}`}>{event.label}</p>
                <p className="font-mono text-[11px] text-[#8b98a5]">{visible ? formatTime(event.at) : "--:--"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
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
  const scenarios = result?.scenarios.slice(0, 2) ?? [];

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b98a5]">Safety lab</p>
          <h3 className="mt-2 text-xl font-black leading-tight text-white">Emergency eval dataset</h3>
        </div>
        <SourceBadge source={result?.source || "local"} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricTile label="Cases" value={loading ? "..." : String(result?.rowCount ?? 8)} />
        <MetricTile label="Credits" value={result?.estimatedCredits != null ? `${result.estimatedCredits}` : loading ? "..." : "0"} />
        <MetricTile label="Minutes" value={result?.estimatedMinutes != null ? `${result.estimatedMinutes}` : loading ? "..." : "0"} />
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-[#8b98a5]">
        {loading
          ? "Uploading emergency edge cases without blocking dispatch."
          : result?.note || `${statusLabel}. Emergency edge cases are ready.`}
      </p>
      {scenarios.length > 0 && (
        <div className="mt-3 grid gap-2">
          {scenarios.map((scenario) => (
            <div key={scenario.transcript} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="truncate text-xs font-black text-white">{scenario.transcript}</p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b98a5]">
                {scenario.expectedType} · {scenario.expectedRoute}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8b98a5]">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
