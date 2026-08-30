# Install the Tembro free beta on macOS

1. Quit Ableton Live.
2. Copy the complete `Tembro` folder into:

   `~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/`

   Keep `Tembro.amxd` and every `.js` file together in that folder.
3. Install and select the pinned `Ableton_Live_MCP` Remote Script by following
   the repository setup guide. The free beta still needs this local bridge;
   it never exposes Live to the internet.
4. The beta API is preconfigured as `{{TEMBRO_API_URL}}` in the release bundle.
5. Reopen Live, choose **User Library → Presets → MIDI Effects → Max MIDI
   Effect → Tembro**, and drop `Tembro.amxd` on a MIDI track.
6. Enter your email and the beta access code supplied by Tembro. No card,
   Lemon Squeezy account, or OpenAI API key is required. The device stores only
   the resulting session and instance identifiers locally.

For the local development smoke test, follow `docs/tembro-v0-run.md`.
