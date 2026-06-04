const STORAGE_KEY = "taskflow.tasks.v1";
const API_URL = "/api/tasks";

const state = {
  tasks: [],
  filter: "all",
  sort: "createdAt",
  search: "",
  apiReady: false,
};

const elements = {
  form: document.querySelector("#taskForm"),
  taskId: document.querySelector("#taskId"),
  title: document.querySelector("#titleInput"),
  notes: document.querySelector("#notesInput"),
  due: document.querySelector("#dueInput"),
  priority: document.querySelector("#priorityInput"),
  category: document.querySelector("#categoryInput"),
  submit: document.querySelector("#submitButton"),
  cancelEdit: document.querySelector("#cancelEditButton"),
  search: document.querySelector("#searchInput"),
  list: document.querySelector("#taskList"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#taskTemplate"),
  clearCompleted: document.querySelector("#clearCompletedButton"),
  todayLabel: document.querySelector("#todayLabel"),
  counts: {
    total: document.querySelector("#totalCount"),
    open: document.querySelector("#openCount"),
    done: document.querySelector("#doneCount"),
    due: document.querySelector("#dueCount"),
    allBadge: document.querySelector("#allBadge"),
    pendingBadge: document.querySelector("#pendingBadge"),
    completedBadge: document.querySelector("#completedBadge"),
    todayBadge: document.querySelector("#todayBadge"),
    overdueBadge: document.querySelector("#overdueBadge"),
  },
};

const priorityWeight = {
  high: 3,
  medium: 2,
  low: 1,
};

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  if (state.apiReady) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

async function loadInitialTasks() {
  if (location.protocol.startsWith("http")) {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        state.tasks = await response.json();
        state.apiReady = true;
        return;
      }
    } catch {
      state.apiReady = false;
    }
  }

  state.tasks = loadTasks();
  seedTasks();
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalize(text) {
  return text.trim().replace(/\s+/g, " ");
}

function isToday(task) {
  return task.dueDate === todayISO();
}

function isOverdue(task) {
  return Boolean(task.dueDate && task.dueDate < todayISO() && !task.completed);
}

function matchesFilter(task) {
  if (state.filter === "pending") return !task.completed;
  if (state.filter === "completed") return task.completed;
  if (state.filter === "today") return isToday(task);
  if (state.filter === "overdue") return isOverdue(task);
  return true;
}

function matchesSearch(task) {
  if (!state.search) return true;
  const haystack = [task.title, task.notes, task.category, task.priority].join(" ").toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function getVisibleTasks() {
  return state.tasks
    .filter((task) => matchesFilter(task) && matchesSearch(task))
    .sort((a, b) => {
      if (state.sort === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority] || b.createdAt - a.createdAt;
      }

      if (state.sort === "dueDate") {
        const aDue = a.dueDate || "9999-12-31";
        const bDue = b.dueDate || "9999-12-31";
        return aDue.localeCompare(bDue) || b.createdAt - a.createdAt;
      }

      return b.createdAt - a.createdAt;
    });
}

function updateCounts() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.completed).length;
  const open = total - done;
  const due = state.tasks.filter((task) => isToday(task) && !task.completed).length;
  const overdue = state.tasks.filter(isOverdue).length;

  elements.counts.total.textContent = total;
  elements.counts.open.textContent = open;
  elements.counts.done.textContent = done;
  elements.counts.due.textContent = due;
  elements.counts.allBadge.textContent = total;
  elements.counts.pendingBadge.textContent = open;
  elements.counts.completedBadge.textContent = done;
  elements.counts.todayBadge.textContent = due;
  elements.counts.overdueBadge.textContent = overdue;
}

function renderTasks() {
  const tasks = getVisibleTasks();
  elements.list.replaceChildren();

  for (const task of tasks) {
    const item = elements.template.content.firstElementChild.cloneNode(true);
    item.dataset.id = task.id;
    item.classList.toggle("is-completed", task.completed);

    const title = item.querySelector("h3");
    const notes = item.querySelector(".task-notes");
    const priority = item.querySelector(".priority-pill");
    const due = item.querySelector(".due-meta");
    const category = item.querySelector(".category-meta");
    const toggle = item.querySelector(".status-toggle");

    title.textContent = task.title;
    notes.textContent = task.notes;
    priority.textContent = task.priority;
    priority.classList.add(`priority-${task.priority}`);
    due.textContent = formatDate(task.dueDate);
    due.classList.toggle("is-overdue", isOverdue(task));
    category.textContent = task.category || "Inbox";
    toggle.setAttribute("aria-pressed", String(task.completed));

    item.querySelector(".edit-button").addEventListener("click", () => startEdit(task.id));
    item.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
    toggle.addEventListener("click", () => toggleTask(task.id));

    elements.list.append(item);
  }

  elements.empty.hidden = tasks.length > 0;
  updateCounts();
}

function resetForm() {
  elements.form.reset();
  elements.taskId.value = "";
  elements.priority.value = "medium";
  elements.submit.textContent = "Add task";
  elements.cancelEdit.hidden = true;
}

async function upsertTask(event) {
  event.preventDefault();

  const title = normalize(elements.title.value);
  if (!title) return;

  const id = elements.taskId.value;
  const existing = state.tasks.find((task) => task.id === id);

  if (existing) {
    const updatedTask = {
      ...existing,
      title,
      notes: normalize(elements.notes.value),
      dueDate: elements.due.value,
      priority: elements.priority.value,
      category: normalize(elements.category.value) || "Inbox",
      updatedAt: Date.now(),
    };

    if (state.apiReady) {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      Object.assign(existing, await response.json());
    } else {
      Object.assign(existing, updatedTask);
    }
  } else {
    const newTask = {
      id: createId(),
      title,
      notes: normalize(elements.notes.value),
      dueDate: elements.due.value,
      priority: elements.priority.value,
      category: normalize(elements.category.value) || "Inbox",
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (state.apiReady) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      state.tasks.unshift(await response.json());
    } else {
      state.tasks.unshift(newTask);
    }
  }

  saveTasks();
  resetForm();
  renderTasks();
}

function startEdit(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  elements.taskId.value = task.id;
  elements.title.value = task.title;
  elements.notes.value = task.notes;
  elements.due.value = task.dueDate;
  elements.priority.value = task.priority;
  elements.category.value = task.category;
  elements.submit.textContent = "Save task";
  elements.cancelEdit.hidden = false;
  elements.title.focus();
}

async function toggleTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  const updatedTask = { ...task, completed: !task.completed, updatedAt: Date.now() };

  if (state.apiReady) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTask),
    });
    Object.assign(task, await response.json());
  } else {
    Object.assign(task, updatedTask);
  }

  saveTasks();
  renderTasks();
}

async function deleteTask(id) {
  if (state.apiReady) {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  }

  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

async function clearCompleted() {
  if (state.apiReady) {
    await fetch(`${API_URL}?completed=true`, { method: "DELETE" });
  }

  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
  renderTasks();
}

function setSort(sort) {
  state.sort = sort;
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sort === sort);
  });
  renderTasks();
}

function seedTasks() {
  if (state.tasks.length > 0) return;

  state.tasks = [
    {
      id: createId(),
      title: "Design task list workflow",
      notes: "Map create, update, complete, and delete actions.",
      dueDate: todayISO(),
      priority: "high",
      category: "Project",
      completed: false,
      createdAt: Date.now() - 30000,
      updatedAt: Date.now() - 30000,
    },
    {
      id: createId(),
      title: "Review persistence layer",
      notes: "Replace localStorage with a database API when the backend is ready.",
      dueDate: "",
      priority: "medium",
      category: "Backend",
      completed: false,
      createdAt: Date.now() - 60000,
      updatedAt: Date.now() - 60000,
    },
    {
      id: createId(),
      title: "Confirm responsive layout",
      notes: "",
      dueDate: "",
      priority: "low",
      category: "UI",
      completed: true,
      createdAt: Date.now() - 90000,
      updatedAt: Date.now() - 90000,
    },
  ];
  saveTasks();
}

function bindEvents() {
  elements.form.addEventListener("submit", upsertTask);
  elements.cancelEdit.addEventListener("click", resetForm);
  elements.clearCompleted.addEventListener("click", clearCompleted);
  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderTasks();
  });

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setSort(button.dataset.sort));
  });
}

async function init() {
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  await loadInitialTasks();
  bindEvents();
  renderTasks();
}

init();
