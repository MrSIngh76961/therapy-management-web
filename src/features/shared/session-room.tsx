"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Captions,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardEdit,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Badge, Card, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import { providers } from "@/services/providers/registry";
import type { ChatMessage, VideoConnection } from "@/services/providers/types";
import type { SessionMode, TranscriptLine } from "@/services/types";
import { modeLabel } from "./labels";

export interface RoomSession {
  id: string;
  start: string;
  duration: number;
  mode: SessionMode;
  status: string;
  therapistName: string;
  clientName: string;
  serviceName: string;
}
type Phase = "lobby" | "live" | "wrapup" | "done";
const clock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function LocalVideo({ stream, off }: { stream: MediaStream | null; off: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      aria-label="Your camera preview"
      className={cn("size-full -scale-x-100 object-cover", (off || !stream) && "hidden")}
    />
  );
}

export function SessionRoom({
  session,
  role,
  guestName,
  exitHref,
  onComplete,
}: {
  session: RoomSession;
  role: "therapist" | "client";
  guestName?: string;
  exitHref: string;
  onComplete?: () => void;
}) {
  const therapist = role === "therapist";
  const me = therapist ? session.therapistName : guestName ?? session.clientName;
  const them = therapist ? session.clientName : session.therapistName;
  const { toast } = useToast();
  const confirm = useConfirm();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [cam, setCam] = useState(session.mode === "video");
  const [mic, setMic] = useState(true);
  const [panel, setPanel] = useState<"chat" | "transcript" | "notes" | null>("chat");
  const [conn, setConn] = useState<VideoConnection | null>(null);
  const [joining, setJoining] = useState(false);
  const [remote, setRemote] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [msg, setMsg] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [tOn, setTOn] = useState(false);
  const [tConsent, setTConsent] = useState(false);
  const [notes, setNotes] = useState("");
  const [wrap, setWrap] = useState({ summary: "", comment: "", visibility: "shared", task: "" });
  const tr = useRef<ReturnType<typeof providers.transcription> | null>(null);
  const connRef = useRef<VideoConnection | null>(null);
  const live = useAction(() => api.patch(`/appointments/${session.id}`, { status: "live" }), ["appointments"]);
  const complete = useAction(
    (b: Record<string, unknown>) => api.post(`/appointments/${session.id}/complete`, b),
    ["appointments", "payments"],
  );
  const addTask = useAction((b: Record<string, unknown>) => api.post("/tasks", b), ["tasks"]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    connRef.current?.leave();
    tr.current?.stop();
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, lines, panel]);

  const enter = async () => {
    setJoining(true);
    try {
      const { roomId } = await providers.video.createRoom(session.id);
      const c = await providers.video.join(roomId, {
        video: cam && session.mode === "video",
        audio: mic,
        displayName: me,
        remoteName: them,
      });
      c.setAudio(mic);
      c.setVideo(cam);
      c.onChat((m) => setChat((x) => [...x, m]));
      c.onRemoteJoin((n) => {
        setRemote(true);
        toast(`${n} joined the consultation room`, "info");
      });
      connRef.current = c;
      setConn(c);
      if (c.mediaError) toast(c.mediaError, "info");
      if (therapist) live.mutate(undefined);
      setPhase("live");
    } catch {
      toast("Could not connect to session. Please check your network.", "error");
    }
    setJoining(false);
  };

  const toggleMic = () => {
    conn?.setAudio(!mic);
    setMic(!mic);
  };
  const toggleCam = () => {
    conn?.setVideo(!cam);
    setCam(!cam);
  };
  const toggleTranscript = () => {
    if (tOn) {
      tr.current?.stop();
      setTOn(false);
      toast("Live transcription paused", "info");
      return;
    }
    if (!tConsent) {
      toast("DPDPA transcription consent is required before enabling transcription", "error");
      return;
    }
    tr.current = providers.transcription();
    tr.current.start(session.id, (l) => setLines((x) => [...x, l]));
    setTOn(true);
    setPanel("transcript");
    toast("Live transcription started");
  };

  const send = () => {
    if (!msg.trim()) return;
    conn?.sendChat(msg.trim());
    setMsg("");
  };

  const leave = async () => {
    if (
      !(await confirm({
        title: therapist ? "End this therapy session?" : "Leave virtual consultation?",
        description: therapist
          ? "The session room will conclude for all participants and you will proceed to clinical documentation."
          : "You can rejoin at any time while the clinical room remains active.",
        confirmLabel: therapist ? "End session" : "Leave room",
        danger: true,
      }))
    )
      return;
    tr.current?.stop();
    connRef.current?.leave();
    connRef.current = null;
    setConn(null);
    setTOn(false);
    if (therapist) setWrap((w) => ({ ...w, summary: w.summary || notes }));
    setPhase(therapist ? "wrapup" : "done");
  };

  const finish = async () => {
    try {
      await complete.mutateAsync({
        summary: wrap.summary || undefined,
        comment: wrap.comment || undefined,
        visibility: wrap.visibility,
        transcript: lines.length ? lines : undefined,
      });
      if (wrap.task.trim())
        await addTask.mutateAsync({
          title: wrap.task.trim(),
          description: "Assigned following consultation",
          clientName: session.clientName,
          status: "assigned",
          due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
          sessionId: session.id,
        });
      setPhase("done");
      toast("Session concluded and clinical notes saved");
      onComplete?.();
    } catch {
      toast("Could not save clinical wrap-up. Please retry.", "error");
    }
  };

  if (phase === "lobby") {
    return (
      <div className="mx-auto grid max-w-4xl gap-6 py-6 md:grid-cols-[1.3fr_1fr]">
        <Card hover={false} className="overflow-hidden border border-[#EDE4E8] bg-white shadow-card">
          <div className="relative grid aspect-video place-items-center bg-[#1F191D]">
            {session.mode === "video" && cam ? (
              <div className="absolute inset-0 grid place-items-center text-xs text-white/70">
                Camera preview starts upon room entry
              </div>
            ) : null}
            <Avatar name={me} size={84} />
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
              <IconButton
                label={mic ? "Mute microphone" : "Unmute microphone"}
                onClick={() => setMic(!mic)}
                className={cn("bg-white/95 shadow-md", !mic && "!border-[#E11D48] !bg-[#FFDBDF] !text-[#9F1239]")}
              >
                {mic ? <Mic className="size-4 text-[#1F191D]" /> : <MicOff className="size-4" />}
              </IconButton>
              {session.mode === "video" && (
                <IconButton
                  label={cam ? "Turn camera off" : "Turn camera on"}
                  onClick={() => setCam(!cam)}
                  className={cn("bg-white/95 shadow-md", !cam && "!border-[#E11D48] !bg-[#FFDBDF] !text-[#9F1239]")}
                >
                  {cam ? <Camera className="size-4 text-[#1F191D]" /> : <CameraOff className="size-4" />}
                </IconButton>
              )}
            </div>
          </div>
        </Card>

        <Card hover={false} variant="ivory" className="space-y-4 p-6">
          <div>
            <span className="rounded-full bg-[#F4DCE6] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#98143F]">
              {session.serviceName}
            </span>
            <h1 className="mt-2 text-xl font-black text-[#1F191D]">Consultation with {them}</h1>
            <p className="mt-1 text-xs text-[#6E686F]">
              {fmtDateTime(session.start)} · {session.duration} min · {modeLabel[session.mode]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            <Badge tone="green">
              <Wifi className="mr-1 inline size-3" /> E2EE Protected
            </Badge>
          </div>
          <div className="rounded-xl border border-[#EDE4E8] bg-white p-3.5">
            <Checkbox
              checked={tConsent}
              onChange={setTConsent}
              label={
                therapist
                  ? "Patient has provided informed DPDPA consent for AI live transcription"
                  : "I consent to real-time speech-to-text transcription to assist clinical notes"
              }
            />
          </div>
          <p className="flex gap-2 text-[11px] text-[#6E686F]">
            <ShieldCheck className="size-4 shrink-0 text-[#98143F]" />
            Session video and audio streams are never recorded or stored. Transcripts are optional and can be toggled off at any moment.
          </p>
          <Button className="w-full" size="lg" loading={joining} icon={<Camera className="size-4" />} onClick={enter}>
            {therapist ? "Start consultation" : "Enter virtual room"}
          </Button>
          <Link href={exitHref} className="block text-center text-xs font-bold text-[#888188] hover:text-[#98143F]">
            Return to dashboard
          </Link>
        </Card>
      </div>
    );
  }

  if (phase === "wrapup") {
    return (
      <Card hover={false} variant="ivory" className="mx-auto max-w-2xl space-y-5 p-7">
        <div className="flex items-center gap-2.5 border-b border-[#F0E6EB] pb-3 text-base font-black text-[#1F191D]">
          <div className="grid size-8 place-items-center rounded-xl bg-[#F4DCE6] text-[#98143F]">
            <ClipboardEdit className="size-4" />
          </div>
          <span>Post-Session Clinical Wrap-up · {clock(elapsed)} elapsed</span>
        </div>
        <Textarea
          label="Clinical summary"
          value={wrap.summary}
          onChange={(e) => setWrap({ ...wrap, summary: e.target.value })}
          placeholder="Document key clinical themes, psychological interventions, breakthroughs, and planned outcomes…"
          rows={4}
        />
        <Textarea
          label="Post-session follow-up note"
          value={wrap.comment}
          onChange={(e) => setWrap({ ...wrap, comment: e.target.value })}
          placeholder="Client-facing encouragement or specific thoughts for reflection…"
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select
            label="Note visibility"
            value={wrap.visibility}
            onChange={(e) => setWrap({ ...wrap, visibility: e.target.value })}
            options={[
              { value: "shared", label: "Shared with patient in portal" },
              { value: "private", label: "Private (clinician eyes only)" },
            ]}
          />
          <Input
            label="Assign follow-up homework task (optional)"
            value={wrap.task}
            onChange={(e) => setWrap({ ...wrap, task: e.target.value })}
            placeholder="e.g. 5-minute daily breathing log"
          />
        </div>
        {lines.length > 0 && (
          <p className="rounded-xl border border-[#EDE4E8] bg-white p-3 text-xs text-[#6E686F]">
            📝 <b>{lines.length} transcript lines</b> captured during session will be securely linked to this appointment.
          </p>
        )}
        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={finish} loading={complete.isPending}>
            Skip documentation
          </Button>
          <Button onClick={finish} loading={complete.isPending}>
            Save clinical records & complete
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card hover={false} variant="ivory" className="mx-auto max-w-md p-8 text-center shadow-card">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#E6FAF2] to-[#D0F3E5] text-[#0D7A55] shadow-xs">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="text-xl font-black text-[#1F191D]">
          {therapist ? "Session Successfully Concluded" : "You have left the session room"}
        </h2>
        <p className="mt-1.5 text-xs text-[#6E686F]">
          {therapist
            ? "Your clinical notes, invoice status and assigned tasks have been recorded."
            : "Thank you for attending your therapy consultation. Shared notes and homework exercises are available in your portal."}
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Link href={exitHref}>
            <Button>{therapist ? "Return to dashboard" : "Continue to portal"}</Button>
          </Link>
          {therapist && (
            <Link href={`/therapist/sessions/${session.id}`}>
              <Button variant="outline">View session record</Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div
      className="grid gap-4 lg:grid-cols-[1fr_360px]"
      style={{ minHeight: "calc(100dvh - 150px)" }}
    >
      <div className="flex min-h-[460px] flex-col overflow-hidden rounded-[22px] border border-[#2D2428] bg-[#1A1417] shadow-pop">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
          <div className="flex items-center gap-2.5 text-xs font-black">
            <span className="flex items-center gap-1.5 rounded-full bg-[#98143F] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
              <Radio className="size-2.5 animate-pulse" /> LIVE
            </span>
            <span className="font-mono">{clock(elapsed)}</span>
          </div>
          <div className="text-[11px] font-semibold text-white/70">
            {session.serviceName} · {modeLabel[session.mode]}
          </div>
        </div>

        <div className="relative grid flex-1 place-items-center p-4">
          {session.mode === "in_person" ? (
            <div className="text-center text-white/80">
              <Avatar name={them} size={72} className="mx-auto mb-3 ring-4 ring-white/10" />
              <p className="text-sm font-bold">In-person session in progress</p>
              <p className="mt-1 text-xs text-white/60">Use the right side panel to record live clinical notes.</p>
            </div>
          ) : (
            <>
              <div className="grid size-full place-items-center rounded-2xl bg-[#251D21] border border-white/5">
                {remote ? (
                  <div className="text-center">
                    <Avatar
                      name={them}
                      size={100}
                      className={cn(mic && "ring-4 ring-[#98143F]/50 shadow-glow")}
                    />
                    <div className="mt-3 text-base font-black text-white">{them}</div>
                    <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                      Connected
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-white/70">
                    <Loader2 className="mx-auto mb-2 size-7 animate-spin text-[#98143F]" />
                    <p className="text-xs font-semibold">Waiting for {them} to enter the room…</p>
                  </div>
                )}
              </div>
              <motion.div
                drag
                dragMomentum={false}
                className="absolute bottom-6 right-6 grid h-32 w-48 cursor-grab place-items-center overflow-hidden rounded-2xl border-2 border-white/20 bg-[#352B30] shadow-pop active:cursor-grabbing"
              >
                <LocalVideo stream={conn?.localStream ?? null} off={!cam} />
                {(!cam || !conn?.localStream) && (
                  <div className="text-center text-white/80">
                    <Avatar name={me} size={44} className="mx-auto ring-2 ring-white/20" />
                    <div className="mt-1 text-[10px] font-bold">
                      {session.mode === "audio" ? "Audio room" : cam ? "Preview" : "Camera off"}
                    </div>
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2.5 rounded-md bg-black/60 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  You
                </span>
              </motion.div>
            </>
          )}
          {tOn && lines.length > 0 && (
            <div
              className="absolute inset-x-8 bottom-4 rounded-xl border border-white/10 bg-black/75 px-4 py-2.5 text-center text-xs text-white backdrop-blur-md"
              aria-live="polite"
            >
              {lines[lines.length - 1].text}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-white/10 bg-[#140F12] p-3.5">
          <IconButton
            label={mic ? "Mute microphone" : "Unmute microphone"}
            onClick={toggleMic}
            className={cn("bg-white text-[#1F191D]", !mic && "!border-[#E11D48] !bg-[#FFDBDF] !text-[#9F1239]")}
          >
            {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </IconButton>
          {session.mode === "video" && (
            <IconButton
              label={cam ? "Camera off" : "Camera on"}
              onClick={toggleCam}
              className={cn("bg-white text-[#1F191D]", !cam && "!border-[#E11D48] !bg-[#FFDBDF] !text-[#9F1239]")}
            >
              {cam ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
            </IconButton>
          )}
          <IconButton
            label={tOn ? "Pause transcription" : "Start live transcription"}
            onClick={toggleTranscript}
            className={cn(
              "bg-white text-[#1F191D]",
              tOn && "!bg-gradient-to-r !from-[#98143F] !to-[#71102F] !text-white shadow-glow",
            )}
          >
            <Captions className="size-4" />
          </IconButton>
          <IconButton
            label="In-session chat"
            onClick={() => setPanel(panel === "chat" ? null : "chat")}
            className={cn("bg-white text-[#1F191D]", panel === "chat" && "!bg-[#F4DCE6] !text-[#98143F]")}
          >
            <MessageSquare className="size-4" />
          </IconButton>
          {therapist && (
            <IconButton
              label="Private clinical notes"
              onClick={() => setPanel(panel === "notes" ? null : "notes")}
              className={cn("bg-white text-[#1F191D]", panel === "notes" && "!bg-[#F4DCE6] !text-[#98143F]")}
            >
              <ClipboardEdit className="size-4" />
            </IconButton>
          )}
          <Button variant="danger" icon={<PhoneOff className="size-4" />} onClick={leave}>
            {therapist ? "Conclude session" : "Leave room"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {panel && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex min-h-[340px] flex-col overflow-hidden rounded-[22px] border border-[#EDE4E8] bg-white shadow-card"
          >
            <div className="flex gap-1 border-b border-[#F0E6EB] bg-[#FAF7F8] p-2 text-xs font-black">
              {(therapist ? ["chat", "transcript", "notes"] : ["chat", "transcript"]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPanel(t as typeof panel)}
                  className={cn(
                    "flex-1 rounded-[10px] py-1.5 text-center capitalize transition-colors",
                    panel === t
                      ? "border border-[#EBC3D3] bg-[#F4DCE6] text-[#71102F] shadow-xs"
                      : "text-[#6E686F] hover:text-[#98143F]",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div ref={logRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
              {panel === "chat" &&
                (chat.length ? (
                  chat.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-[14px] px-3.5 py-2 text-xs",
                        m.from === "me"
                          ? "ml-auto bg-gradient-to-r from-[#98143F] to-[#71102F] text-white shadow-xs"
                          : "bg-[#F4DCE6] text-[#1F191D]",
                      )}
                    >
                      {m.text}
                    </div>
                  ))
                ) : (
                  <p className="pt-8 text-center text-xs text-[#888188]">
                    🔒 End-to-end encrypted chat. Messages are only visible to participants in this room.
                  </p>
                ))}
              {panel === "transcript" &&
                (lines.length ? (
                  lines.map((l) => (
                    <div key={l.id} className="rounded-xl border border-[#EDE4E8] bg-[#FAF7F8] p-2.5 text-xs">
                      <div className="text-[10px] font-black uppercase text-[#98143F]">
                        {l.speaker === "therapist" ? session.therapistName : session.clientName} · {l.at}
                      </div>
                      <p className="mt-1 text-[#1F191D]">{l.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="pt-8 text-center text-xs text-[#888188]">
                    {tOn
                      ? "Listening for speech…"
                      : tConsent
                      ? "Press the captions button in the toolbar to initiate live transcription."
                      : "Live transcription is disabled. Consent was not recorded."}
                  </p>
                ))}
              {panel === "notes" && (
                <Textarea
                  label="Private clinical session notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record contemporaneous clinical observations, mental state observations, affect, themes…"
                  className="min-h-[260px]"
                />
              )}
            </div>
            {panel === "chat" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2 border-t border-[#EDE4E8] bg-[#FAF7F8] p-3"
              >
                <input
                  aria-label="Message"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Type a message to room…"
                  className="min-w-0 flex-1 rounded-[10px] border border-[#EDE4E8] bg-white px-3 py-2 text-xs text-[#1F191D] outline-none focus:border-[#98143F]"
                />
                <Button type="submit" size="sm" icon={<Send className="size-3.5" />} disabled={!msg.trim()}>
                  Send
                </Button>
              </form>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
