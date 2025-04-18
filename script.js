// ===== IMPORT FIREBASE MODULES =====
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ===== FIREBASE SETUP =====
const auth = window.firebase.auth;
const db = window.firebase.db;

// ===== GLOBAL STATE =====
let tasks = [];

// ===== UTIL =====
function showMessage(message, type = 'info') {
  alert(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}`);
}

// ===== TASK MANAGEMENT =====
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

async function fetchTasks() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTasks();
  } catch (err) {
    console.error("❌ Failed to fetch tasks:", err.message);
  }
}

async function addTask(task) {
  const user = auth.currentUser;
  if (!user) return showMessage("User not authenticated!", "error");

  task.userId = user.uid;
  const docRef = await addDoc(collection(db, "tasks"), task);
  task.id = docRef.id;
  tasks.push(task);
  renderTasks();
}

async function toggleTaskCompletion(index) {
  const task = tasks[index];
  task.completed = !task.completed;
  await updateDoc(doc(db, "tasks", task.id), { completed: task.completed });
  renderTasks();
}

async function deleteTask(index) {
  const task = tasks[index];
  await deleteDoc(doc(db, "tasks", task.id));
  tasks.splice(index, 1);
  renderTasks();
}

function createTaskElement(task, index) {
  const card = document.createElement('div');
  card.className = 'task-card';
  if (task.completed) card.classList.add('completed');

  const top = document.createElement('div');
  top.className = 'top';

  const title = document.createElement('h3');
  title.textContent = task.title;

  const buttons = document.createElement('div');
  buttons.className = 'task-actions';

  const completeBtn = document.createElement('button');
  completeBtn.textContent = task.completed ? 'Undo' : 'Done';
  completeBtn.className = 'task-btn complete-btn';
  completeBtn.onclick = () => toggleTaskCompletion(index);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'task-btn delete-btn';
  deleteBtn.onclick = () => deleteTask(index);

  buttons.appendChild(completeBtn);
  buttons.appendChild(deleteBtn);
  top.appendChild(title);
  top.appendChild(buttons);

  const tags = document.createElement('div');
  tags.className = 'tags';

  if (task.category) tags.appendChild(Object.assign(document.createElement('span'), { textContent: `📁 ${task.category}` }));
  if (task.priority) tags.appendChild(Object.assign(document.createElement('span'), { textContent: `⚡ ${task.priority}` }));

  if (task.date && /^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
    const dateTag = document.createElement('span');
    dateTag.textContent = `📅 ${task.date}`;
    if (task.date < new Date().toISOString().split("T")[0]) dateTag.style.backgroundColor = "#ff6b6b";
    tags.appendChild(dateTag);
  }

  card.appendChild(top);
  card.appendChild(tags);
  return card;
}

function renderTasks(showTodayOnly = false, showImportantOnly = false) {
  taskList.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];

  tasks.forEach((task, index) => {
    if (showTodayOnly && task.date !== today) return;
    if (showImportantOnly && task.priority !== 'High') return;
    taskList.appendChild(createTaskElement(task, index));
  });
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const category = document.getElementById('task-category').value.trim();
  const priority = document.getElementById('task-priority').value;
  const date = document.getElementById('task-date').value;

  if (!title) return showMessage('Please enter a task title.', 'error');

  const newTask = { title, category, priority, date, completed: false };
  await addTask(newTask);
  form.reset();
};

// ===== AUTH SYSTEM =====
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const mainApp = document.getElementById('main-app');
const authSection = document.getElementById('auth-section');

// Register
registerBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return showMessage('Email and password are required.', 'error');

  try {
    window.isRegistering = true;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email: user.email
    });

    await signOut(auth);
    authForm.reset();
    showMessage('🎉 Registered successfully! Please login with your credentials.', 'success');
  } catch (err) {
    const code = err.code;
    if (code === 'auth/email-already-in-use') {
      showMessage('That email is already registered. Try logging in.', 'error');
    } else if (code === 'auth/weak-password') {
      showMessage('Password should be at least 6 characters.', 'error');
    } else {
      showMessage('Registration failed: ' + err.message, 'error');
    }
  } finally {
    window.isRegistering = false;
  }
};

// Login
loginBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return showMessage('Email and password are required.', 'error');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('🎉 Login successful!', 'success');
  } catch (err) {
    const code = err.code;
    if (code === 'auth/user-not-found') {
      showMessage('No user found with this email. Try registering first.', 'error');
    } else if (code === 'auth/wrong-password') {
      showMessage('Incorrect password. Try again.', 'error');
    } else {
      showMessage('Login failed: ' + err.message, 'error');
    }
  }
};

// Logout
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
    showMessage('Logged out successfully.', 'success');
  } catch (err) {
    showMessage('Logout failed: ' + err.message, 'error');
  }
};

// ===== SIDEBAR FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function () {
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const closeBtn = document.querySelector('.close-btn');
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  hamburgerBtn?.addEventListener('click', function (e) {
    e.stopPropagation();
    sidebar.classList.add('active');
    backdrop.style.display = 'block';
    hamburgerBtn.style.opacity = '0';
    hamburgerBtn.style.pointerEvents = 'none';
  });

  closeBtn?.addEventListener('click', function () {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  backdrop.addEventListener('click', function () {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const section = this.dataset.section;
      switch (section) {
        case 'dashboard':
        case 'all-tasks': renderTasks(); break;
        case 'today-tasks': renderTasks(true); break;
        case 'important': renderTasks(false, true); break;
      }

      sidebar.classList.remove('active');
      backdrop.style.display = 'none';
      hamburgerBtn.style.opacity = '1';
      hamburgerBtn.style.pointerEvents = 'auto';
    });
  });
});

onAuthStateChanged(auth, async (user) => {
  // 1) remove the loading guard so our logic can run
  document.body.classList.remove('loading');

  // 2) now show either main app or auth form
  if (user && !window.isRegistering) {
    mainApp.style.display = 'block';
    authSection.style.display = 'none';
    await fetchTasks();
  } else {
    authSection.style.display = 'block';
    mainApp.style.display = 'none';
    tasks = [];
  }
});
