"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Captions, Camera, CameraOff, CheckCircle2, ClipboardEdit, Loader2, MessageSquare, Mic, MicOff, PhoneOff, Send, ShieldCheck, Wifi } from "lucide-react";
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

export interface RoomSession { id: string; start: string; duration: number; mode: SessionMode; status: string; therapistName: string; clientName: string; serviceName: string }
type Phase = "lobby" | "live" | "wrapup" | "done";
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function LocalVideo({ stream, off }: { stream: MediaStream | null; off: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay muted playsInline aria-label="Your camera preview" className={cn("size-full -scale-x-100 object-cover", (off || !stream) && "hidden")} />;
}

export function SessionRoom({ session, role, guestName, exitHref, onComplete }: { session: RoomSession; role: "therapist" | "client"; guestName?: string; exitHref: string; onComplete?: () => void }) {
  const therapist = role === "therapist";
  const me = therapist ? session.therapistName : guestName ?? session.clientName;
  const them = therapist ? session.clientName : session.therapistName;
  const { toast } = useToast(), confirm = useConfirm();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [cam, setCam] = useState(session.mode === "video"), [mic, setMic] = useState(true);
  const [panel, setPanel] = useState<"chat" | "transcript" | "notes" | null>("chat");
  const [conn, setConn] = useState<VideoConnection | null>(null);
  const [joining, setJoining] = useState(false), [remote, setRemote] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]), [msg, setMsg] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]), [tOn, setTOn] = useState(false), [tConsent, setTConsent] = useState(false);
  const [notes, setNotes] = useState("");
  const [wrap, setWrap] = useState({ summary: "", comment: "", visibility: "shared", task: "" });
  const tr = useRef<ReturnType<typeof providers.transcription> | null>(null);
  const connRef = useRef<VideoConnection | null>(null);
  const live = useAction(() => api.patch(`/appointments/${session.id}`, { status: "live" }), ["appointments"]);
  const complete = useAction((b: Record<string, unknown>) => api.post(`/appointments/${session.id}/complete`, b), ["appointments", "payments"]);
  const addTask = useAction((b: Record<string, unknown>) => api.post("/tasks", b), ["tasks"]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { connRef.current?.leave(); tr.current?.stop(); }, []);
  useEffect(() => { if (phase !== "live") return; const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [phase]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [chat, lines, panel]);

  const enter = async () => {
    setJoining(true);
    try {
      const { roomId } = await providers.video.createRoom(session.id);
      const c = await providers.video.join(roomId, { video: cam && session.mode === "video", audio: mic, displayName: me, remoteName: them });
      c.setAudio(mic); c.setVideo(cam);
      c.onChat((m) => setChat((x) => [...x, m]));
      c.onRemoteJoin((n) => { setRemote(true); toast(`${n} joined the session`, "info"); });
      connRef.current = c; setConn(c);
      if (c.mediaError) toast(c.mediaError, "info");
      if (therapist) live.mutate(undefined);
      setPhase("live");
    } catch { toast("Could not connect to the session. Please try again.", "error"); }
    setJoining(false);
  };
  const toggleMic = () => { conn?.setAudio(!mic); setMic(!mic); };
  const toggleCam = () => { conn?.setVideo(!cam); setCam(!cam); };
  const toggleTranscript = () => {
    if (tOn) { tr.current?.stop(); setTOn(false); toast("Live transcription paused", "info"); return; }
    if (!tConsent) { toast("Transcription needs participant consent first", "error"); return; }
    tr.current = providers.transcription(); tr.current.start(session.id, (l) => setLines((x) => [...x, l])); setTOn(true); setPanel("transcript"); toast("Live transcription started");
  };
  const send = () => { if (!msg.trim()) return; conn?.sendChat(msg.trim()); setMsg(""); };
  const leave = async () => {
    if (!(await confirm({ title: therapist ? "End this session?" : "Leave the session?", description: therapist ? "The session will close for everyone and you can add your post-session notes." : "You can rejoin from the same link while the session is open.", confirmLabel: therapist ? "End session" : "Leave", danger: true }))) return;
    tr.current?.stop(); connRef.current?.leave(); connRef.current = null; setConn(null); setTOn(false);
    if (therapist) setWrap((w) => ({ ...w, summary: w.summary || notes }));
    setPhase(therapist ? "wrapup" : "done");
  };
  const finish = async () => {
    try {
      await complete.mutateAsync({ summary: wrap.summary || undefined, comment: wrap.comment || undefined, visibility: wrap.visibility, transcript: lines.length ? lines : undefined });
      if (wrap.task.trim()) await addTask.mutateAsync({ title: wrap.task.trim(), description: "Assigned after session", clientName: session.clientName, status: "assigned", due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), sessionId: session.id });
      setPhase("done"); toast("Session completed and notes saved"); onComplete?.();
    } catch { toast("Could not save session notes. Try again.", "error"); }
  };

  if (phase === "lobby") {
    return (
      <div className="mx-auto grid max-w-4xl gap-5 py-4 md:grid-cols-[1.3fr_1fr]">
        <Card hover={false} className="overflow-hidden"><div className="relative grid aspect-video place-items-center bg-[#2a1d22]">
          {session.mode === "video" && cam ? <div className="absolute inset-0 grid place-items-center text-xs text-white/70">Camera preview starts when you join</div> : null}
          <Avatar name={me} size={72} />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            <IconButton label={mic ? "Mute microphone" : "Unmute microphone"} onClick={() => setMic(!mic)} className={cn("bg-white/90", !mic && "!bg-bad !text-white")}>{mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}</IconButton>
            {session.mode === "video" && <IconButton label={cam ? "Turn camera off" : "Turn camera on"} onClick={() => setCam(!cam)} className={cn("bg-white/90", !cam && "!bg-bad !text-white")}>{cam ? <Camera className="size-4" /> : <CameraOff className="size-4" />}</IconButton>}
          </div></div></Card>
        <Card hover={false} className="space-y-4 p-5">
          <div><div className="text-[10px] font-extrabold uppercase tracking-wider text-wine">{session.serviceName}</div><h1 className="text-lg font-extrabold">{therapist ? `Session with ${them}` : `Session with ${them}`}</h1><p className="text-xs text-muted">{fmtDateTime(session.start)} · {session.duration} min · {modeLabel[session.mode]}</p></div>
          <div className="flex items-center gap-2"><StatusBadge status={session.status} /><Badge tone="green"><Wifi className="mr-1 inline size-3" />Secure room</Badge></div>
          <Checkbox checked={tConsent} onChange={setTConsent} label={therapist ? "Client has consented to live transcription" : "I consent to live transcription of this session"} />
          <p className="flex gap-1.5 text-[10px] text-muted"><ShieldCheck className="size-3.5 shrink-0 text-wine" />Sessions are not recorded. Transcription is optional and can be turned off any time.</p>
          <Button className="w-full" size="lg" loading={joining} icon={<Camera className="size-4" />} onClick={enter}>{therapist ? "Start session" : "Join session"}</Button>
          <Link href={exitHref} className="block text-center text-[11px] font-semibold text-muted hover:text-wine">Not now</Link>
        </Card>
      </div>
    );
  }

  if (phase === "wrapup") {
    return (
      <Card hover={false} className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-2 text-sm font-extrabold"><ClipboardEdit className="size-4 text-wine" />Post-session notes · {clock(elapsed)} elapsed</div>
        <Textarea label="Session summary" value={wrap.summary} onChange={(e) => setWrap({ ...wrap, summary: e.target.value })} placeholder="Key themes, interventions, outcome…" />
        <Textarea label="Comment" value={wrap.comment} onChange={(e) => setWrap({ ...wrap, comment: e.target.value })} placeholder="Optional follow-up thoughts" />
        <div className="grid gap-3 sm:grid-cols-2"><Select label="Comment visibility" value={wrap.visibility} onChange={(e) => setWrap({ ...wrap, visibility: e.target.value })} options={[{ value: "shared", label: "Shared with client" }, { value: "private", label: "Private note" }]} /><Input label="Assign follow-up task (optional)" value={wrap.task} onChange={(e) => setWrap({ ...wrap, task: e.target.value })} placeholder="e.g. Daily mood log" /></div>
        {lines.length > 0 && <p className="text-[11px] text-muted">{lines.length} transcript lines will be saved to the session.</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={finish} loading={complete.isPending}>Skip notes</Button><Button onClick={finish} loading={complete.isPending}>Save & complete</Button></div>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card hover={false} className="mx-auto max-w-md p-8 text-center"><div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#e9f7f0] text-ok"><CheckCircle2 className="size-7" /></div>
        <h2 className="text-lg font-extrabold">{therapist ? "Session completed" : "You've left the session"}</h2><p className="mt-1 text-xs text-muted">{therapist ? "Notes are saved. The client can see anything you shared." : "Thank you. Your therapist will share notes and tasks after the session."}</p>
        <div className="mt-5 flex justify-center gap-2"><Link href={exitHref}><Button>{therapist ? "Back to dashboard" : "Continue"}</Button></Link>{therapist && <Link href={`/therapist/sessions/${session.id}`}><Button variant="outline">View session</Button></Link>}</div></Card>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_340px]" style={{ minHeight: "calc(100dvh - 140px)" }}>
      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-[17px] bg-[#241a1e]">
        <div className="flex items-center justify-between px-4 py-2.5 text-white"><div className="flex items-center gap-2 text-xs font-bold"><span className="size-2 animate-pulse rounded-full bg-bad" />LIVE · {clock(elapsed)}</div><div className="text-[11px] text-white/60">{session.serviceName} · {modeLabel[session.mode]}</div></div>
        <div className="relative grid flex-1 place-items-center p-3">
          {session.mode === "in_person" ? <div className="text-center text-white/80"><Avatar name={them} size={64} className="mx-auto mb-3" /><p className="text-xs">In-person session in progress. Use notes and transcript while you work.</p></div> : (
            <>
              <div className="grid size-full place-items-center rounded-2xl bg-[#33252b]">{remote ? <div className="text-center"><Avatar name={them} size={92} className={cn(mic && "ring-4 ring-wine/40")} /><div className="mt-3 text-sm font-bold text-white">{them}</div></div> : <div className="text-center text-white/70"><Loader2 className="mx-auto mb-2 size-6 animate-spin" /><p className="text-xs">Waiting for {them} to join…</p></div>}</div>
              <motion.div drag dragMomentum={false} className="absolute bottom-5 right-5 grid h-28 w-44 cursor-grab place-items-center overflow-hidden rounded-xl border-2 border-white/20 bg-[#4a3840] active:cursor-grabbing">
                <LocalVideo stream={conn?.localStream ?? null} off={!cam} />
                {(!cam || !conn?.localStream) && <div className="text-center text-white/80"><Avatar name={me} size={40} className="mx-auto" /><div className="mt-1 text-[10px]">{session.mode === "audio" ? "Audio only" : cam ? "Preview mode" : "Camera off"}</div></div>}
                <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white">You</span>
              </motion.div>
            </>
          )}
          {tOn && lines.length > 0 && <div className="absolute inset-x-6 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-center text-xs text-white backdrop-blur" aria-live="polite">{lines[lines.length - 1].text}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 p-3">
          <IconButton label={mic ? "Mute" : "Unmute"} onClick={toggleMic} className={cn("bg-white/90", !mic && "!bg-bad !text-white")}>{mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}</IconButton>
          {session.mode === "video" && <IconButton label={cam ? "Camera off" : "Camera on"} onClick={toggleCam} className={cn("bg-white/90", !cam && "!bg-bad !text-white")}>{cam ? <Camera className="size-4" /> : <CameraOff className="size-4" />}</IconButton>}
          <IconButton label={tOn ? "Pause transcription" : "Start transcription"} onClick={toggleTranscript} className={cn("bg-white/90", tOn && "!bg-wine !text-white")}><Captions className="size-4" /></IconButton>
          <IconButton label="Chat" onClick={() => setPanel(panel === "chat" ? null : "chat")} className={cn("bg-white/90", panel === "chat" && "!bg-rose !text-wine")}><MessageSquare className="size-4" /></IconButton>
          {therapist && <IconButton label="Session notes" onClick={() => setPanel(panel === "notes" ? null : "notes")} className={cn("bg-white/90", panel === "notes" && "!bg-rose !text-wine")}><ClipboardEdit className="size-4" /></IconButton>}
          <Button variant="danger" icon={<PhoneOff className="size-4" />} onClick={leave}>{therapist ? "End" : "Leave"}</Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {panel && (
          <motion.aside key="panel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex min-h-[320px] flex-col overflow-hidden rounded-[17px] border border-line bg-white shadow-card">
            <div className="flex gap-1 border-b border-line p-2 text-xs font-bold">{(therapist ? ["chat", "transcript", "notes"] : ["chat", "transcript"]).map((t) => <button key={t} onClick={() => setPanel(t as typeof panel)} className={cn("rounded-lg px-3 py-1.5 capitalize transition-colors", panel === t ? "bg-rose text-wine" : "text-muted hover:text-wine")}>{t}</button>)}</div>
            <div ref={logRef} className="scroll-thin flex-1 space-y-2.5 overflow-y-auto p-3">
              {panel === "chat" && (chat.length ? chat.map((m) => <div key={m.id} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs", m.from === "me" ? "ml-auto bg-wine text-white" : "bg-[#f4eff0]")}>{m.text}</div>) : <p className="pt-6 text-center text-[11px] text-muted">Messages are visible only to participants.</p>)}
              {panel === "transcript" && (lines.length ? lines.map((l) => <div key={l.id} className="text-xs"><div className="text-[10px] font-bold text-muted">{l.speaker === "therapist" ? session.therapistName : session.clientName} · {l.at}</div>{l.text}</div>) : <p className="pt-6 text-center text-[11px] text-muted">{tOn ? "Listening…" : tConsent ? "Press the captions button to start transcription." : "Transcription is off. Consent was not given."}</p>)}
              {panel === "notes" && <Textarea label="Private session notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[220px]" />}
            </div>
            {panel === "chat" && <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-line p-2"><input aria-label="Message" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message…" className="min-w-0 flex-1 rounded-[10px] border border-line px-3 py-2 text-xs outline-none focus:border-wine" /><Button type="submit" size="sm" icon={<Send className="size-3.5" />} disabled={!msg.trim()}>Send</Button></form>}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}