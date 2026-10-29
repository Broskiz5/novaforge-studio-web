(() => {
  "use strict";

  const editorView = document.querySelector("#view-editor");
  if (!editorView || document.querySelector("#nexora-terminal")) return;

  const panel = document.createElement("section");
  panel.id = "nexora-terminal";
  panel.className = "nx-terminal panel";
  panel.innerHTML = `
    <div class="nx-terminal-heading">
      <div>
        <span class="nx-terminal-dot"></span>
        <strong>TERMINAL</strong>
        <span class="nx-terminal-subtitle">Termux · Bash</span>
      </div>
      <span id="nx-terminal-status" class="nx-terminal-status">Desconectado</span>
    </div>

    <div class="nx-terminal-connect">
      <input id="nx-terminal-token" type="password"
        autocomplete="off" placeholder="Pegá el token del servidor"
        aria-label="Token del terminal">
      <button id="nx-terminal-connect" class="primary" type="button">Conectar</button>
    </div>

    <div id="nx-terminal-output" class="nx-terminal-output"
      role="log" aria-live="polite">
      <div class="nx-terminal-welcome">NEXORA TERMINAL
Conectate al servidor local para empezar.
      </div>
    </div>

    <form id="nx-terminal-form" class="nx-terminal-input-row">
      <span class="nx-terminal-prompt">❯</span>
      <input id="nx-terminal-command" type="text"
        autocomplete="off" spellcheck="false"
        placeholder="Escribí un comando..." disabled
        aria-label="Comando de Termux">
      <button type="submit" disabled id="nx-terminal-run">Ejecutar</button>
    </form>

    <div class="nx-terminal-footer">
      <span>Shell local</span>
      <button type="button" id="nx-terminal-clear">Limpiar pantalla</button>
    </div>
  `;

  const editorLayout = editorView.querySelector(".editor-layout");
  if (editorLayout) {
    editorLayout.insertAdjacentElement("afterend", panel);
  } else {
    editorView.appendChild(panel);
  }

  const $ = id => document.getElementById(id);
  const tokenInput = $("nx-terminal-token");
  const connectButton = $("nx-terminal-connect");
  const status = $("nx-terminal-status");
  const output = $("nx-terminal-output");
  const commandInput = $("nx-terminal-command");
  const form = $("nx-terminal-form");
  const runButton = $("nx-terminal-run");

  let token = "";
  let cursor = 0;
  let connected = false;
  let polling = false;
  let pollTimer = null;

  function print(text, className = "") {
    if (!text) return;
    const line = document.createElement("div");
    line.className = "nx-terminal-line " + className;
    line.textContent = text;
    output.appendChild(line);
    while (output.childNodes.length > 1500) {
      output.removeChild(output.firstChild);
    }
    output.scrollTop = output.scrollHeight;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      cache: "no-store",
      headers: {
        "X-Nexora-Token": token,
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Error HTTP ${response.status}`);
    }
    return data;
  }

  // Shared authenticated API for NovaForge bot controls.
  window.NovaForgeBotAPI = Object.freeze({
    request: (path, options = {}) => {
      if (!connected) {
        return Promise.reject(new Error("Conectá primero la terminal de NovaForge."));
      }
      return api(path, options);
    },
    isConnected: () => connected
  });

  function setConnected(value) {
    connected = value;
    status.textContent = value ? "Conectado" : "Desconectado";
    status.classList.toggle("is-connected", value);
    commandInput.disabled = !value;
    runButton.disabled = !value;
    connectButton.textContent = value ? "Desconectar" : "Conectar";
    if (value) commandInput.focus();
  }

  async function poll() {
    if (!connected || polling) return;
    polling = true;

    try {
      const data = await api(`/api/output?since=${cursor}`);
      if (cursor < data.base) cursor = data.base;
      if (data.text) print(data.text);
      cursor = data.next;
    } catch (error) {
      print("[Conexión perdida] " + error.message, "nx-error");
      setConnected(false);
      clearTimeout(pollTimer);
    } finally {
      polling = false;
      if (connected) pollTimer = setTimeout(poll, 500);
    }
  }

  connectButton.addEventListener("click", async () => {
    if (connected) {
      clearTimeout(pollTimer);
      token = "";
      setConnected(false);
      print("[Interfaz desconectada. El proceso del servidor sigue activo.]");
      return;
    }

    token = tokenInput.value.trim();
    if (!token) {
      print("Pegá primero el token que muestra Termux.", "nx-error");
      return;
    }

    connectButton.disabled = true;
    try {
      await api("/api/status");
      cursor = 0;
      output.replaceChildren();
      print("Conexión establecida con el shell de Termux.", "nx-success");
      setConnected(true);
      poll();
    } catch (error) {
      token = "";
      print("No se pudo conectar: " + error.message, "nx-error");
    } finally {
      connectButton.disabled = false;
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!connected) return;

    const command = commandInput.value;
    if (!command.trim()) return;

    print("$ " + command, "nx-command");
    commandInput.value = "";

    if (command.trim() === "clear") {
      output.replaceChildren();
      return;
    }

    try {
      await api("/api/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
    } catch (error) {
      print("Error: " + error.message, "nx-error");
    }
  });

  $("nx-terminal-clear").addEventListener("click", () => {
    output.replaceChildren();
  });

  commandInput.addEventListener("keydown", event => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
    }
  });
})();
