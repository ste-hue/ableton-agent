# Install the Tembro free beta on macOS

1. Quit Ableton Live.
2. Open `Tembro-0.1.5-beta.dmg`, then double-click **Install Tembro**. If the
   unsigned beta is blocked, control-click the app and choose **Open**.
3. The installer places the Max for Live device, pinned `Ableton_Live_MCP`
   Remote Script, and private local bridge in the correct locations. No Xcode,
   Git, Homebrew, repository clone, or customer OpenAI key is required.
4. Reopen Live. In **Settings → Link, Tempo & MIDI**, choose
   `Ableton_Live_MCP` as a Control Surface once; leave Input and Output as None.
5. Choose **User Library → Presets → MIDI Effects → Max MIDI
   Effect → Tembro**, and drop `Tembro.amxd` on a MIDI track.
6. Enter your email and the beta access code supplied by Tembro. No card,
   Lemon Squeezy account, or OpenAI API key is required. The device stores only
   the resulting session and instance identifiers locally.

Updates use the same installer and replace the existing Tembro folder, so only
one current device appears in the User Library.

For the local development smoke test, follow `docs/tembro-v0-run.md`.
