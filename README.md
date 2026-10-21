# Human vs AI — live code race

Vanilla HTML/CSS/JS. Realtime transport is [`pubnub-sse`](https://www.npmjs.com/package/pubnub-sse) with the public `demo` keys; the AI coder and the judge are the Anthropic Messages API called straight from the host's browser.

## Run

```sh
npm install                 # provides node_modules/pubnub-sse/pubnub.js
python3 -m http.server 8080 # or any static server; opening index.html directly also works
```

Host a copy where your players can reach it (the page needs `node_modules/pubnub-sse/pubnub.js` next to it), then:

- **You (server):** open the page → *Host the game* → paste your Anthropic API key (kept in `localStorage`, only sent to `api.anthropic.com`). Pick a challenge and time limit, press **Start round**. The *Player link* in the controls is what you share.
- **Everyone else:** open the page → *Join as Player* → enter a name.

Use `?room=something` on the URL to get a private channel (the demo keys are shared by everyone, so a unique room avoids collisions). Host and players must use the same room.

## How a round works

1. **Start** → everyone gets a ping, a full-screen countdown (5…1) and, if allowed, a desktop notification when the tab is in the background.
2. **GO** → the challenge is revealed to everybody at once, editors unlock, and the AI starts streaming its solution. Every keystroke (the AI's: every streamed chunk) publishes the full text, so all pages show every pane live.
3. A player hits **FINISHED** → the host sends the code to Claude with the hidden + visible test cases. Status updates flow back: *submitted → judging → score*. Everyone sees the scoreboard.
4. **Stop** or the time limit ends the round; anyone who hadn't finished is judged as-is without a speed bonus (empty editors are DNF). The AI is judged the same way as humans.

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
