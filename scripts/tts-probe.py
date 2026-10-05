#!/usr/bin/env python3
# One-shot edge-tts diagnostic. Prints the EXACT failure mode so we know the fix.
import asyncio, sys, traceback
try:
    import edge_tts
except Exception as e:
    print("edge_tts import FAILED:", e); sys.exit(2)
print("edge_tts version:", getattr(edge_tts, "__version__", "?"))
TEXT = "This is a short connectivity probe for the free edge text to speech endpoint."
VOICE = "en-US-AriaNeural"
async def go():
    c = edge_tts.Communicate(TEXT, voice=VOICE, rate="+4%", boundary="WordBoundary")
    audio = bytearray(); wb = 0
    async for ch in c.stream():
        t = ch.get("type")
        if t == "audio": audio.extend(ch["data"])
        elif t == "WordBoundary": wb += 1
    print(f"RESULT: audio_bytes={len(audio)}  wordboundary_events={wb}")
    if len(audio) == 0: print(">>> DIAGNOSIS: connected but NO AUDIO returned (service degraded).")
    elif wb == 0:       print(">>> DIAGNOSIS: audio OK but ZERO WordBoundary events -> trips empty-sidecar guard. Fix: regenerate words client-side or disable sidecar strictness.")
    else:               print(">>> DIAGNOSIS: edge-tts is WORKING right now. The earlier failure was transient throttling -> re-run with --jobs=1.")
try:
    asyncio.run(go())
except Exception as e:
    name = type(e).__name__
    msg = str(e)
    print(f"EXCEPTION: {name}: {msg}")
    if "403" in msg or "Invalid response status" in msg or "Handshake" in name:
        print(">>> DIAGNOSIS: 403 Sec-MS-GEC HANDSHAKE BREAK (service-side). No newer edge-tts exists to fix it. Options: wait/retry later, patch token, or switch TTS_ENGINE.")
    elif "429" in msg or "throttl" in msg.lower():
        print(">>> DIAGNOSIS: 429 THROTTLE. Fix: re-run with --jobs=1 and longer spacing.")
    elif "name resolution" in msg.lower() or "Cannot connect" in msg:
        print(">>> DIAGNOSIS: NETWORK/DNS cannot reach speech.platform.bing.com from this machine.")
    else:
        print(">>> DIAGNOSIS: unrecognized — paste the EXCEPTION line above back to Claude.")
        traceback.print_exc()
