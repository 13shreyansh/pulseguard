"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileCheck2,
  HeartPulse,
  Keyboard,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FlowStep = "landing" | "capture" | "review" | "dispatching" | "result";
type MicState = "idle" | "connecting" | "listening" | "processing" | "denied" | "error";
type BriefState = "idle" | "loading" | "ready" | "stale" | "unavailable";
type CareState = "idle" | "loading" | "available" | "unavailable";
type Outcome = "dispatch_confirmed" | "desk_receipt_only" | "declined" | "unreachable" | "technical_failure" | "verification_only";
type EvidenceResult = "yes" | "no" | "unknown";

type IncidentLocation = {
  label: string;
  source: "gps" | "manual";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

type IncidentBrief = {
  summary: string;
  incidentType: "collision" | "fall" | "medical" | "fire" | "other" | "unknown";
  consciousness: "awake" | "unresponsive" | "unknown";
  breathing: "normal" | "difficulty" | "not_breathing" | "unknown";
  visibleBleeding: "none_reported" | "present" | "severe" | "unknown";
  peopleCount: number | null;
  locationDetail: string | null;
  missingFacts: string[];
};

type HospitalCandidate = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  travelTimeMinutes?: number;
  mapsUrl: string;
  appearsOperational?: boolean;
};

type DispatchEvidence = {
  briefReceived: { result: EvidenceResult; evidence?: string };
  vehicleAssigned: { result: EvidenceResult; evidence?: string };
  destination: { result: "known" | "unknown"; value?: string; evidence?: string };
  eta: { result: "known" | "unknown"; minutes?: number; evidence?: string };
  uncertaintyReason?: string;
};

type DispatchResult = {
  outcome: Outcome;
  evidence: DispatchEvidence;
  messageAcknowledged: boolean;
  error?: string;
};

const unknownEvidence: DispatchEvidence = {
  briefReceived: { result: "unknown" },
  vehicleAssigned: { result: "unknown" },
  destination: { result: "unknown" },
  eta: { result: "unknown" },
};

function makeId(prefix: string) {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${random}`.slice(0, 80);
}

function displayValue(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function mapsUrl(location: IncidentLocation) {
  const query = location.latitude != null && location.longitude != null
    ? `${location.latitude},${location.longitude}`
    : location.label;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function PulseMark() {
  return (
    <span className="pulse-mark" aria-hidden="true">
      <HeartPulse size={20} strokeWidth={2.4} />
    </span>
  );
}

function Header() {
  return (
    <header className="app-header">
      <a className="brand" href="#top" aria-label="Pulse home">
        <PulseMark />
        <span>PULSE</span>
      </a>
      <span className="prototype-pill"><ShieldCheck size={14} /> Controlled prototype</span>
      <a className="emergency-link" href="tel:995"><Phone size={16} /> Call 995</a>
    </header>
  );
}

function SafetyStrip() {
  return (
    <aside className="safety-strip" aria-label="Singapore emergency notice">
      <div>
        <strong>Real emergency in Singapore?</strong>
        <span>Pulse does not contact SCDF or public emergency services.</span>
      </div>
      <a href="tel:995"><Phone size={18} /> Call 995</a>
    </aside>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Capture", "Review", "Connect"];
  return (
    <nav className="flow-progress" aria-label={`Step ${step} of 3`}>
      <div className="progress-copy"><span>Step {step} of 3</span><strong>{labels[step - 1]}</strong></div>
      <ol>
        {labels.map((label, index) => (
          <li key={label} className={index + 1 < step ? "complete" : index + 1 === step ? "current" : ""}>
            <span>{index + 1 < step ? <Check size={14} /> : index + 1}</span>
            <small>{label}</small>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function FieldStatus({ result }: { result: EvidenceResult | "known" }) {
  const tone = result === "yes" || result === "known" ? "verified" : result === "no" ? "negative" : "unknown";
  return <span className={`field-status ${tone}`}>{result === "yes" || result === "known" ? "Yes" : result === "no" ? "No" : "Unknown"}</span>;
}

export default function PulseApp() {
  const [step, setStep] = useState<FlowStep>("landing");
  const [incidentId, setIncidentId] = useState("");
  const [clientId] = useState(() => {
    if (typeof window === "undefined") return makeId("client");
    const stored = window.sessionStorage.getItem("pulseClientId");
    return stored && /^[a-zA-Z0-9_-]{12,80}$/.test(stored) ? stored : makeId("client");
  });
  const [gpsLocation, setGpsLocation] = useState<IncidentLocation | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "captured" | "unavailable">("idle");
  const [locationNotice, setLocationNotice] = useState("");
  const [report, setReport] = useState("");
  const [reviewedReport, setReviewedReport] = useState("");
  const [reportSource, setReportSource] = useState<"Typed" | "Live transcription" | "Final transcription">("Typed");
  const [micState, setMicState] = useState<MicState>("idle");
  const [userEdited, setUserEdited] = useState(false);
  const [liveSuggestion, setLiveSuggestion] = useState("");
  const [brief, setBrief] = useState<IncidentBrief | null>(null);
  const [briefState, setBriefState] = useState<BriefState>("idle");
  const [briefWarning, setBriefWarning] = useState("");
  const [briefModel, setBriefModel] = useState("");
  const [careState, setCareState] = useState<CareState>("idle");
  const [hospitals, setHospitals] = useState<HospitalCandidate[]>([]);
  const [accessCode, setAccessCode] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState("idle");
  const [messageAcknowledged, setMessageAcknowledged] = useState(false);
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const activeRecordingRef = useRef("");
  const activeIncidentRef = useRef("");
  const userEditedRef = useRef(false);
  const committedRef = useRef("");
  const interimRef = useRef("");
  const pollTimerRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const effectiveLocation = useMemo<IncidentLocation | null>(() => {
    const manual = manualLocation.trim();
    return manual.length >= 3 ? { label: manual, source: "manual" } : gpsLocation;
  }, [gpsLocation, manualLocation]);

  const reportReady = report.trim().length >= 12 && report.trim().length <= 2_000;
  const captureReady = Boolean(effectiveLocation && reportReady && micState !== "listening" && micState !== "connecting" && micState !== "processing");

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem("pulseClientId", clientId);
  }, [clientId]);

  const closeMedia = useCallback(() => {
    channelRef.current?.close();
    peerRef.current?.close();
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopEverything = useCallback(() => {
    activeRecordingRef.current = "";
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    chunksRef.current = [];
    closeMedia();
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, [closeMedia]);

  useEffect(() => stopEverything, [stopEverything]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (step === "dispatching") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step]);

  function startIncident() {
    stopEverything();
    const nextId = makeId("incident");
    activeIncidentRef.current = nextId;
    setIncidentId(nextId);
    setGpsLocation(null);
    setManualLocation("");
    setLocationState("idle");
    setLocationNotice("");
    setReport("");
    setReviewedReport("");
    setReportSource("Typed");
    setMicState("idle");
    setLiveSuggestion("");
    setBrief(null);
    setBriefState("idle");
    setBriefWarning("");
    setBriefModel("");
    setCareState("idle");
    setHospitals([]);
    setAccessCode("");
    setReviewConfirmed(false);
    setDispatchStatus("idle");
    setMessageAcknowledged(false);
    setResult(null);
    userEditedRef.current = false;
    setUserEdited(false);
    sendingRef.current = false;
    sessionStorage.removeItem("pulseActiveDispatch");
    setStep("capture");
    setAnnouncement("Capture started. Nothing has been sent to the controlled desk.");
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setLocationNotice("This browser cannot access location. Enter a landmark or address instead.");
      return;
    }
    setLocationState("requesting");
    setLocationNotice("Requesting permission");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!activeIncidentRef.current) return;
        const location: IncidentLocation = {
          label: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
          source: "gps",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };
        setGpsLocation(location);
        setLocationState("captured");
        setLocationNotice("Location captured on this device. It has not been sent.");
        setAnnouncement("Location captured on this device. It has not been sent.");
      },
      () => {
        setLocationState("unavailable");
        setLocationNotice("Location unavailable. Enter an address, postal code, or landmark instead.");
        setAnnouncement("Location unavailable. Manual location entry is ready.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  function recorderMimeType() {
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function liveText(recordingId: string, event: { type?: string; delta?: string; transcript?: string }) {
    if (recordingId !== activeRecordingRef.current || activeIncidentRef.current !== incidentId) return;
    if (event.type === "conversation.item.input_audio_transcription.delta" || event.type === "transcript.text.delta") {
      interimRef.current += event.delta || "";
    } else if (event.type === "conversation.item.input_audio_transcription.completed" || event.type === "transcript.text.done") {
      const completed = event.transcript?.trim();
      if (completed) committedRef.current += `${completed} `;
      interimRef.current = "";
    } else {
      return;
    }
    const next = `${committedRef.current}${interimRef.current}`.trimStart();
    if (userEditedRef.current) {
      setLiveSuggestion(next);
    } else {
      setReport(next);
      setReportSource("Live transcription");
    }
  }

  async function startMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection || !window.MediaRecorder) {
      setMicState("error");
      setAnnouncement("Microphone capture is unavailable. Type the report instead.");
      return;
    }
    closeMedia();
    chunksRef.current = [];
    committedRef.current = "";
    interimRef.current = "";
    setLiveSuggestion("");
    userEditedRef.current = report.trim().length > 0;
    setUserEdited(report.trim().length > 0);
    const recordingId = makeId("recording");
    activeRecordingRef.current = recordingId;
    const thisIncident = incidentId;
    setMicState("connecting");
    setAnnouncement("Requesting microphone access.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (activeRecordingRef.current !== recordingId || activeIncidentRef.current !== thisIncident) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = recorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (recordingId === activeRecordingRef.current && event.data.size) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      recorder.start(500);

      const sessionResponse = await fetch("/api/realtime/session", { method: "POST" });
      const session = (await sessionResponse.json().catch(() => null)) as { clientSecret?: string } | null;
      if (!sessionResponse.ok || !session?.clientSecret) throw new Error("realtime_unavailable");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = (message) => {
        try { liveText(recordingId, JSON.parse(message.data)); } catch { /* Ignore non-JSON events. */ }
      };
      channel.onerror = () => setAnnouncement("Live transcription paused. You can stop and type instead.");
      peer.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(peer.connectionState) && recordingId === activeRecordingRef.current) {
          setAnnouncement("Live transcription disconnected. Stop the microphone and type any missing words.");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const sdp = await fetch("https://api.openai.com/v1/realtime/calls?intent=transcription", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.clientSecret}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!sdp.ok) throw new Error("realtime_unavailable");
      await peer.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
      if (recordingId !== activeRecordingRef.current) return;
      setMicState("listening");
      setAnnouncement("Microphone active. Voice audio is streaming to OpenAI for transcription.");
    } catch (error) {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recorderRef.current = null;
      chunksRef.current = [];
      activeRecordingRef.current = "";
      closeMedia();
      setMicState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error");
      setAnnouncement("Microphone capture could not start. Type the report instead.");
    }
  }

  async function stopMicrophone() {
    const recordingId = activeRecordingRef.current;
    if (!recordingId) return;
    setMicState("processing");
    setAnnouncement("Microphone stopped. Finalizing the transcription.");
    const recorder = recorderRef.current;
    const audio = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: recorder?.mimeType || "audio/webm" }) : null);
        return;
      }
      recorder.onstop = () => resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }) : null);
      recorder.stop();
    });
    recorderRef.current = null;
    closeMedia();
    const fallback = `${committedRef.current}${interimRef.current}`.trim() || report.trim();
    try {
      if (audio && audio.size <= 10 * 1024 * 1024) {
        const form = new FormData();
        form.set("audio", audio, `pulse-${recordingId}.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
        form.set("fallbackText", fallback);
        const response = await fetch("/api/speech/finalize", { method: "POST", body: form });
        const data = (await response.json().catch(() => null)) as { text?: string; source?: string } | null;
        const finalText = data?.text?.trim() || fallback;
        if (recordingId === activeRecordingRef.current && activeIncidentRef.current === incidentId) {
          if (userEditedRef.current) setLiveSuggestion(finalText);
          else {
            setReport(finalText);
            setReportSource(data?.source === "openai" ? "Final transcription" : "Live transcription");
          }
        }
      }
    } finally {
      if (recordingId === activeRecordingRef.current) activeRecordingRef.current = "";
      chunksRef.current = [];
      setMicState("idle");
      setAnnouncement(userEditedRef.current
        ? "Final transcription is available as a suggestion. Your edited report was not changed."
        : "Microphone stopped. Review the report text before continuing.");
    }
  }

  function editReport(value: string) {
    userEditedRef.current = true;
    setUserEdited(true);
    setReport(value.slice(0, 2_000));
    setReportSource("Typed");
    if (briefState === "ready") setBriefState("stale");
  }

  const createBrief = useCallback(async (value: string, id: string) => {
    const controller = new AbortController();
    setBriefState("loading");
    setBriefWarning("");
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ report: value, incidentId: id }),
      });
      const data = (await response.json().catch(() => null)) as { brief?: IncidentBrief | null; warning?: string; model?: string } | null;
      if (controller.signal.aborted) return;
      if (data?.brief) {
        setBrief(data.brief);
        setBriefModel(data.model || "gpt-5.6");
        setBriefState("ready");
      } else {
        setBrief(null);
        setBriefWarning(data?.warning || "Pulse could not structure the report. Your reviewed words can still be sent unchanged.");
        setBriefState("unavailable");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setBrief(null);
      setBriefWarning("Pulse could not structure the report. Your reviewed words can still be sent unchanged.");
      setBriefState("unavailable");
    }
  }, []);

  const loadCareContext = useCallback(async (location: IncidentLocation) => {
    if (location.source !== "gps" || location.latitude == null || location.longitude == null) {
      setCareState("unavailable");
      setHospitals([]);
      return;
    }
    setCareState("loading");
    try {
      const params = new URLSearchParams({ lat: String(location.latitude), lng: String(location.longitude) });
      const response = await fetch(`/api/hospitals?${params}`);
      const data = (await response.json().catch(() => null)) as { source?: string; hospitals?: HospitalCandidate[] } | null;
      if (data?.source === "google_places" && data.hospitals?.length) {
        setHospitals(data.hospitals);
        setCareState("available");
      } else {
        setHospitals([]);
        setCareState("unavailable");
      }
    } catch {
      setHospitals([]);
      setCareState("unavailable");
    }
  }, []);

  function openReview() {
    if (!captureReady || !effectiveLocation) return;
    const cleaned = report.trim();
    setReport(cleaned);
    setReviewedReport(cleaned);
    setReviewConfirmed(false);
    setStep("review");
    setAnnouncement("Review every detail. Nothing has been sent to the controlled desk.");
    void createBrief(cleaned, incidentId);
    void loadCareContext(effectiveLocation);
  }

  const finishDispatch = useCallback((nextResult: DispatchResult) => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    sessionStorage.removeItem("pulseActiveDispatch");
    setResult(nextResult);
    setMessageAcknowledged(nextResult.messageAcknowledged);
    setStep("result");
    setAnnouncement(nextResult.outcome === "dispatch_confirmed"
      ? "Dispatch confirmed with explicit vehicle assignment evidence."
      : "Controlled handoff finished. Review the evidence receipt.");
    sendingRef.current = false;
  }, []);

  const pollDispatch = useCallback((statusToken: string, startedAt: number, messageWasAcknowledged: boolean) => {
    const poll = async () => {
      if (Date.now() - startedAt > 120_000) {
        finishDispatch({
          outcome: "technical_failure",
          evidence: { ...unknownEvidence, uncertaintyReason: "Pulse stopped checking after two minutes." },
          messageAcknowledged: messageWasAcknowledged,
          error: "Status checking timed out after two minutes.",
        });
        return;
      }
      if (document.hidden) {
        pollTimerRef.current = window.setTimeout(poll, 2_000);
        return;
      }
      try {
        const response = await fetch(`/api/dispatch/status?statusToken=${encodeURIComponent(statusToken)}`, {
          headers: { "x-pulse-client-id": clientId },
        });
        const data = (await response.json().catch(() => null)) as {
          status?: string;
          handoffStatus?: string;
          terminal?: boolean;
          outcome?: Outcome;
          evidence?: DispatchEvidence;
          error?: string;
        } | null;
        if (!response.ok) throw new Error(data?.error || "Status check failed.");
        setDispatchStatus(data?.status || "calling");
        if (data?.terminal && data.outcome) {
          finishDispatch({
            outcome: data.outcome,
            evidence: data.evidence || unknownEvidence,
            messageAcknowledged: messageWasAcknowledged,
          });
          return;
        }
        setAnnouncement(data?.handoffStatus === "connected" ? "Controlled desk call connected." : "Calling the controlled desk.");
        pollTimerRef.current = window.setTimeout(poll, 2_000);
      } catch (error) {
        setAnnouncement(error instanceof Error ? error.message : "Status check will retry.");
        pollTimerRef.current = window.setTimeout(poll, 2_000);
      }
    };
    void poll();
  }, [clientId, finishDispatch]);

  useEffect(() => {
    const stored = sessionStorage.getItem("pulseActiveDispatch");
    if (!stored) return;
    try {
      const data = JSON.parse(stored) as {
        incidentId: string;
        statusToken: string;
        report: string;
        location: IncidentLocation;
        startedAt: number;
        messageAcknowledged: boolean;
      };
      if (!data.statusToken || Date.now() - data.startedAt > 120_000) {
        sessionStorage.removeItem("pulseActiveDispatch");
        return;
      }
      window.setTimeout(() => {
        activeIncidentRef.current = data.incidentId;
        setIncidentId(data.incidentId);
        setReviewedReport(data.report);
        setReport(data.report);
        if (data.location.source === "manual") setManualLocation(data.location.label);
        else setGpsLocation(data.location);
        setMessageAcknowledged(data.messageAcknowledged);
        setDispatchStatus("restoring");
        setStep("dispatching");
        setAnnouncement("Restored secure status checking for the active controlled call.");
        pollDispatch(data.statusToken, data.startedAt, data.messageAcknowledged);
      }, 0);
    } catch {
      sessionStorage.removeItem("pulseActiveDispatch");
    }
  }, [pollDispatch]);

  async function sendToDesk() {
    if (sendingRef.current || !reviewConfirmed || !effectiveLocation || !accessCode.trim()) return;
    sendingRef.current = true;
    const finalReport = report.trim();
    const finalLocation = effectiveLocation;
    const code = accessCode;
    setReviewedReport(finalReport);
    setDispatchStatus("authorizing");
    setStep("dispatching");
    setAnnouncement("Authorizing the controlled desk handoff.");
    try {
      const sessionResponse = await fetch("/api/dispatch/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pulse-client-id": clientId },
        body: JSON.stringify({ report: finalReport, location: finalLocation.label, incidentId, accessCode: code }),
      });
      const sessionData = (await sessionResponse.json().catch(() => null)) as { token?: string; error?: string } | null;
      if (!sessionResponse.ok || !sessionData?.token) throw new Error(sessionData?.error || "The controlled session could not be authorized.");
      setAccessCode("");
      setDispatchStatus("sending_message");
      setAnnouncement("Sending the reviewed brief to the controlled desk.");

      const callResponse = await fetch("/api/dispatch/call", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pulse-client-id": clientId },
        body: JSON.stringify({
          incidentId,
          report: finalReport,
          location: finalLocation,
          brief,
          dispatchSessionToken: sessionData.token,
        }),
      });
      const callData = (await callResponse.json().catch(() => null)) as {
        status?: string;
        statusToken?: string;
        verificationOnly?: boolean;
        messageAcknowledged?: boolean;
        evidence?: DispatchEvidence;
        error?: string;
      } | null;
      const acknowledged = Boolean(callData?.messageAcknowledged);
      setMessageAcknowledged(acknowledged);
      if (!callResponse.ok) {
        finishDispatch({
          outcome: "technical_failure",
          evidence: unknownEvidence,
          messageAcknowledged: acknowledged,
          error: callData?.error || "Pulse could not complete the controlled handoff.",
        });
        return;
      }
      if (callData?.verificationOnly) {
        finishDispatch({ outcome: "verification_only", evidence: callData.evidence || unknownEvidence, messageAcknowledged: false });
        return;
      }
      if (!callData?.statusToken) throw new Error("Secure call status was not returned.");
      const startedAt = Date.now();
      setDispatchStatus(callData.status || "queued");
      sessionStorage.setItem("pulseActiveDispatch", JSON.stringify({
        incidentId,
        statusToken: callData.statusToken,
        report: finalReport.slice(0, 500),
        location: finalLocation,
        startedAt,
        messageAcknowledged: acknowledged,
      }));
      pollDispatch(callData.statusToken, startedAt, acknowledged);
    } catch (error) {
      finishDispatch({
        outcome: "technical_failure",
        evidence: unknownEvidence,
        messageAcknowledged,
        error: error instanceof Error ? error.message : "Pulse could not complete the controlled handoff.",
      });
    }
  }

  const connectingSteps = [
    { label: "Report reviewed", state: "done" },
    { label: "Dispatch brief sent", state: messageAcknowledged ? "done" : dispatchStatus === "sending_message" ? "active" : "waiting" },
    { label: "Desk call started", state: ["queued", "ringing", "in-progress", "ended"].includes(dispatchStatus) ? "done" : messageAcknowledged ? "active" : "waiting" },
    { label: "Desk response received", state: dispatchStatus === "ended" ? "done" : dispatchStatus === "in-progress" ? "active" : "waiting" },
    { label: "Evidence checked", state: dispatchStatus === "checking_evidence" ? "active" : "waiting" },
  ];

  function renderLanding() {
    return (
      <main className="landing" id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><span /> Bystander-first controlled coordination</span>
            <h1 ref={headingRef} tabIndex={-1}>In an accident, every clear detail matters.</h1>
            <p>Tell Pulse what happened. Review the report. Then send it to our authorized controlled dispatch desk.</p>
            <Button onClick={startIncident}>Start controlled dispatch <Send size={19} /></Button>
            <p className="microcopy"><ShieldCheck size={15} /> Nothing reaches the controlled desk until you review and press Send.</p>
          </div>
          <div className="hero-receipt" aria-label="How Pulse works">
            <div className="receipt-top"><PulseMark /><span>One calm path</span><small>CONTROLLED</small></div>
            {[
              ["01", "Capture", "Location plus what you observe"],
              ["02", "Review", "Correct every word before contact"],
              ["03", "Connect", "One authorized desk receives the brief"],
            ].map(([number, title, copy]) => (
              <div className="receipt-step" key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div><CheckCircle2 size={19} /></div>
            ))}
            <div className="receipt-foot"><span>Evidence before claims</span><FileCheck2 size={20} /></div>
          </div>
        </section>
        <SafetyStrip />
        <section className="principles" aria-label="Pulse principles">
          <article><Sparkles size={22} /><h2>GPT‑5.6 structures observations</h2><p>It organizes witness-stated facts and keeps missing information visibly unknown. It does not diagnose.</p></article>
          <article><FileCheck2 size={22} /><h2>You approve the source</h2><p>The witness report stays editable. Location is labelled captured before it is ever sent.</p></article>
          <article><ShieldCheck size={22} /><h2>Outcomes need evidence</h2><p>A completed call is not success. Assignment, destination, and ETA remain separate claims.</p></article>
        </section>
        <section className="privacy-note">
          <strong>Clear data flow</strong>
          <p>Voice audio is streamed to OpenAI only when you choose the microphone. Your reviewed report and location are sent to the controlled desk only after you press Send.</p>
        </section>
      </main>
    );
  }

  function renderCapture() {
    return (
      <main className="flow-main" id="top">
        <Progress step={1} />
        <div className="screen-heading">
          <span className="eyebrow"><span /> Capture the incident</span>
          <h1 ref={headingRef} tabIndex={-1}>Tell Pulse what you can see.</h1>
          <p>Location and a clear witness report are enough to continue. Nothing is sent yet.</p>
        </div>
        <div className="capture-grid">
          <section className="panel location-panel">
            <div className="panel-title"><span className="icon-box blue"><MapPin size={21} /></span><div><h2>Where did it happen?</h2><p>Use GPS or enter a place yourself.</p></div></div>
            <Button variant="secondary" onClick={requestLocation} disabled={locationState === "requesting"}>
              {locationState === "requesting" ? <Loader2 className="spin" size={18} /> : <LocateFixed size={18} />}
              {locationState === "requesting" ? "Requesting permission" : "Use my location"}
            </Button>
            {locationNotice && <p className={`inline-status ${locationState}`}><Circle size={10} fill="currentColor" /> {locationNotice}</p>}
            <div className="field-divider"><span>or</span></div>
            <label className="field-label" htmlFor="manual-location">Or enter an address, postal code, or landmark</label>
            <div className="input-with-icon"><MapPin size={18} /><input id="manual-location" value={manualLocation} maxLength={200} onChange={(event) => setManualLocation(event.target.value)} placeholder="Marina Bay Sands, 018956" autoComplete="street-address" /></div>
            {manualLocation.trim().length >= 3 && <p className="inline-status captured"><CheckCircle2 size={15} /> Manual location included on this device. It has not been sent.</p>}
          </section>

          <section className="panel report-panel">
            <div className="panel-title"><span className="icon-box red"><Mic size={21} /></span><div><h2>Tell Pulse what happened</h2><p>Speak naturally or type. You will review every word.</p></div></div>
            <div className="mode-row">
              {micState === "listening" || micState === "connecting" ? (
                <Button variant="danger" onClick={() => void stopMicrophone()} disabled={micState === "connecting"}><Square size={16} fill="currentColor" /> Stop microphone</Button>
              ) : (
                <Button variant="secondary" onClick={() => void startMicrophone()} disabled={micState === "processing"}><Mic size={18} /> Use microphone</Button>
              )}
              <span><Keyboard size={16} /> Type instead below</span>
            </div>
            <div className={`mic-indicator ${micState}`} role="status">
              <span className="mic-dot" />
              {micState === "listening" ? "Microphone active — audio is streaming to OpenAI" :
                micState === "connecting" ? "Connecting live transcription" :
                micState === "processing" ? "Finalizing transcription" :
                micState === "denied" ? "Microphone denied — type instead" :
                micState === "error" ? "Microphone unavailable — type instead" : "Microphone off"}
            </div>
            <label className="field-label" htmlFor="witness-report">Witness report</label>
            <textarea id="witness-report" value={report} onChange={(event) => editReport(event.target.value)} maxLength={2_000} placeholder="Example: A cyclist was hit by a car. They are awake and breathing, with bleeding from one arm. One person is injured." rows={7} />
            <div className="field-meta"><span>{reportSource}</span><span className={reportReady ? "valid" : ""}>{report.length}/2,000 · minimum 12</span></div>
            {liveSuggestion && userEdited && (
              <div className="suggestion"><strong>Your edit is protected</strong><p>New transcription was kept separately and did not overwrite the report.</p><Button variant="ghost" onClick={() => { setReport(liveSuggestion.slice(0, 2_000)); setReportSource("Final transcription"); userEditedRef.current = false; setUserEdited(false); setLiveSuggestion(""); }}>Use transcription suggestion</Button></div>
            )}
          </section>
        </div>
        <aside className="bystander-note"><AlertTriangle size={20} /><div><strong>Stay aware of immediate danger</strong><p>Watch for traffic, fire, or other hazards. For a real emergency, call 995 and follow the call taker’s instructions.</p></div></aside>
        <div className="flow-actions"><Button variant="ghost" onClick={() => { stopEverything(); setStep("landing"); }}><ArrowLeft size={18} /> Back</Button><div><p>{!effectiveLocation ? "Add a location to continue." : !reportReady ? "Enter at least 12 meaningful characters." : micState === "listening" ? "Stop the microphone before review." : "Ready to review. Nothing has been sent."}</p><Button onClick={openReview} disabled={!captureReady}>Review report <FileCheck2 size={18} /></Button></div></div>
      </main>
    );
  }

  function briefFields() {
    if (!brief) return [];
    return [
      ["Incident type", displayValue(brief.incidentType)],
      ["Consciousness", displayValue(brief.consciousness)],
      ["Breathing", displayValue(brief.breathing)],
      ["Visible bleeding", displayValue(brief.visibleBleeding)],
      ["People", brief.peopleCount == null ? "Unknown" : String(brief.peopleCount)],
    ];
  }

  function renderReview() {
    return (
      <main className="flow-main" id="top">
        <Progress step={2} />
        <div className="screen-heading compact">
          <span className="eyebrow"><span /> Review before contact</span>
          <h1 ref={headingRef} tabIndex={-1}>Check every detail.</h1>
          <p>Correct the witness report and location. No controlled desk contact has happened.</p>
        </div>
        <div className="review-layout">
          <div className="review-primary">
            <section className="panel">
              <div className="panel-title"><span className="icon-box"><FileCheck2 size={21} /></span><div><h2>Witness report</h2><p>Source: {reportSource}</p></div></div>
              <label className="sr-only" htmlFor="review-report">Edit witness report</label>
              <textarea id="review-report" value={report} onChange={(event) => editReport(event.target.value)} maxLength={2_000} rows={7} />
              <div className="field-meta"><span>Fully editable</span><span>{report.length}/2,000</span></div>
            </section>

            <section className="panel brief-panel">
              <div className="panel-title"><span className="icon-box violet"><Sparkles size={21} /></span><div><h2>What Pulse understood</h2><p>{briefState === "ready" ? `Structured with ${briefModel || "GPT-5.6"}` : "GPT‑5.6 observation brief"}</p></div></div>
              {briefState === "loading" && <div className="loading-line"><Loader2 className="spin" /> Structuring only witness-stated observations…</div>}
              {(briefState === "unavailable" || !brief && briefState !== "loading") && <div className="honest-warning"><AlertTriangle size={18} /><p>{briefWarning || "Pulse could not structure the report. Your reviewed words can still be sent unchanged."}</p></div>}
              {brief && briefState !== "loading" && (
                <>
                  <p className="brief-summary">{brief.summary}</p>
                  <dl className="brief-grid">{briefFields().map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value === "Unknown" ? "unknown-value" : ""}>{value}</dd></div>)}</dl>
                  <div className="missing-facts"><strong>Missing information</strong><p>{brief.missingFacts.length ? brief.missingFacts.join(" · ") : "No missing facts were listed."}</p></div>
                </>
              )}
              {briefState === "stale" && <div className="stale-row"><span>Report changed — update the brief before relying on it.</span><Button variant="secondary" onClick={() => void createBrief(report.trim(), incidentId)}>Update brief</Button></div>}
              {briefState === "unavailable" && <Button variant="secondary" onClick={() => void createBrief(report.trim(), incidentId)}>Try GPT‑5.6 again</Button>}
              <p className="model-boundary">Pulse structures observations only. It does not diagnose or prescribe treatment.</p>
            </section>
          </div>

          <aside className="review-sidebar">
            <section className="panel summary-panel">
              <h2>Report contents</h2>
              <div className="summary-line"><MapPin size={18} /><div><strong>Location</strong><p>{effectiveLocation?.label}</p><small>Included in this report · not sent</small></div></div>
              <div className="summary-line"><ShieldCheck size={18} /><div><strong>Who will be contacted</strong><p>Pulse Controlled Dispatch Desk</p><small>Authorized test desk only</small></div></div>
            </section>

            <section className="panel care-panel">
              <h2>Nearby care context</h2>
              {careState === "loading" && <div className="loading-line"><Loader2 className="spin" /> Checking Google Maps…</div>}
              {careState === "available" && hospitals.map((hospital) => (
                <article className="hospital-row" key={hospital.id}>
                  <div><strong>{hospital.name}</strong><p>{hospital.address}</p><small>{hospital.travelTimeMinutes ? `About ${hospital.travelTimeMinutes} min drive` : `${hospital.distanceKm} km away`}</small></div>
                  <a href={hospital.mapsUrl} target="_blank" rel="noreferrer" aria-label={`Open ${hospital.name} in Maps`}><ExternalLink size={17} /></a>
                </article>
              ))}
              {careState === "available" && <p className="care-disclosure">Emergency capability and availability are not verified. These listings are never called automatically.</p>}
              {careState === "unavailable" && <div className="honest-warning"><AlertTriangle size={17} /><p>Nearby hospital data is unavailable. The controlled desk will confirm any destination. Dispatch is not blocked.</p></div>}
            </section>

            <section className="panel destination-panel">
              <span className="destination-label">CONTROLLED DESTINATION</span>
              <h2>Pulse Controlled Dispatch Desk</h2>
              <p>This is our authorized test desk, not a hospital shown above and not a public emergency service.</p>
              <label className="field-label" htmlFor="access-code">Private judge demo code</label>
              <input id="access-code" type="password" autoComplete="off" value={accessCode} maxLength={128} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter judge code" />
              <small>The code authorizes one controlled contact and is cleared immediately afterward.</small>
            </section>
          </aside>
        </div>
        <section className="send-confirmation">
          <label><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} /><span><strong>I reviewed the report and location.</strong><small>I understand only the Pulse Controlled Dispatch Desk will be contacted.</small></span></label>
          <Button onClick={() => void sendToDesk()} disabled={!reviewConfirmed || !accessCode.trim() || !reportReady || briefState === "stale"}>Send to controlled desk <Send size={18} /></Button>
        </section>
        <div className="review-back"><Button variant="ghost" onClick={() => setStep("capture")}><ArrowLeft size={18} /> Edit capture</Button><a href="tel:995"><Phone size={16} /> Real emergency? Call 995</a></div>
      </main>
    );
  }

  function renderDispatching() {
    const activeCopy = dispatchStatus === "authorizing" ? "Authorizing this controlled report" :
      dispatchStatus === "sending_message" ? "Preparing the dispatch brief" :
      dispatchStatus === "in-progress" ? "Desk call connected" :
      dispatchStatus === "restoring" ? "Restoring secure status" : "Calling the controlled desk";
    return (
      <main className="flow-main dispatch-screen" id="top">
        <Progress step={3} />
        <div className="dispatch-layout">
          <section className="dispatch-primary">
            <span className="live-pill"><span /> CONTROLLED HANDOFF LIVE</span>
            <h1 ref={headingRef} tabIndex={-1}>Connecting to the controlled desk.</h1>
            <p>{activeCopy}. Keep this screen open while Pulse checks only what the recipient explicitly confirms.</p>
            <ol className="dispatch-timeline">
              {connectingSteps.map((item, index) => (
                <li key={item.label} className={item.state}>
                  <span>{item.state === "done" ? <Check size={17} /> : item.state === "active" ? <Loader2 className="spin" size={17} /> : index + 1}</span>
                  <div><strong>{item.label}</strong><small>{item.state === "done" ? "Complete" : item.state === "active" ? "In progress" : "Waiting"}</small></div>
                </li>
              ))}
            </ol>
            <div className="call-boundary"><ShieldCheck size={19} /><p>A provider connection or completed call is not automatically a successful dispatch. Green appears only after field-specific evidence.</p></div>
          </section>
          <aside className="dispatch-context">
            <section className="panel"><h2>Reviewed brief</h2><p className="clamped-report">{reviewedReport}</p><div className="summary-line compact-line"><MapPin size={17} /><div><strong>Location</strong><p>{effectiveLocation?.label}</p></div></div></section>
            <section className="panel"><h2>Contact boundary</h2><p>Pulse Controlled Dispatch Desk</p><small>Not SCDF, not a public emergency service, and not a listed hospital.</small></section>
            <a className="button button-danger full-button" href="tel:995"><Phone size={18} /> Call 995 for a real emergency</a>
          </aside>
        </div>
      </main>
    );
  }

  function outcomeCopy(outcome: Outcome) {
    if (outcome === "dispatch_confirmed") return { title: "Dispatch confirmed", detail: "The recipient explicitly confirmed that a responder or vehicle was assigned.", tone: "success" };
    if (outcome === "desk_receipt_only") return { title: "Desk received the brief", detail: "Vehicle assignment was not confirmed.", tone: "warning" };
    if (outcome === "declined") return { title: "The controlled desk could not accept this incident.", detail: "No dispatch assignment is shown.", tone: "danger" };
    if (outcome === "unreachable") return { title: "The controlled desk did not answer.", detail: "No dispatch assignment is shown.", tone: "danger" };
    if (outcome === "verification_only") return { title: "Verification only", detail: "No message, webhook, or call was sent to the controlled desk.", tone: "warning" };
    return { title: "Pulse could not complete the controlled handoff.", detail: result?.error || "No dispatch assignment is shown.", tone: "danger" };
  }

  function evidenceRows(evidence: DispatchEvidence) {
    return [
      { label: "Brief received", result: evidence.briefReceived.result, detail: undefined, excerpt: evidence.briefReceived.evidence },
      { label: "Vehicle assigned", result: evidence.vehicleAssigned.result, detail: undefined, excerpt: evidence.vehicleAssigned.evidence },
      { label: "Destination", result: evidence.destination.result, detail: evidence.destination.result === "known" ? evidence.destination.value : undefined, excerpt: evidence.destination.evidence },
      { label: "ETA", result: evidence.eta.result, detail: evidence.eta.result === "known" ? `${evidence.eta.minutes} minutes` : undefined, excerpt: evidence.eta.evidence },
    ];
  }

  function renderResult() {
    const safeResult = result || { outcome: "technical_failure" as const, evidence: unknownEvidence, messageAcknowledged: false };
    const copy = outcomeCopy(safeResult.outcome);
    return (
      <main className="flow-main result-screen" id="top">
        <section className={`outcome-banner ${copy.tone}`}>
          <div className="outcome-icon">{copy.tone === "success" ? <CheckCircle2 /> : copy.tone === "warning" ? <Clock3 /> : <XCircle />}</div>
          <div><span>CONTROLLED HANDOFF RESULT</span><h1 ref={headingRef} tabIndex={-1}>{copy.title}</h1><p>{copy.detail}</p></div>
        </section>
        <div className="result-layout">
          <section className="panel evidence-panel">
            <div className="panel-title"><span className="icon-box"><FileCheck2 size={21} /></span><div><h2>Evidence receipt</h2><p>Recipient speech only · assistant claims excluded</p></div></div>
            <div className="evidence-table" role="table" aria-label="Controlled dispatch evidence">
              <div className="evidence-head" role="row"><span role="columnheader">Question</span><span role="columnheader">Result</span><span role="columnheader">Recipient evidence</span></div>
              {evidenceRows(safeResult.evidence).map((row) => (
                <div className="evidence-row" role="row" key={row.label}>
                  <strong role="cell">{row.label}</strong>
                  <span role="cell"><FieldStatus result={row.result === "known" ? "known" : row.result as EvidenceResult} />{row.detail ? <small>{row.detail}</small> : null}</span>
                  <span role="cell" className={row.excerpt ? "evidence-quote" : "no-evidence"}>{row.excerpt ? `“${row.excerpt}”` : "No verified excerpt"}</span>
                </div>
              ))}
            </div>
            {safeResult.evidence.uncertaintyReason && <div className="honest-warning"><AlertTriangle size={17} /><p>{safeResult.evidence.uncertaintyReason}</p></div>}
            <p className="provider-note">Written brief status: {safeResult.messageAcknowledged ? "Accepted by the messaging provider. This does not prove the desk read it." : "Not acknowledged by a messaging provider."}</p>
          </section>
          <aside className="result-actions">
            {effectiveLocation && <a className="button button-secondary full-button" href={mapsUrl(effectiveLocation)} target="_blank" rel="noreferrer"><MapPin size={18} /> Open location in Maps <ExternalLink size={16} /></a>}
            <a className="button button-danger full-button" href="tel:995"><Phone size={18} /> Call 995 for a real emergency</a>
            <Button variant="ghost" className="full-button" onClick={startIncident}><RotateCcw size={18} /> Start a new controlled report</Button>
            <div className="panel result-boundary"><ShieldCheck size={20} /><h2>What this result means</h2><p>Unknown stays unknown. Pulse never converts call completion, message acceptance, or one generic “yes” into assignment, destination, and ETA.</p></div>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Header />
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      {step === "landing" && renderLanding()}
      {step === "capture" && renderCapture()}
      {step === "review" && renderReview()}
      {step === "dispatching" && renderDispatching()}
      {step === "result" && renderResult()}
      <footer className="app-footer"><span>Pulse · Controlled prototype</span><span>For real emergencies in Singapore, call 995.</span></footer>
    </div>
  );
}
