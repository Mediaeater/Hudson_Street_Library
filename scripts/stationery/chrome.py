#!/usr/bin/env python3
"""
A headless Chrome page, driven over the DevTools protocol with nothing but the
standard library.

The stationery pipeline needs three things from a browser: load a page, switch it
to print media, then either run a function in it or take a picture of one element. Chrome speaks
the DevTools protocol over a pair of pipes when started with
--remote-debugging-pipe (NUL-terminated JSON, commands in on fd 3, replies out on
fd 4), so no websocket client and no browser-automation package is needed.

    with Page(url, viewport=(1600, 1200)) as page:
        page.print_media()
        value = page.call("(sel) => document.querySelector(sel).id", ".sheet")
        open("piece.png", "wb").write(page.screenshot(".sheet", scale=4))

The browser is the installed Chrome; set CHROME= to use another binary.
"""
import base64, json, os, shutil, subprocess, sys, tempfile, time

CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
]


def find_chrome():
    override = os.environ.get("CHROME")
    for c in ([override] if override else CANDIDATES):
        path = c if os.path.isabs(c) else shutil.which(c)
        if path and os.access(path, os.X_OK):
            return path
    sys.exit("! no Chrome found; set CHROME= to the browser binary")


class Page:
    def __init__(self, url, viewport=(1280, 720), timeout=60):
        self.timeout = timeout
        self._id = 0
        self._buf = b""
        self._profile = tempfile.mkdtemp(prefix="stationery-chrome-")
        to_chrome_r, to_chrome_w = os.pipe()
        from_chrome_r, from_chrome_w = os.pipe()

        def wire():                       # in the child: the protocol lives on fds 3 and 4
            a, b = os.dup(to_chrome_r), os.dup(from_chrome_w)   # clear of 3 and 4 first
            os.dup2(a, 3); os.dup2(b, 4)

        self._proc = subprocess.Popen(
            [find_chrome(), "--headless=new", "--remote-debugging-pipe",
             "--disable-gpu", "--no-first-run", "--no-default-browser-check",
             "--hide-scrollbars", f"--user-data-dir={self._profile}", "about:blank"],
            preexec_fn=wire, pass_fds=(3, 4), close_fds=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.close(to_chrome_r); os.close(from_chrome_w)
        self._w, self._r = to_chrome_w, from_chrome_r
        self._session = None

        target = self._send("Target.createTarget", {"url": "about:blank"})["targetId"]
        self._session = self._send("Target.attachToTarget",
                                   {"targetId": target, "flatten": True})["sessionId"]
        self._send("Page.enable")
        self._send("Page.setLifecycleEventsEnabled", {"enabled": True})
        self._send("Emulation.setDeviceMetricsOverride",
                   {"width": viewport[0], "height": viewport[1],
                    "deviceScaleFactor": 1, "mobile": False})
        nav = self._send("Page.navigate", {"url": url})
        if nav.get("errorText"):
            self.close()
            sys.exit(f"! could not load {url}: {nav['errorText']}")
        # Network idle on the main frame: the page and its web fonts are in.
        self._wait(lambda m: m.get("method") == "Page.lifecycleEvent"
                   and m["params"]["name"] == "networkIdle"
                   and m["params"]["frameId"] == nav["frameId"])
        self.call("() => document.fonts.ready.then(() => true)")

    # -- protocol ---------------------------------------------------------------
    def _read(self):
        deadline = time.time() + self.timeout
        while b"\0" not in self._buf:
            if time.time() > deadline:
                raise TimeoutError("Chrome did not answer")
            chunk = os.read(self._r, 1 << 16)
            if not chunk:
                raise RuntimeError("Chrome closed the connection")
            self._buf += chunk
        raw, self._buf = self._buf.split(b"\0", 1)
        return json.loads(raw)

    def _wait(self, match):
        while True:
            m = self._read()
            if match(m):
                return m

    def _send(self, method, params=None):
        self._id += 1
        msg = {"id": self._id, "method": method, "params": params or {}}
        if self._session:
            msg["sessionId"] = self._session
        os.write(self._w, json.dumps(msg).encode() + b"\0")
        reply = self._wait(lambda m: m.get("id") == self._id)
        if "error" in reply:
            raise RuntimeError(f"{method}: {reply['error'].get('message')}")
        return reply["result"]

    # -- what the pipeline uses ---------------------------------------------------
    def print_media(self, settle=0.4):
        self._send("Emulation.setEmulatedMedia", {"media": "print"})
        time.sleep(settle)                # let the print layout land before measuring

    def call(self, function, *args):
        """Run a JS function in the page with JSON arguments; return its value."""
        expr = f"({function})({', '.join(json.dumps(a) for a in args)})"
        r = self._send("Runtime.evaluate",
                       {"expression": expr, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            raise RuntimeError(d.get("exception", {}).get("description") or d.get("text"))
        return r["result"].get("value")

    def screenshot(self, selector, scale=1):
        """PNG bytes of one element's border box, at `scale` device pixels per CSS px."""
        box = self.call("""(sel) => { const e = document.querySelector(sel); if (!e) return null;
            const r = e.getBoundingClientRect();
            return {x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height}; }""",
                        selector)
        if not box:
            raise RuntimeError(f"selector not found: {selector}")
        r = self._send("Page.captureScreenshot",
                       {"format": "png", "captureBeyondViewport": True,
                        "clip": {**box, "scale": scale}})
        return base64.b64decode(r["data"])

    def close(self):
        try:
            self._send("Browser.close")
        except Exception:
            pass
        try:
            self._proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self._proc.kill()
        for fd in (self._w, self._r):
            try:
                os.close(fd)
            except OSError:
                pass
        shutil.rmtree(self._profile, ignore_errors=True)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
