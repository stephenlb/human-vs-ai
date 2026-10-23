# Human vs AI — live code race

Vanilla HTML/CSS/JS. Realtime transport is [`pubnub-sse`](https://www.npmjs.com/package/pubnub-sse) with the public `demo` keys; the AI coder and the judge are the Anthropic Messages API called straight from the host's browser.

## Run

```sh
# nothing to install: lib/pubnub-sse.js is a vendored copy of pubnub-sse@1.0.8 (npm i pubnub-sse to update it)
python3 -m http.server 8080 # or any static server; opening index.html directly also works
```

Host a copy where your players can reach it (any static host works, e.g. GitHub Pages; everything is committed, no build step), then:

- **You (server):** open the page → *Host the game* → paste your Anthropic API key (kept in `localStorage`, only sent to `api.anthropic.com`). Pick a challenge and time limit, press **Start round**. The *Player link* in the controls is what you share.
- **Everyone else:** open the page → *Join as Player* → enter a name.

Use `?room=something` on the URL to get a private channel (the demo keys are shared by everyone, so a unique room avoids collisions). Host and players must use the same room.

## How a round works

1. **Start** → everyone gets a ping, a full-screen countdown (5…1) and, if allowed, a desktop notification when the tab is in the background.
2. **GO** → the challenge is revealed to everybody at once, editors unlock, and the AI starts streaming its solution. Every keystroke (the AI's: every streamed chunk) publishes the full text, so all pages show every pane live.
   The AI always finishes first. The moment it submits it taunts the players, and keeps posting a fresh taunt every 10 seconds while the round runs. Each is a one-liner written by Claude (canned fallback if that call fails) that reacts to who is still coding and who has submitted, shown in a speech bubble on the AI's pane. The first taunt of a round also plays a sound and sends a desktop notification.
3. A player hits **FINISHED** → the host sends the code to Claude with the hidden + visible test cases. Status updates flow back: *submitted → judging → score*. Everyone sees the scoreboard.
4. The round ends on its own once the AI and every online player have submitted (the host broadcasts "round over" and scores finish tallying). **Stop** or the time limit also ends it; anyone who hadn't finished is judged as-is without a speed bonus (empty editors are DNF). The AI is judged the same way as humans.

`score = correctness × (0.6 + 0.4 × speed)`, where correctness is the % of tests Claude says pass and `speed = 1 − elapsed / timeLimit`.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | UI |
| `app.js` | state, PubNub protocol, host round control, rendering |
| `ai.js` | Anthropic streaming AI coder, judge, model list |
| `alerts.js` | start ping, countdown beeps, desktop notifications |
| `challenges.js` | coding challenges (add yours here) |

## Notes

- Keep the host tab visible during a round (background tabs throttle timers).
- Defaults are `claude-sonnet-5-5` for both roles, AI effort `low`. All are editable under *AI & judge settings*; use *model default* for models that don't support `effort`.
- Anyone who can publish to the channel can spoof messages: this is a party game, not a secured one.
