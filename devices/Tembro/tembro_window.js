// Runs in Max's legacy js object (ES5 only — no const/let/arrows). The v8
// object's maxobj API proved unreliable in Live's bundled runtime, while
// this js-object pattern (obj.message("readfile", path), Task pump) is the
// one the validated M4L host uses.
inlets = 1;
outlets = 0;

var pageReady = false;
var loadTicks = 0;
var loadSends = 0;

post("tembro_window 0.1.2 active\n");

// The chat page reports ui_ready through the patch router, which also feeds
// this script; once it arrives we never touch the page again.
function ui_ready() {
    pageReady = true;
}

function pagePath() {
    try {
        var fp = String(this.patcher.filepath || "");
        var cut = fp.lastIndexOf("/");
        if (cut > 0) {
            return fp.substring(0, cut + 1) + "tembro_ui.html";
        }
    } catch (err) {
        // fall through to the search-path form
    }
    return "tembro_ui.html";
}

function tick() {
    var web = null;
    try {
        web = this.patcher.getnamed("tembro-web");
    } catch (err) {
        return;
    }
    if (!web) {
        return;
    }

    // Keep the jweb surface pinned to the presentation window while the user
    // resizes the floating Tembro chat. Cosmetic: failures stay silent.
    try {
        var bounds = this.patcher.wind.size;
        var width = Math.max(420, Number(bounds[2]) - Number(bounds[0]));
        var height = Math.max(420, Number(bounds[3]) - Number(bounds[1]));
        web.rect = [0, 0, width, height];
    } catch (errRect) {
    }

    // Load the chat page with a scripting message — the only delivery of
    // readfile observed to reach jweb in the bundled runtime (patch-cord
    // loadmess and node outlet kicks never arrived). Retry every ~3s, stop
    // for good once the page answers ui_ready or after 10 attempts.
    if (!pageReady && loadSends < 10) {
        if (loadTicks % 15 === 0) {
            try {
                web.message("readfile", String(pagePath.call(this)));
                loadSends += 1;
            } catch (errRead) {
                // jweb not ready yet; the next tick retries
            }
        }
        loadTicks += 1;
    }
}

function bang() {
    tick.call(this);
}

// Drive everything from our own Task so nothing depends on the subpatcher's
// loadbang or qmetro actually firing in the bundled runtime.
var pump = new Task(tick, this);
pump.interval = 200;
pump.repeat();
