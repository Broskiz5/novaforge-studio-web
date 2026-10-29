'use strict';

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const KEY = 'nexoraStudioV2.projects.v1';

  const state = {
    projects: [],
    currentProjectId: null,
    currentFile: null,
    activeView: 'home',
    wikiArticle: 'overview'
  };

  const views = {
    home: ['Inicio', 'Tu espacio de trabajo para desarrollar desde el móvil.'],
    projects: ['Proyectos', 'Tus proyectos guardados en este dispositivo.'],
    editor: ['Editor de código', 'Editá y guardá tus archivos.'],
    builder: ['Crear proyecto', 'Elegí una plantilla para empezar.'],
    preview: ['Vista previa', 'Probá tus proyectos web.'],
    assistant: ['Asistente IA', 'Prepará consultas técnicas para una IA.'],
    wiki: ['Wiki de Nexora', 'Documentación y guía de uso.'],
    settings: ['Configuración', 'Administrá tus proyectos y copias.']
  };

  const wiki = {
    overview: {
      title: 'Bienvenido a Nexora Studio',
      html: `<p>Nexora Studio es un entorno de desarrollo para usar desde el navegador del celular.</p>
      <h3>Funciones</h3><ul>
      <li>Crear proyectos web y de bots.</li>
      <li>Editar archivos de texto y código.</li>
      <li>Previsualizar páginas web.</li>
      <li>Exportar e importar proyectos.</li>
      <li>Consultar esta Wiki.</li></ul>
      <div class="notice">Exportá copias de seguridad periódicamente.</div>`
    },
    projects: {
      title: 'Proyectos',
      html: `<p>Creá proyectos, buscá los existentes y abrilos en el editor.</p>
      <p>Los proyectos se guardan en el navegador de este dispositivo. No se sincronizan automáticamente con otros dispositivos.</p>`
    },
    editor: {
      title: 'Editor',
      html: `<p>Elegí un proyecto, seleccioná un archivo, editá su contenido y presioná Guardar.</p>
      <p>Esta primera versión todavía no incluye terminal integrada ni autocompletado avanzado.</p>`
    },
    builder: {
      title: 'Creador',
      html: `<p>Las plantillas crean archivos iniciales para páginas web, bots de Discord o proyectos vacíos.</p>
      <p>Crear una plantilla de bot no instala dependencias ni inicia el bot.</p>`
    },
    preview: {
      title: 'Vista previa',
      html: `<p>La vista previa combina index.html, styles.css y app.js cuando están disponibles.</p>
      <p>No ejecuta bots de Discord ni programas de Node.js.</p>`
    },
    assistant: {
      title: 'Asistente IA',
      html: `<p>Podés preparar una consulta y copiarla para pegarla en un servicio de IA.</p>
      <p>La conexión automática con IA todavía no está implementada. Nunca compartas tokens ni contraseñas.</p>`
    },
    settings: {
      title: 'Configuración y copias',
      html: `<p>Exportá tus proyectos como JSON para conservar una copia.</p>
      <p>Importar una copia reemplaza la lista actual. Revisá el archivo antes de importarlo.</p>`
    },
    security: {
      title: 'Seguridad',
      html: `<ul><li>No compartas tokens de bots.</li><li>No guardes contraseñas en proyectos públicos.</li><li>Revisá el código antes de ejecutarlo.</li><li>Conservá copias de seguridad.</li></ul>`
    },
    rules: {
      title: 'Reglas',
      html: `<ul><li>Los proyectos necesitan un nombre.</li><li>Los cambios deben guardarse.</li><li>La vista previa está destinada a proyectos web.</li><li>Las plantillas no son aplicaciones ya ejecutándose.</li></ul>`
    },
    install: {
      title: 'Instalación PWA',
      html: `<p>Usá localhost o HTTPS para habilitar las funciones PWA. Abrir el HTML directamente como archivo no permite todas las funciones.</p>
      <p>La opción de instalar depende del navegador utilizado.</p>`
    }
  };

  function id() {
    return 'nx-' + Date.now().toString(36) +
      '-' + Math.random().toString(36).slice(2, 8);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function notify(message) {
    const el = $('#toast');
    if (!el) {
      alert(message);
      return;
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      el.hidden = true;
    }, 3000);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.projects));
      return true;
    } catch (error) {
      console.error(error);
      notify('No se pudo guardar. Revisá el espacio disponible.');
      return false;
    }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      state.projects = Array.isArray(data)
        ? data.filter(p => p && typeof p.id === 'string'
          && typeof p.name === 'string' && p.files
          && typeof p.files === 'object' && !Array.isArray(p.files))
        : [];
    } catch (error) {
      state.projects = [];
      console.error('Error leyendo proyectos:', error);
    }
  }

  function current() {
    return state.projects.find(p => p.id === state.currentProjectId) || null;
  }

  function typeName(type) {
    return ({ web: 'Web', discord: 'Bot Discord', blank: 'Vacío' })[type] || 'Proyecto';
  }

  function typeIcon(type) {
    return ({ web: '🌐', discord: '🤖', blank: '📁' })[type] || '📄';
  }

  function starterFiles(type) {
    if (type === 'discord') {
      return {
        'index.js': `// Nexora Studio - Discord bot starter
// Install dependencies in a Node.js environment.
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log('Bot connected: ' + client.user.tag);
});

if (!process.env.DISCORD_TOKEN) {
  console.error('Set DISCORD_TOKEN privately first.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
`,
        'package.json': JSON.stringify({
          name: 'nexora-discord-bot',
          version: '1.0.0',
          main: 'index.js',
          scripts: { start: 'node index.js' },
          dependencies: {
            'discord.js': '^14.0.0',
            dotenv: '^16.0.0'
          }
        }, null, 2),
        '.env.example': 'DISCORD_TOKEN=your_private_token_here\n',
        'README.md': '# Discord Bot\n\nKeep real tokens private.\n'
      };
    }

    if (type === 'blank') {
      return {
        'README.md': '# My Project\n\nCreated with Nexora Studio.\n'
      };
    }

    return {
      'index.html': `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mi proyecto</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<main class="container">
<h1>¡Hola desde Nexora!</h1>
<p>Este es tu nuevo proyecto web.</p>
<button id="hello-button">Probar botón</button>
<p id="message"></p>
</main>
<script src="app.js"></script>
</body>
</html>`,
      'styles.css': `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #101322;
  color: #f3f4ff;
}
.container { max-width: 760px; margin: 12vh auto; padding: 24px; }
button {
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  background: #8b78f6;
  color: white;
  font-weight: 700;
}`,
      'app.js': `const button = document.querySelector('#hello-button');
const message = document.querySelector('#message');
button?.addEventListener('click', () => {
  if (message) message.textContent = '¡Funciona!';
});`
    };
  }

  function createProject(name, type) {
    const project = {
      id: id(),
      name: name.trim(),
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: starterFiles(type)
    };
    state.projects.unshift(project);
    state.currentProjectId = project.id;
    state.currentFile = Object.keys(project.files)[0] || null;
    save();
    renderAll();
    navigate('editor');
    notify('Proyecto creado correctamente.');
  }

  function openProject(projectId, view = 'editor') {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return notify('No se encontró ese proyecto.');
    state.currentProjectId = project.id;
    state.currentFile = Object.keys(project.files)[0] || null;
    renderAll();
    navigate(view);
  }

  function navigate(view) {
    if (!views[view]) view = 'home';
    state.activeView = view;

    $$('.view').forEach(el => {
      el.classList.toggle('active', el.id === `view-${view}`);
    });

    $$('.nav-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    if ($('#page-title')) $('#page-title').textContent = views[view][0];
    if ($('#page-subtitle')) $('#page-subtitle').textContent = views[view][1];

    $('#sidebar')?.classList.remove('open');

    if (view === 'editor') renderEditor();
    if (view === 'preview') renderPreview();
    if (view === 'wiki') renderWiki();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderStats() {
    const files = state.projects.reduce(
      (total, p) => total + Object.keys(p.files || {}).length, 0
    );

    if ($('#stat-projects')) $('#stat-projects').textContent = state.projects.length;
    if ($('#stat-files')) $('#stat-files').textContent = files;
    if ($('#stat-web')) {
      $('#stat-web').textContent =
        state.projects.filter(p => p.type === 'web').length;
    }

    const recent = $('#recent-projects');
    if (!recent) return;

    const projects = state.projects.slice(0, 4);

    recent.innerHTML = projects.length
      ? projects.map(p => `
        <div class="project-row">
          <div class="project-symbol">${typeIcon(p.type)}</div>
          <div class="project-info">
            <strong>${esc(p.name)}</strong>
            <small>${esc(typeName(p.type))} · ${Object.keys(p.files).length} archivo(s)</small>
          </div>
          <button class="button small" data-open-project="${esc(p.id)}">Abrir</button>
        </div>
      `).join('')
      : `<div class="empty-state">
          <div class="empty-icon">🗂️</div>
          <strong>Tu espacio está listo</strong>
          <p>Creá tu primer proyecto para empezar.</p>
          <button class="button primary" data-action="new-project">＋ Crear proyecto</button>
        </div>`;
  }

  function renderProjects() {
    const container = $('#all-projects');
    if (!container) return;

    const search = ($('#project-search')?.value || '').trim().toLowerCase();
    const projects = state.projects.filter(p =>
      `${p.name} ${typeName(p.type)}`.toLowerCase().includes(search)
    );

    if ($('#projects-empty')) {
      $('#projects-empty').hidden = projects.length > 0;
    }

    container.innerHTML = projects.map(p => `
      <article class="project-card">
        <div class="project-card-top">
          <div class="project-symbol">${typeIcon(p.type)}</div>
          <span class="pill">${esc(typeName(p.type))}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${Object.keys(p.files).length} archivo(s)</p>
        <div class="project-card-bottom">
          <button class="button primary small" data-open-project="${esc(p.id)}">Abrir</button>
          <button class="button small" data-delete-project="${esc(p.id)}">Eliminar</button>
        </div>
      </article>
    `).join('');
  }

  function renderEditor() {
    const project = current();
    const selector = $('#editor-project');
    const list = $('#file-list');
    const editor = $('#code-editor');

    if (selector) {
      selector.innerHTML = state.projects.map(p =>
        `<option value="${esc(p.id)}">${esc(p.name)}</option>`
      ).join('');
      selector.value = project?.id || '';
    }

    if (!project) {
      if (list) list.innerHTML = '<p class="muted">Creá o seleccioná un proyecto.</p>';
      if (editor) {
        editor.value = '';
        editor.disabled = true;
      }
      if ($('#active-file-name')) $('#active-file-name').textContent = 'Sin archivo';
      if ($('#save-status')) $('#save-status').textContent = 'Sin proyecto';
      if ($('#char-count')) $('#char-count').textContent = '0 caracteres';
      return;
    }

    if (editor) editor.disabled = false;

    const names = Object.keys(project.files);
    if (!names.includes(state.currentFile)) {
      state.currentFile = names[0] || null;
    }

    if (list) {
      list.innerHTML = names.map(name => `
        <button class="file-item ${name === state.currentFile ? 'active' : ''}"
          data-select-file="${esc(name)}">📄 ${esc(name)}</button>
      `).join('');
    }

    if ($('#active-file-name')) {
      $('#active-file-name').textContent = state.currentFile || 'Sin archivo';
    }

    if (editor && document.activeElement !== editor) {
      editor.value = state.currentFile ? String(project.files[state.currentFile] ?? '') : '';
    }

    if ($('#save-status')) $('#save-status').textContent = 'Guardado local';
    if ($('#char-count')) {
      $('#char-count').textContent = `${editor?.value.length || 0} caracteres`;
    }
  }

  function saveCurrentFile(showMessage = true) {
    const project = current();
    const editor = $('#code-editor');

    if (!project || !state.currentFile || !editor) {
      if (showMessage) notify('Seleccioná un proyecto y un archivo primero.');
      return false;
    }

    project.files[state.currentFile] = editor.value;
    project.updatedAt = new Date().toISOString();
    const success = save();

    if ($('#save-status')) {
      $('#save-status').textContent = success ? 'Guardado' : 'Error al guardar';
      $('#save-status').classList.toggle('saved', success);
    }

    if ($('#char-count')) {
      $('#char-count').textContent = `${editor.value.length} caracteres`;
    }

    renderStats();
    renderProjects();

    if (success && showMessage) notify('Archivo guardado.');
    return success;
  }

  function renderPreview() {
    const frame = $('#preview-frame');
    if (!frame) return;

    const project = current();
    const selector = $('#preview-project');
    const webProjects = state.projects.filter(p => p.type === 'web');

    if (selector) {
      selector.innerHTML = webProjects.map(p =>
        `<option value="${esc(p.id)}">${esc(p.name)}</option>`
      ).join('');
    }

    if (!project || project.type !== 'web' || !project.files['index.html']) {
      frame.srcdoc = '<!doctype html><html><body style="font-family:system-ui;padding:25px;color:#444"><h2>Vista previa</h2><p>Seleccioná un proyecto web con index.html.</p></body></html>';
      if ($('#preview-status')) {
        $('#preview-status').textContent = 'Elegí un proyecto web.';
      }
      return;
    }

    if (selector) selector.value = project.id;

    let html = String(project.files['index.html'] || '');
    const css = String(project.files['styles.css'] || '');
    const js = String(project.files['app.js'] || '');

    html = html.replace(
      /<link\b[^>]*href=["']styles\.css["'][^>]*>/gi, ''
    );

    html = html.replace(
      /<script\b[^>]*src=["']app\.js["'][^>]*>\s*<\/script>/gi, ''
    );

    html = html.replace(
      /<\/head>/i,
      `<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>`
    );

    const script = `<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script>`;

    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${script}</body>`);
    } else {
      html += script;
    }

    frame.srcdoc = html;

    if ($('#preview-status')) {
      $('#preview-status').textContent = `Previsualizando: ${project.name}`;
    }
  }

  function renderWiki() {
    const article = wiki[state.wikiArticle] || wiki.overview;

    if ($('#wiki-menu')) {
      $('#wiki-menu').innerHTML = Object.entries(wiki).map(([key, item]) => `
        <button class="wiki-link ${key === state.wikiArticle ? 'active' : ''}"
          data-wiki-article="${key}">${esc(item.title)}</button>
      `).join('');
    }

    if ($('#wiki-title')) $('#wiki-title').textContent = article.title;
    if ($('#wiki-content')) $('#wiki-content').innerHTML = article.html;
    if ($('#wiki-category')) {
      $('#wiki-category').textContent = `${Object.keys(wiki).length} artículos`;
    }
  }

  function renderAll() {
    renderStats();
    renderProjects();
    renderEditor();
    if (state.activeView === 'preview') renderPreview();
    if (state.activeView === 'wiki') renderWiki();
  }

  function openCreateDialog(type = 'web') {
    const dialog = $('#project-dialog');
    const form = $('#project-form');

    if ($('#project-type')) $('#project-type').value = type;
    if ($('#project-name')) $('#project-name').value = '';

    if (dialog?.showModal) {
      dialog.showModal();
      $('#project-name')?.focus();
    } else {
      const name = prompt('Nombre del proyecto:');
      if (name?.trim()) createProject(name, type);
    }
  }

  function deleteProject(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return;

    state.projects = state.projects.filter(p => p.id !== projectId);

    if (state.currentProjectId === projectId) {
      state.currentProjectId = null;
      state.currentFile = null;
    }

    save();
    renderAll();
    notify('Proyecto eliminado.');
  }

  function createFile() {
    const project = current();
    if (!project) return notify('Primero abrí o creá un proyecto.');

    const name = prompt('Nombre del archivo (por ejemplo, styles.css):');
    if (!name?.trim()) return;

    const filename = name.trim().replace(/[/\\]/g, '');
    if (!filename || filename === '.' || filename === '..') {
      return notify('Nombre de archivo no válido.');
    }

    if (Object.hasOwn(project.files, filename)) {
      return notify('Ese archivo ya existe.');
    }

    project.files[filename] = '';
    project.updatedAt = new Date().toISOString();
    state.currentFile = filename;
    save();
    renderAll();
    navigate('editor');
    notify('Archivo creado.');
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('No se pudo copiar');
      }
      notify('Copiado al portapapeles.');
    } catch (error) {
      console.error(error);
      notify('No se pudo copiar automáticamente. Seleccioná y copiá el texto.');
    }
  }

  function exportProjects() {
    const data = {
      app: 'Nexora Studio',
      version: 2,
      exportedAt: new Date().toISOString(),
      projects: state.projects
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('Copia de seguridad preparada.');
  }

  async function importProjects(file) {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.projects;

      if (!Array.isArray(incoming)) {
        throw new Error('El archivo no contiene una lista de proyectos.');
      }

      const valid = incoming.filter(p =>
        p && typeof p.name === 'string' &&
        p.name.trim() && p.files &&
        typeof p.files === 'object' && !Array.isArray(p.files)
      );

      if (valid.length !== incoming.length) {
        throw new Error('Hay proyectos con datos inválidos en la copia.');
      }

      if (!confirm(`Se importarán ${valid.length} proyectos y se reemplazará la lista actual. ¿Continuar?`)) {
        return;
      }

      state.projects = valid.map(p => ({
        id: id(),
        name: p.name.trim(),
        type: ['web', 'discord', 'blank'].includes(p.type) ? p.type : 'blank',
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: Object.fromEntries(
          Object.entries(p.files).filter(([name, content]) =>
            typeof name === 'string' && typeof content === 'string'
          )
        )
      }));

      state.currentProjectId = state.projects[0]?.id || null;
      state.currentFile = state.projects[0]
        ? Object.keys(state.projects[0].files)[0] || null
        : null;

      save();
      renderAll();
      notify('Copia importada correctamente.');
    } catch (error) {
      console.error(error);
      notify('No se pudo importar: ' + error.message);
    } finally {
      const input = $('#import-file');
      if (input) input.value = '';
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'new-project':
        openCreateDialog('web');
        break;

      case 'save-file':
        saveCurrentFile();
        break;

      case 'new-file':
        createFile();
        break;

      case 'refresh-preview':
        saveCurrentFile(false);
        renderPreview();
        notify('Vista previa actualizada.');
        break;

      case 'fullscreen-preview': {
        const frame = $('#preview-frame');
        if (frame?.requestFullscreen) {
          frame.requestFullscreen().catch(() => notify('No se pudo activar pantalla completa.'));
        } else {
          notify('Tu navegador no permite pantalla completa desde esta opción.');
        }
        break;
      }

      case 'copy-question': {
        const question = $('#assistant-question')?.value?.trim();
        if (!question) return notify('Escribí una consulta primero.');
        copyText(question);
        break;
      }

      case 'export-projects':
        exportProjects();
        break;

      case 'import-projects':
        $('#import-file')?.click();
        break;

      case 'reset-projects':
        if (!confirm('¿Eliminar TODOS los proyectos guardados en este dispositivo? Exportá una copia si querés conservarlos.')) return;
        state.projects = [];
        state.currentProjectId = null;
        state.currentFile = null;
        save();
        renderAll();
        notify('Proyectos eliminados.');
        break;

      default:
        console.warn('Acción desconocida:', action);
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const nav = target.closest('[data-view]');
    if (nav) {
      event.preventDefault();
      navigate(nav.dataset.view);
      return;
    }

    const action = target.closest('[data-action]');
    if (action) {
      event.preventDefault();
      handleAction(action.dataset.action);
      return;
    }

    const open = target.closest('[data-open-project]');
    if (open) {
      openProject(open.dataset.openProject);
      return;
    }

    const remove = target.closest('[data-delete-project]');
    if (remove) {
      deleteProject(remove.dataset.deleteProject);
      return;
    }

    const file = target.closest('[data-select-file]');
    if (file) {
      saveCurrentFile(false);
      state.currentFile = file.dataset.selectFile;
      renderEditor();
      return;
    }

    const template = target.closest('[data-template]');
    if (template) {
      openCreateDialog(template.dataset.template);
      return;
    }

    const article = target.closest('[data-wiki-article]');
    if (article) {
      state.wikiArticle = article.dataset.wikiArticle;
      renderWiki();
    }
  });

  $('#project-form')?.addEventListener('submit', event => {
    event.preventDefault();

    const name = $('#project-name')?.value?.trim();
    const type = $('#project-type')?.value || 'web';

    if (!name) return notify('Escribí un nombre para el proyecto.');
    if (name.length > 80) return notify('El nombre es demasiado largo.');

    $('#project-dialog')?.close();
    createProject(name, ['web', 'discord', 'blank'].includes(type) ? type : 'web');
  });

  $('#close-dialog')?.addEventListener('click', () => $('#project-dialog')?.close());
  $('#cancel-dialog')?.addEventListener('click', () => $('#project-dialog')?.close());

  $('#menu-button')?.addEventListener('click', () => {
    $('#sidebar')?.classList.toggle('open');
  });

  $('#project-search')?.addEventListener('input', renderProjects);

  $('#editor-project')?.addEventListener('change', event => {
    saveCurrentFile(false);
    openProject(event.target.value);
  });

  let editorAutoSaveTimer = null;

  $('#code-editor')?.addEventListener('input', () => {
    if ($('#save-status')) {
      $('#save-status').textContent = 'Cambios sin guardar';
      $('#save-status').classList.remove('saved');
    }

    if ($('#char-count')) {
      $('#char-count').textContent =
        `${$('#code-editor').value.length} caracteres`;
    }

    clearTimeout(editorAutoSaveTimer);
    editorAutoSaveTimer = setTimeout(() => {
      const editor = $('#code-editor');
      const project = current();

      if (!editor || editor.disabled || !project || !state.currentFile) {
        return;
      }

      const success = saveCurrentFile(false);

      if ($('#save-status')) {
        $('#save-status').textContent = success
          ? 'Autoguardado'
          : 'Error al guardar';
      }
    }, 800);
  });

  $('#preview-project')?.addEventListener('change', event => {
    saveCurrentFile(false);
    state.currentProjectId = event.target.value || null;
    state.currentFile = Object.keys(current()?.files || {})[0] || null;
    renderEditor();
    renderPreview();
  });

  $('#import-file')?.addEventListener('change', event => {
    importProjects(event.target.files?.[0]);
  });

  $('#language-select')?.addEventListener('change', event => {
    if (event.target.value !== 'es') {
      notify('Ese idioma todavía no está disponible. La interfaz sigue en español.');
      event.target.value = 'es';
    }
  });

  $('#assistant-question')?.addEventListener('input', () => {
    if ($('#assistant-status')) {
      $('#assistant-status').textContent = 'Consulta lista para copiar';
    }
  });

  window.addEventListener('beforeunload', event => {
    const status = $('#save-status')?.textContent || '';
    if (status === 'Cambios sin guardar') {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  load();

  if (state.projects.length) {
    state.currentProjectId = state.projects[0].id;
    state.currentFile = Object.keys(state.projects[0].files)[0] || null;
  }

  renderAll();
  navigate('home');

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .catch(error => console.warn('Service Worker no disponible:', error));
    });
  }

  console.log('Nexora Studio V2 inicializado.');
})();
