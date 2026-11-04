// Pulls a plan's JSON out of whatever an AI chat's copy button produced: code fences, text around
// it, and the artifacts chat apps add when the reply was rendered as text rather than a code block
// (HTML entities such as &#x20;, a backslash at the end of each line, curly quotes, markdown escapes).

const ENTITIES = { nbsp: " ", quot: '"', amp: "&", lt: "<", gt: ">", apos: "'" };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(nbsp|quot|amp|lt|gt|apos);/g, (_, n) => ENTITIES[n]);
}

// Each step is only tried if the previous text didn't parse, so valid JSON is never altered.
const CLEANUPS = [
  (s) => s,
  (s) => decodeEntities(s),
  // Markdown hard line breaks: "\" right before a newline is never valid JSON, so it is safe to drop.
  (s) => s.replace(/\\\r?\n/g, "\n").replace(/\\\s*$/, ""),
  (s) => s.replace(/[“”„″]/g, '"').replace(/[‘’]/g, "'").replace(/ /g, " "),
  // Markdown escapes such as \[ \] \_ \* that some apps add when copying.
  (s) => s.replace(/\\([[\]_*#>+`!-])/g, "$1"),
  // Trailing commas before } or ].
  (s) => s.replace(/,\s*([}\]])/g, "$1"),
];

// Our own prompt pasted back by mistake (it is still on the clipboard after "Copy prompt").
const isOurPrompt = (t) => /for the FitMate app/i.test(t) && /Reply format: start IMMEDIATELY|Reply with exactly ONE code block/i.test(t);

export function extractJson(text) {
  let s = String(text ?? "");
  if (isOurPrompt(s)) throw new Error("That's the prompt, not the AI's reply. Send the prompt to the AI, wait for its answer, tap Copy on its code block, then paste it here.");
  for (const clean of CLEANUPS) {
    s = clean(s);
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
      // try the next cleanup on top of this one
    }
  }
  if (!/[{}]/.test(s)) throw new Error("No plan found in that text. Paste the AI's full reply.");
  throw new Error("That reply looks cut off. Ask the AI to send the whole plan again, then paste it.");
}
