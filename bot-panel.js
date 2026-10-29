(() => {
  "use strict";

  function init() {
    const builder = document.querySelector("#view-builder");
    const grid = builder?.querySelector(".builder-grid");
    if (!grid || document.querySelector("#nf-bot-panel")) return;

    const panel = document.createElement("section");
    panel.id = "nf-bot-panel";
    panel.className = "panel nf-bot-panel";
    panel.innerHTML = `
      <div class="nf-bot-heading">
        <div>
          <span class="eyebrow">BOT CONTROL CENTER</span>
          <h3>Administrador de bots</h3>
          <p>Gestioná los bots que se ejecutan en Termux.</p>
        </div>
        <button class="secondary" id="nf-bot-refresh" type="button">↻ Actualizar</button>
      </div>

      <div class="nf-bot-connection">
        <span class="status-dot"></span>
        <span id="nf-bot-connection-text">Comprobando conexión...</span>
      </div>

      <form id="nf-bot-create-form" class="nf-bot-create">
        <label for="nf-bot-name">Nombre del nuevo bot</label>
        <div class="nf-bot-create-row">
          <input id="nf-bot-name" name="name" required
            minlength="1" maxlength="60"
            pattern="[A-Za-z0-9_-]+"
            placeholder="MiNuevoBot" autocomplete="off">
          <button class="primary" type="submit">＋ Crear bot</button>
        </div>
        <p class="hint">Usá letras, números, guiones o guiones bajos.</p>
      </form>

      <p id="nf-bot-message" class="nf-bot-message" role="status">
        Conectá la terminal para administrar los bots.
      </p>

      <div id="nf-bot-list" class="nf-bot-list"></div>

      <div class="nf-bot-logs">
        <div class="nf-bot-logs-heading">
          <h4>Registros de ejecución</h4>
          <span id="nf-bot-log-name">Ningún bot seleccionado</span>
        </div>
        <pre id="nf-bot-log-output">Seleccioná un bot para ver sus registros.</pre>
      </div>
    `;

    grid.insertAdjacentElement("afterend", panel);

    const $ = selector => panel.querySelector(selector);
    const message = $("#nf-bot-message");
    const list = $("#nf-bot-list");
    const connectionText = $("#nf-bot-connection-text");
    const logOutput = $("#nf-bot-log-output");
    const logName = $("#nf-bot-log-name");

    let selectedName = "";

    function setMessage(text, error = false) {
      message.textContent = text;
      message.classList.toggle("is-error", error);
    }

    function api() {
      const bridge = window.NovaForgeBotAPI;
      if (!bridge?.isConnected()) {
        throw new Error("Conectá la terminal de NovaForge primero.");
      }
      return bridge;
    }

    async function request(path, method = "GET", body) {
      const bridge = api();
      const options = { method };

      if (body !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
      }

      return bridge.request(path, options);
    }

    function button(label, action, name, disabled = false) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "secondary nf-bot-action";
      element.textContent = label;
      element.dataset.botAction = action;
      element.dataset.botName = name;
      element.disabled = disabled;
      return element;
    }

    function renderProjects(projects) {
      list.replaceChildren();

      if (!projects.length) {
        const empty = document.createElement("p");
        empty.className = "hint";
        empty.textContent = "Todavía no hay proyectos en la carpeta de bots.";
        list.appendChild(empty);
        return;
      }

      for (const project of projects) {
        const card = document.createElement("article");
        card.className = "nf-bot-card";

        const heading = document.createElement("div");
        heading.className = "nf-bot-card-heading";

        const title = document.createElement("strong");
        title.textContent = project.name;

        const status = document.createElement("span");
        status.className = "nf-bot-status " +
          (project.running ? "is-running" : "is-stopped");
        status.textContent = project.running
          ? "● En ejecución"
          : "○ Detenido";

        heading.append(title, status);

        const detail = document.createElement("p");
        detail.className = "hint";
        detail.textContent = project.running
          ? `Proceso activo · PID ${project.pid ?? "desconocido"}`
          : project.exitCode !== null && project.exitCode !== undefined
            ? `Último código de salida: ${project.exitCode}`
            : "Listo para configurar o iniciar.";

        const actions = document.createElement("div");
        actions.className = "nf-bot-actions";
        actions.append(
          button("Ver registros", "logs", project.name),
          button("Instalar", "install", project.name, project.running),
          button(project.running ? "Detener" : "Iniciar",
            project.running ? "stop" : "start", project.name)
        );

        card.append(heading, detail, actions);
        list.appendChild(card);
      }
    }

    async function refresh() {
      connectionText.textContent = window.NovaForgeBotAPI?.isConnected()
        ? "Terminal conectada"
        : "Terminal desconectada";

      if (!window.NovaForgeBotAPI?.isConnected()) {
        list.replaceChildren();
        setMessage("Conectá la terminal para administrar los bots.", true);
        return;
      }

      try {
        const data = await request("/api/bots");
        renderProjects(Array.isArray(data.projects) ? data.projects : []);
        setMessage("Lista de bots actualizada.");

        if (selectedName) await loadLogs(selectedName);
      } catch (error) {
        setMessage(error.message, true);
      }
    }

    async function loadLogs(name) {
      try {
        const data = await request(
          "/api/bots/" + encodeURIComponent(name) + "/logs"
        );
        selectedName = name;
        logName.textContent = name;
        logOutput.textContent = data.logs || "Este bot todavía no tiene registros.";
        logOutput.scrollTop = logOutput.scrollHeight;
      } catch (error) {
        setMessage(error.message, true);
      }
    }

    $("#nf-bot-refresh").addEventListener("click", refresh);

    $("#nf-bot-create-form").addEventListener("submit", async event => {
      event.preventDefault();
      const input = $("#nf-bot-name");
      const name = input.value.trim();

      if (!/^[A-Za-z0-9_-]{1,60}$/.test(name)) {
        setMessage("Nombre inválido. Usá de 1 a 60 letras, números, _ o -.", true);
        return;
      }

      try {
        setMessage("Creando proyecto...");
        const result = await request("/api/bots", "POST", { name });
        input.value = "";
        selectedName = result.project?.name || name;
        setMessage("Bot creado. Ahora instalá las dependencias.");
        await refresh();
        await loadLogs(selectedName);
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    list.addEventListener("click", async event => {
      const target = event.target.closest("[data-bot-action]");
      if (!target) return;

      const action = target.dataset.botAction;
      const name = target.dataset.botName;
      target.disabled = true;

      try {
        if (action === "logs") {
          await loadLogs(name);
          return;
        }

        setMessage(
          action === "install" ? `Instalando dependencias de ${name}...` :
          action === "start" ? `Iniciando ${name}...` :
          `Solicitando la detención de ${name}...`
        );

        const result = await request(
          "/api/bots/" + encodeURIComponent(name) + "/" + action,
          "POST"
        );

        if (result?.ok === false) {
          throw new Error(result.error || "No se pudo completar la operación.");
        }

        selectedName = name;
        setMessage(
          action === "install" ? "Instalación completada." :
          action === "start" ? "Solicitud de inicio enviada." :
          "Solicitud de detención enviada."
        );

        await refresh();
        await loadLogs(name);
      } catch (error) {
        setMessage(error.message, true);
      } finally {
        target.disabled = false;
      }
    });

    refresh();
    console.log("NovaForge Bot Panel inicializado.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
